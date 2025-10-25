# ERC-8004 Feedback Scripts

This directory contains JavaScript scripts for deploying, registering agents, generating feedback, and reading feedback summaries using the ERC-8004 reference implementation.

## Prerequisites

1. **Foundry installed** - for contract compilation
2. **Node.js 18+** - for running the scripts
3. **Anvil running** - local Ethereum node for testing

## Setup

1. **Install dependencies:**
   ```bash
   cd scripts
   npm install
   ```

2. **Start Anvil:**
   ```bash
   anvil
   ```
   Keep this running in a separate terminal.

3. **Compile contracts:**
   ```bash
   cd ..
   forge build
   cd scripts
   ```

## Scripts Overview

### 1. Deploy Contracts (`deploy-contracts.js`)
Deploys the IdentityRegistry and ReputationRegistry contracts to Anvil.

```bash
npm run deploy
# or
node deploy-contracts.js
```

**Output:**
- Deploys contracts to Anvil
- Saves contract addresses to `deployments.json`
- Displays deployment summary

### 2. Register Agents (`register-agents.js`)
Registers all 15 agents from `sample-agents.json` to the IdentityRegistry.

```bash
npm run register
# or
node register-agents.js
```

**Prerequisites:** Run `deploy-contracts.js` first

**Output:**
- Registers agents with metadata
- Saves agent ID mappings to `agent-mappings.json`
- Displays registration summary

### 3. Generate Feedback (`generate-feedback.js`)
Creates feedback from multiple test clients with proper EIP-191 signatures.

```bash
npm run feedback
# or
node generate-feedback.js
```

**Prerequisites:** Run `deploy-contracts.js` and `register-agents.js` first

**Output:**
- Generates 3-5 feedback entries per agent
- Uses varied scores (60-100) and tags
- Saves feedback metadata to `feedback-data.json`

### 4. Read Feedback (`read-feedback.js`)
Reads and displays feedback summaries using `getSummary` with various filters.

```bash
npm run read
# or
node read-feedback.js
```

**Prerequisites:** Run all previous scripts first

**Output:**
- Shows feedback summaries for all agents
- Demonstrates different filtering options
- Displays overall statistics

## Quick Start

Run all scripts in sequence:

```bash
npm run setup
```

This will:
1. Deploy contracts
2. Register agents
3. Generate feedback
4. Display summaries

## Individual Usage

Each script can be run independently if you have the required data files:

- `deployments.json` - contract addresses
- `agent-mappings.json` - agent ID mappings
- `feedback-data.json` - feedback metadata

## File Structure

```
scripts/
├── package.json              # Dependencies and scripts
├── utils.js                  # Shared utilities
├── deploy-contracts.js       # Contract deployment
├── register-agents.js        # Agent registration
├── generate-feedback.js      # Feedback generation
├── read-feedback.js          # Feedback reading
├── README.md                 # This file
├── deployments.json          # Contract addresses (generated)
├── agent-mappings.json       # Agent ID mappings (generated)
└── feedback-data.json        # Feedback metadata (generated)
```

## Key Features

### Feedback Authorization
- Uses EIP-191 signing for feedback authorization
- Prevents self-feedback attacks
- Includes expiry and index limits

### Filtering Options
- **Client filtering:** Filter by specific client addresses
- **Tag filtering:** Filter by feedback tags (quality, speed, etc.)
- **Combined filtering:** Use multiple filters together

### Test Data
- Uses 10 test accounts from Anvil
- Generates realistic feedback scores and tags
- Creates varied feedback patterns

## Example Output

```
📊 Reading feedback summaries...

📈 Invoice Extraction Agent (ID: 1)
   📊 All feedback: 4 entries, avg score: 78/100
   🎯 Filtered by 3 clients: 3 entries, avg score: 82/100
   🏷️  "quality" tag filter: 2 entries, avg score: 85/100
   🏷️  "speed" tag filter: 1 entries, avg score: 90/100

📋 Overall Summary:
==================
Invoice Extraction Agent (ID: 1): 4 feedback entries, avg score: 78/100
Document Parser Pro (ID: 2): 3 feedback entries, avg score: 82/100
...
```

## Troubleshooting

1. **"Deployments file not found"** - Run `deploy-contracts.js` first
2. **"Agent mappings file not found"** - Run `register-agents.js` first
3. **"Feedback data file not found"** - Run `generate-feedback.js` first
4. **Connection errors** - Ensure Anvil is running on port 8545

## Technical Details

- **Network:** Anvil (localhost:8545, chain ID: 31337)
- **Signing:** EIP-191 personal message signing
- **Tags:** bytes32 encoded strings
- **Scores:** 0-100 scale
- **Authorization:** Includes expiry and index limits
