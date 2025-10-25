# AgentSearch Feedback Workflow

## Complete End-to-End Flow (with ERC-8004 Integration)

### 🎯 Overview

The feedback workflow integrates with the **external ERC-8004 agent identity registry** (`agent-reputation-registry/trustless-agents-erc-ri`) and uses **UMA-style optimistic oracle** for contestable feedback.

**Integration Flow**:
1. User submits feedback → Gets feedbackId
2. FeedbackId stored in ERC-8004 agent identity
3. Liveness period for staking/contestation begins
4. Settlement updates both local registry + ERC-8004

---

## Step-by-Step Workflow

### Phase 0: Agent Identity Verification (ERC-8004)

```
┌─────────────────────────────────────────────────────────────┐
│          VERIFY AGENT EXISTS IN ERC-8004 REGISTRY           │
└─────────────────────────────────────────────────────────────┘

Before allowing feedback, verify agent identity:

1. Query ERC-8004 Registry:
   ├─ Check if agentId exists in trustless-agents-erc-ri
   ├─ Verify agent is active/registered
   ├─ Get agent's identity attestations
   └─ Retrieve current feedback array

2. ERC-8004 Agent Identity Structure:
   {
     agentId: "flight-booking-501",
     identityAttestation: "0x...",  // Agent's verified identity
     metadataURI: "ipfs://Qm...",   // Agent capabilities
     feedbackIds: [                  // Array of review IDs
       "0xabc123...",
       "0xdef456...",
       ...
     ],
     reputationScore: 850,           // Aggregated from feedbacks
     isActive: true
   }

3. Frontend Display:
   ✅ Agent Verified
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Agent ID:       flight-booking-501
   Identity:       ✅ Verified on ERC-8004
   Reviews:        23 previous feedbacks
   Reputation:     850/1000 (85%)
   
   [Submit Feedback] [View Reviews]
```

### Phase 1: Feedback Submission (NOT Staking Yet!)

```
┌─────────────────────────────────────────────────────────────┐
│              USER SUBMITS FEEDBACK (NO STAKE YET)           │
└─────────────────────────────────────────────────────────────┘

Key Change: Feedback submission is FREE initially!
User only stakes if they want to participate in rewards/disputes.

1. User Action:
   ├─ Select agent (must exist in ERC-8004)
   ├─ Write detailed feedback + evidence
   ├─ Upload to IPFS → Get URI (ipfs://Qm...)
   ├─ Choose outcome: Positive ✅ or Negative ❌
   └─ Submit feedback (NO STAKE REQUIRED)

2. Smart Contract Call:
   feedbackMarket.submitFeedback(
     agentId: "flight-booking-501",
     feedbackDataURI: "ipfs://Qm...",
     proposedOutcome: Outcome.Positive
   )
   // Note: No stake parameter yet!

3. Contract Actions:
   ├─ Generate unique feedbackId: 0xabc123...
   ├─ Create Feedback struct:
   │  ├─ state: Submitted (not Proposed yet)
   │  ├─ submittedAt: block.timestamp
   │  ├─ reviewer: msg.sender
   │  ├─ stake: 0 (not staked yet)
   │  └─ proposedOutcome: Positive
   ├─ Add to agentFeedbacks[agentId]
   └─ Emit FeedbackSubmitted event

4. ERC-8004 Integration:
   // Call external ERC-8004 registry to store feedbackId
   erc8004Registry.addFeedbackToAgent(
     agentId: "flight-booking-501",
     feedbackId: 0xabc123...,
     feedbackURI: "ipfs://Qm..."
   )
   
   // ERC-8004 updates agent's identity:
   {
     agentId: "flight-booking-501",
     feedbackIds: [...previousFeedbacks, "0xabc123..."], // ← New feedback added
     pendingFeedbacks: ["0xabc123..."], // ← Not yet staked/settled
     totalFeedbacks: 24 // ← Incremented
   }

5. User Sees:
   ✅ Feedback Submitted!
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Feedback ID:     0xabc123...
   Agent:           flight-booking-501
   Outcome:         Positive ✅
   Status:          Submitted (not staked)
   
   📌 Stored in ERC-8004 Registry
   Identity Link:   ✅ Confirmed
   
   Next Steps:
   [ ] Stake tokens to earn rewards (optional)
   [ ] Just leave feedback public (free)
   
   ℹ️  Note: Your feedback is now public and linked
       to the agent's ERC-8004 identity. You can
       optionally stake to participate in rewards.
```

