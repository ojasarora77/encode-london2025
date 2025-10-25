# ERC-8004 Integration Guide

## 🔗 System Architecture

The AgentSearch DAO feedback system integrates with the **external ERC-8004 identity registry** (`trustless-agents-erc-ri`) to create a complete agent reputation system.

### Two-Registry Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE SYSTEM ARCHITECTURE                  │
└─────────────────────────────────────────────────────────────────┘

External: ERC-8004 Identity Registry (trustless-agents-erc-ri)
├─ Purpose: Agent identity attestations
├─ Stores: Agent identities, capabilities, feedback IDs
├─ Public: Anyone can query agent info
└─ Trustless: Decentralized identity standard

Internal: AgentSearch DAO Contracts (this repo)
├─ FeedbackMarket: Optimistic oracle for reviews
├─ AgentRegistry: Local reputation calculations
├─ AgentGovernanceToken: Voting power
└─ FeedbackDAO: Dispute resolution

Integration Flow:
ERC-8004 ←→ FeedbackMarket ←→ AgentRegistry
    ↑              ↓                ↓
Identity      Feedback ID      Reputation
Storage        Storage          Calculation
```

---

## 📋 Complete Workflow (User Perspective)

### Step 1: User Submits Feedback (FREE!)

```javascript
// Frontend code
async function submitFeedback(agentId, feedbackData) {
  // 1. Verify agent exists in ERC-8004
  const agentExists = await erc8004Registry.agentExists(agentId);
  if (!agentExists) throw new Error("Agent not registered");
  
  // 2. Upload feedback to IPFS
  const feedbackURI = await ipfs.upload(feedbackData);
  
  // 3. Submit feedback (NO STAKE YET)
  const tx = await feedbackMarket.submitFeedback(
    agentId,
    feedbackURI,
    Outcome.Positive  // or Negative
  );
  
  const receipt = await tx.wait();
  const feedbackId = receipt.events.find(e => e.event === 'FeedbackSubmitted').args.feedbackId;
  
  return feedbackId;
}

// Smart contract: FeedbackMarket.sol
function submitFeedback(
    string memory agentId,
    string memory reviewDataURI,
    Outcome proposedOutcome
) external returns (bytes32) {
    // Verify agent exists in ERC-8004
    require(IERC8004Registry(erc8004Registry).agentExists(agentId), "Agent not registered");
    
    // Generate feedback ID
    bytes32 feedbackId = keccak256(abi.encodePacked(
        agentId,
        msg.sender,
        block.timestamp,
        reviewDataURI
    ));
    
    // Create feedback struct (no stake yet)
    reviews[feedbackId] = Review({
        state: ReviewState.Submitted,  // New state!
        agentId: agentId,
        reviewer: msg.sender,
        proposedOutcome: proposedOutcome,
        reviewDataURI: reviewDataURI,
        reviewerStake: 0,  // Not staked yet
        submittedAt: block.timestamp,
        proposedAt: 0,
        livenessDeadline: 0,
        challenger: address(0),
        challengeStake: 0,
        disputeId: 0,
        finalOutcome: Outcome.Pending,
        settledAt: 0
    });
    
    // Add to agent's feedback list
    agentReviews[agentId].push(feedbackId);
    
    // 🔗 INTEGRATE WITH ERC-8004
    IERC8004Registry(erc8004Registry).addFeedbackToAgent(
        agentId,
        feedbackId,
        reviewDataURI
    );
    
    emit FeedbackSubmitted(feedbackId, agentId, msg.sender, proposedOutcome);
    
    return feedbackId;
}
```

**User sees:**
```
✅ Feedback Submitted!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feedback ID:     0xabc123...
Agent:           flight-booking-501
Status:          Submitted (free)

📌 Stored in ERC-8004 Registry
Your feedback is now public.

Next Steps:
[ ] Leave as free feedback (no rewards)
[ ] Stake tokens to verify and earn rewards
```

---

### Step 2: Optional - User Stakes Feedback

```javascript
// Frontend code
async function stakeFeedback(feedbackId, stakeAmount) {
  // Approve tokens
  await agtcToken.approve(feedbackMarket.address, stakeAmount);
  
  // Stake feedback
  const tx = await feedbackMarket.stakeFeedback(feedbackId, stakeAmount);
  await tx.wait();
}

