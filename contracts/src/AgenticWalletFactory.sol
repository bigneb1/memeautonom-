// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentity {
    function registerFor(address wallet, address controller, string calldata uri) external returns (uint256);
    function setController(address controller) external;
}

/**
 * @title AgenticWallet
 * @notice Policy-limited smart account controlled by an off-chain agent signer.
 *         Owner configures allowlists, spend caps, pause state, and recovery.
 *         Signer can execute only approved calls within those limits.
 */
contract AgenticWallet {
    address public owner;
    address public signer;
    IIdentity public immutable identity;
    bool public paused;

    struct Limits {
        uint128 maxCallAmount;
        uint128 dailySpendLimit;
        bool enabled;
    }

    uint256 private _entered = 1;

    Limits public defaultLimits;
    mapping(bytes32 => Limits) public skillLimits;
    mapping(bytes32 => uint256) public spentToday;
    mapping(bytes32 => uint64) public spendDay;
    mapping(address => bool) public targetAllowed;
    mapping(address => mapping(bytes4 => bool)) public selectorAllowed;

    event Executed(address indexed to, uint256 value, bytes data, bytes result);
    event SignerRotated(address indexed signer);
    event OwnerTransferred(address indexed owner);
    event IdentityControllerSyncFailed(address indexed signer);
    event Paused();
    event Unpaused();
    event TargetPermissionUpdated(address indexed target, bool allowed);
    event SelectorPermissionUpdated(address indexed target, bytes4 indexed selector, bool allowed);
    event DefaultLimitsUpdated(uint128 maxCallAmount, uint128 dailySpendLimit, bool enabled);
    event SkillLimitsUpdated(bytes32 indexed skillId, uint128 maxCallAmount, uint128 dailySpendLimit, bool enabled);
    event EmergencyWithdrawal(address indexed asset, address indexed to, uint256 amount);

    error NotOwner();
    error NotSigner();
    error PausedWallet();
    error TargetNotAllowed();
    error SelectorNotAllowed();
    error PolicyDisabled();
    error CallValueTooHigh();
    error DailyLimitExceeded();
    error NotPaused();
    error ZeroAddress();
    error Reentrancy();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_entered != 1) revert Reentrancy();
        _entered = 2;
        _;
        _entered = 1;
    }

    constructor(address _owner, address _signer, address _identity) {
        if (_owner == address(0) || _signer == address(0) || _identity == address(0)) revert ZeroAddress();
        owner = _owner;
        signer = _signer;
        identity = IIdentity(_identity);
    }

    receive() external payable {}

    function rotateSigner(address s) external onlyOwner {
        if (s == address(0)) revert ZeroAddress();
        signer = s;
        try identity.setController(s) {} catch {
            emit IdentityControllerSyncFailed(s);
        }
        emit SignerRotated(s);
    }

    function transferOwner(address o) external onlyOwner {
        if (o == address(0)) revert ZeroAddress();
        owner = o;
        emit OwnerTransferred(o);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    function setTargetAllowed(address target, bool allowed) external onlyOwner {
        if (target == address(0)) revert ZeroAddress();
        targetAllowed[target] = allowed;
        emit TargetPermissionUpdated(target, allowed);
    }

    function setSelectorAllowed(address target, bytes4 selector, bool allowed) external onlyOwner {
        if (target == address(0)) revert ZeroAddress();
        selectorAllowed[target][selector] = allowed;
        emit SelectorPermissionUpdated(target, selector, allowed);
    }

    function setDefaultLimits(uint128 maxCallAmount, uint128 dailySpendLimit, bool enabled) external onlyOwner {
        defaultLimits = Limits({
            maxCallAmount: maxCallAmount,
            dailySpendLimit: dailySpendLimit,
            enabled: enabled
        });
        emit DefaultLimitsUpdated(maxCallAmount, dailySpendLimit, enabled);
    }

    function setSkillLimits(
        bytes32 skillId,
        uint128 maxCallAmount,
        uint128 dailySpendLimit,
        bool enabled
    ) external onlyOwner {
        skillLimits[skillId] = Limits({
            maxCallAmount: maxCallAmount,
            dailySpendLimit: dailySpendLimit,
            enabled: enabled
        });
        emit SkillLimitsUpdated(skillId, maxCallAmount, dailySpendLimit, enabled);
    }

    function withdrawETH(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (!paused) revert NotPaused();
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "eth withdraw");
        emit EmergencyWithdrawal(address(0), to, amount);
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (!paused) revert NotPaused();
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        _safeTokenTransfer(token, to, amount);
        emit EmergencyWithdrawal(token, to, amount);
    }

    function executeSkill(
        bytes32 skillId,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bytes memory) {
        if (skillId == bytes32(0)) revert PolicyDisabled();
        return _execute(skillId, to, value, data);
    }

    function _execute(bytes32 skillId, address to, uint256 value, bytes calldata data)
        internal
        nonReentrant
        returns (bytes memory)
    {
        if (msg.sender != signer && msg.sender != owner) revert NotSigner();
        if (paused) revert PausedWallet();
        if (to == address(0) || to == address(this)) revert TargetNotAllowed();
        if (!targetAllowed[to]) revert TargetNotAllowed();

        bytes4 selector = bytes4(0);
        if (data.length >= 4) {
            selector = _selector(data);
            if (!selectorAllowed[to][selector]) revert SelectorNotAllowed();
        }

        Limits memory limits = skillId == bytes32(0) ? defaultLimits : skillLimits[skillId];
        if (!limits.enabled) revert PolicyDisabled();

        uint256 callAmount = _callAmount(selector, data, value);
        if (value > callAmount) callAmount = value;
        if (callAmount > uint256(limits.maxCallAmount)) revert CallValueTooHigh();

        bytes32 spendKey = skillId == bytes32(0) ? bytes32(uint256(0)) : skillId;
        _enforceDailyLimit(spendKey, callAmount, limits.dailySpendLimit);

        (bool ok, bytes memory ret) = to.call{value: value}(data);
        require(ok, "exec failed");
        emit Executed(to, value, data, ret);
        return ret;
    }

    function _callAmount(bytes4 selector, bytes calldata data, uint256 value) internal pure returns (uint256) {
        if (data.length < 4) return value;
        if (selector == 0xa9059cbb || selector == 0x095ea7b3) {
            return _readUint256(data, 36);
        }
        if (selector == 0x23b872dd) {
            return _readUint256(data, 68);
        }
        return value;
    }

    function _readUint256(bytes calldata data, uint256 offset) internal pure returns (uint256 amount) {
        if (data.length < offset + 32) return 0;
        assembly {
            amount := calldataload(add(data.offset, offset))
        }
    }

    function _enforceDailyLimit(bytes32 spendKey, uint256 amount, uint128 dailySpendLimit) internal {
        uint64 today = uint64(block.timestamp / 1 days);
        if (spendDay[spendKey] != today) {
            spendDay[spendKey] = today;
            spentToday[spendKey] = 0;
        }
        uint256 nextSpent = spentToday[spendKey] + amount;
        if (nextSpent > uint256(dailySpendLimit)) revert DailyLimitExceeded();
        spentToday[spendKey] = nextSpent;
    }

    function _selector(bytes calldata data) internal pure returns (bytes4 selector) {
        assembly {
            selector := calldataload(data.offset)
        }
    }

    function _safeTokenTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory ret) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
        require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "token withdraw");
    }
}

