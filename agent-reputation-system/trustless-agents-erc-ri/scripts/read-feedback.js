#!/usr/bin/env node

import { ethers } from 'ethers';
import { 
  getProviderAndSigner, 
  loadDeployments, 
  loadAgentMappings,
  getContracts,
  formatAddress,
  formatAgentSummary,
  encodeBytes32String
} from './utils.js';

async function readFeedback() {
  console.log('📊 Reading feedback summaries...\n');

  // Load deployment addresses
  const deployments = loadDeployments();
  console.log(`📋 Using contracts:`);
  console.log(`   IdentityRegistry: ${formatAddress(deployments.identityRegistry)}`);
  console.log(`   ReputationRegistry: ${formatAddress(deployments.reputationRegistry)}\n`);

  // Load agent mappings
  const agentMappings = loadAgentMappings();
  console.log(`📄 Loaded ${Object.keys(agentMappings).length} registered agents\n`);

  // Get provider and signer
  const { provider, signer } = getProviderAndSigner(0);
  const { reputationRegistry } = getContracts(signer);

  try {
    // Read feedback summaries for each agent
    for (const [agentName, agentData] of Object.entries(agentMappings)) {
      const agentId = agentData.agentId;
      console.log(`📈 ${agentName} (ID: ${agentId})`);
      
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
    for (const [agentName, agentData] of Object.entries(agentMappings)) {
      const agentId = agentData.agentId;
      try {
        const [count, averageScore] = await reputationRegistry.getSummary(
          agentId,
          [],
          ethers.ZeroHash,
          ethers.ZeroHash
        );
        
        console.log(formatAgentSummary(agentName, agentId, count, averageScore));
      } catch (error) {
        console.log(`${agentName} (ID: ${agentId}): Error reading feedback`);
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