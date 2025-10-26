#!/usr/bin/env node

import { ethers } from 'ethers';
import { 
  getProviderAndSigner, 
  loadDeployments, 
  loadSampleAgents,
  getContracts,
  formatAddress,
  formatAgentSummary
} from './utils.js';
import { 
  getCurrentNetworkConfig, 
  validateEnvironment 
} from './config.js';

/**
 * Calculate standard deviation of an array of numbers
 * @param {number[]} scores - Array of scores
 * @returns {number} Standard deviation
 */
function calculateStandardDeviation(scores) {
  if (scores.length === 0) return 0;
  
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

/**
 * Count unique reviewers from client addresses
 * @param {string[]} clients - Array of client addresses
 * @returns {number} Number of unique reviewers
 */
function countUniqueReviewers(clients) {
  return new Set(clients).size;
}

/**
 * Calculate trust score for an agent based on feedback data
 * @param {string[]} clients - Array of client addresses who gave feedback
 * @param {number[]} scores - Array of feedback scores (0-100)
 * @param {boolean[]} revokedStatuses - Array of revoked status for each feedback
 * @returns {Object} Trust score breakdown and final score
 */
export function calculateTrustScoreForAgent(clients, scores, revokedStatuses) {
  // Filter out revoked feedback
  const validIndices = [];
  for (let i = 0; i < scores.length; i++) {
    if (!revokedStatuses[i]) {
      validIndices.push(i);
    }
  }
  
  // If no valid feedback, return zero trust score
  if (validIndices.length === 0) {
    return {
      finalScore: 0,
      components: {
        averageScore: 0,
        volumeScore: 0,
        diversityScore: 0,
        consistencyScore: 0
      },
      metrics: {
        totalFeedback: 0,
        uniqueReviewers: 0,
        averageScore: 0,
        standardDeviation: 0
      }
    };
  }
  
  // Extract valid data
  const validClients = validIndices.map(i => clients[i]);
  const validScores = validIndices.map(i => scores[i]);
  
  // Calculate metrics
  const totalFeedback = validScores.length;
  const uniqueReviewers = countUniqueReviewers(validClients);
  const averageScore = validScores.reduce((sum, score) => sum + score, 0) / totalFeedback;
  const standardDeviation = calculateStandardDeviation(validScores);
  
  // Calculate trust score components
  
  // 1. Average Score Component (30% weight)
  const averageScoreComponent = averageScore / 100;
  
  // 2. Feedback Volume Component (20% weight)
  // Logarithmic scaling with diminishing returns
  const volumeComponent = Math.min(1, Math.log10(totalFeedback + 1) / Math.log10(50));
  
  // 3. Reviewer Diversity Component (30% weight)
  // Higher ratio of unique reviewers to total feedback = better
  const diversityComponent = Math.min(1, uniqueReviewers / totalFeedback);
  
  // 4. Score Consistency Component (20% weight)
  // Lower standard deviation = more consistent = higher trust
  const consistencyComponent = Math.max(0, 1 - Math.min(1, standardDeviation / 50));
  
  // Calculate weighted final score
  const finalScore = (
    averageScoreComponent * 0.30 +
    volumeComponent * 0.20 +
    diversityComponent * 0.30 +
    consistencyComponent * 0.20
  );
  
  return {
    finalScore,
    components: {
      averageScore: averageScoreComponent,
      volumeScore: volumeComponent,
      diversityScore: diversityComponent,
      consistencyScore: consistencyComponent
    },
    metrics: {
      totalFeedback,
      uniqueReviewers,
      averageScore,
      standardDeviation
    }
  };
}

/**
 * Read all feedback data for an agent from the smart contract
 * @param {Object} reputationRegistry - The ReputationRegistry contract instance
 * @param {number} agentId - The agent ID to read feedback for
 * @returns {Object} Feedback data with clients, scores, and revoked statuses
 */
export async function readAgentFeedback(reputationRegistry, agentId) {
  try {
    // Get all feedback data using readAllFeedback
    const [clients, scores, tag1s, tag2s, revokedStatuses] = await reputationRegistry.readAllFeedback(
      agentId,
      [], // all clients
      ethers.ZeroHash, // no tag1 filter
      ethers.ZeroHash, // no tag2 filter
      false // exclude revoked feedback
    );
    
    // Convert BigInt scores to numbers for calculations
    const numericScores = scores.map(score => Number(score));
    
    return {
      clients,
      scores: numericScores,
      tag1s,
      tag2s,
      revokedStatuses
    };
  } catch (error) {
    throw new Error(`Failed to read feedback for agent ${agentId}: ${error.message}`);
  }
}

/**
 * Read all feedback data for an agent using contract address and RPC URL
 * This wrapper function allows external systems to use just contract addresses
 * @param {string} contractAddress - The ReputationRegistry contract address
 * @param {string} rpcUrl - The RPC URL for blockchain connection
 * @param {number} agentId - The agent ID to read feedback for
 * @param {string} privateKey - Optional private key for signer (uses first test account if not provided)
 * @returns {Object} Feedback data with clients, scores, and revoked statuses
 */
export async function readAgentFeedbackByAddress(contractAddress, rpcUrl, agentId, privateKey = null) {
  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create signer (use provided private key or first test account)
    const signerPrivateKey = privateKey || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const signer = new ethers.Wallet(signerPrivateKey, provider);
    
    // Create contract instance
    const reputationRegistry = new ethers.Contract(
      contractAddress,
      [
        // Minimal ABI for readAllFeedback function
        "function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2, bool includeRevoked) external view returns (address[] memory clients, uint8[] memory scores, bytes32[] memory tag1s, bytes32[] memory tag2s, bool[] memory revokedStatuses)"
      ],
      signer
    );
    
    // Use the existing readAgentFeedback function
    return await readAgentFeedback(reputationRegistry, agentId);
    
  } catch (error) {
    throw new Error(`Failed to read feedback for agent ${agentId} using contract address ${contractAddress}: ${error.message}`);
  }
}

