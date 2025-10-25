# AgentSearch DAO - Optimistic Feedback Protocol

## Overview

A decentralized reputation system for AI agents using **UMA-style optimistic oracle** design for contestable feedback and **Polymarket-style binary prediction markets** for review outcomes.

### 🎯 Core Incentive Mechanism

**INCENTIVIZE GOOD FEEDBACK** ✅
- Honest reviewers earn 10% profit on their stake
- Build reputation → get voting power multiplier (up to 50%)
- Optimistic settlement = no gas costs if correct
- Compound returns via staking vault APY

**DISINCENTIVIZE BAD FEEDBACK** ❌
- Dishonest reviewers lose 100% of their stake
- Slashed stakes go to challenger + staking vault
- Reputation damage → reduced voting power
- Contest costs (gas + matching stake) for frivolous challenges

### Economic Game Theory

```
┌────────────────────────────────────────────────────────────┐
│                 HONEST REVIEWER PATH                        │
├────────────────────────────────────────────────────────────┤
│ Stake: 100 AGTC                                            │
│ → Review is accurate                                       │
│ → No contestation (2hr passes)                            │
│ → Optimistic settlement                                    │
│ → Receives: 110 AGTC (10% profit)                         │
│ → Accuracy score ++                                        │
│ → Future voting power multiplier increases                │
│ → Net gain: +10 AGTC + reputation                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                DISHONEST REVIEWER PATH                      │
├────────────────────────────────────────────────────────────┤
│ Stake: 100 AGTC                                            │
│ → Review is inaccurate/malicious                          │
│ → Challenger stakes 100 AGTC (matches)                    │
│ → DAO votes (24hr)                                        │
│ → Challenger wins                                          │
│ → Challenger receives: 220 AGTC (both stakes + 10%)      │
│ → Reviewer receives: 0 AGTC (slashed)                     │
│ → Accuracy score --                                        │
│ → Future voting power decreases                           │
│ → Net loss: -100 AGTC - reputation                        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│              FRIVOLOUS CHALLENGER PATH                      │
├────────────────────────────────────────────────────────────┤
│ Stake: 100 AGTC (matching)                                 │
│ → Challenges valid review                                 │
│ → DAO votes (24hr)                                        │
│ → Original reviewer wins                                   │
│ → Reviewer receives: 220 AGTC (both stakes + 10%)        │
│ → Challenger receives: 0 AGTC (slashed)                   │
│ → Challenger accuracy score --                            │
│ → Net loss: -100 AGTC - reputation - gas costs           │
└────────────────────────────────────────────────────────────┘
```

### Nash Equilibrium
- **Rational actors** will only submit honest reviews
- **Challengers** will only contest if they have evidence
- **DAO voters** vote honestly due to weighted voting (accuracy multiplier)
- **Result**: Self-enforcing honest feedback system

## Architecture

### Core Contracts

1. **AgentGovernanceToken (AGTC)** ✅
   - ERC20Votes governance token
   - Weighted voting (token balance × accuracy multiplier)
   - Historical accuracy tracking
   
2. **AgentRegistry** ✅
   - Simple reputation tracking (separate from ERC-8004)
   - Agent metadata storage (IPFS/Arweave)
   - Reputation score aggregation
   
3. **FeedbackMarket** ✅
   - UMA optimistic oracle implementation
   - Polymarket-style binary outcomes
   - Contestable review assertions
   - Stake matching and slashing
   
4. **OptimisticReviewOracle** (TODO)
   - Liveness period management
   - Dispute escalation to DAO
   - Settlement automation
   
5. **StakingVault** (TODO)
   - ERC4626 vault implementation
   - Yield generation for stakers
   - Slashed stake collection
   
6. **FeedbackDAO** (TODO)
   - Governor Bravo style governance
   - Dispute resolution voting
   - Parameter management
   - Treasury control

## UMA-Inspired Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Optimistic Feedback Flow                  │
└─────────────────────────────────────────────────────────────┘

1. REVIEW PROPOSAL (Optimistic Assertion)
   ┌─────────────────────────────────────┐
   │ User submits review + stake         │
   │ Outcome: Positive/Negative          │
   │ Stake: Min 100 AGTC                 │
   │ Liveness: 2 hours                   │
   └─────────────────────────────────────┘
                    │
                    ▼
2. LIVENESS PERIOD (UMA Optimistic Window)
   ┌─────────────────────────────────────┐
   │ ⏰ 2 hour contestation window       │
   │                                      │
   │ Path A: No Contest                  │
   │ → Optimistic settlement             │
   │ → User claims reward (110%)         │
   │                                      │
   │ Path B: Contested                   │
   │ → Challenger matches stake          │
   │ → Escalates to DAO                  │
   └─────────────────────────────────────┘
                    │
                    ▼
