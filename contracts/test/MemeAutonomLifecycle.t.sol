// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgenticWallet, AgenticWalletFactory} from "../src/AgenticWalletFactory.sol";
import {ERC8004Identity} from "../src/ERC8004Identity.sol";
import {ERC8004Reputation} from "../src/ERC8004Reputation.sol";
import {ERC8004Validation} from "../src/ERC8004Validation.sol";
import {JobRegistry} from "../src/JobRegistry.sol";
import {SkillRegistry} from "../src/SkillRegistry.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes memory revertData) external;
    function prank(address caller) external;
}

contract TestLite {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    error AssertionFailed(string message);

    function assertTrue(bool value) internal pure {
        if (!value) revert AssertionFailed("expected true");
    }

    function assertEq(address actual, address expected) internal pure {
        if (actual != expected) revert AssertionFailed("address mismatch");
    }

    function assertEq(uint256 actual, uint256 expected) internal pure {
        if (actual != expected) revert AssertionFailed("uint mismatch");
    }

    function assertEq(int256 actual, int256 expected) internal pure {
        if (actual != expected) revert AssertionFailed("int mismatch");
    }

    function assertEq(bytes32 actual, bytes32 expected) internal pure {
        if (actual != expected) revert AssertionFailed("bytes32 mismatch");
    }

    function assertEq(string memory actual, string memory expected) internal pure {
        if (keccak256(bytes(actual)) != keccak256(bytes(expected))) revert AssertionFailed("string mismatch");
    }
}

contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        allowance[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "zero to");
        uint256 balance = balanceOf[from];
        require(balance >= amount, "balance");
        balanceOf[from] = balance - amount;
        balanceOf[to] += amount;
    }
}

