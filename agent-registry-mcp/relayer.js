/**
 * x402 Relayer Service
 * Executes USDC transfers based on EIP-712 signatures
 */

import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { createPublicClient, http, parseUnits, formatUnits, createWalletClient } from 'viem';

// Load environment variables
config({ path: '.dev.vars' });

const env = {
  NETWORK: process.env.NETWORK || 'arbitrum-sepolia',
  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || process.env.PURCHASER_PRIVATE_KEY, // Use same key for demo
  SELLER_ADDRESS: process.env.SELLER_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678',
  USDC_CONTRACT: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' // USDC on Arbitrum Sepolia
};

async function executeRelayerTransfer(signature, amount, currency, recipient) {
  console.log('🔄 x402 Relayer: Executing USDC transfer...');
  console.log(`   Signature: ${signature}`);
  console.log(`   Amount: ${amount} ${currency}`);
  console.log(`   Recipient: ${recipient}`);
  console.log(`   Recipient type: ${typeof recipient}`);
  console.log(`   Recipient value: ${JSON.stringify(recipient)}`);

  try {
    // Setup relayer wallet
    const relayerAccount = privateKeyToAccount(env.RELAYER_PRIVATE_KEY);
    const relayerAddress = relayerAccount.address;
    
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account: relayerAccount,
      chain: arbitrumSepolia,
      transport: http(),
    });

    console.log(`   Relayer Address: ${relayerAddress}`);

    // Check relayer USDC balance
    const usdcBalance = await publicClient.readContract({
      address: env.USDC_CONTRACT,
      abi: [{
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
      }],
      functionName: 'balanceOf',
      args: [relayerAddress]
    });

    console.log(`   Relayer USDC Balance: ${formatUnits(usdcBalance, 6)} USDC`);

    // Execute USDC transfer
    const transferAmount = parseUnits(amount, 6); // USDC has 6 decimals
    
    console.log(`   💸 Executing USDC transfer: ${amount} USDC to ${recipient}`);
    
    // Ensure recipient is properly formatted
    const recipientAddress = recipient.startsWith('0x') ? recipient : `0x${recipient}`;
    
    const txHash = await walletClient.sendTransaction({
      account: relayerAccount,
      to: env.USDC_CONTRACT,
      data: `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${transferAmount.toString(16).padStart(64, '0')}`,
      value: 0n,
    });

    console.log(`   ✅ Relayer transaction submitted: ${txHash}`);
    console.log(`   ⏳ Waiting for confirmation...`);

    // Wait for transaction confirmation
    const tx = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (tx.status === 'success') {
      console.log(`   🎉 Relayer transfer confirmed!`);
      console.log(`   Block: ${tx.blockNumber}`);
      console.log(`   Gas Used: ${tx.gasUsed}`);
      return txHash;
    } else {
      throw new Error('Relayer transaction failed');
    }

  } catch (error) {
    console.error(`   ❌ Relayer execution failed: ${error.message}`);
    throw error;
  }
}

// Export for use in MCP server
export { executeRelayerTransfer };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const signature = process.argv[2];
  const amount = process.argv[3] || '0.01';
  const currency = process.argv[4] || 'USDC';
  const recipient = process.argv[5] || env.SELLER_ADDRESS;

  if (!signature) {
    console.log('Usage: node relayer.js <signature> [amount] [currency] [recipient]');
    process.exit(1);
  }

  executeRelayerTransfer(signature, amount, currency, recipient)
    .then(txHash => {
      console.log(`\n🎉 Relayer execution completed!`);
      console.log(`Transaction Hash: ${txHash}`);
    })
    .catch(error => {
      console.error(`\n❌ Relayer execution failed: ${error.message}`);
      process.exit(1);
    });
}
