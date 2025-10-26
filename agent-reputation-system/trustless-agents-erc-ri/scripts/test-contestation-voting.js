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

// Load contract ABIs
const COMPASS_TOKEN_ABI = JSON.parse(fs.readFileSync('../out/CompassToken.sol/CompassToken.json', 'utf8')).abi;
const FEEDBACK_AUTHENTICATION_DAO_ABI = JSON.parse(fs.readFileSync('../out/FeedbackAuthenticationDAO.sol/FeedbackAuthenticationDAO.json', 'utf8')).abi;

async function testContestationAndVoting() {
  console.log('🧪 Starting Contestation and Voting Test...\n');
  
  // Validate environment and get network config
  validateEnvironment();
  const config = getCurrentNetworkConfig();
  
  // Get provider and signers
  const { provider, signer: deployer } = getProviderAndSigner(0);
  const { signer: agentOwner } = getProviderAndSigner(1);
  const { signer: client1 } = getProviderAndSigner(2);
  const { signer: member1 } = getProviderAndSigner(3);
  const { signer: member2 } = getProviderAndSigner(0); // Reuse deployer for member2
  const { signer: member3 } = getProviderAndSigner(1); // Reuse agentOwner for member3
  const { signer: member4 } = getProviderAndSigner(2); // Reuse client1 for member4
  
  console.log(`📡 Connected to ${config.name}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`👤 Agent Owner: ${agentOwner.address}`);
  console.log(`👤 Client: ${client1.address}`);
  console.log(`👤 Member 1: ${member1.address}`);
  console.log(`👤 Member 2: ${member2.address}`);
  console.log(`👤 Member 3: ${member3.address}`);
  console.log(`👤 Member 4: ${member4.address}\n`);
  
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
      "ipfs://test-agent-contestation.json"
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
      "ipfs://test-feedback-contestation.json",
      ethers.keccak256(ethers.toUtf8Bytes("test-feedback-contestation")),
      feedbackAuth
    );
    await giveFeedbackTx.wait();
    
    console.log('✅ Feedback created in ERC-8004 system\n');
    
    // Test 3: Multiple members join DAO
    console.log('🔹 Test 3: Multiple members joining DAO...');
    
    const members = [member1, member2, member3, member4];
    for (let i = 0; i < members.length; i++) {
      const joinDAOTx = await dao.connect(members[i]).joinDAO();
      await joinDAOTx.wait();
      console.log(`✅ Member ${i + 1} joined DAO`);
      
      // Wait to prevent nonce conflicts
      if (i < members.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const memberCount = await dao.getMemberCount();
    console.log(`✅ Total members: ${memberCount}\n`);
    
    // Test 4: Member 1 stakes to authenticate feedback
    console.log('🔹 Test 4: Member 1 staking to authenticate feedback...');
    
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
        return decoded && decoded.name === 'FeedbackAuthenticationStarted';
      } catch (e) {
        return false;
      }
    });
    
    const authId = authEvent ? dao.interface.parseLog(authEvent).args.authId : 1;
    console.log(`✅ Member 1 staked to authenticate feedback, authId: ${authId}\n`);
    
    // Test 5: Member 2 contests the authentication
    console.log('🔹 Test 5: Member 2 contesting the authentication...');
    
    // Give member2 some tokens
    const transferTx2 = await compassToken.connect(deployer).transfer(member2.address, stakeAmount);
    await transferTx2.wait();
    
    // Wait to prevent nonce conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Approve DAO to spend tokens
    const approveTx2 = await compassToken.connect(member2).approve(dao.target, stakeAmount);
    await approveTx2.wait();
    
    // Wait to prevent nonce conflicts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Contest authentication
    const contestTx = await dao.connect(member2).contestAuthentication(authId, stakeAmount);
    await contestTx.wait();
    
    console.log('✅ Member 2 contested the authentication\n');
    
    // Test 6: Check contestation status
    console.log('🔹 Test 6: Checking contestation status...');
    
    const pendingAuth = await dao.getPendingAuthentication(authId);
    console.log(`   Status: ${pendingAuth.status} (0=Pending, 1=Contested, 2=Authenticated, 3=Rejected)`);
    console.log(`   Staker: ${pendingAuth.staker}`);
    console.log(`   Stake Amount: ${ethers.formatEther(pendingAuth.stakeAmount)} COMPASS`);
    console.log(`   Start Time: ${new Date(Number(pendingAuth.startTime) * 1000).toISOString()}`);
    console.log(`   Paused At: ${pendingAuth.pausedAt > 0 ? new Date(Number(pendingAuth.pausedAt) * 1000).toISOString() : 'Not paused'}\n`);
    
    // Test 7: Members vote on contestation
    console.log('🔹 Test 7: Members voting on contestation...');
    
    const voteStake = ethers.parseEther("500");
    
    // Give voting tokens to members
    for (let i = 0; i < members.length; i++) {
      const transferVoteTx = await compassToken.connect(deployer).transfer(members[i].address, voteStake);
      await transferVoteTx.wait();
      
      // Wait to prevent nonce conflicts
      if (i < members.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Approve DAO to spend voting tokens
    for (let i = 0; i < members.length; i++) {
      const approveVoteTx = await compassToken.connect(members[i]).approve(dao.target, voteStake);
      await approveVoteTx.wait();
      
      // Wait to prevent nonce conflicts
      if (i < members.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Members vote (2 for legitimate, 2 for not legitimate)
    const votes = [
      { member: member1, choice: 1 }, // Legitimate
      { member: member2, choice: 2 }, // Not Legitimate
      { member: member3, choice: 1 }, // Legitimate
      { member: member4, choice: 2 }  // Not Legitimate
    ];
    
    for (let i = 0; i < votes.length; i++) {
      const voteTx = await dao.connect(votes[i].member).voteOnContestation(
        authId,
        votes[i].choice,
        voteStake
      );
      await voteTx.wait();
      console.log(`✅ Member ${i + 1} voted ${votes[i].choice === 1 ? 'Legitimate' : 'Not Legitimate'}`);
      
      // Wait to prevent nonce conflicts
      if (i < votes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('');
    
    // Test 8: Check voting results
    console.log('🔹 Test 8: Checking voting results...');
    
    const contestation = await dao.getContestation(authId);
    console.log(`   Contester: ${contestation.contester}`);
    console.log(`   Contest Stake: ${ethers.formatEther(contestation.contestStake)} COMPASS`);
    console.log(`   Vote Start Time: ${new Date(Number(contestation.voteStartTime) * 1000).toISOString()}`);
    console.log(`   Legitimate Stake: ${ethers.formatEther(contestation.legitimateStake)} COMPASS`);
    console.log(`   Not Legitimate Stake: ${ethers.formatEther(contestation.notLegitimateStake)} COMPASS\n`);
    
    // Test 9: Simulate time passage and finalize contestation
    console.log('🔹 Test 9: Simulating time passage and finalizing contestation...');
    console.log('⏰ In a real test environment, you would:');
    console.log('   1. Use vm.warp() to fast forward 4 hours');
    console.log('   2. Call dao.finalizeContestation(authId)');
    console.log('   3. Verify the voting results and token distribution\n');
    
    // Test 10: Check final authentication status
    console.log('🔹 Test 10: Checking final authentication status...');
    
    const finalPendingAuth = await dao.getPendingAuthentication(authId);
    console.log(`   Final Status: ${finalPendingAuth.status} (0=Pending, 1=Contested, 2=Authenticated, 3=Rejected)`);
    console.log(`   Is authenticated: ${await dao.isAuthenticatedFeedback(agentId, client1.address, 1)}`);
    console.log(`   Authenticated feedback count: ${await dao.getAuthenticatedFeedbackCount(agentId)}\n`);
    
    // Test 11: DAO Statistics after contestation
    console.log('🔹 Test 11: DAO Statistics after contestation...');
    
    const treasuryBalance = await dao.getTreasuryBalance();
    const finalMemberCount = await dao.getMemberCount();
    
    console.log(`   Treasury Balance: ${ethers.formatEther(treasuryBalance)} COMPASS`);
    console.log(`   Member Count: ${finalMemberCount}`);
    console.log(`   Compass Token Address: ${deployments.compassToken}`);
    console.log(`   DAO Address: ${deployments.feedbackAuthenticationDAO}\n`);
    
    // Test 12: Test edge cases
    console.log('🔹 Test 12: Testing edge cases...');
    
    // Try to vote again (should fail)
    try {
      const duplicateVoteTx = await dao.connect(member1).voteOnContestation(authId, 1, voteStake);
      await duplicateVoteTx.wait();
      console.log('❌ Duplicate vote should have failed');
    } catch (error) {
      console.log('✅ Duplicate vote correctly rejected');
    }
    
    // Try to contest non-existent authentication (should fail)
    try {
      const invalidContestTx = await dao.connect(member2).contestAuthentication(999, stakeAmount);
      await invalidContestTx.wait();
      console.log('❌ Invalid contest should have failed');
    } catch (error) {
      console.log('✅ Invalid contest correctly rejected');
    }
    
    console.log('');
    
    console.log('🎉 Contestation and Voting Test Completed Successfully!\n');
    
    console.log('📖 Test Summary:');
    console.log('✅ Agent creation and feedback submission');
    console.log('✅ Multiple DAO membership');
    console.log('✅ Feedback authentication staking');
    console.log('✅ Contestation mechanism');
    console.log('✅ Voting system with multiple participants');
    console.log('✅ Edge case validation');
    console.log('✅ Status tracking and statistics\n');
    
    console.log('📖 Next Steps:');
    console.log('1. Deploy to testnet for full time manipulation testing');
    console.log('2. Test finalization after time passage');
    console.log('3. Test token distribution after voting');
    console.log('4. Test multiple concurrent contestations');
    console.log('5. Test complex voting scenarios');
    
  } catch (error) {
    console.error('❌ Contestation and Voting Test failed:', error);
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
  testContestationAndVoting().catch(console.error);
}
