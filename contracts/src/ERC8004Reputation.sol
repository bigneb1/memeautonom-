// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC8004IdentityRegistry {
    function identities(address wallet) external view returns (
        uint256 id, string memory uri, uint64 registeredAt, uint64 updatedAt
    );
}

/**
 * @title ERC8004Reputation
 * @notice Lightweight on-chain reputation registry for agent wallets.
 *         Reporter contracts or trusted operators can post signed fixed-point
 *         feedback signals and the registry keeps an MVP aggregate score.
 */
contract ERC8004Reputation {
    struct Record {
        address wallet;
        address issuer;
        int128 value;
        uint8 decimals;
        int256 scoreAfter;
        string tag1;
        string tag2;
        string uri;
        bytes32 fileHash;
        uint64 recordedAt;
    }

    address public owner;
    IERC8004IdentityRegistry public identity;
    uint256 public nextRecordId = 1;
    mapping(address => int256) public scoreOf;
    mapping(uint256 => Record) public records;
    mapping(address => uint256) public recordCount;
    mapping(address => bool) public reporter;

    event ReporterUpdated(address indexed reporter, bool allowed);
    event ReputationRecorded(
        address indexed wallet,
        uint256 indexed recordId,
        address indexed issuer,
        int128 value,
        uint8 decimals,
        int256 scoreAfter,
        string tag1,
        string tag2,
        string uri,
        bytes32 fileHash
    );

    error NotOwner();
    error NotReporter();
    error NotIdentified();
    error BadDecimals();
    error ZeroAddress();

    constructor(address _identity) {
        if (_identity == address(0)) revert ZeroAddress();
        owner = msg.sender;
        identity = IERC8004IdentityRegistry(_identity);
        reporter[msg.sender] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function getIdentityRegistry() external view returns (address identityRegistry) {
        return address(identity);
    }

    function setReporter(address account, bool allowed) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        reporter[account] = allowed;
        emit ReporterUpdated(account, allowed);
    }

    function record(
        address wallet,
        int128 value,
        uint8 decimals,
        string calldata tag1,
        string calldata tag2,
        string calldata uri,
        bytes32 fileHash
    ) external returns (uint256 recordId) {
        if (!reporter[msg.sender]) revert NotReporter();
        if (wallet == address(0)) revert ZeroAddress();
        if (decimals > 18) revert BadDecimals();
        (uint256 id,,,) = identity.identities(wallet);
        if (id == 0) revert NotIdentified();

        recordId = nextRecordId++;
        int256 nextScore = scoreOf[wallet] + int256(value);
        scoreOf[wallet] = nextScore;
        recordCount[wallet] += 1;
        records[recordId] = Record({
            wallet: wallet,
            issuer: msg.sender,
            value: value,
            decimals: decimals,
            scoreAfter: nextScore,
            tag1: tag1,
            tag2: tag2,
            uri: uri,
            fileHash: fileHash,
            recordedAt: uint64(block.timestamp)
        });

        emit ReputationRecorded(wallet, recordId, msg.sender, value, decimals, nextScore, tag1, tag2, uri, fileHash);
    }
}
