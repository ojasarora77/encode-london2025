// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/CompassToken.sol";
import "../src/FeedbackAuthenticationDAO.sol";

/**
 * @title DAOIntegrationTest
 * @dev Integration test demonstrating complete DAO feedback authentication flow
 * @author ChaosChain Labs
 */
contract DAOIntegrationTest is Test {
    IdentityRegistry public identityRegistry;
    ReputationRegistry public reputationRegistry;
    CompassToken public compassToken;
    FeedbackAuthenticationDAO public dao;
    
    address public deployer = address(0x1);
    address public agentOwner = address(0x2);
    address public client1 = address(0x3);
    address public client2 = address(0x4);
    address public member1 = address(0x5);
    address public member2 = address(0x6);
    address public member3 = address(0x7);
    address public member4 = address(0x8);
    
    uint256 public agentId;
    uint256 public constant INITIAL_TREASURY = 500000 * 10**18;
    uint256 public constant INITIAL_TOKEN_SUPPLY = 1000000 * 10**18;
    
    function setUp() public {
        // Deploy all contracts
        vm.startPrank(deployer);
        
        identityRegistry = new IdentityRegistry();
        reputationRegistry = new ReputationRegistry(address(identityRegistry));
        compassToken = new CompassToken(INITIAL_TOKEN_SUPPLY);
        
        // Deploy DAO first
        dao = new FeedbackAuthenticationDAO(
            address(compassToken),
            address(reputationRegistry),
            INITIAL_TREASURY
        );
        
        // Set DAO contract in CompassToken
        compassToken.setDAOContract(address(dao));
        
        // Transfer treasury tokens to DAO
        compassToken.transfer(address(dao), INITIAL_TREASURY);
        
        vm.stopPrank();
        
        // Update DAO treasury balance
        dao.updateTreasuryBalance();
        
        // Create test agent
        vm.prank(agentOwner);
        identityRegistry.register("ipfs://test-agent.json");
        agentId = identityRegistry.totalAgents();
    }
    
    function _createFeedbackAuth(
        uint256 _agentId,
        address _clientAddress,
        uint64 _indexLimit,
        uint256 _expiry
    ) internal view returns (bytes memory) {
        bytes memory structData = abi.encode(
            _agentId,
            _clientAddress,
            _indexLimit,
            _expiry,
            block.chainid,
            address(identityRegistry),
            agentOwner
        );
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(structData)
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, messageHash);
        
        return abi.encodePacked(structData, abi.encodePacked(r, s, v));
    }
    
    function test_CompleteFlow_UncontestedAuthentication() public {
        console.log("=== Testing Complete Uncontested Authentication Flow ===");
        
        // 1. Create feedback in ERC-8004 system
        bytes memory feedbackAuth = _createFeedbackAuth(agentId, client1, 1, block.timestamp + 3600);
        
        vm.prank(client1);
        reputationRegistry.giveFeedback(
            agentId,
            85,
            bytes32("quality"),
            bytes32("speed"),
            "ipfs://feedback1.json",
            keccak256("feedback1"),
            feedbackAuth
        );
        
        console.log("Feedback created in ERC-8004 system");
        
        // 2. Members join DAO
        vm.prank(member1);
        dao.joinDAO();
        console.log("Member1 joined DAO");
        
        vm.prank(member2);
        dao.joinDAO();
        console.log("Member2 joined DAO");
        
        // 3. Member1 stakes to authenticate feedback
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        
        vm.prank(member1);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        console.log(" Member1 staked to authenticate feedback, authId:", authId);
        
        // 4. Wait 24 hours and finalize
        vm.warp(block.timestamp + 24 hours + 1);
        
        uint256 initialBalance = compassToken.balanceOf(member1);
        
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        console.log(" Authentication finalized after 24 hours");
        
        // 5. Verify feedback is now DAO authenticated
        assertTrue(dao.isAuthenticatedFeedback(agentId, client1, 1));
        console.log(" Feedback is now DAO authenticated");
        
        // 6. Verify staker received reward
        assertGt(compassToken.balanceOf(member1), initialBalance);
        console.log(" Member1 received stake + reward");
        
        // 7. Verify authenticated feedback can be queried
        (address[] memory clientAddresses, uint64[] memory feedbackIndices) = dao.getAuthenticatedFeedback(agentId);
        assertEq(clientAddresses.length, 1);
        assertEq(feedbackIndices.length, 1);
        assertEq(clientAddresses[0], client1);
        assertEq(feedbackIndices[0], 1);
        console.log(" Authenticated feedback can be queried");
        
        console.log("=== Uncontested Flow Complete ===");
    }
    
    function test_CompleteFlow_ContestedAuthentication() public {
        console.log("=== Testing Complete Contested Authentication Flow ===");
        
        // 1. Create feedback in ERC-8004 system
        bytes memory feedbackAuth = _createFeedbackAuth(agentId, client1, 1, block.timestamp + 3600);
        
        vm.prank(client1);
        reputationRegistry.giveFeedback(
            agentId,
            85,
            bytes32("quality"),
            bytes32("speed"),
            "ipfs://feedback1.json",
            keccak256("feedback1"),
            feedbackAuth
        );
        
        console.log("Feedback created in ERC-8004 system");
        
        // 2. Members join DAO
        vm.prank(member1);
        dao.joinDAO();
        
        vm.prank(member2);
        dao.joinDAO();
        
        vm.prank(member3);
        dao.joinDAO();
        
        vm.prank(member4);
        dao.joinDAO();
        
        console.log(" All members joined DAO");
        
        // 3. Member1 stakes to authenticate feedback
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        
        vm.prank(member1);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        console.log(" Member1 staked to authenticate feedback, authId:", authId);
        
        // 4. Member2 contests the authentication
        vm.prank(deployer);
        compassToken.transfer(member2, stakeAmount);
        
        vm.prank(member2);
        compassToken.approve(address(dao), stakeAmount);
        
        vm.prank(member2);
        dao.contestAuthentication(authId, stakeAmount);
        console.log(" Member2 contested the authentication");
        
        // 5. Members vote on the contestation
        uint256 voteStake = 500 * 10**18;
        
        // Member3 votes legitimate
        vm.prank(deployer);
        compassToken.transfer(member3, voteStake);
        
        vm.prank(member3);
        compassToken.approve(address(dao), voteStake);
        
        vm.prank(member3);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, voteStake);
        console.log(" Member3 voted legitimate");
        
        // Member4 votes not legitimate
        vm.prank(deployer);
        compassToken.transfer(member4, voteStake);
        
        vm.prank(member4);
        compassToken.approve(address(dao), voteStake);
        
        vm.prank(member4);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.NotLegitimate, voteStake);
        console.log(" Member4 voted not legitimate");
        
        // 6. Wait 4 hours and finalize contestation
        vm.warp(block.timestamp + 4 hours + 1);
        
        vm.prank(member1);
        dao.finalizeContestation(authId);
        console.log(" Contestation finalized after 4 hours");
        
        // 7. Since legitimate won (tie goes to legitimate), authentication should be pending again
        IFeedbackAuthenticationDAO.PendingAuthentication memory auth = dao.getPendingAuthentication(authId);
        assertEq(uint256(auth.status), uint256(IFeedbackAuthenticationDAO.AuthenticationStatus.Pending));
        console.log(" Authentication status is now Pending (legitimate won)");
        
        // 8. Wait remaining time and finalize authentication
        vm.warp(block.timestamp + 24 hours + 1);
        
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        console.log(" Authentication finalized after contestation");
        
        // 9. Verify feedback is DAO authenticated
        assertTrue(dao.isAuthenticatedFeedback(agentId, client1, 1));
        console.log(" Feedback is now DAO authenticated");
        
        console.log("=== Contested Flow Complete ===");
    }
    
    function test_CompleteFlow_ContestationRejection() public {
        console.log("=== Testing Contestation Rejection Flow ===");
        
        // 1. Create feedback in ERC-8004 system
        bytes memory feedbackAuth = _createFeedbackAuth(agentId, client1, 1, block.timestamp + 3600);
        
        vm.prank(client1);
        reputationRegistry.giveFeedback(
            agentId,
            85,
            bytes32("quality"),
            bytes32("speed"),
            "ipfs://feedback1.json",
            keccak256("feedback1"),
            feedbackAuth
        );
        
        console.log("Feedback created in ERC-8004 system");
        
        // 2. Members join DAO
        vm.prank(member1);
        dao.joinDAO();
        
        vm.prank(member2);
        dao.joinDAO();
        
        vm.prank(member3);
        dao.joinDAO();
        
        vm.prank(member4);
        dao.joinDAO();
        
        console.log(" All members joined DAO");
        
        // 3. Member1 stakes to authenticate feedback
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        
        vm.prank(member1);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        console.log(" Member1 staked to authenticate feedback, authId:", authId);
        
        // 4. Member2 contests the authentication
        vm.prank(deployer);
        compassToken.transfer(member2, stakeAmount);
        
        vm.prank(member2);
        compassToken.approve(address(dao), stakeAmount);
        
        vm.prank(member2);
        dao.contestAuthentication(authId, stakeAmount);
        console.log(" Member2 contested the authentication");
        
        // 5. Members vote not legitimate (majority)
        uint256 voteStake = 500 * 10**18;
        
        // Member3 votes not legitimate
        vm.prank(deployer);
        compassToken.transfer(member3, voteStake);
        
        vm.prank(member3);
        compassToken.approve(address(dao), voteStake);
        
        vm.prank(member3);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.NotLegitimate, voteStake);
        console.log(" Member3 voted not legitimate");
        
        // Member4 votes not legitimate
        vm.prank(deployer);
        compassToken.transfer(member4, voteStake);
        
        vm.prank(member4);
        compassToken.approve(address(dao), voteStake);
        
        vm.prank(member4);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.NotLegitimate, voteStake);
        console.log(" Member4 voted not legitimate");
        
        // 6. Wait 4 hours and finalize contestation
        vm.warp(block.timestamp + 4 hours + 1);
        
        vm.prank(member1);
        dao.finalizeContestation(authId);
        console.log(" Contestation finalized after 4 hours");
        
        // 7. Since not legitimate won, authentication should be rejected
        IFeedbackAuthenticationDAO.PendingAuthentication memory auth = dao.getPendingAuthentication(authId);
        assertEq(uint256(auth.status), uint256(IFeedbackAuthenticationDAO.AuthenticationStatus.Rejected));
        console.log(" Authentication was rejected (not legitimate won)");
        
        // 8. Verify feedback is NOT DAO authenticated
        assertFalse(dao.isAuthenticatedFeedback(agentId, client1, 1));
        console.log(" Feedback is NOT DAO authenticated");
        
        // 9. Verify no authenticated feedback exists
        assertEq(dao.getAuthenticatedFeedbackCount(agentId), 0);
        console.log(" No authenticated feedback exists");
        
        console.log("=== Contestation Rejection Flow Complete ===");
    }
    
    function test_MultipleAuthentications() public {
        console.log("=== Testing Multiple Authentications ===");
        
        // Create multiple feedback entries
        for (uint i = 0; i < 3; i++) {
            bytes memory feedbackAuth = _createFeedbackAuth(agentId, address(uint160(uint160(client1) + i)), 1, block.timestamp + 3600);
            
            vm.prank(address(uint160(uint160(client1) + i)));
            reputationRegistry.giveFeedback(
                agentId,
                uint8(80 + i * 5),
                bytes32("quality"),
                bytes32("speed"),
                string(abi.encodePacked("ipfs://feedback", i, ".json")),
                keccak256(abi.encodePacked("feedback", i)),
                feedbackAuth
            );
        }
        
        console.log(" Created 3 feedback entries");
        
        // Members join DAO
        vm.prank(member1);
        dao.joinDAO();
        
        vm.prank(member2);
        dao.joinDAO();
        
        console.log(" Members joined DAO");
        
        // Authenticate all feedback
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount * 3);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount * 3);
        
        for (uint i = 0; i < 3; i++) {
            vm.prank(member1);
            uint256 authId = dao.authenticateFeedback(agentId, address(uint160(uint160(client1) + i)), 1, stakeAmount);
            console.log(" Authenticated feedback", i, "authId:", authId);
        }
        
        // Wait and finalize all
        vm.warp(block.timestamp + 24 hours + 1);
        
        for (uint i = 0; i < 3; i++) {
            vm.prank(member1);
            dao.finalizeAuthentication(i + 1);
        }
        
        console.log(" All authentications finalized");
        
        // Verify all are authenticated
        assertEq(dao.getAuthenticatedFeedbackCount(agentId), 3);
        console.log(" All 3 feedback entries are DAO authenticated");
        
        for (uint i = 0; i < 3; i++) {
            assertTrue(dao.isAuthenticatedFeedback(agentId, address(uint160(uint160(client1) + i)), 1));
        }
        console.log(" All individual feedback entries verified as authenticated");
        
        console.log("=== Multiple Authentications Complete ===");
    }
}
