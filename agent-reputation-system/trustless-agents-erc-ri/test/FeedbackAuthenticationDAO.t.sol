// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/CompassToken.sol";
import "../src/FeedbackAuthenticationDAO.sol";

/**
 * @title FeedbackAuthenticationDAOTest
 * @dev Comprehensive test suite for FeedbackAuthenticationDAO contract
 * @author ChaosChain Labs
 */
contract FeedbackAuthenticationDAOTest is Test {
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
    
    uint256 public agentId;
    uint256 public constant INITIAL_TREASURY = 500000 * 10**18;
    uint256 public constant INITIAL_TOKEN_SUPPLY = 1000000 * 10**18;
    
    event MemberJoined(address indexed member, uint256 tokensReceived);
    event FeedbackAuthenticationStarted(
        uint256 indexed authId,
        address indexed staker,
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        uint256 stakeAmount
    );
    event AuthenticationContested(
        uint256 indexed authId,
        address indexed contester,
        uint256 contestStake
    );
    event VoteCast(
        uint256 indexed authId,
        address indexed voter,
        IFeedbackAuthenticationDAO.VoteChoice choice,
        uint256 stakeAmount
    );
    event FeedbackAuthenticated(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );
    
    function setUp() public {
        // Deploy contracts
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
        
        // Create an agent and some feedback for testing
        _createTestAgent();
        _createTestFeedback();
    }
    
    function _createTestAgent() internal {
        vm.prank(agentOwner);
        identityRegistry.register("ipfs://test-agent.json");
        agentId = identityRegistry.totalAgents();
    }
    
    function _createTestFeedback() internal {
        // Create feedback authorization
        bytes memory feedbackAuth = _createFeedbackAuth(agentId, client1, 1, block.timestamp + 3600);
        
        // Give feedback
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
    }
    
    function _createFeedbackAuth(
        uint256 _agentId,
        address _clientAddress,
        uint64 _indexLimit,
        uint256 _expiry
    ) internal view returns (bytes memory) {
        // Create feedback authorization struct
        bytes memory structData = abi.encode(
            _agentId,
            _clientAddress,
            _indexLimit,
            _expiry,
            block.chainid,
            address(identityRegistry),
            agentOwner
        );
        
        // Create signature (simplified for testing)
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(structData)
        ));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, messageHash); // Use private key 1 for agentOwner
        
        return abi.encodePacked(structData, abi.encodePacked(r, s, v));
    }
    
    function test_InitialState() public {
        assertEq(address(dao.compassToken()), address(compassToken));
        assertEq(address(dao.reputationRegistry()), address(reputationRegistry));
        assertEq(dao.getTreasuryBalance(), INITIAL_TREASURY);
        assertEq(dao.getMemberCount(), 0);
        assertEq(compassToken.daoContract(), address(dao));
    }
    
    function test_JoinDAO() public {
        uint256 initialBalance = compassToken.balanceOf(member1);
        
        vm.prank(member1);
        vm.expectEmit(true, false, false, true);
        emit MemberJoined(member1, 0); // 0 because no members yet
        dao.joinDAO();
        
        assertTrue(dao.isMember(member1));
        assertEq(dao.getMemberCount(), 1);
        assertEq(compassToken.balanceOf(member1), initialBalance);
    }
    
    function test_JoinDAO_AlreadyMember() public {
        vm.prank(member1);
        dao.joinDAO();
        
        vm.prank(member1);
        vm.expectRevert("Already a member");
        dao.joinDAO();
    }
    
    function test_JoinDAO_WithExistingMembers() public {
        // First member joins
        vm.prank(member1);
        dao.joinDAO();
        
        // Second member should get tokens
        uint256 expectedTokens = INITIAL_TREASURY / (1 * 100); // treasury / (members * 100)
        
        vm.prank(member2);
        vm.expectEmit(true, false, false, true);
        emit MemberJoined(member2, expectedTokens);
        dao.joinDAO();
        
        assertTrue(dao.isMember(member2));
        assertEq(dao.getMemberCount(), 2);
        assertEq(compassToken.balanceOf(member2), expectedTokens);
    }
    
    function test_AuthenticateFeedback() public {
        // Join DAO first
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        
        // Give member1 some tokens
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        
        vm.prank(member1);
        vm.expectEmit(true, true, false, true);
        emit FeedbackAuthenticationStarted(1, member1, agentId, client1, 1, stakeAmount);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        assertEq(authId, 1);
        
        IFeedbackAuthenticationDAO.PendingAuthentication memory auth = dao.getPendingAuthentication(authId);
        assertEq(auth.staker, member1);
        assertEq(auth.stakeAmount, stakeAmount);
        assertEq(auth.agentId, agentId);
        assertEq(auth.clientAddress, client1);
        assertEq(auth.feedbackIndex, 1);
        assertEq(uint256(auth.status), uint256(IFeedbackAuthenticationDAO.AuthenticationStatus.Pending));
    }
    
    function test_AuthenticateFeedback_NotMember() public {
        uint256 stakeAmount = 1000 * 10**18;
        
        vm.prank(member1);
        vm.expectRevert("Not a DAO member");
        dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
    }
    
    function test_AuthenticateFeedback_AlreadyAuthenticated() public {
        // Join DAO and authenticate feedback
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        // Try to authenticate same feedback again
        vm.prank(member1);
        vm.expectRevert("Feedback already authenticated");
        dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
    }
    
    function test_ContestAuthentication() public {
        // Setup: member1 authenticates feedback
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        // member2 contests
        vm.prank(member2);
        dao.joinDAO();
        
        vm.prank(deployer);
        compassToken.transfer(member2, stakeAmount);
        
        vm.prank(member2);
        compassToken.approve(address(dao), stakeAmount);
        
        vm.prank(member2);
        vm.expectEmit(true, true, false, true);
        emit AuthenticationContested(authId, member2, stakeAmount);
        dao.contestAuthentication(authId, stakeAmount);
        
        IFeedbackAuthenticationDAO.PendingAuthentication memory auth = dao.getPendingAuthentication(authId);
        assertEq(uint256(auth.status), uint256(IFeedbackAuthenticationDAO.AuthenticationStatus.Contested));
        
        IFeedbackAuthenticationDAO.Contestation memory contest = dao.getContestation(authId);
        assertEq(contest.contester, member2);
        assertEq(contest.contestStake, stakeAmount);
        assertTrue(contest.isActive);
    }
    
    function test_VoteOnContestation() public {
        // Setup: authentication and contestation
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        vm.prank(member2);
        dao.joinDAO();
        
        vm.prank(deployer);
        compassToken.transfer(member2, stakeAmount);
        
        vm.prank(member2);
        compassToken.approve(address(dao), stakeAmount);
        dao.contestAuthentication(authId, stakeAmount);
        
        // member3 votes
        vm.prank(member3);
        dao.joinDAO();
        
        uint256 voteStake = 500 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member3, voteStake);
        
        vm.prank(member3);
        compassToken.approve(address(dao), voteStake);
        
        vm.prank(member3);
        vm.expectEmit(true, true, false, true);
        emit VoteCast(authId, member3, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, voteStake);
        dao.voteOnContestation(authId, IFeedbackAuthenticationDAO.VoteChoice.Legitimate, voteStake);
        
        IFeedbackAuthenticationDAO.Vote memory vote = dao.getVote(authId, member3);
        assertEq(uint256(vote.choice), uint256(IFeedbackAuthenticationDAO.VoteChoice.Legitimate));
        assertEq(vote.stakeAmount, voteStake);
        assertTrue(vote.hasVoted);
    }
    
    function test_FinalizeAuthentication_Uncontested() public {
        // Setup: authentication without contestation
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        // Fast forward 24 hours
        vm.warp(block.timestamp + 24 hours + 1);
        
        uint256 initialBalance = compassToken.balanceOf(member1);
        
        vm.prank(member1);
        vm.expectEmit(true, true, true, true);
        emit FeedbackAuthenticated(agentId, client1, 1);
        dao.finalizeAuthentication(authId);
        
        // Check authentication was successful
        assertTrue(dao.isAuthenticatedFeedback(agentId, client1, 1));
        
        // Check staker received stake + reward
        assertGt(compassToken.balanceOf(member1), initialBalance);
    }
    
    function test_IsAuthenticatedFeedback() public {
        // Initially not authenticated
        assertFalse(dao.isAuthenticatedFeedback(agentId, client1, 1));
        
        // After authentication and finalization
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        vm.warp(block.timestamp + 24 hours + 1);
        
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        
        assertTrue(dao.isAuthenticatedFeedback(agentId, client1, 1));
    }
    
    function test_GetAuthenticatedFeedback() public {
        // Setup and finalize authentication
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        vm.warp(block.timestamp + 24 hours + 1);
        
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        
        // Get authenticated feedback
        (address[] memory clientAddresses, uint64[] memory feedbackIndices) = dao.getAuthenticatedFeedback(agentId);
        
        assertEq(clientAddresses.length, 1);
        assertEq(feedbackIndices.length, 1);
        assertEq(clientAddresses[0], client1);
        assertEq(feedbackIndices[0], 1);
    }
    
    function test_GetAuthenticatedFeedbackCount() public {
        // Initially no authenticated feedback
        assertEq(dao.getAuthenticatedFeedbackCount(agentId), 0);
        
        // After authentication and finalization
        vm.prank(member1);
        dao.joinDAO();
        
        uint256 stakeAmount = 1000 * 10**18;
        vm.prank(deployer);
        compassToken.transfer(member1, stakeAmount);
        
        vm.prank(member1);
        compassToken.approve(address(dao), stakeAmount);
        uint256 authId = dao.authenticateFeedback(agentId, client1, 1, stakeAmount);
        
        vm.warp(block.timestamp + 24 hours + 1);
        
        vm.prank(member1);
        dao.finalizeAuthentication(authId);
        
        assertEq(dao.getAuthenticatedFeedbackCount(agentId), 1);
    }
}
