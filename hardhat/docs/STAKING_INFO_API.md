# Staking Information API

## Overview
Users need clear information about staking requirements, potential returns, and risks before submitting reviews.

## Smart Contract Query Functions

### 1. Get Staking Requirements

```solidity
function getStakingInfo() external view returns (
    uint256 minimumRequired,      // Minimum stake (e.g., 100 AGTC)
    uint256 recommendedStake,     // Recommended stake (e.g., 500 AGTC)
    uint256 expectedReturn,       // Return multiplier in basis points (e.g., 11000 = 110%)
    uint256 livenessWindow        // Settlement wait time in seconds (e.g., 7200 = 2 hours)
)
```

**Example Response**:
```json
{
  "minimumRequired": "100000000000000000000",  // 100 AGTC (18 decimals)
  "recommendedStake": "500000000000000000000", // 500 AGTC
  "expectedReturn": "11000",                    // 110% return
  "livenessWindow": "7200"                      // 2 hours
}
```

### 2. Calculate Potential Returns

```solidity
function calculatePotentialReturns(uint256 stakeAmount) external view returns (
    uint256 profit,        // Expected profit
    uint256 totalReturn,   // Total returned (stake + profit)
    uint256 riskAmount     // Amount at risk if challenged
)
```

**Example Usage**:
```javascript
// User wants to stake 200 AGTC
const stake = ethers.parseEther("200") // 200 AGTC

const { profit, totalReturn, riskAmount } = await feedbackMarket.calculatePotentialReturns(stake)

console.log({
  stake: "200 AGTC",
  profit: ethers.formatEther(profit),      // "20 AGTC" (10% profit)
  totalReturn: ethers.formatEther(totalReturn), // "220 AGTC"
  riskAmount: ethers.formatEther(riskAmount)    // "200 AGTC" (can lose all)
})
```

### 3. Check User Balance

```solidity
function canUserStake(address user, uint256 stakeAmount) external view returns (
    bool hasBalance,       // Whether user can afford stake
    uint256 currentBalance, // User's current AGTC balance
    uint256 shortfall      // Amount needed (0 if sufficient)
)
```

**Example Usage**:
```javascript
const userAddress = "0x..."
const desiredStake = ethers.parseEther("200")

const { hasBalance, currentBalance, shortfall } = await feedbackMarket.canUserStake(
  userAddress,
  desiredStake
)

if (!hasBalance) {
  console.log(`You need ${ethers.formatEther(shortfall)} more AGTC`)
  console.log(`Current balance: ${ethers.formatEther(currentBalance)} AGTC`)
}
```

### 4. Get User Statistics

```solidity
function getUserStats(address user) external view returns (
    uint256 totalReviews,      // Total reviews submitted
    uint256 settledReviews,    // Reviews settled optimistically
    uint256 contestedReviews,  // Reviews contested
    uint256 wonDisputes,       // Disputes won
    uint256 accuracyScore      // Accuracy % (basis points, 10000 = 100%)
)
```

**Example Response**:
```javascript
{
  totalReviews: 25,
  settledReviews: 23,        // 23/25 settled optimistically
  contestedReviews: 2,       // 2 were challenged
  wonDisputes: 2,            // Won both challenges
  accuracyScore: 10000       // 100% accuracy
}
```

## Frontend UI Examples

### Staking Info Display (Before Review Submission)

```jsx
// Component: StakingInfoCard.tsx
import { useState, useEffect } from 'react'

function StakingInfoCard({ feedbackMarket }) {
  const [stakingInfo, setStakingInfo] = useState(null)
  
  useEffect(() => {
    const fetchInfo = async () => {
      const info = await feedbackMarket.getStakingInfo()
      setStakingInfo({
        minimum: ethers.formatEther(info.minimumRequired),
        recommended: ethers.formatEther(info.recommendedStake),
        returnPercent: (Number(info.expectedReturn) / 100 - 100).toFixed(1),
        waitTime: Number(info.livenessWindow) / 3600 // Convert to hours
      })
    }
    fetchInfo()
  }, [feedbackMarket])
  
  if (!stakingInfo) return <div>Loading...</div>
  
  return (
    <div className="staking-info-card">
      <h3>📊 Staking Requirements</h3>
      
      <div className="info-row">
        <span>Minimum Stake:</span>
        <strong>{stakingInfo.minimum} AGTC</strong>
      </div>
      
      <div className="info-row">
        <span>Recommended:</span>
        <strong>{stakingInfo.recommended} AGTC</strong>
      </div>
      
      <div className="info-row success">
        <span>Expected Return:</span>
        <strong>+{stakingInfo.returnPercent}% profit</strong>
      </div>
      
      <div className="info-row warning">
        <span>Settlement Time:</span>
        <strong>{stakingInfo.waitTime} hours</strong>
      </div>
      
      <div className="disclaimer">
        ⚠️ If your review is challenged and deemed incorrect, 
        you will lose your entire stake.
      </div>
    </div>
  )
}
```

