// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "../src/IdentityRegistry.sol";
import "../src/interfaces/IIdentityRegistry.sol";

/**
 * @title IdentityRegistryTest
 * @dev Comprehensive test suite for the IdentityRegistry contract
 */
contract IdentityRegistryTest is Test {
    IdentityRegistry public registry;
    
    // Test accounts
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    
    // Test domains
    string constant ALICE_DOMAIN = "alice.example.com";
    string constant BOB_DOMAIN = "bob.example.com";
    string constant CHARLIE_DOMAIN = "charlie.example.com";
    
    event AgentRegistered(uint256 indexed agentId, string agentDomain, address agentAddress);
    event AgentUpdated(uint256 indexed agentId, string agentDomain, address agentAddress);

    function setUp() public {
        registry = new IdentityRegistry();
        
        // Fund test accounts with ETH for registration fees
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
        vm.deal(charlie, 1 ether);
    }

    // ============ Registration Tests ============

    function test_NewAgent_Success() public {
        vm.prank(alice);
        
        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(1, ALICE_DOMAIN, alice);
        
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        assertEq(agentId, 1);
        assertEq(registry.getAgentCount(), 1);
        assertTrue(registry.agentExists(1));
    }

    function test_NewAgent_MultipleAgents() public {
        // Register Alice
        vm.prank(alice);
        uint256 aliceId = registry.newAgent(ALICE_DOMAIN, alice);
        
        // Register Bob
        vm.prank(bob);
        uint256 bobId = registry.newAgent(BOB_DOMAIN, bob);
        
        assertEq(aliceId, 1);
        assertEq(bobId, 2);
        assertEq(registry.getAgentCount(), 2);
    }



    function test_NewAgent_RevertInvalidDomain() public {
        vm.prank(alice);
        
        vm.expectRevert(IIdentityRegistry.InvalidDomain.selector);
        registry.newAgent("", alice);
    }

    function test_NewAgent_RevertUnauthorizedRegistration() public {
        // Test that Alice cannot register Bob's address
        vm.prank(alice);
        
        vm.expectRevert(IIdentityRegistry.UnauthorizedRegistration.selector);
        registry.newAgent(ALICE_DOMAIN, bob); // Alice trying to register Bob's address
    }
    
    function test_NewAgent_RevertInvalidAddress() public {
        // Test invalid address - but since address(0) can't be msg.sender,
        // we need to modify the contract logic to check this after ownership
        // For now, this tests the ownership check which is more critical
        vm.prank(address(0));
        
        vm.expectRevert(IIdentityRegistry.InvalidAddress.selector);
        registry.newAgent(ALICE_DOMAIN, address(0));
    }

    function test_NewAgent_RevertDomainAlreadyRegistered() public {
        // Register Alice first
        vm.prank(alice);
        registry.newAgent(ALICE_DOMAIN, alice);
        
        // Try to register Bob with same domain
        vm.prank(bob);
        vm.expectRevert(IIdentityRegistry.DomainAlreadyRegistered.selector);
        registry.newAgent(ALICE_DOMAIN, bob);
    }

    function test_NewAgent_RevertAddressAlreadyRegistered() public {
        // Register Alice first
        vm.prank(alice);
        registry.newAgent(ALICE_DOMAIN, alice);
        
        // Try to register Alice again with different domain
        vm.prank(alice);
        vm.expectRevert(IIdentityRegistry.AddressAlreadyRegistered.selector);
        registry.newAgent(BOB_DOMAIN, alice);
    }



    // ============ Update Tests ============

    function test_UpdateAgent_Domain() public {
        // Register Alice
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        // Update domain
        string memory newDomain = "alice-new.example.com";
        vm.prank(alice);
        
        vm.expectEmit(true, false, false, true);
        emit AgentUpdated(agentId, newDomain, alice);
        
        bool success = registry.updateAgent(agentId, newDomain, address(0));
        assertTrue(success);
        
        // Verify update
        IIdentityRegistry.AgentInfo memory info = registry.getAgent(agentId);
        assertEq(info.agentDomain, newDomain);
        assertEq(info.agentAddress, alice);
    }

    function test_UpdateAgent_Address() public {
        // Register Alice
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        // Update address
        vm.prank(alice);
        bool success = registry.updateAgent(agentId, "", bob);
        assertTrue(success);
        
        // Verify update
        IIdentityRegistry.AgentInfo memory info = registry.getAgent(agentId);
        assertEq(info.agentDomain, ALICE_DOMAIN);
        assertEq(info.agentAddress, bob);
    }

    function test_UpdateAgent_Both() public {
        // Register Alice
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        // Update both
        string memory newDomain = "alice-new.example.com";
        vm.prank(alice);
        bool success = registry.updateAgent(agentId, newDomain, bob);
        assertTrue(success);
        
        // Verify update
        IIdentityRegistry.AgentInfo memory info = registry.getAgent(agentId);
        assertEq(info.agentDomain, newDomain);
        assertEq(info.agentAddress, bob);
    }

    function test_UpdateAgent_RevertAgentNotFound() public {
        vm.prank(alice);
        vm.expectRevert(IIdentityRegistry.AgentNotFound.selector);
        registry.updateAgent(999, ALICE_DOMAIN, alice);
    }

    function test_UpdateAgent_RevertUnauthorized() public {
        // Register Alice
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        // Try to update from different account
        vm.prank(bob);
        vm.expectRevert(IIdentityRegistry.UnauthorizedUpdate.selector);
        registry.updateAgent(agentId, BOB_DOMAIN, bob);
    }

    function test_UpdateAgent_RevertDomainAlreadyRegistered() public {
        // Register Alice and Bob
        vm.prank(alice);
        uint256 aliceId = registry.newAgent(ALICE_DOMAIN, alice);
        
        vm.prank(bob);
        registry.newAgent(BOB_DOMAIN, bob);
        
        // Try to update Alice to Bob's domain
        vm.prank(alice);
        vm.expectRevert(IIdentityRegistry.DomainAlreadyRegistered.selector);
        registry.updateAgent(aliceId, BOB_DOMAIN, address(0));
    }

    function test_UpdateAgent_RevertAddressAlreadyRegistered() public {
        // Register Alice and Bob
        vm.prank(alice);
        uint256 aliceId = registry.newAgent(ALICE_DOMAIN, alice);
        
        vm.prank(bob);
        registry.newAgent(BOB_DOMAIN, bob);
        
        // Try to update Alice to Bob's address
        vm.prank(alice);
        vm.expectRevert(IIdentityRegistry.AddressAlreadyRegistered.selector);
        registry.updateAgent(aliceId, "", bob);
    }

    // ============ Resolution Tests ============

    function test_GetAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        IIdentityRegistry.AgentInfo memory info = registry.getAgent(agentId);
        assertEq(info.agentId, agentId);
        assertEq(info.agentDomain, ALICE_DOMAIN);
        assertEq(info.agentAddress, alice);
    }

    function test_GetAgent_RevertNotFound() public {
        vm.expectRevert(IIdentityRegistry.AgentNotFound.selector);
        registry.getAgent(999);
    }

    function test_ResolveByDomain() public {
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        IIdentityRegistry.AgentInfo memory info = registry.resolveByDomain(ALICE_DOMAIN);
        assertEq(info.agentId, agentId);
        assertEq(info.agentDomain, ALICE_DOMAIN);
        assertEq(info.agentAddress, alice);
    }

    function test_ResolveByDomain_RevertNotFound() public {
        vm.expectRevert(IIdentityRegistry.AgentNotFound.selector);
        registry.resolveByDomain("nonexistent.com");
    }

    function test_ResolveByAddress() public {
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        IIdentityRegistry.AgentInfo memory info = registry.resolveByAddress(alice);
        assertEq(info.agentId, agentId);
        assertEq(info.agentDomain, ALICE_DOMAIN);
        assertEq(info.agentAddress, alice);
    }

    function test_ResolveByAddress_RevertNotFound() public {
        vm.expectRevert(IIdentityRegistry.AgentNotFound.selector);
        registry.resolveByAddress(makeAddr("nonexistent"));
    }

    function test_AgentExists() public {
        assertFalse(registry.agentExists(1));
        
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        assertTrue(registry.agentExists(agentId));
        assertFalse(registry.agentExists(agentId + 1));
    }

    // ============ Gas Optimization Tests ============

    function test_Gas_NewAgent() public {
        vm.prank(alice);
        uint256 gasStart = gasleft();
        registry.newAgent(ALICE_DOMAIN, alice);
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for newAgent:", gasUsed);
        // Should be less than 200k gas (first registration costs more due to storage setup)
        assertLt(gasUsed, 200_000);
    }

    function test_Gas_UpdateAgent() public {
        vm.prank(alice);
        uint256 agentId = registry.newAgent(ALICE_DOMAIN, alice);
        
        vm.prank(alice);
        uint256 gasStart = gasleft();
        registry.updateAgent(agentId, "new-domain.com", address(0));
        uint256 gasUsed = gasStart - gasleft();
        
        console.log("Gas used for updateAgent:", gasUsed);
        // Should be less than 100k gas
        assertLt(gasUsed, 100_000);
    }
    
    // ============ Security Tests ============
    
    function test_Security_CaseSensitivityPrevention() public {
        // Register alice with lowercase domain
        vm.prank(alice);
        registry.newAgent("example.com", alice);
        
        // Try to register bob with uppercase version - should fail
        vm.prank(bob);
        vm.expectRevert(IIdentityRegistry.DomainAlreadyRegistered.selector);
        registry.newAgent("EXAMPLE.COM", bob);
        
        // Try mixed case - should also fail
        vm.prank(charlie);
        vm.expectRevert(IIdentityRegistry.DomainAlreadyRegistered.selector);
        registry.newAgent("Example.Com", charlie);
    }
    
    function test_Security_ResolveByDomainCaseInsensitive() public {
        // Register with lowercase
        vm.prank(alice);
        uint256 agentId = registry.newAgent("example.com", alice);
        
        // Should be able to resolve with any case variation
        IIdentityRegistry.AgentInfo memory info1 = registry.resolveByDomain("example.com");
        IIdentityRegistry.AgentInfo memory info2 = registry.resolveByDomain("EXAMPLE.COM");
        IIdentityRegistry.AgentInfo memory info3 = registry.resolveByDomain("Example.Com");
        
        assertEq(info1.agentId, agentId);
        assertEq(info2.agentId, agentId);
        assertEq(info3.agentId, agentId);
        
        // Original case should be preserved in stored data
        assertEq(info1.agentDomain, "example.com");
        assertEq(info2.agentDomain, "example.com");
        assertEq(info3.agentDomain, "example.com");
    }
    
    function test_Security_UpdateAgentDomainNormalization() public {
        // Register with lowercase
        vm.prank(alice);
        uint256 agentId = registry.newAgent("example.com", alice);
        
        // Update to mixed case - should work correctly
        vm.prank(alice);
        registry.updateAgent(agentId, "UPDATED.COM", address(0));
        
        // Should be resolvable with any case
        IIdentityRegistry.AgentInfo memory info1 = registry.resolveByDomain("updated.com");
        IIdentityRegistry.AgentInfo memory info2 = registry.resolveByDomain("UPDATED.COM");
        
        assertEq(info1.agentId, agentId);
        assertEq(info2.agentId, agentId);
        
        // Original domain should no longer resolve
        vm.expectRevert(IIdentityRegistry.AgentNotFound.selector);
        registry.resolveByDomain("example.com");
    }
}