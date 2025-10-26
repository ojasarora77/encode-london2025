// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CompassToken.sol";
import "../src/FeedbackAuthenticationDAO.sol";
import "../src/interfaces/IFeedbackAuthenticationDAO.sol";

contract ContestationVotingSimpleTest is Test {
    // Contracts
    CompassToken public compassToken;
    FeedbackAuthenticationDAO public dao;
    
    // Test accounts
    address public deployer = address(this);
    address public member1 = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc; // Private key 3
    address public member2 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Private key 0
    address public member3 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Private key 1
    address public member4 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Private key 2
    
    // Mock ReputationRegistry for testing
    address public mockReputationRegistry = makeAddr("mockReputationRegistry");
    
    // Constants
    uint256 public constant INITIAL_TOKEN_SUPPLY = 1000000 ether;
    uint256 public constant INITIAL_TREASURY = 500000 ether;
    uint256 public constant STAKE_AMOUNT = 1000 ether;
    uint256 public constant VOTE_STAKE = 500 ether;
    
    // Test data
    uint256 public agentId = 1;
    address public client1 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
    uint256 public authId;
    
    function setUp() public {
        // Deploy contracts
        vm.startPrank(deployer);
        
        compassToken = new CompassToken(INITIAL_TOKEN_SUPPLY);
        
        // Deploy DAO with mock reputation registry
        dao = new FeedbackAuthenticationDAO(
            address(compassToken),
            mockReputationRegistry,
            INITIAL_TREASURY
        );
        
        // Set DAO contract in CompassToken
        compassToken.setDAOContract(address(dao));
        
        // Transfer treasury to DAO
        compassToken.transfer(address(dao), INITIAL_TREASURY);
        
        // Update DAO treasury balance
        dao.updateTreasuryBalance();
        
        vm.stopPrank();
        
        // Setup DAO members
        _setupDAOMembers();
    }
    
    function test_ContestationAndVoting() public {
        // Test 1: Member 1 authenticates feedback
        vm.prank(member1);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member1);
        authId = dao.authenticateFeedback(agentId, client1, 1, STAKE_AMOUNT);
        
        // Verify authentication started
        IFeedbackAuthenticationDAO.PendingAuthentication memory pendingAuth = dao.getPendingAuthentication(authId);
        assertEq(pendingAuth.staker, member1);
        assertEq(pendingAuth.stakeAmount, STAKE_AMOUNT);
        assertEq(pendingAuth.agentId, agentId);
        assertEq(pendingAuth.clientAddress, client1);
        assertEq(pendingAuth.feedbackIndex, 1);
        assertEq(uint8(pendingAuth.status), 0); // Pending
        
        // Test 2: Member 2 contests authentication
        vm.prank(member2);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member2);
        dao.contestAuthentication(authId, STAKE_AMOUNT);
        
        // Verify contestation
        IFeedbackAuthenticationDAO.Contestation memory contestation = dao.getContestation(authId);
        assertEq(contestation.contester, member2);
        assertEq(contestation.contestStake, STAKE_AMOUNT);
        assertGt(contestation.voteStartTime, 0);
        assertEq(contestation.legitimateStake, 0);
        assertEq(contestation.notLegitimateStake, 0);
        
        // Verify authentication is now contested
        pendingAuth = dao.getPendingAuthentication(authId);
        assertEq(uint8(pendingAuth.status), 1); // Contested
        
        // Test 3: Members vote on contestation
        _voteOnContestation();
        
        // Test 4: Fast forward time and finalize contestation
        vm.warp(block.timestamp + 4 hours + 1);
        
        vm.prank(member1);
        dao.finalizeContestation(authId);
        
        // Test 5: Verify voting results and token distribution
        _verifyVotingResults();
        
        // Test 6: Fast forward remaining time and finalize authentication
        vm.warp(block.timestamp + 24 hours + 1);
        
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        
        // Test 7: Verify authentication is complete
        assertTrue(dao.isAuthenticatedFeedback(agentId, client1, 1));
        assertEq(dao.getAuthenticatedFeedbackCount(agentId), 1);
    }
    
    function test_ContestationEdgeCases() public {
        // Setup initial authentication
        vm.prank(member1);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member1);
        authId = dao.authenticateFeedback(agentId, client1, 1, STAKE_AMOUNT);
        
        // Test: Cannot contest with insufficient stake
        vm.prank(member2);
        compassToken.approve(address(dao), STAKE_AMOUNT - 1);
        
        vm.prank(member2);
        vm.expectRevert("Insufficient stake amount");
        dao.contestAuthentication(authId, STAKE_AMOUNT - 1);
        
        // Test: Cannot contest non-existent authentication
        vm.prank(member2);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member2);
        vm.expectRevert("Authentication not found");
        dao.contestAuthentication(999, STAKE_AMOUNT);
        
        // Test: Cannot contest already contested authentication
        vm.prank(member2);
        dao.contestAuthentication(authId, STAKE_AMOUNT);
        
        vm.prank(member3);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member3);
        vm.expectRevert("Authentication already contested");
        dao.contestAuthentication(authId, STAKE_AMOUNT);
    }
    
    function test_VotingEdgeCases() public {
        // Setup contestation
        vm.prank(member1);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member1);
        authId = dao.authenticateFeedback(agentId, client1, 1, STAKE_AMOUNT);
        
        vm.prank(member2);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member2);
        dao.contestAuthentication(authId, STAKE_AMOUNT);
        
        // Test: Cannot vote without being a member
        address nonMember = makeAddr("nonMember");
        vm.prank(nonMember);
        compassToken.approve(address(dao), VOTE_STAKE);
        
        vm.prank(nonMember);
        vm.expectRevert("Not a DAO member");
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, VOTE_STAKE);
        
        // Test: Cannot vote on non-existent contestation
        vm.prank(member1);
        compassToken.approve(address(dao), VOTE_STAKE);
        
        vm.prank(member1);
        vm.expectRevert("Contestation not found");
        dao.voteOnContestation(999, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, VOTE_STAKE);
        
        // Test: Cannot vote with invalid choice
        vm.prank(member1);
        vm.expectRevert("Invalid vote choice");
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.None, VOTE_STAKE);
        
        // Test: Cannot vote twice
        vm.prank(member1);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, VOTE_STAKE);
        
        vm.prank(member1);
        vm.expectRevert("Already voted");
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.NotLegitimate, VOTE_STAKE);
    }
    
    function test_TimeBasedFinalization() public {
        // Setup authentication
        vm.prank(member1);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member1);
        authId = dao.authenticateFeedback(agentId, client1, 1, STAKE_AMOUNT);
        
        // Test: Cannot finalize before 24 hours
        vm.prank(member1);
        vm.expectRevert("Authentication period not complete");
        dao.finalizeAuthentication(authId);
        
        // Test: Can finalize after 24 hours
        vm.warp(block.timestamp + 24 hours + 1);
        
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        
        assertTrue(dao.isAuthenticatedFeedback(agentId, client1, 1));
    }
    
    function test_ContestationTimePause() public {
        // Setup authentication
        vm.prank(member1);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member1);
        authId = dao.authenticateFeedback(agentId, client1, 1, STAKE_AMOUNT);
        
        uint256 startTime = block.timestamp;
        
        // Contest after 12 hours
        vm.warp(startTime + 12 hours);
        
        vm.prank(member2);
        compassToken.approve(address(dao), STAKE_AMOUNT);
        
        vm.prank(member2);
        dao.contestAuthentication(authId, STAKE_AMOUNT);
        
        // Verify time is paused
        IFeedbackAuthenticationDAO.PendingAuthentication memory pausedAuth = dao.getPendingAuthentication(authId);
        assertEq(uint8(pausedAuth.status), 1); // Contested
        
        // Fast forward 4 hours for voting
        vm.warp(block.timestamp + 4 hours + 1);
        
        // Finalize contestation
        vm.prank(member1);
        dao.finalizeContestation(authId);
        
        // Fast forward remaining 12 hours (24 - 12 = 12)
        vm.warp(block.timestamp + 12 hours + 1);
        
        // Should be able to finalize now
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        
        assertTrue(dao.isAuthenticatedFeedback(agentId, client1, 1));
    }
    
    function _setupDAOMembers() internal {
        // All members join DAO
        vm.prank(member1);
        dao.joinDAO();
        
        vm.prank(member2);
        dao.joinDAO();
        
        vm.prank(member3);
        dao.joinDAO();
        
        vm.prank(member4);
        dao.joinDAO();
        
        // Give members tokens for voting
        compassToken.transfer(member1, VOTE_STAKE * 2);
        compassToken.transfer(member2, VOTE_STAKE * 2);
        compassToken.transfer(member3, VOTE_STAKE * 2);
        compassToken.transfer(member4, VOTE_STAKE * 2);
    }
    
    function _voteOnContestation() internal {
        // Members vote
        vm.prank(member1);
        compassToken.approve(address(dao), VOTE_STAKE);
        vm.prank(member1);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, VOTE_STAKE);
        
        vm.prank(member2);
        compassToken.approve(address(dao), VOTE_STAKE);
        vm.prank(member2);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.NotLegitimate, VOTE_STAKE);
        
        vm.prank(member3);
        compassToken.approve(address(dao), VOTE_STAKE);
        vm.prank(member3);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, VOTE_STAKE);
        
        vm.prank(member4);
        compassToken.approve(address(dao), VOTE_STAKE);
        vm.prank(member4);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.NotLegitimate, VOTE_STAKE);
    }
    
    function _verifyVotingResults() internal {
        // Check voting results
        IFeedbackAuthenticationDAO.Contestation memory contestation = dao.getContestation(authId);
        
        assertEq(contestation.legitimateStake, VOTE_STAKE * 2); // 2 votes for legitimate
        assertEq(contestation.notLegitimateStake, VOTE_STAKE * 2); // 2 votes for not legitimate
        
        // Since it's a tie, the original staker should win (legitimate)
        // Check that authentication status is back to pending
        IFeedbackAuthenticationDAO.PendingAuthentication memory pendingAuth = dao.getPendingAuthentication(authId);
        assertEq(uint8(pendingAuth.status), 0); // Pending
    }
}
