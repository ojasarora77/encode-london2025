// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @notice Interface for external ERC-8004 identity registry
/// @dev This is the trustless-agents-erc-ri contract
interface IERC8004Registry {
    /// @notice Add feedback ID to agent's identity
    function addFeedbackToAgent(
        string calldata agentId,
        bytes32 feedbackId,
        string calldata feedbackURI
    ) external;
    
    /// @notice Update feedback settlement status
    function settleFeedback(
        string calldata agentId,
        bytes32 feedbackId,
        uint8 finalOutcome,
        bool wasContested,
        uint256 economicWeight
    ) external;
    
    /// @notice Check if agent exists in ERC-8004 registry
    function agentExists(string calldata agentId) external view returns (bool);
}

/**
 * @title FeedbackMarket
 * @notice UMA-style optimistic oracle for contestable agent reviews
 * @dev Implements prediction market design with optimistic assertions and disputes
 * @dev Integrates with external ERC-8004 identity registry for agent identities
 * 
 * INCENTIVE MECHANISM:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ✅ INCENTIVIZE GOOD FEEDBACK:
 * - Honest reviewers earn 10% profit (stake × 1.1)
 * - Build accuracy reputation → voting power multiplier (up to 50%)
 * - Optimistic settlement = no gas costs if correct
 * - Compound returns via staking vault APY
 * 
 * ❌ DISINCENTIVIZE BAD FEEDBACK:
 * - Dishonest reviewers lose 100% of stake
 * - Slashed stakes distributed to winner + staking vault
 * - Reputation damage → reduced voting power
 * - Future reviews more likely to be challenged
 * 
 * ECONOMIC GAME THEORY:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Honest Path:
 *   Stake 100 AGTC → No contest → Receive 110 AGTC (+10 profit + reputation)
 * 
 * Dishonest Path:
 *   Stake 100 AGTC → Contested → Lose vote → Receive 0 AGTC (-100 + reputation damage)
 * 
 * Frivolous Challenge:
 *   Stake 100 AGTC → Challenge valid review → Lose vote → Receive 0 AGTC (-100 - gas - reputation)
 * 
 * Nash Equilibrium:
 *   Rational actors only submit honest reviews & only contest with evidence
 * 
 * FLOW:
 * ═══════════════════════════════════════════════════════════════════
 * 1. User submits review + stake → 2hr liveness period
 * 2. If not contested → settles optimistically → user claims reward
 * 3. If contested → challenger matches stake → triggers DAO vote (24hr)
 * 4. Majority outcome → winner claims both stakes, loser slashed
 * 
 * Key Features:
 * - Optimistic assertions (UMA-style)
 * - Contestation with matched stakes
 * - Liveness periods (configurable)
 * - Polymarket-style binary outcomes
 * - Integration with DAO for dispute resolution
 * 
 * Sources:
 * - UMA Optimistic Oracle V3: https://docs.uma.xyz/developers/optimistic-oracle-v3
 * - UMA Assertion patterns: https://github.com/UMAprotocol/protocol
 * - Polymarket prediction markets
 */
