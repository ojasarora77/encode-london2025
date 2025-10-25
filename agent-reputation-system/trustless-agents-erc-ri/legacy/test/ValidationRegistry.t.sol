// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "../src/IdentityRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/interfaces/IValidationRegistry.sol";

/**
 * @title ValidationRegistryTest
 * @dev Comprehensive test suite for the ValidationRegistry contract
 */
contract ValidationRegistryTest is Test {
    IdentityRegistry public identityRegistry;
    ValidationRegistry public validationRegistry;
    
    // Test accounts
    address public alice = makeAddr("alice"); // Server agent
    address public bob = makeAddr("bob");     // Validator agent
    address public charlie = makeAddr("charlie"); // Another agent
    
    // Test domains
    string constant ALICE_DOMAIN = "alice.example.com";
    string constant BOB_DOMAIN = "bob.example.com";
    string constant CHARLIE_DOMAIN = "charlie.example.com";
    
    // Agent IDs
    uint256 public aliceId;   // Server agent
    uint256 public bobId;     // Validator agent
    uint256 public charlieId; // Another agent
    
    // Test data hashes
    bytes32 public testDataHash1 = keccak256("test-data-1");
    bytes32 public testDataHash2 = keccak256("test-data-2");
    
    event ValidationRequestEvent(
        uint256 indexed agentValidatorId,
        uint256 indexed agentServerId,
        bytes32 indexed dataHash
    );
    
    event ValidationResponseEvent(
        uint256 indexed agentValidatorId,
        uint256 indexed agentServerId,
        bytes32 indexed dataHash,
        uint8 response
    );

    function setUp() public {
        // Deploy contracts
        identityRegistry = new IdentityRegistry();
        validationRegistry = new ValidationRegistry(address(identityRegistry));
        
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

    // ============ Validation Request Tests ============

    function test_ValidationRequest_Success() public {
        vm.expectEmit(true, true, true, false);
        emit ValidationRequestEvent(bobId, aliceId, testDataHash1);
        
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Verify request exists
        IValidationRegistry.Request memory request = validationRegistry.getValidationRequest(testDataHash1);
        assertEq(request.agentValidatorId, bobId);
        assertEq(request.agentServerId, aliceId);
        assertEq(request.dataHash, testDataHash1);
        assertEq(request.timestamp, block.timestamp);
        assertFalse(request.responded);
    }

    function test_ValidationRequest_MultipleRequests() public {
        // First request
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Second request with different data hash
        validationRegistry.validationRequest(bobId, aliceId, testDataHash2);
        
        // Verify both exist
        IValidationRegistry.Request memory request1 = validationRegistry.getValidationRequest(testDataHash1);
        IValidationRegistry.Request memory request2 = validationRegistry.getValidationRequest(testDataHash2);
        
        assertEq(request1.dataHash, testDataHash1);
        assertEq(request2.dataHash, testDataHash2);
    }

    function test_ValidationRequest_DuplicateDataHash() public {
        // First request
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // SECURITY: Second request with same data hash should NOT emit event (prevents griefing)
        // This is a security improvement to prevent event spam attacks
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Should still have only one request
        IValidationRegistry.Request memory request = validationRegistry.getValidationRequest(testDataHash1);
        assertEq(request.dataHash, testDataHash1);
        assertEq(request.agentValidatorId, bobId);
        assertEq(request.agentServerId, aliceId);
    }

    function test_ValidationRequest_RevertInvalidDataHash() public {
        vm.expectRevert(IValidationRegistry.InvalidDataHash.selector);
        validationRegistry.validationRequest(bobId, aliceId, bytes32(0));
    }

    function test_ValidationRequest_RevertValidatorNotFound() public {
        vm.expectRevert(IValidationRegistry.AgentNotFound.selector);
        validationRegistry.validationRequest(999, aliceId, testDataHash1); // Non-existent validator
    }

    function test_ValidationRequest_RevertServerNotFound() public {
        vm.expectRevert(IValidationRegistry.AgentNotFound.selector);
        validationRegistry.validationRequest(bobId, 999, testDataHash1); // Non-existent server
    }

    // ============ Validation Response Tests ============

    function test_ValidationResponse_Success() public {
        // Create request first
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Submit response
        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit ValidationResponseEvent(bobId, aliceId, testDataHash1, 85);
        
        validationRegistry.validationResponse(testDataHash1, 85);
        
        // Verify response
        (bool hasResponse, uint8 response) = validationRegistry.getValidationResponse(testDataHash1);
        assertTrue(hasResponse);
        assertEq(response, 85);
        
        // Verify request is marked as responded
        IValidationRegistry.Request memory request = validationRegistry.getValidationRequest(testDataHash1);
        assertTrue(request.responded);
    }

    function test_ValidationResponse_BoundaryValues() public {
        // Test minimum value (0)
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        vm.prank(bob);
        validationRegistry.validationResponse(testDataHash1, 0);
        
        (bool hasResponse, uint8 response) = validationRegistry.getValidationResponse(testDataHash1);
        assertTrue(hasResponse);
        assertEq(response, 0);
        
        // Test maximum value (100)
        validationRegistry.validationRequest(bobId, aliceId, testDataHash2);
        vm.prank(bob);
        validationRegistry.validationResponse(testDataHash2, 100);
        
        (hasResponse, response) = validationRegistry.getValidationResponse(testDataHash2);
        assertTrue(hasResponse);
        assertEq(response, 100);
    }

    function test_ValidationResponse_RevertInvalidResponse() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        vm.prank(bob);
        vm.expectRevert(IValidationRegistry.InvalidResponse.selector);
        validationRegistry.validationResponse(testDataHash1, 101); // > 100
    }

    function test_ValidationResponse_RevertRequestNotFound() public {
        vm.prank(bob);
        vm.expectRevert(IValidationRegistry.ValidationRequestNotFound.selector);
        validationRegistry.validationResponse(testDataHash1, 85); // No request exists
    }

    function test_ValidationResponse_RevertUnauthorizedValidator() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Charlie tries to respond (not the designated validator)
        vm.prank(charlie);
        vm.expectRevert(IValidationRegistry.UnauthorizedValidator.selector);
        validationRegistry.validationResponse(testDataHash1, 85);
    }

    function test_ValidationResponse_RevertAlreadyResponded() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // First response
        vm.prank(bob);
        validationRegistry.validationResponse(testDataHash1, 85);
        
        // Second response (should fail)
        vm.prank(bob);
        vm.expectRevert(IValidationRegistry.ValidationAlreadyResponded.selector);
        validationRegistry.validationResponse(testDataHash1, 90);
    }

    function test_ValidationResponse_RevertRequestExpired() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Fast forward past expiration
        vm.warp(block.timestamp + validationRegistry.getExpirationSlots() + 1);
        
        vm.prank(bob);
        vm.expectRevert(IValidationRegistry.RequestExpired.selector);
        validationRegistry.validationResponse(testDataHash1, 85);
    }

    // ============ Query Function Tests ============

    function test_IsValidationPending_True() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        (bool exists, bool pending) = validationRegistry.isValidationPending(testDataHash1);
        assertTrue(exists);
        assertTrue(pending);
    }

    function test_IsValidationPending_False_NotExists() public {
        (bool exists, bool pending) = validationRegistry.isValidationPending(testDataHash1);
        assertFalse(exists);
        assertFalse(pending);
    }

    function test_IsValidationPending_False_Responded() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        vm.prank(bob);
        validationRegistry.validationResponse(testDataHash1, 85);
        
        (bool exists, bool pending) = validationRegistry.isValidationPending(testDataHash1);
        assertTrue(exists);
        assertFalse(pending); // Not pending because it's responded
    }

    function test_IsValidationPending_False_Expired() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Fast forward past expiration
        vm.warp(block.timestamp + validationRegistry.getExpirationSlots() + 1);
        
        (bool exists, bool pending) = validationRegistry.isValidationPending(testDataHash1);
        assertTrue(exists);
        assertFalse(pending); // Not pending because it's expired
    }

    function test_GetValidationResponse_NoResponse() public {
        (bool hasResponse, uint8 response) = validationRegistry.getValidationResponse(testDataHash1);
        assertFalse(hasResponse);
        assertEq(response, 0); // Default value
    }

    function test_GetExpirationSlots() public {
        uint256 slots = validationRegistry.getExpirationSlots();
        assertEq(slots, 1000); // Default value from contract
    }

    // ============ Integration Tests ============

    function test_Integration_FullValidationFlow() public {
        // 1. Create validation request
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // 2. Verify request is pending
        (bool exists, bool pending) = validationRegistry.isValidationPending(testDataHash1);
        assertTrue(exists);
        assertTrue(pending);
        
        // 3. Submit response
        vm.prank(bob);
        validationRegistry.validationResponse(testDataHash1, 75);
        
        // 4. Verify response exists and request is no longer pending
        (bool hasResponse, uint8 response) = validationRegistry.getValidationResponse(testDataHash1);
        assertTrue(hasResponse);
        assertEq(response, 75);
        
        (exists, pending) = validationRegistry.isValidationPending(testDataHash1);
        assertTrue(exists);
        assertFalse(pending);
    }

    function test_Integration_MultipleValidatorsForSameServer() public {
        // Different validators for the same server's work
        bytes32 dataHash3 = keccak256("test-data-3");
        
        // Bob validates Alice's work
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        vm.prank(bob);
        validationRegistry.validationResponse(testDataHash1, 85);
        
        // Charlie validates Alice's different work
        validationRegistry.validationRequest(charlieId, aliceId, dataHash3);
        vm.prank(charlie);
        validationRegistry.validationResponse(dataHash3, 92);
        
        // Verify both validations
        (bool hasResponse1, uint8 response1) = validationRegistry.getValidationResponse(testDataHash1);
        (bool hasResponse2, uint8 response2) = validationRegistry.getValidationResponse(dataHash3);
        
        assertTrue(hasResponse1);
        assertTrue(hasResponse2);
        assertEq(response1, 85);
        assertEq(response2, 92);
    }

    function test_Integration_ValidatorAddressUpdate() public {
        // Create request
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Bob updates his address
        address newBobAddress = makeAddr("newBob");
        vm.prank(bob);
        identityRegistry.updateAgent(bobId, "", newBobAddress);
        
        // Old address can't respond
        vm.prank(bob); // Old address
        vm.expectRevert(IValidationRegistry.UnauthorizedValidator.selector);
        validationRegistry.validationResponse(testDataHash1, 85);
        
        // New address can respond
        vm.prank(newBobAddress);
        validationRegistry.validationResponse(testDataHash1, 85);
        
        (bool hasResponse, uint8 response) = validationRegistry.getValidationResponse(testDataHash1);
        assertTrue(hasResponse);
        assertEq(response, 85);
    }

    function test_Integration_RequestReusesExpiredSlot() public {
        // Create request
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Fast forward past expiration
        vm.warp(block.timestamp + validationRegistry.getExpirationSlots() + 1);
        
        // Create new request with same data hash (should work)
        validationRegistry.validationRequest(charlieId, aliceId, testDataHash1);
        
        // Verify the request was updated with new validator
        IValidationRegistry.Request memory request = validationRegistry.getValidationRequest(testDataHash1);
        assertEq(request.agentValidatorId, charlieId); // Should be Charlie now, not Bob
        assertEq(request.timestamp, block.timestamp);
        assertFalse(request.responded);
    }

    // ============ Edge Cases ============

    function test_EdgeCase_SelfValidation() public {
        // SECURITY: Self-validation should now be prevented
        vm.expectRevert(IValidationRegistry.SelfValidationNotAllowed.selector);
        validationRegistry.validationRequest(aliceId, aliceId, testDataHash1);
    }

    function test_EdgeCase_ZeroAgentIds() public {
        vm.expectRevert(IValidationRegistry.AgentNotFound.selector);
        validationRegistry.validationRequest(0, aliceId, testDataHash1);
        
        vm.expectRevert(IValidationRegistry.AgentNotFound.selector);
        validationRegistry.validationRequest(bobId, 0, testDataHash1);
    }

    function test_EdgeCase_ExactExpirationBoundary() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        // Fast forward to exact expiration block
        vm.warp(block.timestamp + validationRegistry.getExpirationSlots());
        
        // Should still be valid at exact expiration block
        vm.prank(bob);
        validationRegistry.validationResponse(testDataHash1, 85);
        
        (bool hasResponse, uint8 response) = validationRegistry.getValidationResponse(testDataHash1);
        assertTrue(hasResponse);
        assertEq(response, 85);
    }

    // ============ Gas Optimization Tests ============

    function test_Gas_ValidationRequest() public {
        uint256 gasStart = gasleft();
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for validationRequest:", gasUsed);
        // Should be less than 140k gas (first validation request costs more due to storage setup)
        assertLt(gasUsed, 140_000);
    }

    function test_Gas_ValidationResponse() public {
        validationRegistry.validationRequest(bobId, aliceId, testDataHash1);
        
        vm.prank(bob);
        uint256 gasStart = gasleft();
        validationRegistry.validationResponse(testDataHash1, 85);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for validationResponse:", gasUsed);
        // Should be less than 115k gas
        assertLt(gasUsed, 115_000);
    }
    
    // ============ Security Tests ============
    
    function test_Security_PreventSelfValidation() public {
        // Test that agents cannot validate themselves
        vm.expectRevert(IValidationRegistry.SelfValidationNotAllowed.selector);
        validationRegistry.validationRequest(aliceId, aliceId, testDataHash1);
        
        vm.expectRevert(IValidationRegistry.SelfValidationNotAllowed.selector);
        validationRegistry.validationRequest(bobId, bobId, testDataHash2);
    }
}