// Smart contract: FeedbackMarket.sol
function stakeFeedback(
    bytes32 reviewId,
    uint256 stakeAmount
) external nonReentrant {
    Review storage review = reviews[reviewId];
    
    require(review.state == ReviewState.Submitted, "Already staked or invalid");
    require(review.reviewer == msg.sender, "Not your feedback");
    require(stakeAmount >= minimumStake, "Stake too low");
    
    // Transfer stake
    IERC20(governanceToken).transferFrom(msg.sender, address(this), stakeAmount);
    
    // Update review
    review.state = ReviewState.Proposed;
    review.reviewerStake = stakeAmount;
    review.proposedAt = block.timestamp;
    review.livenessDeadline = block.timestamp + livenessPeriod;
    
    // 🔗 UPDATE ERC-8004 STATUS
    // (Optional: external registry can track staking status)
    
    emit FeedbackStaked(reviewId, msg.sender, stakeAmount);
}
```

**User sees:**
```
✅ Feedback Staked!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Stake:              200 AGTC
Expected Return:    220 AGTC (+10%)
Settlement Time:    ~2 hours

⏰ Liveness Period Started
Your feedback can be challenged.
```

---

### Step 3: Settlement & ERC-8004 Update

#### Path A: Optimistic Settlement (90% of cases)

```javascript
// Smart contract: FeedbackMarket.sol
function settleReview(bytes32 reviewId) external nonReentrant {
    Review storage review = reviews[reviewId];
    
    require(review.state == ReviewState.Proposed, "Invalid state");
    require(block.timestamp >= review.livenessDeadline, "Liveness not expired");
    
    // Update state
    review.state = ReviewState.Settled;
    review.finalOutcome = review.proposedOutcome;
    review.settledAt = block.timestamp;
    
    // Calculate payout
    uint256 reward = (review.reviewerStake * rewardMultiplier) / 10000;
    
    // Transfer reward
    IERC20(governanceToken).transfer(review.reviewer, reward);
    
    // Update local reputation
    IAgentRegistry(agentRegistry).updateReputation(
        review.agentId,
        review.finalOutcome == Outcome.Positive
    );
    
    // 🔗 UPDATE ERC-8004 REGISTRY
    IERC8004Registry(erc8004Registry).settleFeedback(
        review.agentId,
        reviewId,
        uint8(review.finalOutcome),
        false,  // wasContested
        reward  // economicWeight
    );
    
    emit ReviewSettled(reviewId, review.finalOutcome, review.reviewer, reward);
}
```

**ERC-8004 Registry Updates:**
```solidity
// In ERC-8004 contract (external repo)
struct Agent {
    string agentId;
    bytes32[] feedbackIds;          // All feedback IDs
    bytes32[] settledFeedbacks;     // ← Add settled feedback
    bytes32[] pendingFeedbacks;     // ← Remove from pending
    uint256 reputationScore;        // ← Update based on outcome + weight
    
    mapping(bytes32 => FeedbackDetail) feedbackDetails;
}

struct FeedbackDetail {
    uint8 outcome;              // Positive/Negative
    uint256 economicWeight;     // Stake amount (trust signal)
    uint256 settledAt;
    bool wasContested;
    bool daoVerified;           // True if DAO voted
    address reviewer;
    string dataURI;
}