### Phase 2: Optional Staking (User Decides)

```
┌─────────────────────────────────────────────────────────────┐
│           USER DECIDES WHETHER TO STAKE (OPTIONAL)          │
└─────────────────────────────────────────────────────────────┘

After submitting feedback, user has TWO options:

OPTION A: Leave as Free Feedback (No Stake)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Benefits:
├─ ✅ Free (no tokens required)
├─ ✅ Still visible in ERC-8004 registry
├─ ✅ Still affects agent reputation
└─ ❌ No rewards, no economic stake

Your Feedback:
├─ Status: Public, Unverified
├─ Weight: Low (not economically backed)
├─ Visibility: Listed in ERC-8004 feedbacks
└─ Impact: Minor reputation effect

[Keep as Free Feedback]


OPTION B: Stake to Verify & Earn Rewards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Benefits:
├─ ✅ Earn 10% profit if correct
├─ ✅ Higher reputation weight
├─ ✅ Economic verification signal
└─ ❌ Risk losing stake if wrong

Staking Info:
├─ Minimum: 100 AGTC
├─ Recommended: 200 AGTC
├─ Expected Return: +10% (220 AGTC)
├─ Settlement Time: 2 hours
└─ Risk: -100% if challenged & wrong

[Stake 200 AGTC to Verify]

If user chooses to stake:

feedbackMarket.stakeFeedback(
  feedbackId: 0xabc123...,
  stakeAmount: 200 AGTC
)

Contract Actions:
├─ Transfer 200 AGTC from user to contract
├─ Update feedback:
│  ├─ state: Submitted → Proposed
│  ├─ stake: 200 AGTC
│  ├─ proposedAt: block.timestamp
│  └─ livenessDeadline: now + 2 hours
└─ Emit FeedbackStaked event

ERC-8004 Update:
erc8004Registry.updateFeedbackStatus(
  feedbackId: 0xabc123...,
  status: "staked",
  stakeAmount: 200 AGTC
)

{
  agentId: "flight-booking-501",
  feedbackIds: [..., "0xabc123..."],
  pendingFeedbacks: ["0xabc123..."], // Still pending settlement
  stakedFeedbacks: ["0xabc123..."],  // ← Now economically backed
  totalStaked: 200 AGTC
}

User Sees:
✅ Feedback Staked!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Feedback ID:        0xabc123...
Stake:              200 AGTC
Expected Return:    220 AGTC (+10%)
Settlement Time:    ~2 hours
Status:             ✅ Economically Verified

⏰ Liveness Period Started
Your feedback can be challenged for the next 2 hours.
If not challenged, you'll receive 220 AGTC automatically.

ERC-8004 Status: Staked ✅
```

---

### Phase 2: Liveness Period (2 Hours)

