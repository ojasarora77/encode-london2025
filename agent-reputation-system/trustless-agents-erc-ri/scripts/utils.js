import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { 
  getCurrentNetworkConfig, 
  getPrivateKey, 
  getFeedbackPrivateKey,
  getDeploymentFileName,
  validateEnvironment 
} from './config.js';

// Load contract ABIs
const IDENTITY_REGISTRY_ABI = JSON.parse(fs.readFileSync('../out/IdentityRegistry.sol/IdentityRegistry.json', 'utf8')).abi;
const REPUTATION_REGISTRY_ABI = JSON.parse(fs.readFileSync('../out/ReputationRegistry.sol/ReputationRegistry.json', 'utf8')).abi;

// Test accounts (Anvil default accounts)
const TEST_ACCOUNTS = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // 0x5de4111daa5ba4e0b6747af108906c4ea4ae6d28287e4955f2f3f75004c0772
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', // 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9', // 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
  '0x14dC79964daC831e0b5eE0281365e24125C3a9E6', // 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
  '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', // 0xdbda1821b805be8f3b1159338c696f4b8b0b3b7b3b3b3b3b3b3b3b3b3b3b3b3b3
  '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720'  // 0x2a871d0798f97d79848a013d4936a73bf4cc922c72d8f5cbeaf088594186204e
];

const TEST_PRIVATE_KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba'
];

// File paths - now dynamic based on network
const AGENT_MAPPINGS_FILE = 'agent-mappings.json';
const FEEDBACK_DATA_FILE = 'feedback-data.json';

/**
 * Get provider and signer for current network
 */
export function getProviderAndSigner(accountIndex = 0) {
  const config = getCurrentNetworkConfig();
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  
  // For local network, use test accounts
  if (config.name === 'Anvil Local') {
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEYS[accountIndex], provider);
    return { provider, signer: wallet };
  }
  
  // For testnets, use private key from environment
  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error(`Private key is required for ${config.name} network`);
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  return { provider, signer: wallet };
}

/**
 * Get provider and signer for feedback operations
 * Uses FEEDBACK_PRIVATE_KEY if available, otherwise falls back to PRIVATE_KEY
 */
export function getFeedbackProviderAndSigner() {
  const config = getCurrentNetworkConfig();
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  
  // For local network, use test accounts (use different accounts for feedback)
  if (config.name === 'Anvil Local') {
    // Use accounts 2-3 for feedback to avoid conflicts with agent owners (0-1)
    const feedbackAccountIndex = 2;
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEYS[feedbackAccountIndex], provider);
    return { provider, signer: wallet };
  }
  
  // For testnets, use feedback private key
  const feedbackPrivateKey = getFeedbackPrivateKey();
  if (!feedbackPrivateKey) {
    throw new Error(`Feedback private key is required for ${config.name} network. Please set FEEDBACK_PRIVATE_KEY or PRIVATE_KEY environment variable.`);
  }
  
  const wallet = new ethers.Wallet(feedbackPrivateKey, provider);
  return { provider, signer: wallet };
}

/**
 * Load deployment addresses
 */
export function loadDeployments() {
  const deploymentsFile = getDeploymentFileName();
  if (!fs.existsSync(deploymentsFile)) {
    throw new Error(`Deployments file not found: ${deploymentsFile}. Run deploy-contracts.js first.`);
  }
  return JSON.parse(fs.readFileSync(deploymentsFile, 'utf8'));
}

/**
 * Save deployment addresses
 */
export function saveDeployments(deployments) {
  const deploymentsFile = getDeploymentFileName();
  fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
}

/**
 * Load agent mappings
 */
export function loadAgentMappings() {
  if (!fs.existsSync(AGENT_MAPPINGS_FILE)) {
    throw new Error(`Agent mappings file not found: ${AGENT_MAPPINGS_FILE}. Run register-agents.js first.`);
  }
  return JSON.parse(fs.readFileSync(AGENT_MAPPINGS_FILE, 'utf8'));
}

/**
 * Save agent mappings
 */
