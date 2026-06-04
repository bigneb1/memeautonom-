// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SkillRegistry
 * @notice Registry of "skills" (decision modules) that agentic wallets
 *         install and fire autonomously. A skill is an off-chain
 *         WASM/JS bundle pinned to IPFS; this contract just records
 *         publish + install + fire events for the indexer.
 *
 *         Indexer events:
 *           SkillPublished(bytes32 id, address author, string uri, string name)
 *           SkillInstalled(bytes32 id, address wallet)
 *           SkillFired(bytes32 id, address wallet, bytes32 actionHash)
 *           SkillStatusChanged(bytes32 id, address wallet, uint8 status) // 0=paused,1=active
 */
interface IReputationRegistry {
    function record(
        address wallet,
        int128 value,
        uint8 decimals,
        string calldata tag1,
        string calldata tag2,
        string calldata uri,
        bytes32 fileHash
    ) external returns (uint256);
}

contract SkillRegistry {
    struct Skill {
        address author;
        string  uri;   // ipfs://…/skill.json
        string  name;
        uint64  publishedAt;
        uint128 installs;
        uint128 fires;
    }

    mapping(bytes32 => Skill) public skills;
    mapping(bytes32 => mapping(address => bool)) public installed;
    mapping(bytes32 => mapping(address => uint8)) public statusOf; // 0=paused 1=active
    address public owner;
    IReputationRegistry public reputationRegistry;

    event SkillPublished(bytes32 indexed id, address indexed author, string uri, string name);
    event SkillInstalled(bytes32 indexed id, address indexed wallet);
    event SkillUninstalled(bytes32 indexed id, address indexed wallet);
    event SkillFired(bytes32 indexed id, address indexed wallet, bytes32 actionHash);
    event SkillStatusChanged(bytes32 indexed id, address indexed wallet, uint8 status);
    event ReputationRegistryUpdated(address indexed reputationRegistry);

    error AlreadyPublished();
    error NotInstalled();
    error SkillPaused();
    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setReputationRegistry(address registry) external onlyOwner {
        reputationRegistry = IReputationRegistry(registry);
        emit ReputationRegistryUpdated(registry);
    }

    function publish(string calldata name, string calldata uri) external returns (bytes32 id) {
        id = keccak256(abi.encode(msg.sender, name));
        if (skills[id].publishedAt != 0) revert AlreadyPublished();
        skills[id] = Skill({
            author: msg.sender, uri: uri, name: name,
            publishedAt: uint64(block.timestamp), installs: 0, fires: 0
        });
        emit SkillPublished(id, msg.sender, uri, name);
    }

    function install(bytes32 id) external {
        require(skills[id].publishedAt != 0, "no skill");
        if (!installed[id][msg.sender]) {
            installed[id][msg.sender] = true;
            statusOf[id][msg.sender] = 1; // active by default
            skills[id].installs += 1;
            emit SkillInstalled(id, msg.sender);
            emit SkillStatusChanged(id, msg.sender, 1);
        }
    }

    function uninstall(bytes32 id) external {
        if (!installed[id][msg.sender]) revert NotInstalled();
        installed[id][msg.sender] = false;
        statusOf[id][msg.sender] = 0;
        emit SkillUninstalled(id, msg.sender);
    }

    function setStatus(bytes32 id, uint8 status) external {
        if (!installed[id][msg.sender]) revert NotInstalled();
        require(status <= 1, "bad status");
        statusOf[id][msg.sender] = status;
        emit SkillStatusChanged(id, msg.sender, status);
    }

    /// @notice Called by the wallet itself when its decision loop fires the skill.
    function fire(bytes32 id, bytes32 actionHash) external {
        if (!installed[id][msg.sender]) revert NotInstalled();
        if (statusOf[id][msg.sender] != 1) revert SkillPaused();
        Skill storage skill = skills[id];
        skill.fires += 1;
        emit SkillFired(id, msg.sender, actionHash);
        if (address(reputationRegistry) != address(0)) {
            reputationRegistry.record(msg.sender, 1, 0, "skill-fire", skill.name, skill.uri, actionHash);
        }
    }
}
