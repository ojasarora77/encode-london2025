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

console.log('Environment check:');
console.log(`CDP_API_KEY_ID: ${env.CDP_API_KEY_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`CDP_API_KEY_SECRET: ${env.CDP_API_KEY_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`CDP_WALLET_SECRET: ${env.CDP_WALLET_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`NETWORK: ${env.NETWORK}\n`);

console.log('🧪 Testing REAL Testnet Payments with x402 MCP Server\n');

async function testRealPayments() {
  try {
    console.log('1️⃣  Setting up CDP client and purchaser account...');
    
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
    
    const balances = await purchaserAccount.listTokenBalances({
      network: env.NETWORK,
    });

    const usdcBalance = balances.balances.find(
      (balance) => balance.token.symbol === 'USDC'
    );

    // If under $0.50 while on testnet, request more
    if (
      env.NETWORK === 'base-sepolia' &&
      (!usdcBalance || Number(usdcBalance.amount) < 500000)
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

    console.log(`   Purchaser Address: ${purchaserAccount.address}`);
    console.log(`   USDC Balance: ${usdcBalance ? Number(usdcBalance.amount) / 1000000 : 0} USDC\n`);

    console.log('2️⃣  Testing MCP server tools list...');
    
    const toolsResponse = await fetch(env.MCP_SERVER_URL, {
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

    console.log('3️⃣  Making payment request (should get 402)...');
    
    const paymentRequestResponse = await fetch(env.MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-402-Payment': 'required',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_agents',
          arguments: {
            query: 'I need to extract invoice data from PDF files',
            limit: 3
          }
        }
      })
    });

    console.log(`   Status: ${paymentRequestResponse.status}`);
    
    if (paymentRequestResponse.status === 402) {
      const paymentData = await paymentRequestResponse.json();
      console.log('   ✅ Payment required response:');
      console.log(`   Amount: ${paymentData.error.data.payment.amount} ${paymentData.error.data.payment.currency}`);
      console.log(`   Recipient: ${paymentData.error.data.payment.recipient}`);
      console.log(`   Network: ${paymentData.error.data.payment.network}\n`);
      
      const recipientAddress = paymentData.error.data.payment.recipient;
      const paymentAmount = parseUnits('0.001', 6); // 0.001 USDC
      
      console.log('4️⃣  Making REAL testnet payment...');
      console.log(`   Sending ${formatUnits(paymentAmount, 6)} USDC to ${recipientAddress}`);
      
      // Make real USDC transfer
      const transferResult = await cdp.evm.sendTransaction({
        from: purchaserAccount.address,
        to: recipientAddress,
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
        
        console.log('5️⃣  Making paid search request with transaction hash...');
        
        const paidSearchResponse = await fetch(env.MCP_SERVER_URL, {
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
      
    } else {
      console.log('   ❌ Expected 402 Payment Required, got:', paymentRequestResponse.status);
    }

    console.log('\n🎉 REAL testnet payment test completed!');
    console.log('💰 Actual USDC was transferred on Base Sepolia testnet');
    console.log('🔗 View transaction on Base Sepolia explorer');
    console.log(`   https://sepolia.basescan.org/address/${purchaserAccount.address}`);

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
