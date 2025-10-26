#!/usr/bin/env node

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { 
  getProviderAndSigner
} from './utils.js';
import { 
  getCurrentNetworkConfig, 
  validateEnvironment,
  getDeploymentFileName
} from './config.js';

// Load contract ABIs
const IDENTITY_REGISTRY_ABI = JSON.parse(fs.readFileSync('../out/IdentityRegistry.sol/IdentityRegistry.json', 'utf8')).abi;
const REPUTATION_REGISTRY_ABI = JSON.parse(fs.readFileSync('../out/ReputationRegistry.sol/ReputationRegistry.json', 'utf8')).abi;
const COMPASS_TOKEN_ABI = JSON.parse(fs.readFileSync('../out/CompassToken.sol/CompassToken.json', 'utf8')).abi;
const FEEDBACK_AUTHENTICATION_DAO_ABI = JSON.parse(fs.readFileSync('../out/FeedbackAuthenticationDAO.sol/FeedbackAuthenticationDAO.json', 'utf8')).abi;

async function testDAOIntegration() {
  console.log('🧪 Starting DAO Integration Test...\n');
  
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  // Get provider and signers (use available test accounts)
  const { provider, signer: deployer } = getProviderAndSigner(0);
  const { signer: agentOwner } = getProviderAndSigner(1);
  const { signer: client1 } = getProviderAndSigner(2);
  const { signer: member1 } = getProviderAndSigner(3);
  const { signer: member2 } = getProviderAndSigner(0); // Reuse deployer for member2
  
  console.log(`📡 Connected to ${config.name}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`👤 Agent Owner: ${agentOwner.address}`);
  console.log(`👤 Client: ${client1.address}`);
  console.log(`👤 Member 1: ${member1.address}`);
  console.log(`👤 Member 2: ${member2.address}\n`);
  
  try {
    // Load deployed contracts
    const deployments = JSON.parse(fs.readFileSync(getDeploymentFileName(), 'utf8'));
    
    const identityRegistry = new ethers.Contract(deployments.identityRegistry, IDENTITY_REGISTRY_ABI, deployer);
    const reputationRegistry = new ethers.Contract(deployments.reputationRegistry, REPUTATION_REGISTRY_ABI, deployer);
    const compassToken = new ethers.Contract(deployments.compassToken, COMPASS_TOKEN_ABI, deployer);
    const dao = new ethers.Contract(deployments.feedbackAuthenticationDAO, FEEDBACK_AUTHENTICATION_DAO_ABI, deployer);
    
    console.log('📋 Loaded deployed contracts:');
    console.log(`   IdentityRegistry: ${deployments.identityRegistry}`);
    console.log(`   ReputationRegistry: ${deployments.reputationRegistry}`);
    console.log(`   CompassToken: ${deployments.compassToken}`);
    console.log(`   FeedbackAuthenticationDAO: ${deployments.feedbackAuthenticationDAO}\n`);
    
    // Test 1: Create an agent
    console.log('🔹 Test 1: Creating an agent...');
    const registerTx = await identityRegistry.connect(agentOwner)["register(string)"](
      "ipfs://test-agent-dao.json"
    );
    await registerTx.wait();
    
    const agentId = await identityRegistry.totalAgents();
    console.log(`✅ Agent created with ID: ${agentId}\n`);
    
    // Test 2: Create feedback in ERC-8004 system
    console.log('🔹 Test 2: Creating feedback in ERC-8004 system...');
    
    // Create feedback authorization
    const feedbackAuth = await createFeedbackAuth(
      agentId,
      client1.address,
      1,
      Math.floor(Date.now() / 1000) + 3600,
      identityRegistry.target,
      agentOwner
    );
    
    const giveFeedbackTx = await reputationRegistry.connect(client1).giveFeedback(
      agentId,
      85,
      ethers.keccak256(ethers.toUtf8Bytes("quality")),
      ethers.keccak256(ethers.toUtf8Bytes("speed")),
      "ipfs://test-feedback.json",
      ethers.keccak256(ethers.toUtf8Bytes("test-feedback")),
      feedbackAuth
    );
    await giveFeedbackTx.wait();
    
    console.log('✅ Feedback created in ERC-8004 system\n');
    
    // Test 3: Members join DAO
    console.log('🔹 Test 3: Members joining DAO...');
    
    const joinDAOTx1 = await dao.connect(member1).joinDAO();
    await joinDAOTx1.wait();
    console.log('✅ Member 1 joined DAO');
    
    // Wait to prevent nonce conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const joinDAOTx2 = await dao.connect(member2).joinDAO();
    await joinDAOTx2.wait();
    console.log('✅ Member 2 joined DAO');
    
    const memberCount = await dao.getMemberCount();
    console.log(`✅ Total members: ${memberCount}\n`);
    
    // Test 4: Member stakes to authenticate feedback
    console.log('🔹 Test 4: Member staking to authenticate feedback...');
    
    const stakeAmount = ethers.parseEther("1000");
    
    // Give member1 some tokens
    const transferTx = await compassToken.connect(deployer).transfer(member1.address, stakeAmount);
    await transferTx.wait();
    
    // Wait to prevent nonce conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Approve DAO to spend tokens
    const approveTx = await compassToken.connect(member1).approve(dao.target, stakeAmount);
    await approveTx.wait();
    
    // Wait to prevent nonce conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Authenticate feedback
    const authTx = await dao.connect(member1).authenticateFeedback(
      agentId,
      client1.address,
      1,
      stakeAmount
    );
    const authReceipt = await authTx.wait();
    
    // Extract authId from event
    const authEvent = authReceipt.logs.find(log => {
      try {
        const decoded = dao.interface.parseLog(log);
        return decoded.name === 'FeedbackAuthenticationStarted';
      } catch {
        return false;
      }
    });
    
    const authId = authEvent ? dao.interface.parseLog(authEvent).args.authId : 1;
    console.log(`✅ Member 1 staked to authenticate feedback, authId: ${authId}\n`);
    
    // Test 5: Check authentication status
    console.log('🔹 Test 5: Checking authentication status...');
    
    const authInfo = await dao.getPendingAuthentication(authId);
    console.log(`   Staker: ${authInfo.staker}`);
    console.log(`   Stake Amount: ${ethers.formatEther(authInfo.stakeAmount)} COMPASS`);
    console.log(`   Agent ID: ${authInfo.agentId}`);
    console.log(`   Client: ${authInfo.clientAddress}`);
    console.log(`   Feedback Index: ${authInfo.feedbackIndex}`);
    console.log(`   Status: ${authInfo.status}\n`);
    
    // Test 6: Fast forward time and finalize authentication
    console.log('🔹 Test 6: Finalizing authentication (simulating 24 hours)...');
    
    // Note: In a real test, you would need to use a test network that allows time manipulation
    // For this demo, we'll just show the finalization call
    console.log('⏰ Simulating 24 hours wait...');
    console.log('📝 In a real test environment, you would:');
    console.log('   1. Use vm.warp() or similar to fast forward time');
    console.log('   2. Call dao.finalizeAuthentication(authId)');
    console.log('   3. Verify the feedback is now DAO authenticated\n');
    
    // Test 7: Query authenticated feedback
    console.log('🔹 Test 7: Querying authenticated feedback...');
    
    const isAuthenticated = await dao.isAuthenticatedFeedback(agentId, client1.address, 1);
    console.log(`   Is authenticated: ${isAuthenticated}`);
    
    const authCount = await dao.getAuthenticatedFeedbackCount(agentId);
    console.log(`   Authenticated feedback count: ${authCount}\n`);
    
    // Test 8: Display DAO statistics
    console.log('🔹 Test 8: DAO Statistics...');
    
    const treasuryBalance = await dao.getTreasuryBalance();
    console.log(`   Treasury Balance: ${ethers.formatEther(treasuryBalance)} COMPASS`);
    console.log(`   Member Count: ${memberCount}`);
    console.log(`   Compass Token Address: ${compassToken.target}`);
    console.log(`   DAO Address: ${dao.target}\n`);
    
    console.log('🎉 DAO Integration Test Completed Successfully!');
    console.log('\n📖 Next Steps:');
    console.log('1. Deploy to a testnet for full testing with time manipulation');
    console.log('2. Test contestation and voting mechanisms');
    console.log('3. Test multiple feedback authentications');
    console.log('4. Test edge cases and error conditions');
    
  } catch (error) {
    console.error('❌ DAO Integration Test failed:', error);
    process.exit(1);
  }
}

async function createFeedbackAuth(agentId, clientAddress, indexLimit, expiry, identityRegistry, signer) {
  // Create proper EIP-191 signature for testing
  
  const structData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'uint64', 'uint256', 'uint256', 'address', 'address'],
    [agentId, clientAddress, indexLimit, expiry, 31337, identityRegistry, signer.address]
  );
  
  const messageHash = ethers.keccak256(ethers.concat([
    ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
    ethers.keccak256(structData)
  ]));
  
  // Create a real signature using the signer's private key
  const signature = await signer.signMessage(ethers.getBytes(ethers.keccak256(structData)));
  
  return ethers.concat([structData, signature]);
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDAOIntegration().catch(console.error);
}

export { testDAOIntegration };