```
┌─────────────────────────────────────────────────────────────┐
│              OPTIMISTIC LIVENESS WINDOW (2 HRS)             │
└─────────────────────────────────────────────────────────────┘

Timeline:
0:00 ─────────────────────────── 2:00
 │                                  │
 │  Contestation Window Open        │
 │  Anyone can challenge            │
 │                                  │
 └──────────────────────────────────┘
        ↓                    ↓
   PATH A:            PATH B:
   No Contest         Challenged
   
🎯 PATH A: No Contest (Happy Path - 90% of cases)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Timeline:
[0:00] Feedback staked
[0:30] Watchers verify feedback
[1:00] No issues found
[1:30] Still no challenge
[2:00] ⏰ Liveness period expires
[2:01] Anyone can call settleFeedback()

Contract State:
├─ feedback.state: Proposed → Settled
├─ feedback.finalOutcome: Positive (as proposed)
└─ feedback.settledAt: block.timestamp

Payout:
├─ Calculate reward: 200 AGTC × 1.10 = 220 AGTC
├─ Transfer 220 AGTC to reviewer
├─ Update reviewer accuracy: correct++
└─ Update local AgentRegistry reputation

ERC-8004 Integration:
// Update external identity registry
erc8004Registry.settleFeedback(
  agentId: "flight-booking-501",
  feedbackId: 0xabc123...,
  finalOutcome: Outcome.Positive,
  wasContested: false,
  economicWeight: 200 AGTC
)

{
  agentId: "flight-booking-501",
  feedbackIds: [..., "0xabc123..."],
  settledFeedbacks: ["0xabc123..."], // ← Moved from pending
  pendingFeedbacks: [],               // ← Removed
  
  // Reputation updated based on outcome + stake weight
  reputationScore: 850 → 865 (+15 due to economic backing),
  
  // Feedback details stored
  feedbackDetails: {
    "0xabc123...": {
      outcome: "Positive",
      stakeAmount: 200 AGTC,
      settledAt: timestamp,
      wasContested: false,
      reviewer: "0xReviewer...",
      dataURI: "ipfs://Qm..."
    }
  }
}

User Sees:
✅ Feedback Settled!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Outcome:   Settled Optimistically ✅
Received:  220 AGTC
Profit:    +20 AGTC (10%)
Duration:  2 hours
Accuracy:  15/15 (100%) → 50% voting bonus!

📌 ERC-8004 Updated:
   Agent Reputation: 850 → 865
   Your Feedback: Verified & Weighted
   
Next: Your stake is returned + profit.
      Agent reputation updated in both registries.


⚔️ PATH B: Contested (Dispute Path - 10% of cases)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Timeline:
[0:00] Feedback staked (Positive outcome)
[0:45] 🚨 Challenger spots potential issue
[0:50] Challenger decides to contest
[0:55] Challenger prepares counter-evidence

Challenger Action:
feedbackMarket.contestFeedback(
  feedbackId: 0xabc123...,
  challengeStake: 200 AGTC  // Must match original stake
)

Contract Actions:
├─ Transfer 200 AGTC from challenger to contract
├─ Update feedback:
│  ├─ state: Proposed → Contested
│  ├─ challenger: 0xdef456...
│  └─ challengeStake: 200 AGTC
├─ Create DAO proposal:
│  ├─ disputeId: 42
│  ├─ votingDeadline: now + 24 hours
│  └─ description: "Review 0xabc123 disputed"
└─ Emit ReviewContested event

Both Parties See:
⚠️ Review Contested!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Review ID:      0xabc123...
Original Stake: 200 AGTC (reviewer)
Challenge Stake: 200 AGTC (challenger)
Total at Risk:  400 AGTC

📊 DAO Vote Started
Vote Duration:  24 hours
Dispute ID:     #42
Question:       "Was this review accurate?"

🔍 Review Details:
├─ Agent: flight-booking-501
├─ Proposed: Positive ✅
├─ Evidence: ipfs://Qm...
└─ Challenger claims: Actually negative ❌

Next: DAO members will vote.
      Winner takes 220 AGTC.
      Loser loses entire stake.
```

---

### Phase 3: DAO Voting (If Contested)

```
┌─────────────────────────────────────────────────────────────┐
│                  DAO DISPUTE RESOLUTION                      │
│                     (24 Hours)                               │
└─────────────────────────────────────────────────────────────┘

Voting Interface:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Dispute #42: Review Accuracy Vote

Agent: flight-booking-501 (Flight Booking Assistant)

Original Review (Reviewer: 0xaaa111...):
├─ Outcome: Positive ✅
├─ Stake: 200 AGTC
├─ Accuracy History: 14/14 (100%)
└─ Evidence: [View on IPFS]
    "Agent successfully booked flight, great UX, 
     confirmed reservation received."

Challenge (Challenger: 0xbbb222...):
├─ Stake: 200 AGTC (matched)
├─ Accuracy History: 8/10 (80%)
└─ Counter-Evidence: [View on IPFS]
    "Flight was not actually booked, no confirmation,
     agent hallucinated success."

Your Vote:
( ) Reviewer is Correct (Positive outcome)
( ) Challenger is Correct (Negative outcome)
( ) Invalid Review (Neither)

Your Voting Power:
├─ AGTC Balance: 1,000 tokens
├─ Accuracy Score: 90% (9/10 correct)
├─ Multiplier: 45%
└─ Effective Power: 1,450 votes

[Cast Vote] [View Evidence]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAO Voting Process:
1. Voting Period: 24 hours
2. Quorum Required: 20% of total voting power
3. Simple Majority: >50% of participating votes
4. Weighted by: token balance × accuracy multiplier

Vote Tallying:
┌─────────────────┬──────────┬──────────┐
│ Option          │ Votes    │ Power %  │
├─────────────────┼──────────┼──────────┤
│ Reviewer Right  │ 125,000  │ 62.5%    │
│ Challenger Right│ 60,000   │ 30.0%    │
│ Invalid Review  │ 15,000   │ 7.5%     │
├─────────────────┼──────────┼──────────┤
│ Total Voted     │ 200,000  │ 100%     │
│ Quorum (20%)    │ ✅ Met   │          │
└─────────────────┴──────────┴──────────┘

Result: Reviewer Wins (62.5% majority)
```

