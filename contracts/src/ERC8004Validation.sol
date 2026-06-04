// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC8004IdentityForValidation {
    function ownerOf(uint256 id) external view returns (address);
    function controllerOf(address wallet) external view returns (address);
}

/**
 * @title ERC8004Validation
 * @notice Minimal ERC-8004-style validation registry. Agent wallets request
 *         validation for an off-chain execution payload and a chosen validator
 *         posts a 0-100 response plus optional evidence URI/hash.
 */
contract ERC8004Validation {
    struct ValidationStatus {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        uint64 lastUpdate;
        string tag;
    }

    IERC8004IdentityForValidation public immutable identity;

    mapping(bytes32 => address) public validatorOf;
    mapping(bytes32 => uint256) public agentIdOf;
    mapping(bytes32 => ValidationStatus) public validationStatus;
    mapping(uint256 => bytes32[]) private agentValidations;
    mapping(address => bytes32[]) private validatorRequests;

    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestURI,
        bytes32 indexed requestHash
    );
    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    error NotAgentOwnerOrController();
    error NotValidator();
    error UnknownRequest();
    error BadResponse();
    error ZeroAddress();

    constructor(address _identity) {
        if (_identity == address(0)) revert ZeroAddress();
        identity = IERC8004IdentityForValidation(_identity);
    }

    function getIdentityRegistry() external view returns (address identityRegistry) {
        return address(identity);
    }

    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external {
        if (validatorAddress == address(0)) revert ZeroAddress();
        address agentWallet = identity.ownerOf(agentId);
        if (msg.sender != agentWallet && msg.sender != identity.controllerOf(agentWallet)) {
            revert NotAgentOwnerOrController();
        }

        validatorOf[requestHash] = validatorAddress;
        agentIdOf[requestHash] = agentId;
        agentValidations[agentId].push(requestHash);
        validatorRequests[validatorAddress].push(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external {
        address validatorAddress = validatorOf[requestHash];
        if (validatorAddress == address(0)) revert UnknownRequest();
        if (msg.sender != validatorAddress) revert NotValidator();
        if (response > 100) revert BadResponse();

        uint256 agentId = agentIdOf[requestHash];
        validationStatus[requestHash] = ValidationStatus({
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: response,
            responseHash: responseHash,
            lastUpdate: uint64(block.timestamp),
            tag: tag
        });

        emit ValidationResponse(validatorAddress, agentId, requestHash, response, responseURI, responseHash, tag);
    }

    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 responseHash,
            string memory tag,
            uint256 lastUpdate
        )
    {
        ValidationStatus storage status = validationStatus[requestHash];
        return (
            status.validatorAddress,
            status.agentId,
            status.response,
            status.responseHash,
            status.tag,
            status.lastUpdate
        );
    }

    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes) {
        return agentValidations[agentId];
    }

    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes) {
        return validatorRequests[validatorAddress];
    }
}
