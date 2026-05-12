// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentity { function register(string calldata uri) external returns (uint256); }

/**
 * @title AgenticWallet
 * @notice Minimal smart account controlled by an off-chain agent signer.
 *         Owner can rotate signer; signer can execute arbitrary calls
 *         (used by the Byreal agent runtime to fire skills + accept jobs).
 */
contract AgenticWallet {
    address public owner;
    address public signer;

    event Executed(address indexed to, uint256 value, bytes data, bytes result);
    event SignerRotated(address indexed signer);
    event OwnerTransferred(address indexed owner);

    error NotOwner();
    error NotSigner();

    constructor(address _owner, address _signer) {
        owner = _owner;
        signer = _signer;
    }

    receive() external payable {}

    function rotateSigner(address s) external {
        if (msg.sender != owner) revert NotOwner();
        signer = s;
        emit SignerRotated(s);
    }

    function transferOwner(address o) external {
        if (msg.sender != owner) revert NotOwner();
        owner = o;
        emit OwnerTransferred(o);
    }

    function execute(address to, uint256 value, bytes calldata data) external returns (bytes memory) {
        if (msg.sender != signer && msg.sender != owner) revert NotSigner();
        (bool ok, bytes memory ret) = to.call{value: value}(data);
        require(ok, "exec failed");
        emit Executed(to, value, data, ret);
        return ret;
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
        bytes memory bc = abi.encodePacked(type(AgenticWallet).creationCode, abi.encode(owner, signer));
        bytes32 s = bytes32(salt);
        assembly {
            wallet := create2(0, add(bc, 0x20), mload(bc), s)
        }
        require(wallet != address(0), "create2");
        if (bytes(uri).length > 0) {
            // identity registers the *factory caller* — wallets call register()
            // themselves via execute() if they want their own identity.
            try identity.register(uri) returns (uint256) {} catch {}
        }
        emit WalletCreated(wallet, owner, signer, salt);
    }

    function predict(address owner, address signer, uint256 salt) external view returns (address) {
        bytes memory bc = abi.encodePacked(type(AgenticWallet).creationCode, abi.encode(owner, signer));
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), bytes32(salt), keccak256(bc)));
        return address(uint160(uint256(hash)));
    }
}
