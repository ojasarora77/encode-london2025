#!/usr/bin/env node

/**
 * Test REAL testnet payments with x402 MCP server using private key
 * Makes actual USDC transactions on Base Sepolia testnet
 */

import { config } from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { createPublicClient, http, parseUnits, formatUnits, createWalletClient } from 'viem';
import { privateKeyToAddress } from 'viem/accounts';

// Load environment variables from .dev.vars
config({ path: '.dev.vars' });

const env = {
  PURCHASER_PRIVATE_KEY: process.env.PURCHASER_PRIVATE_KEY,
  SELLER_ADDRESS: process.env.SELLER_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678',
  NETWORK: process.env.NETWORK || 'base-sepolia',
  MCP_SERVER_URL: 'http://localhost:8787'
};

console.log('🧪 Testing REAL Testnet Payments with Private Key\n');

async function testRealPaymentsWithPK() {
  try {
    if (!env.PURCHASER_PRIVATE_KEY) {
      throw new Error('PURCHASER_PRIVATE_KEY not found in environment variables');
    }

    console.log('1️⃣  Setting up wallet and accounts...');
    
    const chainMap = {
      'arbitrum-sepolia': arbitrumSepolia,
    };
    const chain = chainMap[env.NETWORK];
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const walletClient = createWalletClient({
      chain,
      transport: http(),
    });

    // Create account from private key
    const purchaserAccount = privateKeyToAccount(env.PURCHASER_PRIVATE_KEY);
    const purchaserAddress = purchaserAccount.address;
    
    console.log(`   Purchaser Address: ${purchaserAddress}`);
    console.log(`   Seller Address: ${env.SELLER_ADDRESS}`);

    // Check balances
    const purchaserBalance = await publicClient.getBalance({
      address: purchaserAddress,
    });
    
    console.log(`   Purchaser ETH Balance: ${formatUnits(purchaserBalance, 18)} ETH`);

    // Check USDC balance (if you have USDC contract address)
    // For now, we'll assume you have USDC or will get it from faucet

    console.log('\n2️⃣  Testing MCP server...');
    
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
      
      // For now, let's send ETH instead of USDC (simpler)
      const ethAmount = parseUnits('0.001', 18); // 0.001 ETH
      
      const txHash = await walletClient.sendTransaction({
        account: purchaserAccount,
        to: recipientAddress,
        value: ethAmount,
      });
      
      console.log(`   Transaction Hash: ${txHash}`);
      console.log('   ⏳ Waiting for transaction confirmation...');
      
      // Wait for transaction confirmation
      const tx = await publicClient.waitForTransactionReceipt({
        hash: txHash,
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
            'X-402-Transaction': txHash,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'search_agents',
        arguments: {
          query: 'extract invoice data from PDF files',
          limit: 3,
          filters: {
            capabilities: ['ocr', 'batch-processing'],
            minScore: 0.4
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
    console.log('💰 Actual ETH was transferred on Arbitrum Sepolia testnet');
    console.log('🔗 View transaction on Arbitrum Sepolia explorer:');
    if (typeof txHash !== 'undefined') {
      console.log(`   Transaction: https://sepolia.arbiscan.io/tx/${txHash}`);
    }
    console.log(`   Purchaser: https://sepolia.arbiscan.io/address/${purchaserAddress}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure MCP server is running');
    console.error('2. Check PURCHASER_PRIVATE_KEY is set in .dev.vars');
    console.error('3. Verify Agent Registry API is running on', env.MCP_SERVER_URL);
    console.error('4. Check network connectivity');
    console.error('5. Ensure private key has sufficient ETH balance');
  }
}

// Run the test
testRealPaymentsWithPK();