contract MemeAutonomLifecycleTest is TestLite {
    ERC8004Identity internal identity;
    ERC8004Reputation internal reputation;
    ERC8004Validation internal validation;
    SkillRegistry internal skillRegistry;
    AgenticWalletFactory internal factory;
    MockUSDC internal usdc;
    JobRegistry internal jobs;

    address internal signer = address(0xBEEF);
    address internal newSigner = address(0xC0DE);
    address internal client = address(0xA11CE);
    address internal executor = address(0xB0B);
    address internal validator = address(0xD00D);
    address internal feeSink = address(0xFEE);
    address internal recovery = address(0xCAFE);

    function setUp() public {
        identity = new ERC8004Identity();
        factory = new AgenticWalletFactory(address(identity));
        identity.setRegistrar(address(factory), true);

        reputation = new ERC8004Reputation(address(identity));
        validation = new ERC8004Validation(address(identity));
        skillRegistry = new SkillRegistry();
        usdc = new MockUSDC();
        jobs = new JobRegistry(address(usdc), address(identity), feeSink, 250);

        reputation.setReporter(address(skillRegistry), true);
        reputation.setReporter(address(jobs), true);
        skillRegistry.setReputationRegistry(address(reputation));
        jobs.setReputationRegistry(address(reputation));
    }

    function testFactoryRegistersIdentityAndSyncsController() public {
        AgenticWallet wallet = _deployWallet(address(this), signer, 11, "ipfs://agent.json");

        (uint256 id, string memory uri,,) = identity.identities(address(wallet));
        assertEq(id, 1);
        assertEq(uri, "ipfs://agent.json");
        assertEq(identity.ownerOf(id), address(wallet));
        assertEq(identity.controllerOf(address(wallet)), signer);
        assertEq(wallet.owner(), address(this));
        assertEq(wallet.signer(), signer);
        assertEq(address(wallet.identity()), address(identity));

        wallet.rotateSigner(newSigner);
        assertEq(wallet.signer(), newSigner);
        assertEq(identity.controllerOf(address(wallet)), newSigner);

        vm.expectRevert(AgenticWallet.NotSigner.selector);
        vm.prank(address(0xDAD));
        wallet.executeSkill(keccak256(bytes("agent")), address(skillRegistry), 0, "");

        vm.expectRevert(AgenticWallet.PolicyDisabled.selector);
        wallet.executeSkill(bytes32(0), address(skillRegistry), 0, "");
    }

    function testSkillPublishInstallFireAndReputation() public {
        AgenticWallet wallet = _deployWallet(address(this), signer, 12, "ipfs://skill-agent.json");
        bytes32 skillId = skillRegistry.publish("TrendScout", "ipfs://skill.json");

        wallet.setTargetAllowed(address(skillRegistry), true);
        wallet.setSelectorAllowed(address(skillRegistry), SkillRegistry.install.selector, true);
        wallet.setSelectorAllowed(address(skillRegistry), SkillRegistry.fire.selector, true);
        wallet.setSelectorAllowed(address(skillRegistry), SkillRegistry.setStatus.selector, true);
        wallet.setSkillLimits(skillId, 0, 0, true);

        wallet.executeSkill(skillId, address(skillRegistry), 0, abi.encodeWithSelector(SkillRegistry.install.selector, skillId));
        assertTrue(skillRegistry.installed(skillId, address(wallet)));
        assertEq(uint256(skillRegistry.statusOf(skillId, address(wallet))), 1);

        bytes32 actionHash = keccak256(bytes("rebalance-1"));
        vm.prank(signer);
        wallet.executeSkill(skillId, address(skillRegistry), 0, abi.encodeWithSelector(SkillRegistry.fire.selector, skillId, actionHash));

        (,,,, uint128 installs, uint128 fires) = skillRegistry.skills(skillId);
        assertEq(uint256(installs), 1);
        assertEq(uint256(fires), 1);
        assertEq(reputation.scoreOf(address(wallet)), 1);
        assertEq(reputation.recordCount(address(wallet)), 1);

        wallet.executeSkill(skillId, address(skillRegistry), 0, abi.encodeWithSelector(SkillRegistry.setStatus.selector, skillId, 0));
        vm.expectRevert(bytes("exec failed"));
        vm.prank(signer);
        wallet.executeSkill(skillId, address(skillRegistry), 0, abi.encodeWithSelector(SkillRegistry.fire.selector, skillId, actionHash));
    }

    function testJobPostAcceptSubmitCompleteAndCancel() public {
        uint128 budget = 1_000_000_000;
        uint256 fee = 25_000_000;
        uint256 pay = 975_000_000;

        _registerIdentity(client, "ipfs://client.json");
        _registerIdentity(executor, "ipfs://executor.json");

        usdc.mint(client, budget);
        vm.prank(client);
        usdc.approve(address(jobs), budget);

        vm.prank(client);
        uint256 jobId = jobs.post(budget, "ipfs://job.json");

        vm.prank(executor);
        jobs.accept(jobId);

        bytes32 resultHash = keccak256(bytes("job-result"));
        vm.prank(executor);
        jobs.submit(jobId, resultHash);

        vm.prank(client);
        jobs.complete(jobId);

        (
            address actualClient,
            address actualExecutor,
            uint128 actualBudget,
            uint128 paid,
            ,
            ,
            ,
            JobRegistry.Status status,
            bytes32 storedResult,
            string memory spec
        ) = jobs.jobs(jobId);
        assertEq(actualClient, client);
        assertEq(actualExecutor, executor);
        assertEq(uint256(actualBudget), budget);
        assertEq(uint256(paid), pay);
        assertEq(uint256(status), uint256(JobRegistry.Status.Completed));
        assertEq(storedResult, resultHash);
        assertEq(spec, "ipfs://job.json");
        assertEq(usdc.balanceOf(executor), pay);
        assertEq(usdc.balanceOf(feeSink), fee);
        assertEq(reputation.scoreOf(executor), 10);
        assertEq(reputation.recordCount(executor), 1);

        usdc.mint(client, budget);
        vm.prank(client);
        usdc.approve(address(jobs), budget);
        uint256 clientBalanceBeforeCancel = usdc.balanceOf(client);

        vm.prank(client);
        uint256 cancelId = jobs.post(budget, "ipfs://cancel.json");
        assertEq(usdc.balanceOf(client), clientBalanceBeforeCancel - budget);

        vm.prank(client);
        jobs.cancel(cancelId);
        assertEq(usdc.balanceOf(client), clientBalanceBeforeCancel);

        (,,,,,,, JobRegistry.Status cancelStatus,, string memory cancelSpec) = jobs.jobs(cancelId);
        assertEq(uint256(cancelStatus), uint256(JobRegistry.Status.Cancelled));
        assertEq(cancelSpec, "ipfs://cancel.json");

        usdc.mint(client, budget);
        vm.prank(client);
        usdc.approve(address(jobs), budget);
        uint256 clientBalanceBeforeAcceptedCancel = usdc.balanceOf(client);

        vm.prank(client);
        uint256 acceptedCancelId = jobs.post(budget, "ipfs://accepted-cancel.json");

        vm.prank(executor);
        jobs.accept(acceptedCancelId);

        vm.prank(executor);
        jobs.cancel(acceptedCancelId);
        assertEq(usdc.balanceOf(client), clientBalanceBeforeAcceptedCancel);

        (,,,,,,, JobRegistry.Status acceptedCancelStatus,,) = jobs.jobs(acceptedCancelId);
        assertEq(uint256(acceptedCancelStatus), uint256(JobRegistry.Status.Cancelled));
    }

    function testValidationRequestAndResponseLifecycle() public {
        AgenticWallet wallet = _deployWallet(address(this), signer, 13, "ipfs://validation-agent.json");
        (uint256 agentId,,,) = identity.identities(address(wallet));
        bytes32 requestHash = keccak256(bytes("risk-check"));
        bytes32 responseHash = keccak256(bytes("risk-ok"));

        vm.prank(signer);
        validation.validationRequest(validator, agentId, "ipfs://request.json", requestHash);

        vm.expectRevert(ERC8004Validation.NotValidator.selector);
        vm.prank(executor);
        validation.validationResponse(requestHash, 90, "ipfs://response.json", responseHash, "spoof");

        vm.prank(validator);
        validation.validationResponse(requestHash, 90, "ipfs://response.json", responseHash, "pass");

        (
            address actualValidator,
            uint256 actualAgentId,
            uint8 response,
            bytes32 storedResponseHash,
            string memory tag,
            uint256 lastUpdate
        ) = validation.getValidationStatus(requestHash);
        assertEq(actualValidator, validator);
        assertEq(actualAgentId, agentId);
        assertEq(uint256(response), 90);
        assertEq(storedResponseHash, responseHash);
        assertEq(tag, "pass");
        assertTrue(lastUpdate > 0);

        bytes32[] memory agentRequests = validation.getAgentValidations(agentId);
        bytes32[] memory validatorRequests = validation.getValidatorRequests(validator);
        assertEq(agentRequests.length, 1);
        assertEq(validatorRequests.length, 1);
        assertEq(agentRequests[0], requestHash);
        assertEq(validatorRequests[0], requestHash);
    }

    function testWalletPolicySpendPauseAndRecovery() public {
        AgenticWallet wallet = _deployWallet(address(this), signer, 14, "ipfs://policy-agent.json");
        bytes32 skillId = keccak256(bytes("usdc-transfer-skill"));
        bytes memory transfer100 = abi.encodeWithSelector(MockUSDC.transfer.selector, recovery, 100);

        usdc.mint(address(wallet), 500);
        wallet.setSkillLimits(skillId, 100, 150, true);

        vm.expectRevert(AgenticWallet.TargetNotAllowed.selector);
        wallet.executeSkill(skillId, address(usdc), 0, transfer100);

        wallet.setTargetAllowed(address(usdc), true);
        vm.expectRevert(AgenticWallet.SelectorNotAllowed.selector);
        wallet.executeSkill(skillId, address(usdc), 0, transfer100);

        wallet.setSelectorAllowed(address(usdc), MockUSDC.transfer.selector, true);
        vm.prank(signer);
        wallet.executeSkill(skillId, address(usdc), 0, transfer100);
        assertEq(usdc.balanceOf(recovery), 100);
        assertEq(wallet.spentToday(skillId), 100);

        vm.expectRevert(AgenticWallet.CallValueTooHigh.selector);
        vm.prank(signer);
        wallet.executeSkill(skillId, address(usdc), 0, abi.encodeWithSelector(MockUSDC.transfer.selector, recovery, 101));

        vm.expectRevert(AgenticWallet.DailyLimitExceeded.selector);
        vm.prank(signer);
        wallet.executeSkill(skillId, address(usdc), 0, abi.encodeWithSelector(MockUSDC.transfer.selector, recovery, 51));

        wallet.pause();
        vm.expectRevert(AgenticWallet.PausedWallet.selector);
        vm.prank(signer);
        wallet.executeSkill(skillId, address(usdc), 0, transfer100);

        vm.deal(recovery, 0);
        vm.deal(address(wallet), 1 ether);
        wallet.withdrawETH(payable(recovery), 0.4 ether);
        assertEq(recovery.balance, 0.4 ether);

        wallet.withdrawToken(address(usdc), recovery, 50);
        assertEq(usdc.balanceOf(recovery), 150);

        wallet.unpause();
        vm.prank(signer);
        wallet.executeSkill(skillId, address(usdc), 0, abi.encodeWithSelector(MockUSDC.transfer.selector, recovery, 50));
        assertEq(usdc.balanceOf(recovery), 200);
        assertEq(wallet.spentToday(skillId), 150);
    }

    function _deployWallet(
        address walletOwner,
        address walletSigner,
        uint256 salt,
        string memory uri
    ) internal returns (AgenticWallet wallet) {
        address predicted = factory.predict(walletOwner, walletSigner, salt);
        address deployed = factory.deploy(walletOwner, walletSigner, salt, uri);
        assertEq(deployed, predicted);
        wallet = AgenticWallet(payable(deployed));
    }

    function _registerIdentity(address wallet, string memory uri) internal {
        vm.prank(wallet);
        identity.register(uri);
    }
}