---

### Phase 4: Settlement & Payouts

```
┌─────────────────────────────────────────────────────────────┐
│                  SCENARIO A: REVIEWER WINS                   │
└─────────────────────────────────────────────────────────────┘

DAO Resolution:
feedbackDAO.resolveDispute(
  reviewId: 0xabc123...,
  outcome: Outcome.Positive  // Original reviewer was correct
)

Contract Actions:
1. Update Feedback State:
   ├─ state: Contested → Resolved
   ├─ finalOutcome: Positive
   └─ settledAt: block.timestamp

2. Calculate Payouts:
   ├─ Total stake pool: 400 AGTC (200 + 200)
   ├─ Winner reward: 400 × 1.10 = 440 AGTC
   └─ Distribution:
       ├─ Reviewer gets: 440 AGTC
       ├─ Challenger gets: 0 AGTC (slashed)
       └─ Vault gets: Slashing fee portion

3. Update Local Reputations:
   ├─ Reviewer:
   │  ├─ accuracyScore++ (15/15 = 100%)
   │  ├─ votingPower multiplier: 50%
   │  └─ totalReviews++
   ├─ Challenger:
   │  ├─ accuracyScore stays (8/11 = 73%)
   │  ├─ votingPower multiplier: 36%
   │  └─ challengesFailed++
   └─ AgentRegistry (flight-booking-501):
       ├─ reputationScore++ (positive feedback confirmed)
       └─ totalReviews++

4. Update ERC-8004 Identity Registry:
   // Final settlement in external registry
   erc8004Registry.settleFeedback(
     agentId: "flight-booking-501",
     feedbackId: 0xabc123...,
     finalOutcome: Outcome.Positive,
     wasContested: true,
     disputeResolution: {
       disputeId: 42,
       daoVotePercent: 62.5,
       economicWeight: 440 AGTC,  // Winner's total payout
       reviewerWon: true
     }
   )
   
   // ERC-8004 updates agent identity:
   {
     agentId: "flight-booking-501",
     feedbackIds: [..., "0xabc123..."],
     settledFeedbacks: ["0xabc123..."], // ← Moved from pending
     contestedFeedbacks: ["0xabc123..."], // ← Marked as contested
     pendingFeedbacks: [],                // ← Removed
     
     // Higher weight for DAO-verified feedback
     reputationScore: 850 → 875 (+25 due to DAO verification),
     
     // Detailed feedback record
     feedbackDetails: {
       "0xabc123...": {
         outcome: "Positive",
         stakeAmount: 440 AGTC,  // Total economic backing
         settledAt: timestamp,
         wasContested: true,
         daoVerified: true,      // ← Extra trust signal
         disputeId: 42,
         daoVotePercent: 62.5,
         reviewer: "0xReviewer...",
         challenger: "0xChallenger...",
         dataURI: "ipfs://Qm..."
       }
     },
     
     // Trust metrics updated
     trustScore: {
       economicBackingTotal: 1200 AGTC,
       daoVerifiedCount: 3,
       contestWinRate: 1.0  // Agent's feedbacks hold up under scrutiny
     }
   }

5. Emit Events:
   ├─ FeedbackResolved(feedbackId, Positive, disputeId: 42)
   ├─ FeedbackSettled(feedbackId, Positive, winner: reviewer, 440 AGTC)
   └─ ERC8004Updated(agentId, feedbackId, reputationScore: 875)

Reviewer Sees:
🎉 You Won the Dispute!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dispute #42 Resolved
Outcome:    DAO voted in your favor ✅
DAO Vote:   62.5% agreed with you

💰 Payout Breakdown:
├─ Your Original Stake:     200 AGTC
├─ Challenger's Stake:      200 AGTC
├─ Bonus Reward (10%):      +40 AGTC
└─ Total Received:          440 AGTC

📈 Reputation Updated:
├─ Accuracy: 15/15 (100%) → 🏆 Perfect!
├─ Voting Power: +50% multiplier
└─ Status: Trusted Reviewer

📌 ERC-8004 Updated:
├─ Agent Reputation: 850 → 875 (+25)
├─ Feedback: DAO-Verified ✅
├─ Trust Signal: Economic backing 440 AGTC
└─ Your feedback is now high-weight verified

Challenger Sees:
❌ You Lost the Dispute
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dispute #42 Resolved
Outcome:    DAO voted against you
DAO Vote:   62.5% sided with reviewer

💸 Financial Impact:
├─ Your Stake:          200 AGTC
├─ Amount Returned:     0 AGTC
└─ Loss:               -200 AGTC (100%)

📉 Reputation Impact:
├─ Accuracy: 8/11 (73%)
├─ Voting Power: 36% multiplier
└─ Failed Challenges: 3


┌─────────────────────────────────────────────────────────────┐
│                SCENARIO B: CHALLENGER WINS                   │
└─────────────────────────────────────────────────────────────┘

DAO Resolution:
feedbackDAO.resolveDispute(
  reviewId: 0xabc123...,
  outcome: Outcome.Negative  // Challenger was correct
)

Contract Actions:
1. Update Review State:
   ├─ state: Contested → Resolved
   ├─ finalOutcome: Negative (opposite of proposed)
   └─ settledAt: block.timestamp

2. Calculate Payouts:
   ├─ Total stake pool: 400 AGTC
   ├─ Winner reward: 440 AGTC
   └─ Distribution:
       ├─ Challenger gets: 440 AGTC
       ├─ Reviewer gets: 0 AGTC (slashed)
       └─ Vault receives slashing portion

3. Update Reputations:
   ├─ Reviewer:
   │  ├─ accuracyScore-- (14/15 = 93%)
   │  ├─ votingPower multiplier: 47%
   │  └─ Reviews penalized
   ├─ Challenger:
   │  ├─ accuracyScore++ (9/11 = 82%)
   │  ├─ votingPower multiplier: 41%
   │  └─ successfulChallenges++
   └─ Agent:
       ├─ reputationScore-- (negative confirmed)
       └─ totalReviews++

Challenger Sees:
🎉 You Won the Challenge!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Received: 440 AGTC
Profit: +240 AGTC
Accuracy: 9/11 (82%) ↗️

Reviewer Sees:
❌ Your Review Was Incorrect
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lost: -200 AGTC
Accuracy: 14/15 (93%) ↘️
Reputation Damaged


┌─────────────────────────────────────────────────────────────┐
│                 SCENARIO C: INVALID REVIEW                   │
└─────────────────────────────────────────────────────────────┘

DAO Resolution:
feedbackDAO.resolveDispute(
  reviewId: 0xabc123...,
  outcome: Outcome.Invalid  // Both parties wrong/insufficient evidence
)

Contract Actions:
1. Update Review State:
   ├─ state: Contested → Resolved
   ├─ finalOutcome: Invalid
   └─ settledAt: block.timestamp

2. Return Stakes:
   ├─ Reviewer gets: 200 AGTC (original stake)
   ├─ Challenger gets: 200 AGTC (challenge stake)
   └─ No bonus rewards (draw)

3. Reputations:
   ├─ Reviewer: No change (invalid review doesn't count)
   ├─ Challenger: No change (valid challenge of invalid)
   └─ Agent: No reputation update

Both Parties See:
⚖️ Review Deemed Invalid
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAO Vote: Insufficient evidence

Result: Stakes returned to both parties
├─ Reviewer: 200 AGTC returned
├─ Challenger: 200 AGTC returned
└─ No reputation changes

Reason: Cannot determine accuracy with
        available evidence.
```

