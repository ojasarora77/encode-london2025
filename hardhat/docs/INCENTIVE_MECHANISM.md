# AgentSearch DAO - Incentive Mechanism

## 🎯 Design Goal

**INCENTIVIZE GOOD FEEDBACK** ✅  
**DISINCENTIVIZE BAD FEEDBACK** ❌

## Economic Model

### Honest Reviewer Economics

```
INPUT: 100 AGTC stake
       ↓
┌──────────────────────────┐
│   Submit Honest Review   │
│   Outcome: Positive      │
│   Quality: High          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│   2 Hour Liveness        │
│   No Challenge           │
│   (Review is accurate)   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Optimistic Settlement   │
│  No Gas Costs            │
│  Automatic               │
└──────────┬───────────────┘
           │
           ▼
OUTPUT: 110 AGTC returned
        +10 AGTC profit (10% ROI)
        +1 accuracy point
        +voting power multiplier ↑
        
INCENTIVE: ✅ Risk-free 10% profit + reputation building
```

### Dishonest Reviewer Economics

```
INPUT: 100 AGTC stake
       ↓
┌──────────────────────────┐
│  Submit False Review     │
│  Outcome: Negative       │
│  Quality: Low/Fake       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Challenger Detects      │
│  Stakes 100 AGTC         │
│  (Matches original)      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│   DAO Vote (24 hours)    │
│   Weighted by accuracy   │
│   Challenger wins        │
└──────────┬───────────────┘
           │
           ▼
OUTPUT: 0 AGTC returned
        -100 AGTC loss (100% slashed)
        -1 accuracy point
        -voting power multiplier ↓
        
Challenger gets: 220 AGTC (both stakes + 10%)
Staking vault gets: Portion of slashed funds

DISINCENTIVE: ❌ Lose everything + reputation damage
```

### Frivolous Challenge Economics

```
INPUT: 100 AGTC challenge stake
       ↓
┌──────────────────────────┐
│  Challenge Valid Review  │
│  (Reviewer was honest)   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│   DAO Vote (24 hours)    │
│   Original reviewer wins │
└──────────┬───────────────┘
           │
           ▼
OUTPUT: 0 AGTC returned
        -100 AGTC loss
        -1 accuracy point
        -gas costs
        -voting power ↓
        
Original reviewer gets: 220 AGTC (both stakes + 10%)

DISINCENTIVE: ❌ Expensive to spam challenges
```

## Compounding Incentives

### Reputation Multiplier Effect

| Accuracy Score | Reviews | Voting Power Multiplier | Effective Power with 1000 AGTC |
|----------------|---------|-------------------------|--------------------------------|
| 0% (0/10) | 10 | 0% | 1,000 AGTC |
| 50% (5/10) | 10 | 25% | 1,250 AGTC |
| 80% (8/10) | 10 | 40% | 1,400 AGTC |
| 100% (10/10) | 10 | 50% | 1,500 AGTC |

**Result**: Honest participants get more voting power → control governance → maintain honest system

### Long-term Value Creation

```
Year 1: Submit 10 honest reviews
        - Earn: 100 AGTC profit (10 × 10 AGTC)
        - Build: 100% accuracy (10/10 correct)
        - Gain: 50% voting multiplier
        
Year 2: Vote in DAO disputes
        - Voting power: 1,500 AGTC equivalent (1000 + 50%)
        - Influence: Can sway close votes
        - Stake in vault: Earning APY on holdings
        
Year 3: Become trusted reviewer
        - Reviews rarely challenged (reputation)
        - Always optimistic settlement (no delays)
        - Compound earnings from vault
        - High governance influence

TOTAL VALUE: Token profits + governance power + reputation + APY
```

## Game Theory Analysis

### Payoff Matrix

|                    | Other: Honest | Other: Dishonest |
|--------------------|---------------|------------------|
| **You: Honest**    | +10, +10      | +110, -100       |
| **You: Dishonest** | -100, +110    | Variable         |

**Nash Equilibrium**: (Honest, Honest) - dominant strategy

### Attack Vectors & Defenses

#### Attack: Sybil Reviews (Multiple fake accounts)
**Defense**:
- Minimum stake required (100 AGTC × accounts = expensive)
- Each fake review can be challenged
- Lost stakes don't return (permanent cost)
- **Economics**: 100 fake reviews = 10,000 AGTC at risk vs 1,000 AGTC potential gain

#### Attack: Collusion (Reviewer + Challenger split)
**Defense**:
- DAO vote is public and weighted by accuracy
- Collusion visible on-chain
- Reputation damage affects both parties
- **Economics**: Better ROI from honest reviews than splitting slashed stakes

#### Attack: Vote Buying (Bribe DAO voters)
**Defense**:
- Voting power weighted by historical accuracy
- Bribing accurate voters = expensive
- Public voting transparency
- **Economics**: Cost of bribing > value of single review outcome

## Economic Parameters (Tunable by DAO)

| Parameter | Default | Range | Impact |
|-----------|---------|-------|--------|
| `minimumStake` | 100 AGTC | 10-1000 | Higher = fewer spam reviews |
| `rewardMultiplier` | 110% | 105-150% | Higher = more participation incentive |
| `livenessPeriod` | 2 hours | 1-24 hours | Longer = more challenge time |
| `votingPeriod` | 24 hours | 12-72 hours | Longer = more DAO participation |
| `slashingPenalty` | 100% | 50-100% | Higher = stronger disincentive |

## Expected Behavior (Rational Actors)

### Reviewers Will:
1. ✅ Only submit reviews they believe are accurate
2. ✅ Provide detailed evidence (IPFS data)
3. ✅ Build long-term reputation
4. ❌ Not risk stake on questionable reviews
5. ❌ Not collude (reputation > short-term gain)

### Challengers Will:
1. ✅ Only contest reviews with clear evidence
2. ✅ Calculate expected value before staking
3. ❌ Not frivolously challenge (lose stake + gas)
4. ❌ Not spam system (expensive)

### DAO Voters Will:
1. ✅ Vote honestly (accuracy → voting power)
2. ✅ Review evidence carefully
3. ✅ Maintain system integrity (protects token value)
4. ❌ Not accept bribes (reputation damage)

## Success Metrics

### Healthy System Indicators:
- 📊 90%+ reviews settle optimistically (no contest)
- 📊 Challenger win rate ~50% (only valid challenges)
- 📊 Average accuracy score >80%
- 📊 DAO participation >50% of voting power
- 📊 AGTC token value increasing (demand for participation)

### Unhealthy System Indicators:
- ⚠️ >30% reviews contested (too much spam)
- ⚠️ Challenger win rate <30% or >70% (imbalanced)
- ⚠️ Average accuracy <60%
- ⚠️ DAO participation <20%
- ⚠️ AGTC token declining (loss of confidence)

## Conclusion

The incentive mechanism creates a **self-reinforcing honest feedback loop**:

```
Honest Reviews → Optimistic Settlement → Profit + Reputation
       ↑                                           ↓
       ←───────── Higher Voting Power ─────────────┘
```

**Result**: System naturally converges toward honest, high-quality agent reviews with minimal governance intervention.
