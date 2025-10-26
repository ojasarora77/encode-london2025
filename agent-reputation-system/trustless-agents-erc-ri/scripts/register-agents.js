#!/usr/bin/env node

import { ethers } from 'ethers';
import { 
  getProviderAndSigner, 
  loadDeployments,
  waitForTransaction,
  getContracts,
  formatAddress
} from './utils.js';
import { 
  getCurrentNetworkConfig, 
  validateEnvironment 
} from './config.js';
import fs from 'fs';
import path from 'path';

async function registerAgents() {
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  console.log(`🤖 Starting agent registration on ${config.name}...\n`);
  
  // Load deployment addresses
  const deployments = loadDeployments();
  console.log(`📋 Using contracts:`);
  console.log(`   IdentityRegistry: ${formatAddress(deployments.identityRegistry)}`);
  console.log(`   ReputationRegistry: ${formatAddress(deployments.reputationRegistry)}`);
  console.log(`   Network: ${deployments.network || config.name}\n`);
  
  // Get provider and signers (use different signers for each registration)
  const { provider } = getProviderAndSigner(0);
  
  // Load sample agents
  const sampleAgentsPath = path.join('..', '..', '..', 'agent-registry', 'data', 'sample-agents.json');
  const sampleAgents = JSON.parse(fs.readFileSync(sampleAgentsPath, 'utf8'));
  
  console.log(`📄 Loaded ${sampleAgents.length} agents from sample-agents.json\n`);
  
  const registeredAgents = [];
  let registeredCount = 0;
  
  try {
    // Register all agents from sample-agents.json
    for (let i = 0; i < sampleAgents.length; i++) {
      const agent = sampleAgents[i];
      console.log(`📝 Registering: ${agent.name}`);
      
      // Use different signer for each registration to avoid nonce conflicts
      const { signer } = getProviderAndSigner(i % 2); // Cycle through first 2 accounts
      const { identityRegistry } = getContracts(signer);
      
      // Create tokenURI with agent metadata
      const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify({
        name: agent.name,
        description: agent.description,
        image: "https://via.placeholder.com/300x300?text=Agent",
        attributes: [
          { trait_type: "Provider", value: agent.provider },
          { trait_type: "Version", value: agent.version },
          { trait_type: "Capabilities", value: agent.capabilities.join(", ") },
          { trait_type: "Skills", value: agent.skills.length.toString() }
        ],
        skills: agent.skills,
        capabilities: agent.capabilities,
        defaultInputModes: agent.defaultInputModes,
        defaultOutputModes: agent.defaultOutputModes
      })).toString('base64')}`;
      
      // Register agent
      const tx = await identityRegistry['register(string)'](tokenURI);
      const receipt = await waitForTransaction(tx, `Registration of ${agent.name}`);
      
      // Get the agent ID from the event
      const registeredEvent = receipt.logs.find(log => {
        try {
          const parsed = identityRegistry.interface.parseLog(log);
          return parsed && parsed.name === 'Registered';
        } catch {
          return false;
        }
      });
      
      if (registeredEvent) {
        const parsed = identityRegistry.interface.parseLog(registeredEvent);
        const agentId = parsed.args.agentId.toString();
        
        registeredAgents.push({
          ...agent,
          agentId: agentId,
          tokenURI: tokenURI
        });
        
        console.log(`   ✅ Registered with ID: ${agentId}`);
        registeredCount++;
      } else {
        console.log(`   ⚠️  Could not find registration event for ${agent.name}`);
      }
    }
    
    console.log(`\n🎉 Registration completed!`);
    console.log(`📊 Summary:`);
    console.log(`   Total agents: ${sampleAgents.length}`);
    console.log(`   Successfully registered: ${registeredCount}`);
    console.log(`   Failed: ${sampleAgents.length - registeredCount}`);
    console.log(`\n📄 Using sample-agents.json as data source (no mappings file needed)`);
    
  } catch (error) {
    console.error('❌ Registration failed:', error);
    process.exit(1);
  }
}

// Run registration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  registerAgents().catch(console.error);
}