function settleFeedback(
    string memory agentId,
    bytes32 feedbackId,
    uint8 finalOutcome,
    bool wasContested,
    uint256 economicWeight
) external onlyFeedbackMarket {
    Agent storage agent = agents[agentId];
    
    // Move from pending to settled
    _removeFromArray(agent.pendingFeedbacks, feedbackId);
    agent.settledFeedbacks.push(feedbackId);
    
    // Store details
    agent.feedbackDetails[feedbackId] = FeedbackDetail({
        outcome: finalOutcome,
        economicWeight: economicWeight,
        settledAt: block.timestamp,
        wasContested: wasContested,
        daoVerified: wasContested,  // DAO verified if contested
        reviewer: msg.sender,
        dataURI: ""  // Already stored
    });
    
    // Update reputation (weighted by economic backing)
    uint256 weightMultiplier = economicWeight / 100 ether;  // More stake = more weight
    if (finalOutcome == 1) {  // Positive
        agent.reputationScore += (10 + weightMultiplier);
    } else {
        agent.reputationScore -= (10 + weightMultiplier);
    }
    
    emit FeedbackSettled(agentId, feedbackId, finalOutcome);
}
```

#### Path B: DAO Resolution (10% of cases)

```javascript
// Smart contract: FeedbackMarket.sol
function resolveDispute(
    bytes32 reviewId,
    Outcome outcome
) external onlyDAO {
    Review storage review = reviews[reviewId];
    
    require(review.state == ReviewState.Contested, "Not contested");
    
    review.state = ReviewState.Resolved;
    review.finalOutcome = outcome;
    review.settledAt = block.timestamp;
    
    // Calculate payouts
    uint256 totalStake = review.reviewerStake + review.challengeStake;
    uint256 winnerReward = (totalStake * rewardMultiplier) / 10000;
    
    address winner;
    address loser;
    
    if (outcome == review.proposedOutcome) {
        // Reviewer wins
        winner = review.reviewer;
        loser = review.challenger;
    } else if (outcome == Outcome.Negative && review.proposedOutcome == Outcome.Positive) {
        // Challenger wins
        winner = review.challenger;
        loser = review.reviewer;
    }
    
    // Transfer reward
    IERC20(governanceToken).transfer(winner, winnerReward);
    
    // Update reputations
    IAgentRegistry(agentRegistry).updateReputation(
        review.agentId,
        outcome == Outcome.Positive
    );
    
    // 🔗 UPDATE ERC-8004 WITH DAO VERIFICATION
    IERC8004Registry(erc8004Registry).settleFeedback(
        review.agentId,
        reviewId,
        uint8(outcome),
        true,  // wasContested = true (DAO verified!)
        winnerReward  // Higher economic weight
    );
    
    emit ReviewResolved(reviewId, outcome, winner, winnerReward);
}
```

---

## 🎯 Why Two Registries?

### ERC-8004 (External - Identity)
- **Purpose**: Decentralized agent identity standard
- **Stores**: 
  - Agent attestations (capabilities, permissions)
  - Feedback IDs (links to FeedbackMarket)
  - Aggregated reputation scores
- **Benefits**:
  - Trustless identity
  - Cross-platform compatibility
  - Public queryability
  - Standard compliance (ERC-8004)

### AgentRegistry (Internal - Reputation)
- **Purpose**: Fast reputation calculations
- **Stores**:
  - Local reputation scores
  - Review counts
  - Active/inactive status
- **Benefits**:
  - Gas-efficient queries
  - DAO-controlled logic
  - Custom reputation algorithms

---

## 📊 Data Flow Summary

```
USER SUBMITS FEEDBACK
        ↓
FeedbackMarket.submitFeedback()
        ↓
├─ Create Review struct (state: Submitted, stake: 0)
├─ Generate feedbackId
└─ Call ERC-8004.addFeedbackToAgent() ←── Store feedbackId in identity
        ↓
USER STAKES (optional)
        ↓
FeedbackMarket.stakeFeedback()
        ↓
├─ Update Review (state: Proposed, stake: 200)
└─ Start liveness period
        ↓
LIVENESS EXPIRES (2 hours)
        ↓
FeedbackMarket.settleReview()
        ↓
├─ Payout reviewer (220 AGTC)
├─ Update AgentRegistry (local reputation)
└─ Call ERC-8004.settleFeedback() ←── Update identity with outcome + weight
        ↓