---

## Complete Flow Diagram

```
                    START: User Has Review
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Query Staking Info          │
            │   - Min: 100 AGTC             │
            │   - Expected: +10% profit     │
            │   - Wait: 2 hours             │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Calculate Returns           │
            │   Stake: 200 AGTC             │
            │   → Profit: +20 AGTC          │
            │   → Risk: -200 AGTC           │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Check Balance               │
            │   Balance: 250 AGTC ✅        │
            │   Needed: 200 AGTC            │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Submit Review               │
            │   proposeReview()             │
            │   - Stake locked              │
            │   - Review proposed           │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Liveness Period (2hrs)      │
            │   ⏰ Contestation Window      │
            └───────────────┬───────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌─────────────────┐    ┌─────────────────┐
    │  No Challenge   │    │   Challenged    │
    │  (90% cases)    │    │   (10% cases)   │
    └────────┬────────┘    └────────┬────────┘
             │                      │
             ▼                      ▼
    ┌─────────────────┐    ┌─────────────────┐
    │ Settle Review   │    │  DAO Vote       │
    │ settleReview()  │    │  (24 hours)     │
    └────────┬────────┘    └────────┬────────┘
             │                      │
             │          ┌───────────┼───────────┐
             │          │           │           │
             │          ▼           ▼           ▼
             │    ┌─────────┐ ┌─────────┐ ┌─────────┐
             │    │Reviewer │ │Challenger│ │Invalid  │
             │    │  Wins   │ │  Wins   │ │ Review  │
             │    └────┬────┘ └────┬────┘ └────┬────┘
             │         │           │           │
             └─────────┴───────────┴───────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Update Reputations          │
            │   - Reviewer accuracy         │
            │   - Agent reputation          │
            │   - Voting power multiplier   │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │   Distribute Rewards          │
            │   - Winner gets payout        │
            │   - Loser slashed             │
            │   - Vault collects fees       │
            └───────────────┬───────────────┘
                            │
                            ▼
                    END: Settlement Complete
```

