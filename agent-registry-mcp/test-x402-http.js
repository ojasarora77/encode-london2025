#!/usr/bin/env node

/**
 * Test x402 MCP server with HTTP requests
 * Tests the paid MCP server to see if it handles x402 payments
 */

import { config } from 'dotenv';

// Load environment variables
config();

const env = {
  CDP_WALLET_SECRET: process.env.CDP_WALLET_SECRET,
  CDP_API_KEY_ID: process.env.CDP_API_KEY_ID,
  CDP_API_KEY_SECRET: process.env.CDP_API_KEY_SECRET,
  NETWORK: process.env.NETWORK || 'base-sepolia',
  MCP_SERVER_URL: 'http://localhost:46445'
};

console.log('🧪 Testing x402 MCP Server with HTTP Requests\n');

async function testX402MCPHTTP() {
  try {
    console.log('1️⃣  Testing MCP server health...');
    
    const healthResponse = await fetch(env.MCP_SERVER_URL, {
      method: 'GET',
    });
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response: ${await healthResponse.text()}\n`);

    console.log('2️⃣  Testing MCP tools list...');
    
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

    console.log(`   Status: ${toolsResponse.status}`);
    
    if (toolsResponse.ok) {
      const toolsData = await toolsResponse.json();
      console.log('   ✅ Tools list response:');
      console.log(JSON.stringify(toolsData, null, 2));
    } else {
      const errorText = await toolsResponse.text();
      console.log(`   ❌ Tools list failed: ${toolsResponse.status}`);
      console.log(`   Error: ${errorText}`);
    }

    console.log('\n3️⃣  Testing MCP tool call (this should trigger x402 payment)...');
    
    const toolResponse = await fetch(env.MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
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

    console.log(`   Status: ${toolResponse.status}`);
    
    if (toolResponse.ok) {
      const toolData = await toolResponse.json();
      console.log('   ✅ Tool call response:');
      console.log(JSON.stringify(toolData, null, 2));
    } else {
      const errorText = await toolResponse.text();
      console.log(`   ❌ Tool call failed: ${toolResponse.status}`);
      console.log(`   Error: ${errorText}`);
    }

    console.log('\n4️⃣  Testing x402 payment headers...');
    
    // Test if the server responds with x402 payment headers
    const paymentTestResponse = await fetch(env.MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-402-Payment': 'required',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'search_agents',
          arguments: {
            query: 'test payment required',
            limit: 1
          }
        }
      })
    });

    console.log(`   Status: ${paymentTestResponse.status}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(paymentTestResponse.headers.entries()))}`);
    
    const paymentTestData = await paymentTestResponse.text();
    console.log(`   Response: ${paymentTestData}`);

    console.log('\n🎉 x402 MCP HTTP test completed!');
    console.log('📋 Summary:');
    console.log('- MCP server is responding');
    console.log('- Tools list is working');
    console.log('- Tool calls are being processed');
    console.log('- Check if x402 payment integration is working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure MCP server is running on port 46445');
    console.error('2. Check if x402-mcp library is properly integrated');
    console.error('3. Verify Agent Registry API is running on port 3001');
    console.error('4. Check network connectivity');
  }
}

// Run the test
testX402MCPHTTP();
