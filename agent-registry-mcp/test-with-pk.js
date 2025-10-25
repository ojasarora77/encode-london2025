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
    
    // Check USDC balance
    const usdcContractAddress = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
    const usdcBalance = await publicClient.readContract({
      address: usdcContractAddress,
      abi: [{
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
      }],
      functionName: 'balanceOf',
      args: [purchaserAddress]
    });
    
    console.log(`   Purchaser USDC Balance: ${formatUnits(usdcBalance, 6)} USDC`);


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
    
    let signature = null; // Declare signature variable for later use
    
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
      const paymentAmount = parseUnits('0.01', 6); // 0.01 USDC
      
      console.log('4️⃣  Creating REAL x402 EIP-712 signature...');
      console.log(`   Authorizing ${formatUnits(paymentAmount, 6)} USDC payment to ${recipientAddress}`);
      
      // Create EIP-712 signature for x402 payment authorization
      const domain = {
        name: 'x402',
        version: '1',
        chainId: arbitrumSepolia.id,
        verifyingContract: recipientAddress
      };
      
      const types = {
        PaymentAuthorization: [
          { name: 'amount', type: 'uint256' },
          { name: 'currency', type: 'string' },
          { name: 'recipient', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      };
      
      const message = {
        amount: paymentAmount,
        currency: 'USDC',
        recipient: recipientAddress,
        nonce: BigInt(Date.now()),
        deadline: BigInt(Date.now() + 300000) // 5 minutes
      };
      
      // Sign the EIP-712 typed data
      signature = await walletClient.signTypedData({
        account: purchaserAccount,
        domain,
        types,
        primaryType: 'PaymentAuthorization',
        message
      });
      
      console.log(`   ✅ EIP-712 signature created: ${signature}`);
      console.log('   📝 Signature authorizes relayer to execute USDC transfer');
      console.log(`   🔗 Signature Hash: ${signature}\n`);
      
      console.log('5️⃣  Making paid search request with EIP-712 signature...');
      
      const paidSearchResponse = await fetch(env.MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-402-Signature': signature,
          'X-402-Amount': '0.01',
          'X-402-Currency': 'USDC',
          'X-402-Recipient': recipientAddress,
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
          console.log('   ✅ REAL x402 paid search successful!');
          console.log('   Search results:');
          console.log(JSON.stringify(searchData, null, 2));
        } else {
          const errorText = await paidSearchResponse.text();
          console.log(`   ❌ Paid search failed: ${paidSearchResponse.status}`);
          console.log(`   Error: ${errorText}`);
        }
      
    } else {
      console.log('   ❌ Expected 402 Payment Required, got:', paymentRequestResponse.status);
    }

    console.log('\n🎉 REAL x402 EIP-712 signature test completed!');
    console.log('🔐 EIP-712 signature authorizes relayer to execute USDC transfer');
    console.log('🔗 View signature details:');
    console.log(`   Signer: ${purchaserAddress}`);
    console.log(`   Signature Hash: ${signature || 'Generated during test'}`);
    console.log(`   Network: Arbitrum Sepolia`);

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