### Return Calculator (Interactive)

```jsx
// Component: StakeCalculator.tsx
function StakeCalculator({ feedbackMarket }) {
  const [stakeAmount, setStakeAmount] = useState('100')
  const [returns, setReturns] = useState(null)
  
  const calculate = async (amount) => {
    try {
      const stake = ethers.parseEther(amount)
      const result = await feedbackMarket.calculatePotentialReturns(stake)
      
      setReturns({
        profit: ethers.formatEther(result.profit),
        total: ethers.formatEther(result.totalReturn),
        risk: ethers.formatEther(result.riskAmount)
      })
    } catch (error) {
      console.error('Below minimum stake')
    }
  }
  
  useEffect(() => {
    if (stakeAmount) calculate(stakeAmount)
  }, [stakeAmount])
  
  return (
    <div className="stake-calculator">
      <h3>💰 Calculate Your Returns</h3>
      
      <input
        type="number"
        value={stakeAmount}
        onChange={(e) => setStakeAmount(e.target.value)}
        placeholder="Enter stake amount"
      />
      <span>AGTC</span>
      
      {returns && (
        <div className="results">
          <div className="result-row positive">
            <span>If Correct (optimistic):</span>
            <strong>+{returns.profit} AGTC profit</strong>
            <small>Total: {returns.total} AGTC</small>
          </div>
          
          <div className="result-row negative">
            <span>If Challenged & Wrong:</span>
            <strong>-{returns.risk} AGTC loss</strong>
            <small>You lose everything</small>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Balance Check (Before Submission)

```jsx
// Component: BalanceCheck.tsx
function BalanceCheck({ feedbackMarket, userAddress, desiredStake }) {
  const [canStake, setCanStake] = useState(null)
  
  useEffect(() => {
    const check = async () => {
      const stake = ethers.parseEther(desiredStake)
      const result = await feedbackMarket.canUserStake(userAddress, stake)
      
      setCanStake({
        hasBalance: result.hasBalance,
        current: ethers.formatEther(result.currentBalance),
        needed: ethers.formatEther(result.shortfall)
      })
    }
    check()
  }, [userAddress, desiredStake])
  
  if (!canStake) return null
  
  return (
    <div className={`balance-check ${canStake.hasBalance ? 'success' : 'error'}`}>
      {canStake.hasBalance ? (
        <>
          ✅ <strong>Sufficient Balance</strong>
          <p>Current: {canStake.current} AGTC</p>
        </>
      ) : (
        <>
          ❌ <strong>Insufficient Balance</strong>
          <p>You need {canStake.needed} more AGTC</p>
          <button onClick={() => window.open('/buy-agtc')}>
            Buy AGTC Tokens
          </button>
        </>
      )}
    </div>
  )
}
```

### User Stats Dashboard

```jsx
// Component: UserStatsDashboard.tsx
function UserStatsDashboard({ feedbackMarket, userAddress }) {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    const fetchStats = async () => {
      const result = await feedbackMarket.getUserStats(userAddress)
      
      setStats({
        total: Number(result.totalReviews),
        settled: Number(result.settledReviews),
        contested: Number(result.contestedReviews),
        won: Number(result.wonDisputes),
        accuracy: (Number(result.accuracyScore) / 100).toFixed(1)
      })
    }
    fetchStats()
  }, [userAddress])
  
  if (!stats) return <div>Loading stats...</div>
  
  const optimisticRate = stats.total > 0 
    ? ((stats.settled / stats.total) * 100).toFixed(1)
    : 0
  
  return (
    <div className="user-stats">
      <h3>📈 Your Review History</h3>
      
      <div className="stat-grid">
        <div className="stat">
          <span>Total Reviews</span>
          <strong>{stats.total}</strong>
        </div>
        
        <div className="stat success">
          <span>Optimistic Settlements</span>
          <strong>{stats.settled} ({optimisticRate}%)</strong>
        </div>
        
        <div className="stat warning">
          <span>Contested</span>
          <strong>{stats.contested}</strong>
        </div>
        
        <div className="stat success">
          <span>Disputes Won</span>
          <strong>{stats.won}/{stats.contested}</strong>
        </div>
        
        <div className="stat highlight">
          <span>Accuracy Score</span>
          <strong>{stats.accuracy}%</strong>
        </div>
      </div>
      
      {stats.accuracy === 100 && (
        <div className="achievement">
          🏆 Perfect Score! You get 50% voting power bonus
        </div>
      )}
    </div>
  )
}
```

## Complete Review Submission Flow

```jsx
// Component: ReviewSubmissionFlow.tsx
function ReviewSubmissionFlow({ feedbackMarket, agentId }) {
  const [step, setStep] = useState(1)
  const [stake, setStake] = useState('')
  const [reviewData, setReviewData] = useState({})
  
  return (
    <div className="review-flow">
      {step === 1 && (
        <StakingInfoCard feedbackMarket={feedbackMarket} />
      )}
      
      {step === 2 && (
        <StakeCalculator 
          feedbackMarket={feedbackMarket}
          onStakeSelect={(amount) => setStake(amount)}
        />
      )}
      
      {step === 3 && (
        <BalanceCheck
          feedbackMarket={feedbackMarket}
          userAddress={userAddress}
          desiredStake={stake}
        />
      )}
      
      {step === 4 && (
        <ReviewForm
          onSubmit={async (data) => {
            const tx = await feedbackMarket.proposeReview(
              agentId,
              data.ipfsURI,
              data.outcome,
              ethers.parseEther(stake)
            )
            await tx.wait()
            setStep(5)
          }}
        />
      )}
      
      {step === 5 && (
        <SuccessMessage
          stake={stake}
          waitTime="2 hours"
          expectedReturn={`${(Number(stake) * 1.1).toFixed(1)} AGTC`}
        />
      )}
    </div>
  )
}
```

## Key User-Facing Messages

### Before Staking
```
📊 Staking Requirements
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum Stake:     100 AGTC
Recommended:       500 AGTC
Expected Return:   +10% profit
Settlement Time:   2 hours

