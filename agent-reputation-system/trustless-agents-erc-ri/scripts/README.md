# ERC-8004 Agent Reputation System - Scripts

This directory contains deployment and management scripts for the ERC-8004 Agent Reputation System, supporting both local Anvil development and Arbitrum Sepolia testnet deployment.

## 🚀 Quick Start

### Local Development (Anvil)

```bash
# Start Anvil in another terminal
anvil

# Deploy contracts
node scripts/deploy-contracts.js

# Register agents
node scripts/register-agents.js

# Generate feedback
node scripts/generate-feedback.js

# Calculate trust scores
node scripts/calculate-trust-score.js
```

### Arbitrum Sepolia Deployment

**Option 1: Using .env file (Recommended)**
```bash
# Create .env file
cp env.example .env
# Edit .env file with your values
NETWORK=arbitrum-sepolia
PRIVATE_KEY=0x1234...          # For deployment/registration
FEEDBACK_PRIVATE_KEY=0x5678...  # For giving feedback (different wallet)
ARBISCAN_API_KEY=your_key

# Deploy contracts
node scripts/deploy-contracts.js
```

**Option 2: Using export commands**
```bash
# Set environment variables
export NETWORK=arbitrum-sepolia
export PRIVATE_KEY=0x1234...          # For deployment/registration
export FEEDBACK_PRIVATE_KEY=0x5678...  # For giving feedback (different wallet)
export ARBISCAN_API_KEY=your_key       # Optional for verification

# Deploy contracts
node scripts/deploy-contracts.js

# Register agents
node scripts/register-agents.js

# Generate feedback
node scripts/generate-feedback.js

# Calculate trust scores
node scripts/calculate-trust-score.js
```

## 📋 Prerequisites

### For Local Development
- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Anvil running on `http://127.0.0.1:8545`

### For Arbitrum Sepolia
- Private key with testnet ETH
- Get testnet ETH from [Arbitrum Bridge](https://bridge.arbitrum.io/)
- Optional: Arbiscan API key for contract verification

## 🔧 Environment Variables

The system supports both `.env` files and shell environment variables. The `.env` file approach is recommended for easier management.

### Using .env File (Recommended)

```bash
# Copy the example file
cp env.example .env

# Edit .env with your values
nano .env
```

### Using Shell Environment Variables

```bash
export NETWORK=arbitrum-sepolia
export PRIVATE_KEY=0x1234...
```

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NETWORK` | Network to deploy to | `local` |
| `PRIVATE_KEY` | Private key for deployment/registration (required for testnets) | - |
| `FEEDBACK_PRIVATE_KEY` | Private key for giving feedback (prevents self-feedback errors) | Falls back to `PRIVATE_KEY` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ARBITRUM_SEPOLIA_RPC_URL` | Custom RPC URL | `https://sepolia-rollup.arbitrum.io/rpc` |
| `ARBISCAN_API_KEY` | API key for contract verification | - |

## 📜 Available Scripts

### Core Scripts

- **`deploy-contracts.js`** - Deploy IdentityRegistry and ReputationRegistry contracts
- **`register-agents.js`** - Register sample agents in the system
- **`generate-feedback.js`** - Generate sample feedback for testing
- **`calculate-trust-score.js`** - Calculate trust scores for all agents
- **`read-feedback.js`** - Read and display feedback summaries

### Utility Scripts

- **`example-external-usage.js`** - Example of how external systems can use the trust calculator

## 🌐 Network Support

### Local (Anvil)
- **RPC**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Accounts**: Uses Anvil test accounts (no private key needed)
- **Deployment File**: `deployments.json`

### Arbitrum Sepolia
- **RPC**: `https://sepolia-rollup.arbitrum.io/rpc`
- **Chain ID**: `421614`
- **Accounts**: Requires `PRIVATE_KEY` environment variable
- **Deployment File**: `deployments-arbitrum-sepolia.json`
- **Block Explorer**: [Arbiscan Sepolia](https://sepolia.arbiscan.io/)

## 🔄 Workflow

### Understanding Private Keys

The system uses two different private keys to prevent "self-feedback" errors:

- **`PRIVATE_KEY`**: Used for deploying contracts and registering agents
- **`FEEDBACK_PRIVATE_KEY`**: Used for giving feedback (should be a different wallet)

This separation ensures that agents don't give feedback to themselves, which would cause errors in the reputation system.

### 1. Deploy Contracts
```bash
node scripts/deploy-contracts.js
```
This creates a deployment file with contract addresses.

### 2. Register Agents
```bash
node scripts/register-agents.js
```
Registers sample agents from the agent registry.

### 3. Generate Feedback
```bash
node scripts/generate-feedback.js
```
Creates sample feedback entries for testing.

### 4. Calculate Trust Scores
```bash
node scripts/calculate-trust-score.js
```
Calculates and displays trust scores for all agents.

## 🛠️ Configuration

### Network Configuration

The system automatically detects the network based on the `NETWORK` environment variable:

```bash
# Local development
NETWORK=local

# Arbitrum Sepolia
NETWORK=arbitrum-sepolia
```

### Private Key Management

For testnet deployments, you must provide a private key:

```bash
export PRIVATE_KEY=0x1234567890abcdef...
```

**Security Note**: Never commit private keys to version control. Use environment variables or secure key management systems.

## 📊 Trust Score Calculation

The trust score algorithm considers:

- **Average Score** (30% weight): Mean of all feedback scores
- **Volume Score** (20% weight): Number of feedback entries (logarithmic scaling)
- **Diversity Score** (30% weight): Ratio of unique reviewers to total feedback
- **Consistency Score** (20% weight): Standard deviation of scores (lower is better)

## 🔍 External Integration

External systems can use the trust calculator without running the full system:

```javascript
import { calculateTrustScoreByAddress } from './calculate-trust-score.js';

const result = await calculateTrustScoreByAddress(
  '0x...', // ReputationRegistry contract address
  'https://sepolia-rollup.arbitrum.io/rpc', // RPC URL
  1, // Agent ID
  '0x...' // Private key (optional)
);

console.log(`Trust Score: ${(result.trustScore.finalScore * 100).toFixed(1)}%`);
```

## 🐛 Troubleshooting

### Common Issues

1. **"Private key is required" error**
   - Set the `PRIVATE_KEY` environment variable
   - Ensure the private key is valid (64 hex characters)

2. **"Deployments file not found" error**
   - Run `deploy-contracts.js` first
   - Check that the correct network is configured

3. **"Invalid private key format" error**
   - Ensure the private key starts with `0x`
   - Verify the private key is 66 characters long (including `0x`)

4. **RPC connection errors**
   - Check your internet connection
   - Verify the RPC URL is correct
   - Try using a different RPC provider

### Getting Help

- Check the console output for detailed error messages
- Ensure all environment variables are set correctly
- Verify you have sufficient testnet ETH for gas fees

## 🔒 Security Best Practices

1. **Never commit private keys** to version control
2. **Use dedicated testnet wallets** for development
3. **Keep minimal funds** in testnet wallets
4. **Use hardware wallets** for production deployments
5. **Rotate keys regularly** in development environments

## 📝 License

This project is part of the ERC-8004 implementation and follows the same licensing terms.