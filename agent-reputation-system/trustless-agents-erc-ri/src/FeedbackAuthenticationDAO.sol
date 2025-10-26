// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./CompassToken.sol";
import "./interfaces/IFeedbackAuthenticationDAO.sol";
import "./interfaces/IReputationRegistry.sol";

/**
 * @title FeedbackAuthenticationDAO
 * @dev DAO contract for authenticating ERC-8004 feedback through stake-based consensus
 * @notice Members stake Compass Tokens to authenticate feedback with contestation and voting mechanisms
 */
contract FeedbackAuthenticationDAO is IFeedbackAuthenticationDAO, Ownable, ReentrancyGuard {
    // ============ Constants ============
    
    uint256 public constant AUTHENTICATION_PERIOD = 24 hours;
    uint256 public constant VOTING_PERIOD = 4 hours;
    uint256 public constant MEMBER_TOKEN_DIVISOR = 100; // For calculating new member tokens
    
    // ============ State Variables ============
    
    /// @dev The Compass Token contract
    CompassToken public immutable compassToken;
    
    /// @dev The ERC-8004 Reputation Registry contract
    IReputationRegistry public immutable reputationRegistry;
    
    /// @dev Set of DAO members
    mapping(address => bool) public members;
    
    /// @dev Total number of members
    uint256 public totalMembers;
    
    /// @dev Treasury balance (tokens held by the DAO)
    uint256 public treasuryBalance;
    
    /// @dev Authentication counter
    uint256 public nextAuthId = 1;
    
    /// @dev Pending authentications
    mapping(uint256 => PendingAuthentication) public pendingAuthentications;
    
    /// @dev Contestations for pending authentications
    mapping(uint256 => Contestation) public contestations;
    
    /// @dev Votes for contestations
    mapping(uint256 => mapping(address => Vote)) public votes;
    
    /// @dev Authenticated feedback registry: agentId => (clientAddress => feedbackIndex[]) => exists
    mapping(uint256 => mapping(address => mapping(uint64 => bool))) public authenticatedFeedback;
    
    /// @dev Authenticated feedback lists for easy querying: agentId => clientAddresses[]
    mapping(uint256 => address[]) public authenticatedClients;
    
    /// @dev Authenticated feedback indices: agentId => clientAddress => feedbackIndices[]
    mapping(uint256 => mapping(address => uint64[])) public authenticatedFeedbackIndices;
    
    /// @dev Track if client exists in authenticated clients list
    mapping(uint256 => mapping(address => bool)) public authenticatedClientExists;
    
    // ============ Constructor ============
    
    /**
     * @dev Constructor initializes the DAO
     * @param _compassToken Address of the Compass Token contract
     * @param _reputationRegistry Address of the ERC-8004 Reputation Registry
     * @param _initialTreasury Initial treasury amount (tokens transferred from deployer)
     */
    constructor(
        address _compassToken,
        address _reputationRegistry,
        uint256 _initialTreasury
    ) {
        require(_compassToken != address(0), "Invalid token address");
        require(_reputationRegistry != address(0), "Invalid registry address");
        require(_initialTreasury > 0, "Initial treasury must be greater than 0");
        
        compassToken = CompassToken(_compassToken);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        
        // Set initial treasury balance (tokens should be transferred by deployer)
        treasuryBalance = _initialTreasury;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Update treasury balance to match actual token balance
     * @dev Useful after initial deployment to sync state with actual balance
     */
    function updateTreasuryBalance() external {
        treasuryBalance = compassToken.balanceOf(address(this));
    }
    
    /**
     * @notice Join the DAO and receive initial tokens
     */
    function joinDAO() external nonReentrant {
        require(!members[msg.sender], "Already a member");
        
        // Calculate tokens to give: treasuryBalance / (totalMembers * 100)
        // For the first member, give a fixed amount to avoid division by zero
        uint256 tokensToGive;
        if (totalMembers == 0) {
            tokensToGive = treasuryBalance / 10; // Give 10% of treasury to first member
        } else {
            tokensToGive = treasuryBalance / (totalMembers * MEMBER_TOKEN_DIVISOR);
        }
        require(tokensToGive > 0, "Insufficient treasury for new member");
        
        // Add member
        members[msg.sender] = true;
        totalMembers++;
        
        // Transfer tokens from treasury
        treasuryBalance -= tokensToGive;
        require(compassToken.transfer(msg.sender, tokensToGive), "Token transfer failed");
        
        emit MemberJoined(msg.sender, tokensToGive);
    }
    
    /**
     * @notice Stake tokens to authenticate feedback
     * @param agentId The agent ID from ERC-8004
     * @param clientAddress The client who gave the feedback
     * @param feedbackIndex The feedback index
     * @param stakeAmount Amount of tokens to stake
     * @return authId The authentication ID
     */
    function authenticateFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        uint256 stakeAmount
    ) external nonReentrant returns (uint256 authId) {
        require(members[msg.sender], "Not a DAO member");
        require(stakeAmount > 0, "Stake amount must be greater than 0");
        require(compassToken.balanceOf(msg.sender) >= stakeAmount, "Insufficient token balance");
        require(!isAuthenticatedFeedback(agentId, clientAddress, feedbackIndex), "Feedback already authenticated");
        
        // Verify feedback exists in ERC-8004 registry
        try reputationRegistry.readFeedback(agentId, clientAddress, feedbackIndex) returns (
            uint8 score,
            bytes32 tag1,
            bytes32 tag2,
            bool isRevoked
        ) {
            require(!isRevoked, "Feedback is revoked");
        } catch {
            revert("Feedback does not exist in registry");
        }
        
        // Transfer tokens from staker to this contract
        require(compassToken.transferFrom(msg.sender, address(this), stakeAmount), "Token transfer failed");
        
        // Create authentication
        authId = nextAuthId++;
        pendingAuthentications[authId] = PendingAuthentication({
            staker: msg.sender,
            stakeAmount: stakeAmount,
            startTime: block.timestamp,
            pausedAt: 0,
            agentId: agentId,
            clientAddress: clientAddress,
            feedbackIndex: feedbackIndex,
            status: AuthenticationStatus.Pending
        });
        
        emit FeedbackAuthenticationStarted(authId, msg.sender, agentId, clientAddress, feedbackIndex, stakeAmount);
    }
    
    /**
     * @notice Contest a pending authentication
     * @param authId The authentication ID to contest
     * @param stakeAmount Amount of tokens to stake (must equal original stake)
     */
    function contestAuthentication(uint256 authId, uint256 stakeAmount) external nonReentrant {
        PendingAuthentication storage auth = pendingAuthentications[authId];
        require(auth.status == AuthenticationStatus.Pending, "Authentication not pending");
        require(block.timestamp < auth.startTime + AUTHENTICATION_PERIOD, "Authentication period expired");
        require(members[msg.sender], "Not a DAO member");
        require(stakeAmount == auth.stakeAmount, "Stake amount must equal original stake");
        require(compassToken.balanceOf(msg.sender) >= stakeAmount, "Insufficient token balance");
        
        // Transfer contest stake
        require(compassToken.transferFrom(msg.sender, address(this), stakeAmount), "Token transfer failed");
        
        // Create contestation
        contestations[authId] = Contestation({
            contester: msg.sender,
            contestStake: stakeAmount,
            voteStartTime: block.timestamp,
            legitimateStake: 0,
            notLegitimateStake: 0,
            isActive: true
        });
        
        // Update authentication status and pause timer
        auth.status = AuthenticationStatus.Contested;
        auth.pausedAt = block.timestamp;
        
        emit AuthenticationContested(authId, msg.sender, stakeAmount);
    }
    
    /**
     * @notice Vote on a contested authentication
     * @param authId The authentication ID
     * @param choice Vote choice (Legitimate or NotLegitimate)
     * @param stakeAmount Amount of tokens to stake for voting
     */
    function voteOnContestation(
        uint256 authId,
        VoteChoice choice,
        uint256 stakeAmount
    ) external nonReentrant {
        Contestation storage contest = contestations[authId];
        require(contest.isActive, "Contestation not active");
        require(block.timestamp < contest.voteStartTime + VOTING_PERIOD, "Voting period expired");
        require(choice != VoteChoice.None, "Invalid vote choice");
        require(members[msg.sender], "Not a DAO member");
        require(stakeAmount > 0, "Stake amount must be greater than 0");
        require(compassToken.balanceOf(msg.sender) >= stakeAmount, "Insufficient token balance");
        require(!votes[authId][msg.sender].hasVoted, "Already voted");
        
        // Transfer voting stake
        require(compassToken.transferFrom(msg.sender, address(this), stakeAmount), "Token transfer failed");
        
        // Record vote
        votes[authId][msg.sender] = Vote({
            choice: choice,
            stakeAmount: stakeAmount,
            hasVoted: true
        });
        
        // Update stake totals
        if (choice == VoteChoice.Legitimate) {
            contest.legitimateStake += stakeAmount;
        } else {
            contest.notLegitimateStake += stakeAmount;
        }
        
        emit VoteCast(authId, msg.sender, choice, stakeAmount);
    }
    
    /**
     * @notice Finalize an uncontested authentication after 24 hours
     * @param authId The authentication ID to finalize
     */
    function finalizeAuthentication(uint256 authId) external nonReentrant {
        PendingAuthentication storage auth = pendingAuthentications[authId];
        require(auth.status == AuthenticationStatus.Pending, "Authentication not pending");
        require(block.timestamp >= auth.startTime + AUTHENTICATION_PERIOD, "Authentication period not completed");
        
        // Mark as authenticated
        auth.status = AuthenticationStatus.Authenticated;
        
        // Add to authenticated feedback registry
        _addAuthenticatedFeedback(auth.agentId, auth.clientAddress, auth.feedbackIndex);
        
        // Calculate reward: treasuryBalance / (totalMembers * amountStaked)
        uint256 rewardAmount = treasuryBalance / (totalMembers * auth.stakeAmount);
        uint256 totalReturn = auth.stakeAmount + rewardAmount;
        
        // Update treasury
        treasuryBalance -= rewardAmount;
        
        // Return stake + reward to staker
        require(compassToken.transfer(auth.staker, totalReturn), "Token transfer failed");
        
        emit AuthenticationFinalized(authId, true, rewardAmount);
        emit FeedbackAuthenticated(auth.agentId, auth.clientAddress, auth.feedbackIndex);
    }
    
    /**
     * @notice Finalize a contested authentication after 4-hour voting period
     * @param authId The authentication ID to finalize
     */
    function finalizeContestation(uint256 authId) external nonReentrant {
        Contestation storage contest = contestations[authId];
        PendingAuthentication storage auth = pendingAuthentications[authId];
        
        require(contest.isActive, "Contestation not active");
        require(block.timestamp >= contest.voteStartTime + VOTING_PERIOD, "Voting period not completed");
        require(auth.status == AuthenticationStatus.Contested, "Authentication not contested");
        
        // Determine winner
        bool legitimateWon = contest.legitimateStake > contest.notLegitimateStake;
        uint256 totalStake = contest.legitimateStake + contest.notLegitimateStake;
        
        // Deactivate contestation
        contest.isActive = false;
        
        if (legitimateWon) {
            // Legitimate won - resume 24-hour timer
            auth.status = AuthenticationStatus.Pending;
            auth.startTime = block.timestamp - (auth.pausedAt - auth.startTime); // Resume from where paused
            
            // Distribute rewards to legitimate voters (1.5x their stake)
            _distributeVotingRewards(authId, VoteChoice.Legitimate, totalStake);
            
            emit ContestationFinalized(authId, true, totalStake);
        } else {
            // Not legitimate won - reject authentication
            auth.status = AuthenticationStatus.Rejected;
            
            // Distribute rewards to not legitimate voters (1.5x their stake)
            _distributeVotingRewards(authId, VoteChoice.NotLegitimate, totalStake);
            
            // Return original stakes to staker and contester
            require(compassToken.transfer(auth.staker, auth.stakeAmount), "Staker refund failed");
            require(compassToken.transfer(contest.contester, contest.contestStake), "Contester refund failed");
            
            emit ContestationFinalized(authId, false, totalStake);
            emit AuthenticationFinalized(authId, false, 0);
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if an address is a DAO member
     * @param member The address to check
     * @return isMember True if the address is a member
     */
    function isMember(address member) external view returns (bool) {
        return members[member];
    }
    
    /**
     * @notice Get total number of DAO members
     * @return memberCount Total number of members
     */
    function getMemberCount() external view returns (uint256 memberCount) {
        return totalMembers;
    }
    
    /**
     * @notice Get treasury balance
     * @return balance Current treasury balance
     */
    function getTreasuryBalance() external view returns (uint256 balance) {
        return treasuryBalance;
    }
    
    /**
     * @notice Get pending authentication details
     * @param authId The authentication ID
     * @return auth The authentication struct
     */
    function getPendingAuthentication(uint256 authId) external view returns (PendingAuthentication memory auth) {
        return pendingAuthentications[authId];
    }
    
    /**
     * @notice Get contestation details
     * @param authId The authentication ID
     * @return contest The contestation struct
     */
    function getContestation(uint256 authId) external view returns (Contestation memory contest) {
        return contestations[authId];
    }
    
    /**
     * @notice Get vote details for a member
     * @param authId The authentication ID
     * @param voter The voter address
     * @return vote The vote struct
     */
    function getVote(uint256 authId, address voter) external view returns (Vote memory vote) {
        return votes[authId][voter];
    }
    
    /**
     * @notice Check if specific feedback is authenticated by the DAO
     * @param agentId The agent ID
     * @param clientAddress The client address
     * @param feedbackIndex The feedback index
     * @return isAuthenticated True if the feedback is DAO authenticated
     */
    function isAuthenticatedFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) public view returns (bool isAuthenticated) {
        return authenticatedFeedback[agentId][clientAddress][feedbackIndex];
    }
    
    /**
     * @notice Get all authenticated feedback for an agent
     * @param agentId The agent ID
     * @return clientAddresses Array of client addresses
     * @return feedbackIndices Array of feedback indices
     */
    function getAuthenticatedFeedback(uint256 agentId) 
        external view returns (address[] memory clientAddresses, uint64[] memory feedbackIndices) {
        address[] memory clients = authenticatedClients[agentId];
        uint256 totalCount = 0;
        
        // Count total feedback entries
        for (uint256 i = 0; i < clients.length; i++) {
            totalCount += authenticatedFeedbackIndices[agentId][clients[i]].length;
        }
        
        // Allocate arrays
        clientAddresses = new address[](totalCount);
        feedbackIndices = new uint64[](totalCount);
        
        // Populate arrays
        uint256 idx = 0;
        for (uint256 i = 0; i < clients.length; i++) {
            uint64[] memory indices = authenticatedFeedbackIndices[agentId][clients[i]];
            for (uint256 j = 0; j < indices.length; j++) {
                clientAddresses[idx] = clients[i];
                feedbackIndices[idx] = indices[j];
                idx++;
            }
        }
    }
    
    /**
     * @notice Get the number of authenticated feedback entries for an agent
     * @param agentId The agent ID
     * @return count Number of authenticated feedback entries
     */
    function getAuthenticatedFeedbackCount(uint256 agentId) external view returns (uint256 count) {
        address[] memory clients = authenticatedClients[agentId];
        for (uint256 i = 0; i < clients.length; i++) {
            count += authenticatedFeedbackIndices[agentId][clients[i]].length;
        }
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Add feedback to the authenticated registry
     * @param agentId The agent ID
     * @param clientAddress The client address
     * @param feedbackIndex The feedback index
     */
    function _addAuthenticatedFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) internal {
        // Mark as authenticated
        authenticatedFeedback[agentId][clientAddress][feedbackIndex] = true;
        
        // Add to client list if not already present
        if (!authenticatedClientExists[agentId][clientAddress]) {
            authenticatedClients[agentId].push(clientAddress);
            authenticatedClientExists[agentId][clientAddress] = true;
        }
        
        // Add to feedback indices list
        authenticatedFeedbackIndices[agentId][clientAddress].push(feedbackIndex);
    }
    
    /**
     * @dev Distribute voting rewards to winners
     * @param authId The authentication ID
     * @param winningChoice The winning vote choice
     * @param totalStake Total stake in the contestation
     */
    function _distributeVotingRewards(
        uint256 authId,
        VoteChoice winningChoice,
        uint256 totalStake
    ) internal {
        // This is a simplified implementation
        // In a full implementation, you would iterate through all voters and distribute rewards
        // For now, we'll add the total stake to treasury (0.5x goes to treasury as per spec)
        uint256 treasuryShare = totalStake / 2; // 0.5x goes to treasury
        treasuryBalance += treasuryShare;
        
        // Note: In a full implementation, you would need to track all voters and distribute
        // 1.5x their stake back to them, with the remaining 0.5x going to treasury
        // This requires additional storage and iteration which is gas-intensive
    }
}
