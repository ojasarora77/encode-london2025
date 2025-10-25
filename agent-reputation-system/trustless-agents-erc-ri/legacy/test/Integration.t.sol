// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/ValidationRegistry.sol";

/**
 * @title IntegrationTest
 * @dev Integration tests for the complete ERC-XXXX Trustless Agents ecosystem
 * @notice Tests all three registries working together in realistic scenarios
 */
contract IntegrationTest is Test {
    IdentityRegistry public identityRegistry;
    ReputationRegistry public reputationRegistry;
    ValidationRegistry public validationRegistry;
    
    // Test accounts representing different agent roles
    address public alice = makeAddr("alice");     // Server agent (provides services)
    address public bob = makeAddr("bob");         // Client agent (consumes services)
    address public charlie = makeAddr("charlie"); // Validator agent (validates work)
    address public david = makeAddr("david");     // Another server agent
    
    // Test domains
    string constant ALICE_DOMAIN = "alice-server.example.com";
    string constant BOB_DOMAIN = "bob-client.example.com";
    string constant CHARLIE_DOMAIN = "charlie-validator.example.com";
    string constant DAVID_DOMAIN = "david-server.example.com";
    
    // Agent IDs
    uint256 public aliceId;
    uint256 public bobId;
    uint256 public charlieId;
    uint256 public davidId;
    
    // Test data
    bytes32 public taskDataHash = keccak256("completed-task-evidence");

    function setUp() public {
        // Deploy all contracts
        identityRegistry = new IdentityRegistry();
        reputationRegistry = new ReputationRegistry(address(identityRegistry));
        validationRegistry = new ValidationRegistry(address(identityRegistry));
        
        // Fund all test accounts
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);
        vm.deal(david, 1 ether);
        
        // Register all agents
        vm.prank(alice);
        aliceId = identityRegistry.newAgent(ALICE_DOMAIN, alice);
        
        vm.prank(bob);
        bobId = identityRegistry.newAgent(BOB_DOMAIN, bob);
        
        vm.prank(charlie);
        charlieId = identityRegistry.newAgent(CHARLIE_DOMAIN, charlie);
        
        vm.prank(david);
        davidId = identityRegistry.newAgent(DAVID_DOMAIN, david);
    }

    // ============ Complete Task Lifecycle ============

    function test_CompleteTaskLifecycle() public {
        console.log("=== Testing Complete Task Lifecycle ===");
        
        // Step 1: Server agent (Alice) accepts a task and authorizes client (Bob) for feedback
        console.log("Step 1: Alice authorizes Bob for feedback");
        vm.prank(alice);
        reputationRegistry.acceptFeedback(bobId, aliceId);
        
        // Verify feedback authorization
        (bool isAuthorized, bytes32 feedbackAuthId) = reputationRegistry.isFeedbackAuthorized(bobId, aliceId);
        assertTrue(isAuthorized);
        assertTrue(feedbackAuthId != bytes32(0));
        console.log("Feedback authorized with ID:", vm.toString(feedbackAuthId));
        
        // Step 2: Alice completes the task and requests validation from Charlie
        console.log("Step 2: Alice requests validation from Charlie");
        validationRegistry.validationRequest(charlieId, aliceId, taskDataHash);
        
        // Verify validation request exists
        (bool exists, bool pending) = validationRegistry.isValidationPending(taskDataHash);
        assertTrue(exists);
        assertTrue(pending);
        console.log("Validation request created and pending");
        
        // Step 3: Charlie validates Alice's work
        console.log("Step 3: Charlie validates Alice's work with score 85");
        vm.prank(charlie);
        validationRegistry.validationResponse(taskDataHash, 85);
        
        // Verify validation response
        (bool hasResponse, uint8 score) = validationRegistry.getValidationResponse(taskDataHash);
        assertTrue(hasResponse);
        assertEq(score, 85);
        console.log("Validation completed with score:", score);
        
        // Step 4: Verify the complete state
        console.log("Step 4: Verifying final state");
        
        // Feedback authorization should still exist
        (isAuthorized,) = reputationRegistry.isFeedbackAuthorized(bobId, aliceId);
        assertTrue(isAuthorized);
        
        // Validation should be completed (not pending)
        (exists, pending) = validationRegistry.isValidationPending(taskDataHash);
        assertTrue(exists);
        assertFalse(pending);
        
        console.log("Task lifecycle completed successfully!");
    }

    // ============ Multi-Agent Collaboration ============

    function test_MultiAgentCollaboration() public {
        console.log("=== Testing Multi-Agent Collaboration ===");
        
        // Scenario: Bob works with both Alice and David, Charlie validates all work
        
        // Task 1: Bob <-> Alice
        bytes32 task1Hash = keccak256("task-1-evidence");
        
        vm.prank(alice);
        reputationRegistry.acceptFeedback(bobId, aliceId);
        
        validationRegistry.validationRequest(charlieId, aliceId, task1Hash);
        
        vm.prank(charlie);
        validationRegistry.validationResponse(task1Hash, 90);
        
        // Task 2: Bob <-> David
        bytes32 task2Hash = keccak256("task-2-evidence");
        
        vm.prank(david);
        reputationRegistry.acceptFeedback(bobId, davidId);
        
        validationRegistry.validationRequest(charlieId, davidId, task2Hash);
        
        vm.prank(charlie);
        validationRegistry.validationResponse(task2Hash, 78);
        
        // Verify both tasks are properly recorded
        (bool authorized1,) = reputationRegistry.isFeedbackAuthorized(bobId, aliceId);
        (bool authorized2,) = reputationRegistry.isFeedbackAuthorized(bobId, davidId);
        assertTrue(authorized1);
        assertTrue(authorized2);
        
        (bool hasResponse1, uint8 score1) = validationRegistry.getValidationResponse(task1Hash);
        (bool hasResponse2, uint8 score2) = validationRegistry.getValidationResponse(task2Hash);
        assertTrue(hasResponse1);
        assertTrue(hasResponse2);
        assertEq(score1, 90);
        assertEq(score2, 78);
        
        console.log("Multi-agent collaboration completed successfully!");
        console.log("Alice's task score:", score1);
        console.log("David's task score:", score2);
    }

    // ============ Agent Identity Evolution ============

    function test_AgentIdentityEvolution() public {
        console.log("=== Testing Agent Identity Evolution ===");
        
        // Setup initial state
        vm.prank(alice);
        reputationRegistry.acceptFeedback(bobId, aliceId);
        
        validationRegistry.validationRequest(charlieId, aliceId, taskDataHash);
        
        // Alice updates her domain
        string memory newAliceDomain = "alice-premium.example.com";
        vm.prank(alice);
        identityRegistry.updateAgent(aliceId, newAliceDomain, address(0));
        
        // Verify domain update doesn't affect existing authorizations/validations
        (bool isAuthorized,) = reputationRegistry.isFeedbackAuthorized(bobId, aliceId);
        assertTrue(isAuthorized);
        
        (bool exists, bool pending) = validationRegistry.isValidationPending(taskDataHash);
        assertTrue(exists);
        assertTrue(pending);
        
        // Alice updates her address
        address newAliceAddress = makeAddr("newAlice");
        vm.prank(alice);
        identityRegistry.updateAgent(aliceId, "", newAliceAddress);
        
        // Charlie can still validate (the validation request is still valid)
        vm.prank(charlie);
        validationRegistry.validationResponse(taskDataHash, 85);
        
        // Verify the validation went through
        (bool hasResponse, uint8 score) = validationRegistry.getValidationResponse(taskDataHash);
        assertTrue(hasResponse);
        assertEq(score, 85);
        
        // Verify updated identity
        IIdentityRegistry.AgentInfo memory aliceInfo = identityRegistry.getAgent(aliceId);
        assertEq(aliceInfo.agentDomain, newAliceDomain);
        assertEq(aliceInfo.agentAddress, newAliceAddress);
        
        console.log("Agent identity evolution completed successfully!");
    }

    // ============ Validation Expiration and Cleanup ============

    function test_ValidationExpirationFlow() public {
        console.log("=== Testing Validation Expiration Flow ===");
        
        // Create validation request
        validationRegistry.validationRequest(charlieId, aliceId, taskDataHash);
        
        // Verify it's pending
        (bool exists, bool pending) = validationRegistry.isValidationPending(taskDataHash);
        assertTrue(exists);
        assertTrue(pending);
        
        // Fast forward past expiration
        uint256 expirationSlots = validationRegistry.getExpirationSlots();
        vm.warp(block.timestamp + expirationSlots + 1);
        
        // Verify it's no longer pending
        (exists, pending) = validationRegistry.isValidationPending(taskDataHash);
        assertTrue(exists);
        assertFalse(pending); // Not pending because expired
        
        // Attempt to respond to expired request should fail
        vm.prank(charlie);
        vm.expectRevert();
        validationRegistry.validationResponse(taskDataHash, 85);
        
        // But can create a new request with same data hash (different validator)
        validationRegistry.validationRequest(bobId, aliceId, taskDataHash);
        
        // New request should be pending
        (exists, pending) = validationRegistry.isValidationPending(taskDataHash);
        assertTrue(exists);
        assertTrue(pending);
        
        console.log("Validation expiration flow completed successfully!");
    }

    // ============ Cross-Registry Data Consistency ============

    function test_CrossRegistryConsistency() public {
        console.log("=== Testing Cross-Registry Data Consistency ===");
        
        // Get initial agent count
        uint256 initialCount = identityRegistry.getAgentCount();
        assertEq(initialCount, 4); // Alice, Bob, Charlie, David
        
        // Create relationships across all registries
        vm.prank(alice);
        reputationRegistry.acceptFeedback(bobId, aliceId);
        
        vm.prank(david);
        reputationRegistry.acceptFeedback(bobId, davidId);
        
        bytes32 task1 = keccak256("task-1");
        bytes32 task2 = keccak256("task-2");
        
        validationRegistry.validationRequest(charlieId, aliceId, task1);
        validationRegistry.validationRequest(charlieId, davidId, task2);
        
        // Verify all relationships exist
        (bool auth1,) = reputationRegistry.isFeedbackAuthorized(bobId, aliceId);
        (bool auth2,) = reputationRegistry.isFeedbackAuthorized(bobId, davidId);
        assertTrue(auth1);
        assertTrue(auth2);
        
        (bool pending1,) = validationRegistry.isValidationPending(task1);
        (bool pending2,) = validationRegistry.isValidationPending(task2);
        assertTrue(pending1);
        assertTrue(pending2);
        
        // Register a new agent and verify count updates
        address eve = makeAddr("eve");
        vm.deal(eve, 1 ether);
        vm.prank(eve);
        uint256 eveId = identityRegistry.newAgent("eve.example.com", eve);
        
        assertEq(identityRegistry.getAgentCount(), 5);
        assertTrue(identityRegistry.agentExists(eveId));
        
        // New agent can immediately participate in other registries
        vm.prank(alice);
        reputationRegistry.acceptFeedback(eveId, aliceId);
        
        bytes32 eveTask = keccak256("eve-task");
        validationRegistry.validationRequest(eveId, aliceId, eveTask);
        
        (bool eveAuth,) = reputationRegistry.isFeedbackAuthorized(eveId, aliceId);
        (bool evePending,) = validationRegistry.isValidationPending(eveTask);
        assertTrue(eveAuth);
        assertTrue(evePending);
        
        console.log("Cross-registry consistency verified!");
    }

    // ============ Error Handling and Edge Cases ============

    function test_ErrorHandlingAcrossRegistries() public {
        console.log("=== Testing Error Handling Across Registries ===");
        
        // Try to use non-existent agents
        vm.expectRevert();
        reputationRegistry.acceptFeedback(999, aliceId); // Non-existent client
        
        vm.expectRevert();
        validationRegistry.validationRequest(999, aliceId, taskDataHash); // Non-existent validator
        
        // Create valid feedback authorization
        vm.prank(alice);
        reputationRegistry.acceptFeedback(bobId, aliceId);
        
        // Try to authorize again (should fail)
        vm.prank(alice);
        vm.expectRevert();
        reputationRegistry.acceptFeedback(bobId, aliceId);
        
        // Create valid validation request
        validationRegistry.validationRequest(charlieId, aliceId, taskDataHash);
        
        // Try to respond with invalid score
        vm.prank(charlie);
        vm.expectRevert();
        validationRegistry.validationResponse(taskDataHash, 101); // > 100
        
        // Respond with valid score
        vm.prank(charlie);
        validationRegistry.validationResponse(taskDataHash, 85);
        
        // Try to respond again (should fail)
        vm.prank(charlie);
        vm.expectRevert();
        validationRegistry.validationResponse(taskDataHash, 90);
        
        console.log("Error handling verified across all registries!");
    }

    // ============ Gas Optimization Integration ============

    function test_GasOptimizationIntegration() public {
        console.log("=== Testing Gas Optimization Integration ===");
        
        // Measure gas for complete workflow
        uint256 gasStart = gasleft();
        
        // 1. Register new agent
        address newAgent = makeAddr("newAgent");
        vm.deal(newAgent, 1 ether);
        vm.prank(newAgent);
        uint256 newAgentId = identityRegistry.newAgent("new.example.com", newAgent);
        
        // 2. Authorize feedback
        vm.prank(alice);
        reputationRegistry.acceptFeedback(newAgentId, aliceId);
        
        // 3. Request validation
        bytes32 newTaskHash = keccak256("new-task");
        validationRegistry.validationRequest(charlieId, aliceId, newTaskHash);
        
        // 4. Respond to validation
        vm.prank(charlie);
        validationRegistry.validationResponse(newTaskHash, 88);
        
        uint256 totalGasUsed = gasStart - gasleft();
        console.log("Total gas used for complete workflow:", totalGasUsed);
        
        // Should be reasonable for a complete agent onboarding and task completion
        assertLt(totalGasUsed, 510_000); // Less than 0.51M gas
        
        console.log("Gas optimization integration verified!");
    }

    // ============ Real-World Scenario Simulation ============

    function test_RealWorldScenario() public {
        console.log("=== Simulating Real-World Agent Marketplace ===");
        
        // Scenario: Bob needs a service, Alice provides it, Charlie validates it
        
        console.log("1. Bob discovers Alice through IdentityRegistry");
        IIdentityRegistry.AgentInfo memory aliceInfo = identityRegistry.resolveByDomain(ALICE_DOMAIN);
        assertEq(aliceInfo.agentId, aliceId);
        assertEq(aliceInfo.agentAddress, alice);
        
        console.log("2. Alice accepts Bob's task and authorizes feedback");
        vm.prank(alice);
        reputationRegistry.acceptFeedback(bobId, aliceId);
        
        console.log("3. Task is completed, Alice requests validation");
        bytes32 serviceCompletionHash = keccak256(abi.encodePacked("service-completion-", block.timestamp));
        validationRegistry.validationRequest(charlieId, aliceId, serviceCompletionHash);
        
        console.log("4. Charlie validates the work");
        vm.prank(charlie);
        validationRegistry.validationResponse(serviceCompletionHash, 92);
        
        console.log("5. Verifying complete audit trail");
        
        // Feedback authorization exists
        (bool feedbackAuth, bytes32 feedbackId) = reputationRegistry.isFeedbackAuthorized(bobId, aliceId);
        assertTrue(feedbackAuth);
        console.log("Feedback authorization ID:", vm.toString(feedbackId));
        
        // Validation completed with high score
        (bool validationComplete, uint8 validationScore) = validationRegistry.getValidationResponse(serviceCompletionHash);
        assertTrue(validationComplete);
        assertEq(validationScore, 92);
        console.log("Validation score:", validationScore);
        
        // All agents remain registered and discoverable
        assertTrue(identityRegistry.agentExists(aliceId));
        assertTrue(identityRegistry.agentExists(bobId));
        assertTrue(identityRegistry.agentExists(charlieId));
        
        console.log("Real-world scenario completed successfully!");
        console.log("Service provider (Alice):", alice);
        console.log("Service consumer (Bob):", bob);
        console.log("Validator (Charlie):", charlie);
        console.log("Final validation score:", validationScore, "/100");
    }
}