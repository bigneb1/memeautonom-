// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ERC8004Identity
 * @notice Minimal ERC-8004 style on-chain identity registry for autonomous
 *         agentic wallets. Each wallet registers an identity once, keeps a
 *         controller address, and may update its metadata URI (IPFS pointer
 *         to agent.json).
 *
 *         Events are designed for a subgraph / Envio handler:
 *           - IdentityRegistered(address wallet, uint256 id, address controller, string uri)
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

    address public owner;
    uint256 public nextId = 1;
    mapping(address => Identity) public identities;
    mapping(uint256 => address) public ownerOf;
    mapping(address => address) public controllerOf;
    mapping(address => bool) public registrar;

    event IdentityRegistered(address indexed wallet, uint256 indexed id, address indexed controller, string uri);
    event IdentityUpdated(address indexed wallet, string uri);
    event ControllerUpdated(address indexed wallet, address indexed controller);
    event RegistrarUpdated(address indexed registrar, bool allowed);

    error AlreadyRegistered();
    error NotRegistered();
    error NotAuthorized();
    error ZeroAddress();

    constructor() {
        owner = msg.sender;
        registrar[msg.sender] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    function setRegistrar(address account, bool allowed) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        registrar[account] = allowed;
        emit RegistrarUpdated(account, allowed);
    }

    function register(string calldata uri) external returns (uint256 id) {
        return registerFor(msg.sender, msg.sender, uri);
    }

    function registerFor(address wallet, address controller, string calldata uri) public returns (uint256 id) {
        if (wallet == address(0) || controller == address(0)) revert ZeroAddress();
        if (identities[wallet].id != 0) revert AlreadyRegistered();
        if (msg.sender != wallet && msg.sender != owner && !registrar[msg.sender]) revert NotAuthorized();
        id = nextId++;
        identities[wallet] = Identity({
            id: id,
            uri: uri,
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });
        ownerOf[id] = wallet;
        controllerOf[wallet] = controller;
        emit IdentityRegistered(wallet, id, controller, uri);
    }

    function tokenURI(uint256 id) external view returns (string memory) {
        address wallet = ownerOf[id];
        if (wallet == address(0)) revert NotRegistered();
        return identities[wallet].uri;
    }

    function getAgentWallet(uint256 id) external view returns (address) {
        address wallet = ownerOf[id];
        if (wallet == address(0)) revert NotRegistered();
        return wallet;
    }

    function update(string calldata uri) external {
        _update(msg.sender, uri);
    }

    function updateFor(address wallet, string calldata uri) external {
        if (wallet == address(0)) revert ZeroAddress();
        if (msg.sender != wallet && msg.sender != owner && msg.sender != controllerOf[wallet] && !registrar[msg.sender]) {
            revert NotAuthorized();
        }
        _update(wallet, uri);
    }

    function setController(address controller) external {
        if (controller == address(0)) revert ZeroAddress();
        Identity storage i = identities[msg.sender];
        if (i.id == 0) revert NotRegistered();
        controllerOf[msg.sender] = controller;
        emit ControllerUpdated(msg.sender, controller);
    }

    function _update(address wallet, string calldata uri) internal {
        Identity storage i = identities[wallet];
        if (i.id == 0) revert NotRegistered();
        i.uri = uri;
        i.updatedAt = uint64(block.timestamp);
        emit IdentityUpdated(wallet, uri);
    }
}
