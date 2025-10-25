#!/usr/bin/env node

/**
 * Test REAL testnet payments with x402 MCP server
 * Makes actual USDC transactions on Base Sepolia testnet
 */

import { config } from 'dotenv';
import { toAccount } from 'viem/accounts';
import { CdpClient } from '@coinbase/cdp-sdk';
import { base, baseSepolia } from 'viem/chains';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';

// Load environment variables from .dev.vars
config({ path: '.dev.vars' });

const env = {
  CDP_WALLET_SECRET: process.env.CDP_WALLET_SECRET,
  CDP_API_KEY_ID: process.env.CDP_API_KEY_ID,
  CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
  NETWORK: process.env.NETWORK || 'base-sepolia',
  MCP_SERVER_URL: 'http://localhost:43467'
};

console.log('🧪 Testing REAL Testnet Payments with x402 MCP Server\n');

async function testRealPayments() {
  try {
    console.log('1️⃣  Setting up CDP client and accounts...');
    
    const cdp = new CdpClient({
      apiKeyId: env.CDP_API_KEY_ID,
      apiKeySecret: env.CDP_API_KEY_SECRET,
      walletSecret: env.CDP_WALLET_SECRET,
    });
    
    const chainMap = {
      'base-sepolia': baseSepolia,
      'base': base,
    };
    const chain = chainMap[env.NETWORK];
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Create purchaser account
    const purchaserAccount = await cdp.evm.getOrCreateAccount({
      name: 'AgentRegistryMCP-Purchaser',
    });
    
    // Create seller account (same as in the MCP server)
    const sellerAccount = await cdp.evm.getOrCreateAccount({
      name: 'AgentRegistryMCP-Seller',
    });
    
    console.log(`   Purchaser Address: ${purchaserAccount.address}`);
    console.log(`   Seller Address: ${sellerAccount.address}`);

    // Get balances
    const purchaserBalances = await purchaserAccount.listTokenBalances({
      network: env.NETWORK,
    });
    const sellerBalances = await sellerAccount.listTokenBalances({
      network: env.NETWORK,
    });

    const purchaserUsdcBalance = purchaserBalances.balances.find(
      (balance) => balance.token.symbol === 'USDC'
    );
    const sellerUsdcBalance = sellerBalances.balances.find(
      (balance) => balance.token.symbol === 'USDC'
    );

    console.log(`   Purchaser USDC Balance: ${purchaserUsdcBalance ? Number(purchaserUsdcBalance.amount) / 1000000 : 0} USDC`);
    console.log(`   Seller USDC Balance: ${sellerUsdcBalance ? Number(sellerUsdcBalance.amount) / 1000000 : 0} USDC`);

    // If purchaser needs USDC, request from faucet
    if (
      env.NETWORK === 'base-sepolia' &&
      (!purchaserUsdcBalance || Number(purchaserUsdcBalance.amount) < 1000000) // Need at least 1 USDC
    ) {
      console.log('   💰 Requesting testnet USDC for purchaser account...');
      const { transactionHash } = await cdp.evm.requestFaucet({
        address: purchaserAccount.address,
        network: env.NETWORK,
        token: 'usdc',
      });
      const tx = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      });
      if (tx.status !== 'success') {
        throw new Error('Failed to receive funds from faucet');
      }
      console.log('   ✅ Received testnet USDC successfully');
    }

    console.log('\n2️⃣  Testing MCP server (simple version)...');
    
    // Test with a simple MCP server that doesn't use CDP
    const simpleServerUrl = 'http://localhost:43467';
    
    const toolsResponse = await fetch(simpleServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    if (toolsResponse.ok) {
      const toolsData = await toolsResponse.json();
      console.log('   ✅ Tools list response:');
      console.log(`   Available tools: ${toolsData.result.tools.map(t => t.name).join(', ')}\n`);
    } else {
      console.log(`   ❌ Tools list failed: ${toolsResponse.status}\n`);
    }

    console.log('3️⃣  Making REAL testnet payment...');
    
    const paymentAmount = parseUnits('0.001', 6); // 0.001 USDC
    console.log(`   Sending ${formatUnits(paymentAmount, 6)} USDC to ${sellerAccount.address}`);
    
    // Make real USDC transfer
    const transferResult = await cdp.evm.sendTransaction({
      from: purchaserAccount.address,
      to: sellerAccount.address,
      value: paymentAmount.toString(),
      network: env.NETWORK,
      token: 'usdc',
    });
    
    console.log(`   Transaction Hash: ${transferResult.transactionHash}`);
    console.log('   ⏳ Waiting for transaction confirmation...');
    
    // Wait for transaction confirmation
    const tx = await publicClient.waitForTransactionReceipt({
      hash: transferResult.transactionHash,
    });
    
    if (tx.status === 'success') {
      console.log('   ✅ Payment confirmed on blockchain!');
      console.log(`   Block: ${tx.blockNumber}`);
      console.log(`   Gas Used: ${tx.gasUsed}\n`);
      
      console.log('4️⃣  Making paid search request with transaction hash...');
      
      const paidSearchResponse = await fetch(simpleServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Transaction': transferResult.transactionHash,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'search_agents',
            arguments: {
              query: 'I need to extract invoice data from PDF files',
              limit: 3,
              filters: {
                capabilities: ['ocr', 'pdf-processing'],
                minScore: 0.7
              }
            }
          }
        })
      });

      console.log(`   Status: ${paidSearchResponse.status}`);
      
      if (paidSearchResponse.ok) {
        const searchData = await paidSearchResponse.json();
        console.log('   ✅ Paid search successful!');
        console.log('   Search results:');
        console.log(JSON.stringify(searchData, null, 2));
      } else {
        const errorText = await paidSearchResponse.text();
        console.log(`   ❌ Paid search failed: ${paidSearchResponse.status}`);
        console.log(`   Error: ${errorText}`);
      }
      
    } else {
      console.log('   ❌ Payment transaction failed');
    }

    console.log('\n🎉 REAL testnet payment test completed!');
    console.log('💰 Actual USDC was transferred on Base Sepolia testnet');
    console.log('🔗 View transactions on Base Sepolia explorer:');
    console.log(`   Purchaser: https://sepolia.basescan.org/address/${purchaserAccount.address}`);
    console.log(`   Seller: https://sepolia.basescan.org/address/${sellerAccount.address}`);
    console.log(`   Transaction: https://sepolia.basescan.org/tx/${transferResult.transactionHash}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure MCP server is running');
    console.error('2. Check CDP credentials are correct');
    console.error('3. Verify Agent Registry API is running on port 3001');
    console.error('4. Check network connectivity');
    console.error('5. Ensure purchaser account has sufficient USDC balance');
  }
}

// Run the test
testRealPayments();
