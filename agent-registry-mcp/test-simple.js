#!/usr/bin/env node

/**
 * Simple test for MCP server
 * Tests the server with a basic HTTP request
 */

import { config } from 'dotenv';

// Load environment variables
config();

console.log('🧪 Testing MCP Server with Simple HTTP Request\n');

async function testMCPServer() {
  try {
    console.log('1️⃣  Testing MCP server health...');
    
    const response = await fetch('http://localhost:8787', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log(`   Status: ${response.status}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

    if (response.ok) {
      const text = await response.text();
      console.log(`   Response: ${text.substring(0, 200)}...`);
      console.log('   ✅ MCP server is responding\n');
    } else {
      console.log('   ❌ MCP server not responding properly\n');
    }

    console.log('2️⃣  Testing MCP tools list...');
    
    const toolsResponse = await fetch('http://localhost:8787', {
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
      console.log(JSON.stringify(toolsData, null, 2));
    } else {
      console.log(`   ❌ Tools list failed: ${toolsResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Ensure MCP server is running on port 8787');
    console.error('2. Check if wrangler dev is running');
    console.error('3. Verify no build errors');
  }
}

// Run the test
testMCPServer();
