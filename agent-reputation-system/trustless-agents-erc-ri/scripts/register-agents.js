#!/usr/bin/env node

import { ethers } from 'ethers';
import { 
  getProviderAndSigner, 
  loadDeployments,
  saveAgentMappings,
  waitForTransaction,
  getContracts,
  formatAddress
} from './utils.js';
import fs from 'fs';
import path from 'path';

async function registerAgents() {
  console.log('🤖 Starting agent registration...\n');
  
  // Load deployment addresses
  const deployments = loadDeployments();
  console.log(`📋 Using contracts:`);
  console.log(`   IdentityRegistry: ${formatAddress(deployments.identityRegistry)}`);
  console.log(`   ReputationRegistry: ${formatAddress(deployments.reputationRegistry)}\n`);
  
  // Get provider and signers (use different signers for each registration)
  const { provider } = getProviderAndSigner(0);
  
  // Load sample agents
  const sampleAgentsPath = path.join('..', '..', '..', 'agent-registry', 'data', 'sample-agents.json');
  const sampleAgents = JSON.parse(fs.readFileSync(sampleAgentsPath, 'utf8'));
  
  console.log(`📄 Loaded ${sampleAgents.length} agents from sample-agents.json\n`);
  
  const agentMappings = {};
  let registeredCount = 0;
  
  try {
    // Register only first 5 agents for testing
    const agentsToRegister = sampleAgents.slice(0, 5);
    for (let i = 0; i < agentsToRegister.length; i++) {
      const agent = agentsToRegister[i];
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
        
        agentMappings[agent.id] = {
          agentId: agentId,
          name: agent.name,
          provider: agent.provider,
          version: agent.version,
          tokenURI: tokenURI
        };
        
        console.log(`   ✅ Registered with ID: ${agentId}`);
        registeredCount++;
      } else {
        console.log(`   ⚠️  Could not find registration event for ${agent.name}`);
      }
    }
    
    // Save agent mappings
    saveAgentMappings(agentMappings);
    
    console.log(`\n🎉 Registration completed!`);
    console.log(`📊 Summary:`);
    console.log(`   Total agents: ${sampleAgents.length}`);
    console.log(`   Successfully registered: ${registeredCount}`);
    console.log(`   Failed: ${sampleAgents.length - registeredCount}`);
    console.log(`\n💾 Agent mappings saved to: agent-mappings.json`);
    
  } catch (error) {
    console.error('❌ Registration failed:', error);
    process.exit(1);
  }
}

// Run registration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  registerAgents().catch(console.error);
}