3. DAO DISPUTE RESOLUTION (If Contested)
   ┌─────────────────────────────────────┐
   │ 📊 DAO vote (24 hours)              │
   │ Voting power: tokens × accuracy     │
   │                                      │
   │ Majority decides outcome:           │
   │ - Positive                          │
   │ - Negative                          │
   │ - Invalid                           │
   └─────────────────────────────────────┘
                    │
                    ▼
4. SETTLEMENT (Slashing & Rewards)
   ┌─────────────────────────────────────┐
   │ ✅ Winner: Claims both stakes       │
   │    + 10% reward bonus               │
   │                                      │
   │ ❌ Loser: Stake slashed             │
   │    → Sent to staking vault          │
   │                                      │
   │ 📈 Agent reputation updated         │
   └─────────────────────────────────────┘
```

## Key Features (UMA-Inspired)

### 1. Optimistic Assertions
- Reviews are assumed valid unless contested
- 2-hour liveness window for challenges
- Gas-efficient for honest participants
- **Source**: [UMA Optimistic Oracle V3](https://docs.uma.xyz/developers/optimistic-oracle-v3)

### 2. Economic Security
- Matched stakes (challenger must match reviewer)
- Skin in the game for both parties
- Slashing for dishonest actors
- **Source**: [UMA Assertion Security Model](https://github.com/UMAprotocol/protocol)

### 3. Binary Outcomes (Polymarket-Style)
- Simple YES/NO (Positive/Negative)
- Clear resolution criteria
- DAO arbitration for disputes
- **Source**: [Polymarket Prediction Markets](https://polymarket.com/)

### 4. Escalation Mechanism
- L1: Optimistic settlement (free)
- L2: Contestation (staked)
- L3: DAO vote (governance)
- **Source**: [Aragon Optimistic Governance](https://blog.aragon.org/aragon-optimistic-governance/)

## Smart Contract Details

### FeedbackMarket (UMA Optimistic Oracle)

```solidity
// Review states following UMA pattern
enum ReviewState {
    None,           // Doesn't exist
    Proposed,       // In liveness period
    Settled,        // Optimistically settled
    Contested,      // Challenged, awaiting DAO
    Resolved,       // DAO resolved
    Expired         // Expired
}

// Binary outcomes (Polymarket-style)
enum Outcome {
    Pending,        // Not determined
    Positive,       // Agent performed well
    Negative,       // Agent performed poorly
    Invalid         // Invalid review
}
```

**Key Functions**:
- `proposeReview()` - Submit review with optimistic assertion
- `settleReview()` - Settle after liveness (if no contest)
- `contestReview()` - Challenge review with matched stake
- `resolveDispute()` - DAO resolves contested review

### Parameters (Configurable by DAO)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minimumStake` | 100 AGTC | Minimum stake required |
| `livenessPeriod` | 2 hours | Optimistic liveness window |
| `rewardMultiplier` | 11000 (110%) | Winner reward multiplier |
| `votingPeriod` | 24 hours | DAO voting duration |

## Research Sources

### UMA Optimistic Oracle
1. [UMA Docs - Optimistic Oracle V3](https://docs.uma.xyz/developers/optimistic-oracle-v3)
2. [UMA Protocol GitHub](https://github.com/UMAprotocol/protocol)
3. [UMA Assertion Security](https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work)

### DAO Governance
4. [Aragon Optimistic Governance](https://blog.aragon.org/aragon-optimistic-governance/)
5. [Compound Governor Bravo](https://github.com/compound-finance/compound-protocol)
6. [DAO Tokenomics Best Practices](https://www.bankless.com/dao-tokenomics)

### Prediction Markets
7. [Polymarket](https://polymarket.com/)
8. [Gnosis Conditional Tokens](https://docs.gnosis.io/conditionaltokens/)

### Staking & Vaults
9. [ERC4626 Tokenized Vault Standard](https://eips.ethereum.org/EIPS/eip-4626)
10. [Yearn V3 Vault Architecture](https://docs.yearn.fi/developers/v3/overview)

### Modular Identity
11. [ERC-8004 Registry Standard](https://eips.ethereum.org/EIPS/eip-8004)

## Development

### Installation

```bash
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy to Arbitrum Sepolia

```bash
npx hardhat ignition deploy ./ignition/modules/Deploy.ts --network arbitrumSepolia
```

## Status

- ✅ AgentGovernanceToken (AGTC)
- ✅ AgentRegistry
- ✅ FeedbackMarket (UMA-style)
- ⏳ OptimisticReviewOracle
- ⏳ StakingVault (ERC4626)
- ⏳ FeedbackDAO (Governor)
- ⏳ Deployment scripts
- ⏳ Tests

## License

MIT
