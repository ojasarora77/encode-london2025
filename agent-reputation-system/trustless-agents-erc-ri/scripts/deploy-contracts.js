#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { 
  getProviderAndSigner, 
  saveDeployments, 
  waitForTransaction,
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI
} from './utils.js';
import { 
  getCurrentNetworkConfig, 
  validateEnvironment,
  getDeploymentFileName
} from './config.js';

async function deployContracts() {
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  console.log(`🚀 Starting ERC-8004 contract deployment to ${config.name}...\n`);
  
  // Get provider and signers (using different accounts for each deployment)
  const { provider, signer: signer1 } = getProviderAndSigner(0);
  const { signer: signer2 } = getProviderAndSigner(1);
  
  console.log(`📡 Connected to ${config.name} at: ${config.rpcUrl}`);
  console.log(`👤 Deployer 1: ${signer1.address}`);
  console.log(`👤 Deployer 2: ${signer2.address}`);
  console.log(`⛓️  Chain ID: ${config.chainId}\n`);
  
  try {
    // Load bytecode from compiled artifacts
    const identityRegistryArtifact = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../out/IdentityRegistry.sol/IdentityRegistry.json'), 'utf8'));
    const reputationRegistryArtifact = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../out/ReputationRegistry.sol/ReputationRegistry.json'), 'utf8'));
    
    // Deploy IdentityRegistry
    console.log('📋 Deploying IdentityRegistry...');
    const identityRegistryFactory = new ethers.ContractFactory(
      IDENTITY_REGISTRY_ABI,
      identityRegistryArtifact.bytecode.object,
      signer1
    );
    
    const identityRegistryTx = await identityRegistryFactory.deploy();
    const identityRegistry = await identityRegistryTx.waitForDeployment();
    const identityRegistryAddress = await identityRegistry.getAddress();
    
    await waitForTransaction(identityRegistryTx.deploymentTransaction(), 'IdentityRegistry deployment');
    
    // Deploy ReputationRegistry
    console.log('📊 Deploying ReputationRegistry...');
    const reputationRegistryFactory = new ethers.ContractFactory(
      REPUTATION_REGISTRY_ABI,
      reputationRegistryArtifact.bytecode.object,
      signer2
    );
    
    const reputationRegistryTx = await reputationRegistryFactory.deploy(identityRegistryAddress);
    const reputationRegistry = await reputationRegistryTx.waitForDeployment();
    const reputationRegistryAddress = await reputationRegistry.getAddress();
    
    await waitForTransaction(reputationRegistryTx.deploymentTransaction(), 'ReputationRegistry deployment');
    
    // Save deployment addresses
    const deployments = {
      identityRegistry: identityRegistryAddress,
      reputationRegistry: reputationRegistryAddress,
      chainId: config.chainId,
      network: config.name,
      deployedAt: new Date().toISOString()
    };
    
    saveDeployments(deployments);
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('📋 Contract Addresses:');
    console.log(`   IdentityRegistry:   ${identityRegistryAddress}`);
    console.log(`   ReputationRegistry: ${reputationRegistryAddress}`);
    console.log(`   Chain ID:           ${config.chainId}`);
    console.log(`   Network:            ${config.name}`);
    if (config.blockExplorer) {
      console.log(`   Block Explorer:    ${config.blockExplorer}`);
    }
    console.log(`\n💾 Deployment data saved to: ${getDeploymentFileName()}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployContracts().catch(console.error);
}