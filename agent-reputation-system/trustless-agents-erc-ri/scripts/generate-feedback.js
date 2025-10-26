#!/usr/bin/env node

import { ethers } from 'ethers';
import { 
  getProviderAndSigner, 
  getFeedbackProviderAndSigner,
  loadDeployments,
  loadAgentMappings,
  saveFeedbackData,
  waitForTransaction,
  getContracts,
  getRandomTestAccount,
  getTestAccount,
  createFeedbackAuth,
  signFeedbackAuth,
  encodeBytes32String,
  formatAddress
} from './utils.js';
import { 
  getCurrentNetworkConfig, 
  validateEnvironment 
} from './config.js';

async function generateFeedback() {
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  console.log(`💬 Starting feedback generation on ${config.name}...\n`);
  
  // Load deployment addresses and agent mappings
  const deployments = loadDeployments();
  const agentMappings = loadAgentMappings();
  
  console.log(`📋 Using contracts:`);
  console.log(`   IdentityRegistry: ${formatAddress(deployments.identityRegistry)}`);
  console.log(`   ReputationRegistry: ${formatAddress(deployments.reputationRegistry)}`);
  console.log(`   Network: ${deployments.network || config.name}`);
  console.log(`📄 Loaded ${Object.keys(agentMappings).length} registered agents\n`);
  
  // Get provider and signer for agent operations
  const { provider, signer } = getProviderAndSigner(0);
  const { identityRegistry, reputationRegistry } = getContracts(signer);
  
  // Get feedback signer (separate from agent owner)
  const { signer: feedbackSigner } = getFeedbackProviderAndSigner();
  
  const feedbackData = {};
  let totalFeedback = 0;
  
  try {
    for (const [agentId, agentInfo] of Object.entries(agentMappings)) {

      console.log(`💭 Generating feedback for: ${agentInfo.name}`);
      
      feedbackData[agentInfo.agentId] = {
        agentName: agentInfo.name,
        agentId: agentInfo.agentId,
        feedback: []
      };
      
      // Get the correct agent owner based on agent ID
      // Agents 1,3,5 were registered by account 0; agents 2,4 by account 1
      const agentOwnerIndex = (parseInt(agentInfo.agentId) - 1) % 2; // 0 for odd IDs, 1 for even IDs
      const { signer: agentOwnerSigner } = getProviderAndSigner(agentOwnerIndex);
      
      // Generate 3-5 feedback entries per agent
      const feedbackCount = Math.floor(Math.random() * 3) + 3; // 3-5 feedback
      
      for (let i = 0; i < feedbackCount; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        // Use feedback signer for all feedback operations
        const clientAccount = { address: feedbackSigner.address, privateKey: feedbackSigner.privateKey };
        
        // Generate random score (60-100)
        const score = Math.floor(Math.random() * 41) + 60;
        
        // Generate tags based on agent skills
        const possibleTags = ['quality', 'speed', 'reliability', 'accuracy', 'efficiency', 'usefulness'];
        const tag1 = possibleTags[Math.floor(Math.random() * possibleTags.length)];
        const tag2 = possibleTags[Math.floor(Math.random() * possibleTags.length)];
        
        // Create feedback authorization
        const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const indexLimit = 10; // Allow up to 10 feedback entries
        
        const auth = createFeedbackAuth(
          agentInfo.agentId,
          feedbackSigner.address, // Use the feedback signer's address
          indexLimit,
          expiry,
          config.chainId,
          deployments.identityRegistry,
          agentOwnerSigner.address // Use the correct agent owner's address
        );
        
        // Sign the authorization with the correct agent owner's private key
        const feedbackAuth = signFeedbackAuth(auth, agentOwnerSigner.privateKey);

        console.log(`   📝 Feedback Auth: ${feedbackAuth}`);
        
        console.log(`   📝 Feedback ${i + 1}: Score ${score}, Tags: ${tag1}, ${tag2}`);
        console.log(`   👤 Client: ${feedbackSigner.address}, Agent Owner: ${agentOwnerSigner.address}`);
        
        try {
          // Give feedback using the feedback signer
          const tx = await reputationRegistry.connect(feedbackSigner).giveFeedback(
            agentInfo.agentId,
            score,
            encodeBytes32String(tag1),
            encodeBytes32String(tag2),
            "", // Empty file URI
            ethers.ZeroHash, // Empty file hash
            feedbackAuth
          );
          
          await waitForTransaction(tx, `Feedback ${i + 1} for ${agentInfo.name}`);
          
          feedbackData[agentInfo.agentId].feedback.push({
            clientAddress: clientAccount.address,
            score: score,
            tag1: tag1,
            tag2: tag2,
            fileuri: `ipfs://feedback-${agentInfo.agentId}-${i + 1}.json`,
            timestamp: new Date().toISOString()
          });
          
          totalFeedback++;
          
        } catch (error) {
          console.log(`   ❌ Failed to submit feedback ${i + 1}: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Generated ${feedbackData[agentInfo.agentId].feedback.length} feedback entries\n`);

      
    }
    
    // Save feedback data
    saveFeedbackData(feedbackData);
    
    console.log(`🎉 Feedback generation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   Total agents: ${Object.keys(agentMappings).length}`);
    console.log(`   Total feedback entries: ${totalFeedback}`);
    console.log(`\n💾 Feedback data saved to: feedback-data.json`);
    
  } catch (error) {
    console.error('❌ Feedback generation failed:', error);
    process.exit(1);
  }
}

// Run feedback generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateFeedback().catch(console.error);
}
