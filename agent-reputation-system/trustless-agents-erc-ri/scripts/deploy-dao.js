#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { 
  getProviderAndSigner, 
  saveDeployments, 
  waitForTransaction
} from './utils.js';
import { 
  getCurrentNetworkConfig, 
  validateEnvironment,
  getDeploymentFileName
} from './config.js';

// Load contract ABIs
const COMPASS_TOKEN_ABI = JSON.parse(fs.readFileSync('../out/CompassToken.sol/CompassToken.json', 'utf8')).abi;
const FEEDBACK_AUTHENTICATION_DAO_ABI = JSON.parse(fs.readFileSync('../out/FeedbackAuthenticationDAO.sol/FeedbackAuthenticationDAO.json', 'utf8')).abi;

async function deployDAOContracts() {
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  console.log(`🚀 Starting DAO contract deployment to ${config.name}...\n`);
  
  // Get provider and signers
  const { provider, signer: signer1 } = getProviderAndSigner(0);
  const { signer: signer2 } = getProviderAndSigner(1);
  
  console.log(`📡 Connected to ${config.name} at: ${config.rpcUrl}`);
  console.log(`👤 Deployer 1: ${signer1.address}`);
  console.log(`👤 Deployer 2: ${signer2.address}`);
  console.log(`⛓️  Chain ID: ${config.chainId}\n`);
  
  try {
    // Load bytecode from compiled artifacts
    const compassTokenArtifact = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../out/CompassToken.sol/CompassToken.json'), 'utf8'));
    const daoArtifact = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '../out/FeedbackAuthenticationDAO.sol/FeedbackAuthenticationDAO.json'), 'utf8'));
    
    // Deploy CompassToken
    console.log('🪙 Deploying CompassToken...');
    const compassTokenFactory = new ethers.ContractFactory(
      COMPASS_TOKEN_ABI,
      compassTokenArtifact.bytecode.object,
      signer1
    );
    
    const initialTokenSupply = ethers.parseEther("1000000"); // 1M tokens
    const compassTokenTx = await compassTokenFactory.deploy(initialTokenSupply);
    const compassToken = await compassTokenTx.waitForDeployment();
    const compassTokenAddress = await compassToken.getAddress();
    
    await waitForTransaction(compassTokenTx.deploymentTransaction(), 'CompassToken deployment');
    console.log(`✅ CompassToken deployed at: ${compassTokenAddress}`);
    
    // Deploy FeedbackAuthenticationDAO
    console.log('🏛️ Deploying FeedbackAuthenticationDAO...');
    const daoFactory = new ethers.ContractFactory(
      FEEDBACK_AUTHENTICATION_DAO_ABI,
      daoArtifact.bytecode.object,
      signer2
    );
    
    // Get ReputationRegistry address from existing deployment
    const deploymentFileName = getDeploymentFileName();
    console.log(`📁 Loading deployments from: ${deploymentFileName}`);
    const existingDeployments = JSON.parse(fs.readFileSync(deploymentFileName, 'utf8'));
    console.log(`📋 Existing deployments:`, existingDeployments);
    const reputationRegistryAddress = existingDeployments.reputationRegistry;
    
    if (!reputationRegistryAddress) {
      throw new Error('ReputationRegistry not found in existing deployments. Please deploy ERC-8004 contracts first.');
    }
    
    console.log(`✅ ReputationRegistry address: ${reputationRegistryAddress}`);
    
    const initialTreasury = ethers.parseEther("500000"); // 500K tokens for treasury
    
    // Deploy DAO first
    const daoTx = await daoFactory.deploy(
      compassTokenAddress,
      reputationRegistryAddress,
      initialTreasury
    );
    const dao = await daoTx.waitForDeployment();
    const daoAddress = await dao.getAddress();
    
    await waitForTransaction(daoTx.deploymentTransaction(), 'FeedbackAuthenticationDAO deployment');
    console.log(`✅ FeedbackAuthenticationDAO deployed at: ${daoAddress}`);
    
    // Set DAO contract in CompassToken
    console.log('🔗 Setting DAO contract in CompassToken...');
    const setDAOTx = await compassToken.setDAOContract(daoAddress);
    await setDAOTx.wait();
    console.log('✅ DAO contract set in CompassToken');
    
    // Wait a bit to prevent nonce conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Transfer treasury tokens from deployer to DAO
    console.log('💰 Transferring treasury tokens to DAO...');
    const transferTx = await compassToken.transfer(daoAddress, initialTreasury);
    await transferTx.wait();
    console.log('✅ Treasury tokens transferred to DAO');
    
    // Wait a bit to prevent nonce conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update DAO treasury balance to match actual token balance
    console.log('🔄 Updating DAO treasury balance...');
    const updateTx = await dao.updateTreasuryBalance();
    await updateTx.wait();
    console.log('✅ DAO treasury balance updated');
    
    // Save deployment addresses
    const deployments = {
      ...existingDeployments,
      compassToken: compassTokenAddress,
      feedbackAuthenticationDAO: daoAddress,
      daoDeployedAt: new Date().toISOString()
    };
    
    saveDeployments(deployments);
    
    console.log('\n🎉 DAO deployment completed successfully!');
    console.log('📋 Contract Addresses:');
    console.log(`   CompassToken:            ${compassTokenAddress}`);
    console.log(`   FeedbackAuthenticationDAO: ${daoAddress}`);
    console.log(`   ReputationRegistry:      ${reputationRegistryAddress}`);
    console.log(`   Chain ID:                ${config.chainId}`);
    console.log(`   Network:                 ${config.name}`);
    if (config.blockExplorer) {
      console.log(`   Block Explorer:         ${config.blockExplorer}`);
    }
    console.log(`\n💾 Deployment data saved to: ${getDeploymentFileName()}`);
    
    // Display usage instructions
    console.log('\n📖 Usage Instructions:');
    console.log('1. Members can join the DAO by calling joinDAO()');
    console.log('2. Members can authenticate feedback by calling authenticateFeedback()');
    console.log('3. Members can contest authentications by calling contestAuthentication()');
    console.log('4. Members can vote on contestations by calling voteOnContestation()');
    console.log('5. Anyone can finalize authentications by calling finalizeAuthentication()');
    console.log('6. Query authenticated feedback using getAuthenticatedFeedback()');
    
  } catch (error) {
    console.error('❌ DAO deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployDAOContracts().catch(console.error);
}

export { deployDAOContracts };
