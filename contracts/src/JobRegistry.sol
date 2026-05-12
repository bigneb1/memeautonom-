// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IERC8004 {
    function identities(address wallet) external view returns (
        uint256 id, string memory uri, uint64 registeredAt, uint64 updatedAt
    );
}

/**
 * @title JobRegistry
 * @notice Wallet-to-wallet job marketplace settled in USDC. A "client"
 *         wallet posts a job with an IPFS spec + USDC budget. An
 *         "executor" agentic wallet accepts, then submits a result hash.
 *         The client (or a verifier) marks the job complete and funds
 *         release to the executor minus a protocol fee.
 *
 *         Indexer events:
 *           JobPosted(uint256 id, address client, uint256 budget, string spec)
 *           JobAccepted(uint256 id, address executor)
 *           JobSubmitted(uint256 id, bytes32 resultHash)
 *           JobCompleted(uint256 id, address executor, uint256 paid, uint256 fee)
 *           JobCancelled(uint256 id)
 */
contract JobRegistry {
    enum Status { Open, Accepted, Submitted, Completed, Cancelled }

    struct Job {
        address client;
        address executor;
        uint128 budget;
        uint128 paid;
        uint64  postedAt;
        uint64  acceptedAt;
        uint64  completedAt;
        Status  status;
        bytes32 resultHash;
        string  spec; // ipfs://…
    }

    IERC20  public immutable usdc;
    IERC8004 public immutable identity;
    address public owner;
    uint16  public feeBps;     // e.g. 250 = 2.5%
    address public feeSink;
    uint256 public nextJobId = 1;

    mapping(uint256 => Job) public jobs;

    event JobPosted(uint256 indexed id, address indexed client, uint256 budget, string spec);
    event JobAccepted(uint256 indexed id, address indexed executor);
    event JobSubmitted(uint256 indexed id, bytes32 resultHash);
    event JobCompleted(uint256 indexed id, address indexed executor, uint256 paid, uint256 fee);
    event JobCancelled(uint256 indexed id);

    error NotOwner();
    error NotClient();
    error BadStatus();
    error NotIdentified();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    constructor(address _usdc, address _identity, address _feeSink, uint16 _feeBps) {
        usdc = IERC20(_usdc);
        identity = IERC8004(_identity);
        owner = msg.sender;
        feeSink = _feeSink;
        feeBps = _feeBps;
    }

    function setFee(uint16 _feeBps, address _feeSink) external onlyOwner {
        require(_feeBps <= 1000, "fee>10%");
        feeBps = _feeBps; feeSink = _feeSink;
    }

    function _requireIdentity(address w) internal view {
        (uint256 id,,,) = identity.identities(w);
        if (id == 0) revert NotIdentified();
    }

    function post(uint128 budget, string calldata spec) external returns (uint256 id) {
        _requireIdentity(msg.sender);
        require(usdc.transferFrom(msg.sender, address(this), budget), "usdc xfer");
        id = nextJobId++;
        jobs[id] = Job({
            client: msg.sender, executor: address(0), budget: budget, paid: 0,
            postedAt: uint64(block.timestamp), acceptedAt: 0, completedAt: 0,
            status: Status.Open, resultHash: bytes32(0), spec: spec
        });
        emit JobPosted(id, msg.sender, budget, spec);
    }

    function accept(uint256 id) external {
        Job storage j = jobs[id];
        if (j.status != Status.Open) revert BadStatus();
        _requireIdentity(msg.sender);
        j.executor = msg.sender;
        j.acceptedAt = uint64(block.timestamp);
        j.status = Status.Accepted;
        emit JobAccepted(id, msg.sender);
    }

    function submit(uint256 id, bytes32 resultHash) external {
        Job storage j = jobs[id];
        if (j.status != Status.Accepted || msg.sender != j.executor) revert BadStatus();
        j.resultHash = resultHash;
        j.status = Status.Submitted;
        emit JobSubmitted(id, resultHash);
    }

    function complete(uint256 id) external {
        Job storage j = jobs[id];
        if (j.status != Status.Submitted) revert BadStatus();
        if (msg.sender != j.client) revert NotClient();
        uint256 fee = (uint256(j.budget) * feeBps) / 10_000;
        uint256 pay = uint256(j.budget) - fee;
        j.paid = uint128(pay);
        j.completedAt = uint64(block.timestamp);
        j.status = Status.Completed;
        if (fee > 0) require(usdc.transfer(feeSink, fee), "fee xfer");
        require(usdc.transfer(j.executor, pay), "pay xfer");
        emit JobCompleted(id, j.executor, pay, fee);
    }

    function cancel(uint256 id) external {
        Job storage j = jobs[id];
        if (j.status != Status.Open || msg.sender != j.client) revert BadStatus();
        j.status = Status.Cancelled;
        require(usdc.transfer(j.client, j.budget), "refund");
        emit JobCancelled(id);
    }
}
