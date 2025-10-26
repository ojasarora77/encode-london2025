#!/usr/bin/env node

import { ethers } from 'ethers';
import { 
  getProviderAndSigner, 
  loadDeployments, 
  loadSampleAgents,
  getContracts,
  formatAddress,
  formatAgentSummary,
  encodeBytes32String
} from './utils.js';
import { 
  getCurrentNetworkConfig, 
  validateEnvironment 
} from './config.js';

async function readFeedback() {
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  console.log(`📊 Reading feedback summaries on ${config.name}...\n`);

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

    // Read feedback summaries for each registered agent
    for (const agentInfo of registeredAgents) {
      const agentId = agentInfo.agentId;
      console.log(`📈 ${agentInfo.name} (ID: ${agentId})`);
      
      try {
        // Get summary for all feedback (no filters)
        const [count, averageScore] = await reputationRegistry.getSummary(
          agentId,
          [], // empty array = all clients
          ethers.ZeroHash, // no tag filter
          ethers.ZeroHash  // no tag filter
        );
        
        console.log(`   📊 All feedback: ${count} entries, avg score: ${averageScore}/100`);
        
        // Get summary filtered by specific tag
        const qualityTag = encodeBytes32String('quality');
        const [qualityCount, qualityScore] = await reputationRegistry.getSummary(
          agentId,
          [], // all clients
          qualityTag, // filter by quality tag
          ethers.ZeroHash
        );
        
        console.log(`   🏷️  "quality" tag filter: ${qualityCount} entries, avg score: ${qualityScore}/100`);
        
        // Get summary filtered by speed tag
        const speedTag = encodeBytes32String('speed');
        const [speedCount, speedScore] = await reputationRegistry.getSummary(
          agentId,
          [], // all clients
          speedTag, // filter by speed tag
          ethers.ZeroHash
        );
        
        console.log(`   🏷️  "speed" tag filter: ${speedCount} entries, avg score: ${speedScore}/100`);
        
        console.log(''); // Empty line for readability
        
      } catch (error) {
        console.log(`   ❌ Error reading feedback: ${error.message}`);
        console.log('');
      }
    }

    console.log('📋 Overall Summary:');
    console.log('==================');
    
    // Display overall statistics
    for (const agentInfo of registeredAgents) {
      const agentId = agentInfo.agentId;
      try {
        const [count, averageScore] = await reputationRegistry.getSummary(
          agentId,
          [],
          ethers.ZeroHash,
          ethers.ZeroHash
        );
        
        console.log(formatAgentSummary(agentInfo.name, agentId, count, averageScore));
      } catch (error) {
        console.log(`${agentInfo.name} (ID: ${agentId}): Error reading feedback`);
      }
    }

    console.log('\n🎉 Feedback reading complete!');
    console.log('\n💡 Note: This demonstrates the getSummary functionality.');
    console.log('   To see actual feedback data, you would need to:');
    console.log('   1. Fix the feedback authorization system');
    console.log('   2. Generate valid feedback with proper EIP-191 signatures');
    console.log('   3. Ensure client addresses match the authorization');

  } catch (error) {
    console.error('❌ Error reading feedback:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  readFeedback().catch(console.error);
}