/**
 * @title AgenticWalletFactory
 * @notice CREATE2 factory for AgenticWallet. Optionally registers an
 *         ERC-8004 identity in the same tx.
 *
 *         Indexer events:
 *           WalletCreated(address wallet, address owner, address signer, uint256 salt)
 */
contract AgenticWalletFactory {
    IIdentity public immutable identity;

    event WalletCreated(address indexed wallet, address indexed owner, address indexed signer, uint256 salt);

    constructor(address _identity) {
        identity = IIdentity(_identity);
    }

    function deploy(address owner, address signer, uint256 salt, string calldata uri)
        external returns (address wallet)
    {
        bytes memory bc = abi.encodePacked(type(AgenticWallet).creationCode, abi.encode(owner, signer, address(identity)));
        bytes32 s = bytes32(salt);
        assembly {
            wallet := create2(0, add(bc, 0x20), mload(bc), s)
        }
        require(wallet != address(0), "create2");
        if (bytes(uri).length > 0) {
            identity.registerFor(wallet, signer, uri);
        }
        emit WalletCreated(wallet, owner, signer, salt);
    }

    function predict(address owner, address signer, uint256 salt) external view returns (address) {
        bytes memory bc = abi.encodePacked(type(AgenticWallet).creationCode, abi.encode(owner, signer, address(identity)));
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), bytes32(salt), keccak256(bc)));
        return address(uint160(uint256(hash)));
    }
}