contract FeedbackMarket is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    /// @notice Review states following UMA optimistic oracle pattern
    enum ReviewState {
        None,           // Review doesn't exist
        Proposed,       // Review submitted, in liveness period
        Settled,        // Review settled optimistically (no contest)
        Contested,      // Review contested, awaiting DAO vote
        Resolved,       // Review resolved after DAO vote
        Expired         // Review expired without settlement
    }
    
    /// @notice Review outcome (binary like Polymarket)
    enum Outcome {
        Pending,        // Not yet determined
        Positive,       // Agent performed well
        Negative,       // Agent performed poorly
        Invalid         // Review deemed invalid by DAO
    }
    
    /// @notice Review assertion data
    struct Review {
        bytes32 reviewId;           // Unique review identifier
        string agentId;             // Agent being reviewed
        address reviewer;           // Review submitter
        string reviewDataURI;       // IPFS URI to review data
        uint256 stake;              // Stake amount (AGTC tokens)
        Outcome proposedOutcome;    // Proposed outcome (Positive/Negative)
        ReviewState state;          // Current state
        uint256 proposedAt;         // Timestamp of proposal
        uint256 livenessDeadline;   // Deadline for contestation
        address challenger;         // Address that contested (if any)
        uint256 challengeStake;     // Challenger's matched stake
        uint256 disputeId;          // DAO proposal ID for dispute
        Outcome finalOutcome;       // Final settled outcome
        uint256 settledAt;          // Settlement timestamp
    }
    
    /// @notice Governance token (AGTC)
    address public governanceToken;
    
    /// @notice Agent registry contract (local reputation)
    address public agentRegistry;
    
    /// @notice External ERC-8004 identity registry
    /// @dev This is the trustless-agents-erc-ri contract
    /// @dev FeedbackIds are stored in agent's identity on ERC-8004
    address public erc8004Registry;
    
    /// @notice DAO contract for dispute resolution
    address public dao;
    
    /// @notice Staking vault for rewards
    address public stakingVault;
    
    /// @notice Minimum stake required (in AGTC tokens)
    uint256 public minimumStake;
    
    /// @notice Liveness period for optimistic settlement (default: 2 hours)
    uint256 public livenessPeriod;
    
    /// @notice Reward multiplier for correct reviews (basis points, 10000 = 100%)
    uint256 public rewardMultiplier;
    
    /// @notice Mapping from reviewId to Review struct
    mapping(bytes32 => Review) public reviews;
    
    /// @notice Mapping from agentId to review IDs
    mapping(string => bytes32[]) public agentReviews;
    
    /// @notice All review IDs
    bytes32[] public allReviewIds;
    
    /// @notice Events following UMA optimistic oracle pattern
    event ReviewProposed(
        bytes32 indexed reviewId,
        string indexed agentId,
        address indexed reviewer,
        Outcome proposedOutcome,
        uint256 stake,
        uint256 livenessDeadline
    );
    
    event ReviewContested(
        bytes32 indexed reviewId,
        address indexed challenger,
        uint256 challengeStake,
        uint256 disputeId
    );
    
    event ReviewSettled(
        bytes32 indexed reviewId,
        Outcome finalOutcome,
        address indexed winner,
        uint256 reward
    );
    
    event ReviewResolved(
        bytes32 indexed reviewId,
        Outcome finalOutcome,
        uint256 disputeId
    );
    
    event ParametersUpdated(
        uint256 minimumStake,
        uint256 livenessPeriod,
        uint256 rewardMultiplier
    );
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the feedback market
     * @param _governanceToken AGTC token address
     * @param _agentRegistry Agent registry address
     * @param _dao DAO contract address
     * @param _stakingVault Staking vault address
     */
    function initialize(
        address _governanceToken,
        address _agentRegistry,
        address _dao,
        address _stakingVault
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        governanceToken = _governanceToken;
        agentRegistry = _agentRegistry;
        dao = _dao;
        stakingVault = _stakingVault;
        
        // Default parameters (following UMA patterns)
        minimumStake = 100 * 10**18;  // 100 AGTC tokens
        livenessPeriod = 2 hours;      // 2hr optimistic liveness
        rewardMultiplier = 11000;      // 110% reward (10% profit)
    }
    
    /**
     * @notice Submit a review with optimistic assertion (UMA pattern)
     * @param agentId Agent being reviewed
     * @param reviewDataURI IPFS URI to review data
     * @param proposedOutcome Proposed outcome (Positive/Negative)
     * @param stake Stake amount (must be >= minimumStake)
     * @return reviewId Unique review identifier
     */
    function proposeReview(
        string calldata agentId,
        string calldata reviewDataURI,
        Outcome proposedOutcome,
        uint256 stake
    ) external nonReentrant returns (bytes32) {
        require(stake >= minimumStake, "FeedbackMarket: stake too low");
        require(
            proposedOutcome == Outcome.Positive || proposedOutcome == Outcome.Negative,
            "FeedbackMarket: invalid outcome"
        );
        
        // Generate unique review ID
        bytes32 reviewId = keccak256(abi.encodePacked(
            agentId,
            msg.sender,
            block.timestamp,
            block.number
        ));
        
        require(reviews[reviewId].state == ReviewState.None, "FeedbackMarket: review exists");
        
        // Transfer stake from reviewer
        // TODO: Add actual token transfer when integrated
        // IERC20(governanceToken).transferFrom(msg.sender, address(this), stake);
        
        // Create review with optimistic assertion
        reviews[reviewId] = Review({
            reviewId: reviewId,
            agentId: agentId,
            reviewer: msg.sender,
            reviewDataURI: reviewDataURI,
            stake: stake,
            proposedOutcome: proposedOutcome,
            state: ReviewState.Proposed,
            proposedAt: block.timestamp,
            livenessDeadline: block.timestamp + livenessPeriod,
            challenger: address(0),
            challengeStake: 0,
            disputeId: 0,
            finalOutcome: Outcome.Pending,
            settledAt: 0
        });
        
        agentReviews[agentId].push(reviewId);
        allReviewIds.push(reviewId);
        
        emit ReviewProposed(
            reviewId,
            agentId,
            msg.sender,
            proposedOutcome,
            stake,
            block.timestamp + livenessPeriod
        );
        
        return reviewId;
    }
    
    /**
     * @notice Settle review optimistically after liveness period (UMA pattern)
     * @param reviewId Review identifier
     */
    function settleReview(bytes32 reviewId) external nonReentrant {
        Review storage review = reviews[reviewId];
        
        require(review.state == ReviewState.Proposed, "FeedbackMarket: not proposed");
        require(block.timestamp >= review.livenessDeadline, "FeedbackMarket: liveness not expired");
        
        // Optimistic settlement - no contest during liveness period
        review.state = ReviewState.Settled;
        review.finalOutcome = review.proposedOutcome;
        review.settledAt = block.timestamp;
        
        // Calculate reward (stake + profit)
        uint256 reward = (review.stake * rewardMultiplier) / 10000;
        
        // Transfer reward to reviewer
        // TODO: Add actual token transfer
        // IERC20(governanceToken).transfer(review.reviewer, reward);
        
        // Update agent reputation
        // TODO: Call agentRegistry.updateReputation()
        
        emit ReviewSettled(reviewId, review.finalOutcome, review.reviewer, reward);
    }
    
    /**
     * @notice Contest a review (UMA dispute pattern)
     * @param reviewId Review identifier
     * @param challengeStake Challenger's stake (must match or exceed original stake)
     */
    function contestReview(bytes32 reviewId, uint256 challengeStake) external nonReentrant {
        Review storage review = reviews[reviewId];
        
        require(review.state == ReviewState.Proposed, "FeedbackMarket: not proposed");
        require(block.timestamp < review.livenessDeadline, "FeedbackMarket: liveness expired");
        require(challengeStake >= review.stake, "FeedbackMarket: insufficient challenge stake");
        
        // Transfer challenge stake
        // TODO: Add actual token transfer
        // IERC20(governanceToken).transferFrom(msg.sender, address(this), challengeStake);
        
        review.state = ReviewState.Contested;
        review.challenger = msg.sender;
        review.challengeStake = challengeStake;
        
        // Create DAO proposal for dispute resolution (24hr vote)
        // TODO: Integrate with actual DAO contract
        uint256 disputeId = _createDisputeProposal(reviewId);
        review.disputeId = disputeId;
        
        emit ReviewContested(reviewId, msg.sender, challengeStake, disputeId);
    }
    
    /**
     * @notice Resolve disputed review after DAO vote (UMA resolution pattern)
     * @param reviewId Review identifier
     * @param daoOutcome Outcome determined by DAO vote
     */
    function resolveDispute(bytes32 reviewId, Outcome daoOutcome) external {
        require(msg.sender == dao, "FeedbackMarket: only DAO");
        
        Review storage review = reviews[reviewId];
        require(review.state == ReviewState.Contested, "FeedbackMarket: not contested");
        
        review.state = ReviewState.Resolved;
        review.finalOutcome = daoOutcome;
        review.settledAt = block.timestamp;
        
        // Determine winner and distribute stakes
        address winner;
        address loser;
        uint256 totalStake = review.stake + review.challengeStake;
        
        if (daoOutcome == review.proposedOutcome) {
            // Reviewer was correct
            winner = review.reviewer;
            loser = review.challenger;
        } else if (daoOutcome == Outcome.Positive || daoOutcome == Outcome.Negative) {
            // Challenger was correct
            winner = review.challenger;
            loser = review.reviewer;
        } else {
            // Invalid - return stakes
            // TODO: Return both stakes
            emit ReviewResolved(reviewId, daoOutcome, review.disputeId);
            return;
        }
        
        // Winner gets both stakes + reward
        uint256 winnerReward = (totalStake * rewardMultiplier) / 10000;
        
        // Loser stake is slashed (goes to treasury/staking vault)
        // TODO: Transfer winner reward and slash loser stake
        
        // Update agent reputation
        // TODO: Call agentRegistry.updateReputation()
        
        emit ReviewResolved(reviewId, daoOutcome, review.disputeId);
        emit ReviewSettled(reviewId, daoOutcome, winner, winnerReward);
    }
    
    /**
     * @notice Update market parameters (DAO governance)
     * @param _minimumStake New minimum stake
     * @param _livenessPeriod New liveness period
     * @param _rewardMultiplier New reward multiplier
     */
    function updateParameters(
        uint256 _minimumStake,
        uint256 _livenessPeriod,
        uint256 _rewardMultiplier
    ) external onlyOwner {
        minimumStake = _minimumStake;
        livenessPeriod = _livenessPeriod;
        rewardMultiplier = _rewardMultiplier;
        
        emit ParametersUpdated(_minimumStake, _livenessPeriod, _rewardMultiplier);
    }
    
    /**
     * @notice Get review details
     * @param reviewId Review identifier
     * @return Review struct
     */
    function getReview(bytes32 reviewId) external view returns (Review memory) {
        return reviews[reviewId];
    }
    
    /**
     * @notice Get all reviews for an agent
     * @param agentId Agent identifier
     * @return Array of review IDs
     */
    function getAgentReviews(string calldata agentId) external view returns (bytes32[] memory) {
        return agentReviews[agentId];
    }
    
    /**
     * @notice Get staking requirements and potential returns
     * @return minimumRequired Minimum stake amount in AGTC
     * @return recommendedStake Recommended stake for better rewards
     * @return expectedReturn Expected return multiplier (basis points, 10000 = 100%)
     * @return livenessWindow Time to wait for settlement (in seconds)
     */
    function getStakingInfo() external view returns (
        uint256 minimumRequired,
        uint256 recommendedStake,
        uint256 expectedReturn,
        uint256 livenessWindow
    ) {
        return (
            minimumStake,              // e.g., 100 AGTC
            minimumStake * 5,          // Recommended: 5x minimum for better visibility
            rewardMultiplier,          // e.g., 11000 = 110% return
            livenessPeriod             // e.g., 7200 seconds (2 hours)
        );
    }
    
    /**
     * @notice Calculate potential profit for a given stake
     * @param stakeAmount Amount user wants to stake
     * @return profit Expected profit if review settles optimistically
     * @return totalReturn Total amount returned (stake + profit)
     * @return riskAmount Amount at risk if contested and lost
     */
    function calculatePotentialReturns(uint256 stakeAmount) external view returns (
        uint256 profit,
        uint256 totalReturn,
        uint256 riskAmount
    ) {
        require(stakeAmount >= minimumStake, "FeedbackMarket: below minimum stake");
        
        totalReturn = (stakeAmount * rewardMultiplier) / 10000;
        profit = totalReturn - stakeAmount;
        riskAmount = stakeAmount; // 100% loss if challenged and wrong
        
        return (profit, totalReturn, riskAmount);
    }
    
    /**
     * @notice Check if user has enough balance to stake
     * @param user User address
     * @param stakeAmount Desired stake amount
     * @return hasBalance Whether user has sufficient balance
     * @return currentBalance User's current AGTC balance
     * @return shortfall Amount needed to reach stake (0 if sufficient)
     */
    function canUserStake(address user, uint256 stakeAmount) external view returns (
        bool hasBalance,
        uint256 currentBalance,
        uint256 shortfall
    ) {
        // TODO: Integrate with actual AGTC token when connected
        // IERC20 token = IERC20(governanceToken);
        // currentBalance = token.balanceOf(user);
        
        // Mock for now - replace with real token check
        user; stakeAmount; // Silence unused parameter warnings
        currentBalance = 0; // Replace with: token.balanceOf(user)
        
        hasBalance = currentBalance >= stakeAmount;
        shortfall = hasBalance ? 0 : stakeAmount - currentBalance;
        
        return (hasBalance, currentBalance, shortfall);
    }
    
    /**
     * @notice Get user's review history and accuracy
     * @param user User address
     * @return totalReviews Total reviews submitted
     * @return settledReviews Reviews settled optimistically
     * @return contestedReviews Reviews that were contested
     * @return wonDisputes Disputes won by user
     * @return accuracyScore Accuracy percentage (basis points, 10000 = 100%)
     */
    function getUserStats(address user) external pure returns (
        uint256 totalReviews,
        uint256 settledReviews,
        uint256 contestedReviews,
        uint256 wonDisputes,
        uint256 accuracyScore
    ) {
        // TODO: Track user stats in storage
        user; // Silence unused parameter warning
        return (0, 0, 0, 0, 0);
    }
    
    /**
     * @notice Internal: Create DAO dispute proposal
     * @param reviewId Review identifier
     * @return disputeId DAO proposal ID
     */
    function _createDisputeProposal(bytes32 reviewId) internal view returns (uint256) {
        // TODO: Integrate with actual DAO contract
        // For now, return mock dispute ID
        return uint256(keccak256(abi.encodePacked(reviewId, block.timestamp)));
    }
    
    /**
     * @notice Required override for UUPS pattern
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
