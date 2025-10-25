#!/usr/bin/env node

/**
 * Test MCP request to the server
 */

console.log('🧪 Testing MCP Server with Proper MCP Request\n');

async function testMCPRequest() {
  try {
    console.log('1️⃣  Testing MCP tools list...');
    
    const toolsResponse = await fetch('http://localhost:40399', {
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

    console.log('\n2️⃣  Testing MCP tool call...');
    
    const toolResponse = await fetch('http://localhost:40399', {
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

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testMCPRequest();