⚠️ Important: If challenged and deemed incorrect, you lose your entire stake.
```

### During Calculation
```
💰 Calculate Your Returns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your Stake: 200 AGTC

✅ If Correct (no challenge):
   Profit: +20 AGTC
   Total Returned: 220 AGTC
   Time: 2 hours

❌ If Challenged & Wrong:
   Loss: -200 AGTC (100%)
   You receive: 0 AGTC
```

### Balance Insufficient
```
❌ Insufficient Balance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Required:  200 AGTC
Current:   150 AGTC
Shortfall: 50 AGTC

[Buy AGTC Tokens] [Use Different Amount]
```

### Successful Submission
```
✅ Review Submitted Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Staked:           200 AGTC
Expected Return:  220 AGTC (+20 AGTC profit)
Settlement Time:  ~2 hours

⏰ Your review is now in the optimistic liveness period.
   If not challenged within 2 hours, you'll receive your reward.

📊 [View Your Review] [Track Status]
```

## Integration Example

```typescript
// hooks/useStakingInfo.ts
import { useState, useEffect } from 'react'
import { useContract } from 'wagmi'

export function useStakingInfo() {
  const feedbackMarket = useContract(/* ... */)
  const [info, setInfo] = useState(null)
  
  useEffect(() => {
    async function fetchInfo() {
      const [minimum, recommended, returnBps, liveness] = 
        await feedbackMarket.getStakingInfo()
      
      setInfo({
        minimumStake: ethers.formatEther(minimum),
        recommendedStake: ethers.formatEther(recommended),
        profitPercent: (Number(returnBps) / 100 - 100).toFixed(1),
        livenessHours: Number(liveness) / 3600
      })
    }
    
    fetchInfo()
  }, [feedbackMarket])
  
  return info
}

// Usage in component
function ReviewPage() {
  const stakingInfo = useStakingInfo()
  
  return (
    <div>
      <h2>Submit Review</h2>
      {stakingInfo && (
        <p>
          Minimum stake: {stakingInfo.minimumStake} AGTC
          (earn {stakingInfo.profitPercent}% profit if correct)
        </p>
      )}
    </div>
  )
}
```

## Summary

The staking information API provides:

1. ✅ **Clear requirements** - minimum and recommended stakes
2. ✅ **Profit calculator** - show exact returns before staking
3. ✅ **Balance checking** - verify user can afford stake
4. ✅ **Risk transparency** - show potential losses
5. ✅ **User stats** - build trust with accuracy history
6. ✅ **Settlement timeline** - manage expectations

This creates transparency and builds user confidence in the staking system!