---

## Key Metrics & Probabilities

### Expected Outcomes (Honest System)

| Path | Probability | Duration | User Profit | Notes |
|------|-------------|----------|-------------|-------|
| Optimistic Settlement | 90% | 2 hours | +10% | Most reviews |
| Contested → Win | 5% | 26 hours | +120% | Honest review challenged |
| Contested → Lose | 4% | 26 hours | -100% | Dishonest review caught |
| Invalid | 1% | 26 hours | 0% | Unclear evidence |

### Financial Example (200 AGTC Stake)

```
Optimistic Path (90%):
├─ Duration: 2 hours
├─ Outcome: No challenge
├─ Received: 220 AGTC
├─ Profit: +20 AGTC (10%)
└─ Expected Value: 0.90 × 20 = +18 AGTC

Contested Win Path (5%):
├─ Duration: 26 hours
├─ Outcome: DAO votes in your favor
├─ Received: 440 AGTC
├─ Profit: +240 AGTC (120%)
└─ Expected Value: 0.05 × 240 = +12 AGTC

Contested Loss Path (4%):
├─ Duration: 26 hours
├─ Outcome: DAO votes against you
├─ Received: 0 AGTC
├─ Loss: -200 AGTC (-100%)
└─ Expected Value: 0.04 × (-200) = -8 AGTC

Invalid Path (1%):
├─ Duration: 26 hours
├─ Outcome: DAO deems invalid
├─ Received: 200 AGTC (stake returned)
├─ Profit: 0 AGTC
└─ Expected Value: 0.01 × 0 = 0 AGTC

TOTAL EXPECTED VALUE (Honest Reviewer):
= 18 + 12 - 8 + 0 = +22 AGTC profit
= 11% effective ROI
```

---

## Summary

The feedback workflow incentivizes honesty through:

1. **Fast rewards** - 2 hours for honest reviews (90% cases)
2. **High risk** - 100% loss if dishonest and caught
3. **Reputation stakes** - Accuracy affects future voting power
4. **Economic security** - Matched stakes ensure skin in the game
5. **DAO backstop** - Community resolves edge cases

**Result**: Self-enforcing honest feedback system! ✅
