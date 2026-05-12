// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ERC8004Identity
 * @notice Minimal ERC-8004 style on-chain identity registry for autonomous
 *         agentic wallets. Each wallet registers an identity once and may
 *         update its metadata URI (IPFS pointer to agent.json).
 *
 *         Events are designed for a subgraph / Envio handler:
 *           - IdentityRegistered(address wallet, uint256 id, string uri)
 *           - IdentityUpdated(address wallet, string uri)
 *
 * @dev Designed for Mantle Sepolia (chainId 5003) but chain-agnostic.
 */
contract ERC8004Identity {
    struct Identity {
        uint256 id;
        string  uri;        // ipfs://… agent.json
        uint64  registeredAt;
        uint64  updatedAt;
    }

    uint256 public nextId = 1;
    mapping(address => Identity) public identities;
    mapping(uint256 => address) public ownerOf;

    event IdentityRegistered(address indexed wallet, uint256 indexed id, string uri);
    event IdentityUpdated(address indexed wallet, string uri);

    error AlreadyRegistered();
    error NotRegistered();

    function register(string calldata uri) external returns (uint256 id) {
        if (identities[msg.sender].id != 0) revert AlreadyRegistered();
        id = nextId++;
        identities[msg.sender] = Identity({
            id: id,
            uri: uri,
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });
        ownerOf[id] = msg.sender;
        emit IdentityRegistered(msg.sender, id, uri);
    }

    function update(string calldata uri) external {
        Identity storage i = identities[msg.sender];
        if (i.id == 0) revert NotRegistered();
        i.uri = uri;
        i.updatedAt = uint64(block.timestamp);
        emit IdentityUpdated(msg.sender, uri);
    }
}