/**
 * Complete trust score calculation using contract address
 * This is the main function external systems should use
 * @param {string} contractAddress - The ReputationRegistry contract address
 * @param {string} rpcUrl - The RPC URL for blockchain connection
 * @param {number} agentId - The agent ID to calculate trust score for
 * @param {string} privateKey - Optional private key for signer
 * @returns {Object} Complete trust score result with metrics and components
 */
export async function calculateTrustScoreByAddress(contractAddress, rpcUrl, agentId, privateKey = null) {
  try {
    // Read feedback data using contract address
    const feedbackData = await readAgentFeedbackByAddress(contractAddress, rpcUrl, agentId, privateKey);
    
    // Calculate trust score
    const trustScore = calculateTrustScoreForAgent(
      feedbackData.clients,
      feedbackData.scores,
      feedbackData.revokedStatuses
    );
    
    return {
      agentId,
      trustScore,
      feedbackData: {
        totalEntries: feedbackData.clients.length,
        uniqueClients: new Set(feedbackData.clients).size,
        averageScore: feedbackData.scores.reduce((sum, score) => sum + score, 0) / feedbackData.scores.length || 0
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to calculate trust score for agent ${agentId}: ${error.message}`);
  }
}

/**
 * Format trust score output for console display
 * @param {string} agentName - Name of the agent
 * @param {number} agentId - ID of the agent
 * @param {Object} trustScore - Trust score result from calculateTrustScoreForAgent
 * @returns {string} Formatted output
 */
function formatTrustScoreOutput(agentName, agentId, trustScore) {
  const { finalScore, components, metrics } = trustScore;
  
  return `📊 ${agentName} (ID: ${agentId})
   📈 Trust Score: ${(finalScore * 100).toFixed(1)}%
   📝 Feedback: ${metrics.totalFeedback} entries from ${metrics.uniqueReviewers} reviewers
   📊 Average Score: ${metrics.averageScore.toFixed(1)}/100
   📏 Standard Deviation: ${metrics.standardDeviation.toFixed(1)}
   🔍 Components:
      • Average Score: ${(components.averageScore * 100).toFixed(1)}% (30% weight)
      • Volume: ${(components.volumeScore * 100).toFixed(1)}% (20% weight)
      • Diversity: ${(components.diversityScore * 100).toFixed(1)}% (30% weight)
      • Consistency: ${(components.consistencyScore * 100).toFixed(1)}% (20% weight)`;
}

async function calculateTrustScores() {
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  console.log(`🔍 Calculating trust scores on ${config.name}...\n`);

  // Load deployment addresses
  const deployments = loadDeployments();
  console.log(`📋 Using contracts:`);
  console.log(`   IdentityRegistry: ${formatAddress(deployments.identityRegistry)}`);
  console.log(`   ReputationRegistry: ${formatAddress(deployments.reputationRegistry)}`);
  console.log(`   Network: ${deployments.network || config.name}\n`);

  // Load sample agents
  const sampleAgents = loadSampleAgents();
  console.log(`📄 Loaded ${sampleAgents.length} sample agents\n`);

  // Get provider and signer
  const { provider, signer } = getProviderAndSigner(0);
  const { identityRegistry, reputationRegistry } = getContracts(signer);

  try {
    // Get all registered agents from the blockchain
    const registeredAgents = [];
    for (let agentId = 1; agentId <= sampleAgents.length; agentId++) {
      try {
        const owner = await identityRegistry.ownerOf(agentId);
        if (owner && owner !== ethers.ZeroAddress) {
          // Find the corresponding sample agent
          const sampleAgent = sampleAgents[agentId - 1];
          if (sampleAgent) {
            registeredAgents.push({
              ...sampleAgent,
              agentId: agentId.toString(),
              owner: owner
            });
          }
        }
      } catch (error) {
        // Agent doesn't exist, continue
      }
    }

    console.log(`📋 Found ${registeredAgents.length} registered agents on blockchain\n`);

    const trustScoreResults = [];
    
    // Calculate trust scores for each registered agent
    for (const agentInfo of registeredAgents) {
      const agentId = agentInfo.agentId;
      console.log(`🔍 Calculating trust score for ${agentInfo.name} (ID: ${agentId})...`);
      
      try {
        // Get all feedback data using centralized function
        const feedbackData = await readAgentFeedback(reputationRegistry, agentId);
        
        // Calculate trust score
        const trustScore = calculateTrustScoreForAgent(
          feedbackData.clients, 
          feedbackData.scores, 
          feedbackData.revokedStatuses
        );
        
        // Store result
        trustScoreResults.push({
          agentName: agentInfo.name,
          agentId,
          trustScore
        });
        
        console.log(formatTrustScoreOutput(agentInfo.name, agentId, trustScore));
        console.log(''); // Empty line for readability
        
      } catch (error) {
        console.log(`   ❌ Error calculating trust score: ${error.message}`);
        console.log('');
      }
    }

    // Display summary
    console.log('📋 Trust Score Summary:');
    console.log('========================');
    
    // Sort by trust score (highest first)
    trustScoreResults.sort((a, b) => b.trustScore.finalScore - a.trustScore.finalScore);
    
    for (const result of trustScoreResults) {
      const { agentName, agentId, trustScore } = result;
      console.log(`${agentName} (ID: ${agentId}): ${(trustScore.finalScore * 100).toFixed(1)}% trust score`);
    }

    console.log('\n🎉 Trust score calculation complete!');
    console.log('\n💡 Trust scores are calculated based on:');
    console.log('   • Average feedback score (30% weight)');
    console.log('   • Feedback volume with diminishing returns (20% weight)');
    console.log('   • Reviewer diversity to prevent spam (30% weight)');
    console.log('   • Score consistency to reward reliability (20% weight)');

  } catch (error) {
    console.error('❌ Error calculating trust scores:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  calculateTrustScores().catch(console.error);
}