ERC-8004 UPDATES
├─ Move feedbackId: pending → settled
├─ Store feedback details (outcome, weight, DAO verified)
├─ Update agent reputation (weighted by stake)
└─ Emit FeedbackSettled event
```

---

## 🔍 Querying Agent Reputation (Frontend)

```javascript
// Query complete agent reputation from both systems
async function getAgentReputation(agentId) {
  // 1. Query ERC-8004 for identity and feedback IDs
  const erc8004Data = await erc8004Registry.getAgent(agentId);
  
  // 2. Query local registry for calculated reputation
  const localData = await agentRegistry.agents(agentId);
  
  // 3. Query feedback details from FeedbackMarket
  const feedbacks = await Promise.all(
    erc8004Data.feedbackIds.map(id => feedbackMarket.reviews(id))
  );
  
  return {
    // From ERC-8004
    identity: {
      agentId: erc8004Data.agentId,
      attestation: erc8004Data.identityAttestation,
      capabilities: erc8004Data.metadataURI,
      totalFeedbacks: erc8004Data.feedbackIds.length,
      settledFeedbacks: erc8004Data.settledFeedbacks.length,
      daoVerifiedCount: feedbacks.filter(f => f.state === ReviewState.Resolved).length,
      totalEconomicBacking: feedbacks.reduce((sum, f) => sum + f.reviewerStake, 0)
    },
    
    // From local AgentRegistry
    localReputation: {
      score: localData.reputationScore,  // 0-1000
      totalReviews: localData.totalReviews,
      isActive: localData.isActive
    },
    
    // Combined metrics
    trustScore: {
      hasIdentity: true,
      economicBacking: feedbacks.reduce((sum, f) => sum + f.reviewerStake, 0),
      daoVerificationRate: erc8004Data.settledFeedbacks.filter(contestedFilter).length / erc8004Data.settledFeedbacks.length,
      averageStake: totalStake / feedbacks.length
    },
    
    // All feedbacks
    feedbacks: feedbacks.map(f => ({
      feedbackId: f.feedbackId,
      outcome: f.finalOutcome,
      stake: f.reviewerStake,
      wasContested: f.state === ReviewState.Resolved,
      daoVerified: f.state === ReviewState.Resolved,
      dataURI: f.reviewDataURI
    }))
  };
}
```

---

## 🎨 Frontend Display

```
Agent Reputation Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: flight-booking-501
Identity: ✅ Verified (ERC-8004)

Overall Score: 875/1000 (87.5%)
├─ Local Reputation: 850
└─ Identity Reputation: 875

Trust Signals:
├─ Total Feedbacks: 24
├─ Settled: 22 ✅
├─ Pending: 2 ⏰
├─ DAO Verified: 3 🏛️
├─ Economic Backing: 4,400 AGTC
└─ Avg Stake: 200 AGTC

Recent Feedbacks:
┌──────────┬──────────┬──────────┬─────────────┐
│ Outcome  │ Stake    │ Status   │ Verified    │
├──────────┼──────────┼──────────┼─────────────┤
│ Positive │ 440 AGTC │ Settled  │ DAO ✅      │
│ Positive │ 200 AGTC │ Settled  │ Optimistic  │
│ Negative │ 300 AGTC │ Pending  │ ⏰ 1h left  │
└──────────┴──────────┴──────────┴─────────────┘

[View All Feedbacks] [Submit Feedback]
```

---

## 🔐 Security Considerations

1. **ERC-8004 Integration**:
   - Only FeedbackMarket can call `addFeedbackToAgent()` and `settleFeedback()`
   - Use access control in ERC-8004 contract
   - Verify FeedbackMarket address in ERC-8004 constructor

2. **Double Counting Prevention**:
   - FeedbackId stored in both systems (ERC-8004 + FeedbackMarket)
   - Use same feedbackId hash in both
   - ERC-8004 should NOT recalculate reputation independently

3. **Trust Model**:
   - ERC-8004: Stores identity + feedback IDs (trustless)
   - FeedbackMarket: Executes economic game (DAO controlled)
   - AgentRegistry: Caches reputation (DAO controlled)

---

## 📝 Implementation Checklist

- [x] Add IERC8004Registry interface to FeedbackMarket.sol
- [x] Add erc8004Registry state variable
- [ ] Implement submitFeedback() function (free submission)
- [ ] Implement stakeFeedback() function (optional staking)
- [ ] Update settleReview() to call ERC-8004
- [ ] Update resolveDispute() to call ERC-8004 with DAO flag
- [ ] Add ReviewState.Submitted enum value
- [ ] Create comprehensive tests for ERC-8004 integration
- [ ] Deploy both systems and link addresses
- [ ] Update frontend to query both registries

---

## 🚀 Next Steps

1. **Update FeedbackMarket.sol**:
   - Split proposeReview() into submitFeedback() + stakeFeedback()
   - Add ERC-8004 integration calls
   - Test with mock ERC-8004 contract

2. **ERC-8004 Contract Updates** (in external repo):
   - Add `addFeedbackToAgent()` function
   - Add `settleFeedback()` function
   - Add access control for FeedbackMarket
   - Store feedback details mapping

3. **Frontend Integration**:
   - Query both registries for complete agent info
   - Show free vs staked feedback distinction
   - Display trust signals (DAO verified, economic backing)

4. **Testing**:
   - Unit tests for both submission flows
   - Integration tests with mock ERC-8004
   - E2E tests for complete workflow
