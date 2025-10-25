#!/usr/bin/env node

/**
 * Example: How external systems can use the trust score calculator
 * This demonstrates the new wrapper functions that only require contract addresses
 */

import { 
  calculateTrustScoreByAddress,
  readAgentFeedbackByAddress,
  calculateTrustScoreForAgent 
} from './calculate-trust-score.js';

// Example configuration (would typically come from environment variables)
const CONFIG = {
  contractAddress: '0x8464...18bC', // ReputationRegistry contract address
  rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',  // RPC URL
  agentId: 1,                       // Agent ID to analyze
  privateKey: process.env.PRIVATE_KEY || null  // Optional: use default test account if null
};

async function exampleUsage() {
  console.log('🔍 Example: External System Usage\n');
  
  try {
    // Method 1: Complete trust score calculation (recommended for most use cases)
    console.log('📊 Method 1: Complete Trust Score Calculation');
    const result = await calculateTrustScoreByAddress(
      CONFIG.contractAddress,
      CONFIG.rpcUrl,
      CONFIG.agentId,
      CONFIG.privateKey
    );
    
    console.log(`Agent ID: ${result.agentId}`);
    console.log(`Trust Score: ${(result.trustScore.finalScore * 100).toFixed(1)}%`);
    console.log(`Feedback Entries: ${result.feedbackData.totalEntries}`);
    console.log(`Unique Clients: ${result.feedbackData.uniqueClients}`);
    console.log(`Average Score: ${result.feedbackData.averageScore.toFixed(1)}/100\n`);
    
    // Method 2: Just read feedback data (for custom processing)
    console.log('📋 Method 2: Read Raw Feedback Data');
    const feedbackData = await readAgentFeedbackByAddress(
      CONFIG.contractAddress,
      CONFIG.rpcUrl,
      CONFIG.agentId,
      CONFIG.privateKey
    );
    
    console.log(`Raw feedback data:`, {
      clients: feedbackData.clients.length,
      scores: feedbackData.scores,
      revokedStatuses: feedbackData.revokedStatuses
    });
    
    // Method 3: Use existing calculation with raw data
    console.log('\n🧮 Method 3: Custom Calculation with Raw Data');
    const customTrustScore = calculateTrustScoreForAgent(
      feedbackData.clients,
      feedbackData.scores,
      feedbackData.revokedStatuses
    );
    
    console.log(`Custom trust score: ${(customTrustScore.finalScore * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error);
}

export { exampleUsage };
