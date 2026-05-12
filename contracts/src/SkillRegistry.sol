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

    event SkillPublished(bytes32 indexed id, address indexed author, string uri, string name);
    event SkillInstalled(bytes32 indexed id, address indexed wallet);
    event SkillUninstalled(bytes32 indexed id, address indexed wallet);
    event SkillFired(bytes32 indexed id, address indexed wallet, bytes32 actionHash);
    event SkillStatusChanged(bytes32 indexed id, address indexed wallet, uint8 status);

    error AlreadyPublished();
    error NotInstalled();

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
        skills[id].fires += 1;
        emit SkillFired(id, msg.sender, actionHash);
    }
}
