// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/interfaces/IReputationRegistry.sol";

/**
 * @title ReputationRegistryTest
 * @dev Comprehensive test suite for the ReputationRegistry contract
 */
contract ReputationRegistryTest is Test {
    IdentityRegistry public identityRegistry;
    ReputationRegistry public reputationRegistry;
    
    // Test accounts
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    
    // Test domains
    string constant ALICE_DOMAIN = "alice.example.com";
    string constant BOB_DOMAIN = "bob.example.com";
    string constant CHARLIE_DOMAIN = "charlie.example.com";
    
    // Agent IDs
    uint256 public aliceId;
    uint256 public bobId;
    uint256 public charlieId;
    
    event AuthFeedback(
        uint256 indexed agentClientId,
        uint256 indexed agentServerId,
        bytes32 indexed feedbackAuthId
    );

    function setUp() public {
        // Deploy contracts
        identityRegistry = new IdentityRegistry();
        reputationRegistry = new ReputationRegistry(address(identityRegistry));
        
        // Fund test accounts
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);
        
        // Register test agents
        vm.prank(alice);
        aliceId = identityRegistry.newAgent(ALICE_DOMAIN, alice);
        
        vm.prank(bob);
        bobId = identityRegistry.newAgent(BOB_DOMAIN, bob);
        
        vm.prank(charlie);
        charlieId = identityRegistry.newAgent(CHARLIE_DOMAIN, charlie);
    }

    // ============ Feedback Authorization Tests ============

    function test_AcceptFeedback_Success() public {
        // Bob (server) authorizes Alice (client) to provide feedback
        vm.prank(bob);
        
        vm.expectEmit(true, true, false, false);
        emit AuthFeedback(aliceId, bobId, bytes32(0)); // bytes32(0) as placeholder since ID is generated
        
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Verify authorization exists
        (bool isAuthorized, bytes32 feedbackAuthId) = reputationRegistry.isFeedbackAuthorized(aliceId, bobId);
        assertTrue(isAuthorized);
        assertTrue(feedbackAuthId != bytes32(0));
    }

    function test_AcceptFeedback_MultipleClients() public {
        // Bob authorizes Alice
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Bob authorizes Charlie
        vm.prank(bob);
        reputationRegistry.acceptFeedback(charlieId, bobId);
        
        // Verify both authorizations
        (bool aliceAuthorized,) = reputationRegistry.isFeedbackAuthorized(aliceId, bobId);
        (bool charlieAuthorized,) = reputationRegistry.isFeedbackAuthorized(charlieId, bobId);
        
        assertTrue(aliceAuthorized);
        assertTrue(charlieAuthorized);
        
        // Verify different auth IDs
        bytes32 aliceAuthId = reputationRegistry.getFeedbackAuthId(aliceId, bobId);
        bytes32 charlieAuthId = reputationRegistry.getFeedbackAuthId(charlieId, bobId);
        assertTrue(aliceAuthId != charlieAuthId);
    }

    function test_AcceptFeedback_RevertClientAgentNotFound() public {
        vm.prank(bob);
        vm.expectRevert(IReputationRegistry.AgentNotFound.selector);
        reputationRegistry.acceptFeedback(999, bobId); // Non-existent client
    }

    function test_AcceptFeedback_RevertServerAgentNotFound() public {
        vm.prank(bob);
        vm.expectRevert(IReputationRegistry.AgentNotFound.selector);
        reputationRegistry.acceptFeedback(aliceId, 999); // Non-existent server
    }

    function test_AcceptFeedback_RevertUnauthorized() public {
        // Alice tries to authorize feedback for Bob's services (only Bob should be able to do this)
        vm.prank(alice);
        vm.expectRevert(IReputationRegistry.UnauthorizedFeedback.selector);
        reputationRegistry.acceptFeedback(aliceId, bobId);
    }

    function test_AcceptFeedback_RevertAlreadyAuthorized() public {
        // Bob authorizes Alice
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Try to authorize again
        vm.prank(bob);
        vm.expectRevert(IReputationRegistry.FeedbackAlreadyAuthorized.selector);
        reputationRegistry.acceptFeedback(aliceId, bobId);
    }

    function test_AcceptFeedback_RevertSelfFeedback() public {
        // SECURITY: Self-feedback should be prevented to maintain integrity
        vm.prank(alice);
        vm.expectRevert(IReputationRegistry.SelfFeedbackNotAllowed.selector);
        reputationRegistry.acceptFeedback(aliceId, aliceId);
    }

    // ============ Feedback Query Tests ============

    function test_IsFeedbackAuthorized_True() public {
        // Authorize feedback
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Check authorization
        (bool isAuthorized, bytes32 feedbackAuthId) = reputationRegistry.isFeedbackAuthorized(aliceId, bobId);
        assertTrue(isAuthorized);
        assertTrue(feedbackAuthId != bytes32(0));
    }

    function test_IsFeedbackAuthorized_False() public {
        // Check non-existent authorization
        (bool isAuthorized, bytes32 feedbackAuthId) = reputationRegistry.isFeedbackAuthorized(aliceId, bobId);
        assertFalse(isAuthorized);
        assertEq(feedbackAuthId, bytes32(0));
    }

    function test_GetFeedbackAuthId_Exists() public {
        // Authorize feedback
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Get auth ID
        bytes32 feedbackAuthId = reputationRegistry.getFeedbackAuthId(aliceId, bobId);
        assertTrue(feedbackAuthId != bytes32(0));
    }

    function test_GetFeedbackAuthId_NotExists() public {
        // Get auth ID for non-existent authorization
        bytes32 feedbackAuthId = reputationRegistry.getFeedbackAuthId(aliceId, bobId);
        assertEq(feedbackAuthId, bytes32(0));
    }

    // ============ Integration Tests ============

    function test_Integration_FullFeedbackFlow() public {
        // 1. Server agent (Bob) accepts a task and authorizes client (Alice) for feedback
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // 2. Verify authorization exists
        (bool isAuthorized, bytes32 feedbackAuthId) = reputationRegistry.isFeedbackAuthorized(aliceId, bobId);
        assertTrue(isAuthorized);
        assertTrue(feedbackAuthId != bytes32(0));
        
        // 3. Get the auth ID for off-chain feedback submission
        bytes32 retrievedAuthId = reputationRegistry.getFeedbackAuthId(aliceId, bobId);
        assertEq(retrievedAuthId, feedbackAuthId);
        
        // 4. Verify the auth ID can be used to identify the client-server pair
        // (In a real implementation, the client would submit feedback off-chain
        // using this feedbackAuthId, which gets referenced in their AgentCard's FeedbackDataURI)
    }

    function test_Integration_MultipleServersSameClient() public {
        // Alice works with multiple servers (Bob and Charlie)
        
        // Bob authorizes Alice for feedback
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Charlie authorizes Alice for feedback
        vm.prank(charlie);
        reputationRegistry.acceptFeedback(aliceId, charlieId);
        
        // Verify both authorizations exist with different auth IDs
        bytes32 bobAuthId = reputationRegistry.getFeedbackAuthId(aliceId, bobId);
        bytes32 charlieAuthId = reputationRegistry.getFeedbackAuthId(aliceId, charlieId);
        
        assertTrue(bobAuthId != bytes32(0));
        assertTrue(charlieAuthId != bytes32(0));
        assertTrue(bobAuthId != charlieAuthId);
    }

    function test_Integration_AgentUpdatesAddress() public {
        // Bob authorizes Alice for feedback
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Bob updates his address in the identity registry
        address newBobAddress = makeAddr("newBob");
        vm.prank(bob);
        identityRegistry.updateAgent(bobId, "", newBobAddress);
        
        // The feedback authorization should still exist (it's based on agent IDs, not addresses)
        (bool isAuthorized,) = reputationRegistry.isFeedbackAuthorized(aliceId, bobId);
        assertTrue(isAuthorized);
        
        // But new authorizations should require the new address
        vm.prank(bob); // Old address
        vm.expectRevert(IReputationRegistry.UnauthorizedFeedback.selector);
        reputationRegistry.acceptFeedback(charlieId, bobId);
        
        vm.prank(newBobAddress); // New address
        reputationRegistry.acceptFeedback(charlieId, bobId); // Should succeed
    }

    // ============ Edge Cases ============

    function test_EdgeCase_ZeroAgentIds() public {
        vm.prank(bob);
        vm.expectRevert(IReputationRegistry.AgentNotFound.selector);
        reputationRegistry.acceptFeedback(0, bobId);
        
        vm.prank(bob);
        vm.expectRevert(IReputationRegistry.AgentNotFound.selector);
        reputationRegistry.acceptFeedback(aliceId, 0);
    }

    function test_EdgeCase_AuthIdUniqueness() public {
        // Authorize same client-server pair multiple times (should fail after first)
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        bytes32 firstAuthId = reputationRegistry.getFeedbackAuthId(aliceId, bobId);
        
        vm.prank(bob);
        vm.expectRevert(IReputationRegistry.FeedbackAlreadyAuthorized.selector);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Auth ID should remain the same
        bytes32 secondAuthId = reputationRegistry.getFeedbackAuthId(aliceId, bobId);
        assertEq(firstAuthId, secondAuthId);
    }

    // ============ Gas Optimization Tests ============

    function test_Gas_AcceptFeedback() public {
        vm.prank(bob);
        uint256 gasStart = gasleft();
        reputationRegistry.acceptFeedback(aliceId, bobId);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for acceptFeedback:", gasUsed);
        // Should be less than 95k gas
        assertLt(gasUsed, 95_000);
    }

    function test_Gas_IsFeedbackAuthorized() public {
        // Setup authorization
        vm.prank(bob);
        reputationRegistry.acceptFeedback(aliceId, bobId);
        
        // Test gas usage
        uint256 gasStart = gasleft();
        reputationRegistry.isFeedbackAuthorized(aliceId, bobId);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for isFeedbackAuthorized:", gasUsed);
        // Should be less than 10k gas (view function)
        assertLt(gasUsed, 10_000);
    }
}