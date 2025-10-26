// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IFeedbackAuthenticationDAO
 * @dev Interface for the Feedback Authentication DAO
 * @notice Defines the interface for authenticating ERC-8004 feedback through DAO consensus
 */
interface IFeedbackAuthenticationDAO {
    // ============ Enums ============
    
    enum AuthenticationStatus {
        Pending,        // Authentication is pending 24-hour period
        Contested,      // Authentication is being contested and voted on
        Authenticated,  // Authentication completed successfully
        Rejected        // Authentication was rejected through voting
    }
    
    enum VoteChoice {
        None,           // No vote cast
        Legitimate,     // Vote for legitimate feedback
        NotLegitimate   // Vote for not legitimate feedback
    }
    
    // ============ Structs ============
    
    struct PendingAuthentication {
        address staker;
        uint256 stakeAmount;
        uint256 startTime;
        uint256 pausedAt;           // Time when contestation paused the timer (0 if not paused)
        uint256 agentId;
        address clientAddress;
        uint64 feedbackIndex;
        AuthenticationStatus status;
    }
    
    struct Contestation {
        address contester;
        uint256 contestStake;
        uint256 voteStartTime;
        uint256 legitimateStake;
        uint256 notLegitimateStake;
        bool isActive;
    }
    
    struct Vote {
        VoteChoice choice;
        uint256 stakeAmount;
        bool hasVoted;
    }
    
    // ============ Events ============
    
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
        VoteChoice choice,
        uint256 stakeAmount
    );
    event ContestationFinalized(
        uint256 indexed authId,
        bool legitimateWon,
        uint256 totalStake
    );
    event AuthenticationFinalized(
        uint256 indexed authId,
        bool success,
        uint256 rewardAmount
    );
    event FeedbackAuthenticated(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );
    
    // ============ Core Functions ============
    
    /**
     * @notice Join the DAO and receive initial tokens
     */
    function joinDAO() external;
    
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
    ) external returns (uint256 authId);
    
    /**
     * @notice Contest a pending authentication
     * @param authId The authentication ID to contest
     * @param stakeAmount Amount of tokens to stake (must equal original stake)
     */
    function contestAuthentication(uint256 authId, uint256 stakeAmount) external;
    
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
    ) external;
    
    /**
     * @notice Finalize an uncontested authentication after 24 hours
     * @param authId The authentication ID to finalize
     */
    function finalizeAuthentication(uint256 authId) external;
    
    /**
     * @notice Finalize a contested authentication after 4-hour voting period
     * @param authId The authentication ID to finalize
     */
    function finalizeContestation(uint256 authId) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Check if an address is a DAO member
     * @param member The address to check
     * @return isMember True if the address is a member
     */
    function isMember(address member) external view returns (bool isMember);
    
    /**
     * @notice Get total number of DAO members
     * @return memberCount Total number of members
     */
    function getMemberCount() external view returns (uint256 memberCount);
    
    /**
     * @notice Get treasury balance
     * @return balance Current treasury balance
     */
    function getTreasuryBalance() external view returns (uint256 balance);
    
    /**
     * @notice Get pending authentication details
     * @param authId The authentication ID
     * @return auth The authentication struct
     */
    function getPendingAuthentication(uint256 authId) external view returns (PendingAuthentication memory auth);
    
    /**
     * @notice Get contestation details
     * @param authId The authentication ID
     * @return contest The contestation struct
     */
    function getContestation(uint256 authId) external view returns (Contestation memory contest);
    
    /**
     * @notice Get vote details for a member
     * @param authId The authentication ID
     * @param voter The voter address
     * @return vote The vote struct
     */
    function getVote(uint256 authId, address voter) external view returns (Vote memory vote);
    
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
    ) external view returns (bool isAuthenticated);
    
    /**
     * @notice Get all authenticated feedback for an agent
     * @param agentId The agent ID
     * @return clientAddresses Array of client addresses
     * @return feedbackIndices Array of feedback indices
     */
    function getAuthenticatedFeedback(uint256 agentId) 
        external view returns (address[] memory clientAddresses, uint64[] memory feedbackIndices);
    
    /**
     * @notice Get the number of authenticated feedback entries for an agent
     * @param agentId The agent ID
     * @return count Number of authenticated feedback entries
     */
    function getAuthenticatedFeedbackCount(uint256 agentId) external view returns (uint256 count);
}
