#!/usr/bin/env node

import { ethers } from 'ethers';
import { 
  getProviderAndSigner, 
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
  formatAddress,
  ANVIL_CHAIN_ID
} from './utils.js';

async function generateFeedback() {
  console.log('💬 Starting feedback generation...\n');
  
  // Load deployment addresses and agent mappings
  const deployments = loadDeployments();
  const agentMappings = loadAgentMappings();
  
  console.log(`📋 Using contracts:`);
  console.log(`   IdentityRegistry: ${formatAddress(deployments.identityRegistry)}`);
  console.log(`   ReputationRegistry: ${formatAddress(deployments.reputationRegistry)}`);
  console.log(`📄 Loaded ${Object.keys(agentMappings).length} registered agents\n`);
  
  // Get provider and signer (using first account as agent owner)
  const { provider, signer } = getProviderAndSigner(0);
  const { identityRegistry, reputationRegistry } = getContracts(signer);
  
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
        // Use different accounts for clients (accounts 2-3) to avoid conflicts with agent owners
        const clientIndex = (i % 2) + 2; // Use accounts 2, 3 (only valid ones)
        const { signer: clientSigner } = getProviderAndSigner(clientIndex);
        const clientAccount = { address: clientSigner.address, privateKey: clientSigner.privateKey };
        
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
          clientSigner.address, // Use the client signer's address
          indexLimit,
          expiry,
          ANVIL_CHAIN_ID,
          deployments.identityRegistry,
          agentOwnerSigner.address // Use the correct agent owner's address
        );
        
        // Sign the authorization with the correct agent owner's private key
        const feedbackAuth = signFeedbackAuth(auth, agentOwnerSigner.privateKey);

        console.log(`   📝 Feedback Auth: ${feedbackAuth}`);
        
        console.log(`   📝 Feedback ${i + 1}: Score ${score}, Tags: ${tag1}, ${tag2}`);
        console.log(`   👤 Client: ${clientSigner.address}, Agent Owner: ${agentOwnerSigner.address}`);
        
        try {
          // Give feedback using the client signer
          const tx = await reputationRegistry.connect(clientSigner).giveFeedback(
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
