import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

/**
 * Load environment variables from .env file if it exists
 */
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Load .env file on import
loadEnvFile();

/**
 * Network configuration system for multi-chain deployment
 * Supports both local Anvil and Arbitrum Sepolia testnet
 */

// Network configurations
const NETWORKS = {
  local: {
    name: 'Anvil Local',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
    blockExplorer: null,
    requiresPrivateKey: false
  },
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614,
    blockExplorer: 'https://sepolia.arbiscan.io',
    requiresPrivateKey: true
  }
};

/**
 * Get network configuration based on environment variable or default
 * @param {string} networkName - Network name (optional, defaults to NETWORK env var or 'local')
 * @returns {Object} Network configuration object
 */
export function getNetworkConfig(networkName = null) {
  const network = networkName || process.env.NETWORK || 'local';
  
  if (!NETWORKS[network]) {
    throw new Error(`Unsupported network: ${network}. Supported networks: ${Object.keys(NETWORKS).join(', ')}`);
  }
  
  const config = { ...NETWORKS[network] };
  
  // Add environment-specific overrides
  if (process.env.ARBITRUM_SEPOLIA_RPC_URL && network === 'arbitrum-sepolia') {
    config.rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  }
  
  return config;
}

/**
 * Get the current network configuration
 * @returns {Object} Current network configuration
 */
export function getCurrentNetworkConfig() {
  return getNetworkConfig();
}

/**
 * Check if private key is required for current network
 * @returns {boolean} True if private key is required
 */
export function requiresPrivateKey() {
  const config = getCurrentNetworkConfig();
  return config.requiresPrivateKey;
}

/**
 * Get private key from environment or throw error if required
 * @returns {string|null} Private key or null if not required
 */
export function getPrivateKey() {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (requiresPrivateKey() && !privateKey) {
    throw new Error(
      `Private key is required for ${getCurrentNetworkConfig().name} network. ` +
      `Please set PRIVATE_KEY environment variable.`
    );
  }
  
  return privateKey || null;
}

/**
 * Get feedback private key from environment
 * Falls back to PRIVATE_KEY if FEEDBACK_PRIVATE_KEY is not set
 * @returns {string|null} Feedback private key or null if not required
 */
export function getFeedbackPrivateKey() {
  const feedbackPrivateKey = process.env.FEEDBACK_PRIVATE_KEY;
  
  return feedbackPrivateKey;
}

/**
 * Get API key for block explorer verification
 * @returns {string|null} API key or null if not available
 */
export function getBlockExplorerApiKey() {
  const config = getCurrentNetworkConfig();
  
  switch (config.name) {
    case 'Arbitrum Sepolia':
      return process.env.ARBISCAN_API_KEY || null;
    default:
      return null;
  }
}

/**
 * Get deployment file name based on network
 * @param {string} networkName - Network name (optional)
 * @returns {string} Deployment file name
 */
export function getDeploymentFileName(networkName = null) {
  const network = networkName || process.env.NETWORK || 'local';
  
  if (network === 'local') {
    return 'deployments.json';
  }
  
  return `deployments-${network}.json`;
}

/**
 * Validate environment variables for current network
 * @throws {Error} If required environment variables are missing
 */
export function validateEnvironment() {
  const config = getCurrentNetworkConfig();
  
  console.log(`🌐 Using network: ${config.name}`);
  console.log(`🔗 RPC URL: ${config.rpcUrl}`);
  console.log(`⛓️  Chain ID: ${config.chainId}`);
  
  if (config.blockExplorer) {
    console.log(`🔍 Block Explorer: ${config.blockExplorer}`);
  }
  
  // Check private key requirement
  if (requiresPrivateKey()) {
    const privateKey = getPrivateKey();
    if (!privateKey) {
      throw new Error(
        `❌ Private key is required for ${config.name} network.\n` +
        `Please set PRIVATE_KEY environment variable.\n` +
        `Example: export PRIVATE_KEY=0x1234...`
      );
    }
    
    // Validate private key format
    try {
      new ethers.Wallet(privateKey);
      console.log(`🔑 Private key loaded successfully`);
    } catch (error) {
      throw new Error(`❌ Invalid private key format: ${error.message}`);
    }
  } else {
    console.log(`🔑 Using test accounts (no private key required)`);
  }
  
  console.log(''); // Empty line for readability
}

export { NETWORKS };