export function saveAgentMappings(mappings) {
  fs.writeFileSync(AGENT_MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

/**
 * Load feedback data
 */
export function loadFeedbackData() {
  if (!fs.existsSync(FEEDBACK_DATA_FILE)) {
    throw new Error(`Feedback data file not found: ${FEEDBACK_DATA_FILE}. Run generate-feedback.js first.`);
  }
  return JSON.parse(fs.readFileSync(FEEDBACK_DATA_FILE, 'utf8'));
}

/**
 * Save feedback data
 */
export function saveFeedbackData(data) {
  fs.writeFileSync(FEEDBACK_DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get contract instances
 */
export function getContracts(signer) {
  const deployments = loadDeployments();
  
  const identityRegistry = new ethers.Contract(
    deployments.identityRegistry,
    IDENTITY_REGISTRY_ABI,
    signer
  );
  
  const reputationRegistry = new ethers.Contract(
    deployments.reputationRegistry,
    REPUTATION_REGISTRY_ABI,
    signer
  );
  
  return { identityRegistry, reputationRegistry };
}

/**
 * Encode string to bytes32
 */
export function encodeBytes32String(str) {
  return ethers.encodeBytes32String(str);
}

/**
 * Create feedback authorization struct
 */
export function createFeedbackAuth(agentId, clientAddress, indexLimit, expiry, chainId, identityRegistry, signerAddress) {
  return {
    agentId,
    clientAddress,
    indexLimit,
    expiry,
    chainId,
    identityRegistry,
    signerAddress
  };
}

/**
 * Hash feedback authorization for EIP-191 signing
 */
export function hashFeedbackAuth(auth) {
  // Step 1: Encode the struct using abi.encode (not abi.encodePacked)
  const structHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
    [auth.agentId, auth.clientAddress, auth.indexLimit, auth.expiry, auth.chainId, auth.identityRegistry, auth.signerAddress]
  ));
  
  // Step 2: Create EIP-191 message hash using abi.encodePacked
  return ethers.keccak256(ethers.solidityPacked(
    ['string', 'bytes32'],
    ['\x19Ethereum Signed Message:\n32', structHash]
  ));
}

/**
 * Sign feedback authorization
 */
export function signFeedbackAuth(auth, privateKey) {
  const messageHash = hashFeedbackAuth(auth);
  const wallet = new ethers.Wallet(privateKey);
  
  // Sign the message hash directly (not using signMessageSync which expects a string)
  const signature = wallet.signingKey.sign(messageHash);
  
  // Format signature as r+s+v (65 bytes)
  const signatureBytes = ethers.concat([
    signature.r,
    signature.s,
    ethers.zeroPadValue(ethers.toBeHex(signature.v), 1)
  ]);
  
  // Encode the struct using abi.encode (not abi.encodePacked)
  const structData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
    [auth.agentId, auth.clientAddress, auth.indexLimit, auth.expiry, auth.chainId, auth.identityRegistry, auth.signerAddress]
  );
  
  // Concatenate struct data + signature (65 bytes: r=32, s=32, v=1)
  return ethers.concat([structData, signatureBytes]);
}

/**
 * Get random test account
 */
export function getRandomTestAccount() {
  const index = Math.floor(Math.random() * TEST_ACCOUNTS.length);
  return {
    address: TEST_ACCOUNTS[index],
    privateKey: TEST_PRIVATE_KEYS[index]
  };
}

/**
 * Get test account by index
 */
export function getTestAccount(index) {
  return {
    address: TEST_ACCOUNTS[index],
    privateKey: TEST_PRIVATE_KEYS[index]
  };
}

/**
 * Wait for transaction and log result
 */
export async function waitForTransaction(tx, description) {
  console.log(`⏳ ${description}...`);
  const receipt = await tx.wait();
  console.log(`✅ ${description} completed. Gas used: ${receipt.gasUsed.toString()}`);
  return receipt;
}

/**
 * Format address for display
 */
export function formatAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format agent summary for display
 */
export function formatAgentSummary(agentName, agentId, count, averageScore) {
  return `${agentName} (ID: ${agentId}): ${count} feedback entries, avg score: ${averageScore}/100`;
}

export {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  TEST_ACCOUNTS,
  TEST_PRIVATE_KEYS
};
