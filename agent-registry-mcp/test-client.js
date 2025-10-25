#!/usr/bin/env node

/**
 * Test client for x402 MCP server
 * Makes real x402 payment calls to the Agent Registry MCP server
 */

import { config } from 'dotenv';
import { withPayment } from 'x402-mcp';
import { createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { toAccount } from 'viem/accounts';
import { CdpClient } from '@coinbase/cdp-sdk';
import { base, baseSepolia } from 'viem/chains';
import { createPublicClient, http } from 'viem';

// Load environment variables
config();

const env = {
  CDP_WALLET_SECRET: process.env.CDP_WALLET_SECRET,
  CDP_API_KEY_ID: process.env.CDP_API_KEY_ID,
  CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
  NETWORK: process.env.NETWORK || 'base-sepolia',
  MCP_SERVER_URL: process.env.MCP_SERVER_URL || 'http://localhost:8787'
};

console.log('🧪 Testing x402 MCP Client for Agent Registry\n');

async function testX402MCPClient() {
  try {
    console.log('1️⃣  Setting up CDP client and purchaser account...');
    
    const cdp = new CdpClient();
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

    console.log(`   Purchaser Address: ${purchaserAccount.address}\n`);

    console.log('2️⃣  Creating MCP client with x402 payment support...');
    
    const mcpClient = await createMCPClient({
      transport: new StreamableHTTPClientTransport(new URL(env.MCP_SERVER_URL)),
    }).then((client) => withPayment(client, { 
      account: toAccount(purchaserAccount), 
      network: env.NETWORK 
    }));

    console.log('   ✅ MCP client created with x402 payment support\n');

    console.log('3️⃣  Testing tool discovery...');
    const tools = await mcpClient.tools();
    console.log(`   Available tools: ${tools.map(t => t.name).join(', ')}\n`);

    console.log('4️⃣  Making paid search call...');
    console.log('   Query: "I need to extract invoice data from PDF files"');
    console.log('   Price: $0.001 USDC\n');

    const result = await mcpClient.callTool('search_agents', {
      query: 'I need to extract invoice data from PDF files',
      limit: 3,
      filters: {
        capabilities: ['ocr', 'pdf-processing'],
        minScore: 0.7
      }
    });

    console.log('5️⃣  Search results:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n🎉 x402 MCP test completed successfully!');
    console.log('💰 Payment processed automatically via x402 protocol');
    console.log('🔗 View transaction on Base Sepolia explorer');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure MCP server is running on port 8787');
    console.error('2. Check CDP credentials are correct');
    console.error('3. Verify Agent Registry API is running on port 3001');
    console.error('4. Check network connectivity');
    process.exit(1);
  }
}

// Run the test
testX402MCPClient();
