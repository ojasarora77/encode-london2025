const { spawn } = require('child_process');
const path = require('path');

// Test the MCP server
async function testMCPServer() {
  console.log('🧪 Testing Agent Registry MCP Server...\n');
  
  // Start the MCP server
  const mcpServer = spawn('node', ['src/index.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      AGENT_REGISTRY_URL: 'http://localhost:3001'
    }
  });

  let output = '';
  let errorOutput = '';

  mcpServer.stdout.on('data', (data) => {
    output += data.toString();
  });

  mcpServer.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Test 1: List tools
  console.log('📋 Test 1: Listing available tools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  mcpServer.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait a bit for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Search agents
  console.log('🔍 Test 2: Searching for agents...');
  const searchRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'search_agents',
      arguments: {
        query: 'extract invoice data from PDF',
        limit: 3
      }
    }
  };

  mcpServer.stdin.write(JSON.stringify(searchRequest) + '\n');

  // Wait for responses
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Search with filters
  console.log('🎯 Test 3: Searching with filters...');
  const filteredSearchRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search_agents',
      arguments: {
        query: 'translate text between languages',
        limit: 2,
        filters: {
          capabilities: ['streaming', 'real-time'],
          minScore: 0.6
        }
      }
    }
  };

  mcpServer.stdin.write(JSON.stringify(filteredSearchRequest) + '\n');

  // Wait for final response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Close the server
  mcpServer.kill();

  console.log('\n📊 Test Results:');
  console.log('================');
  console.log('STDOUT:', output);
  if (errorOutput) {
    console.log('STDERR:', errorOutput);
  }

  // Parse and display results
  const lines = output.split('\n').filter(line => line.trim());
  lines.forEach((line, index) => {
    try {
      const response = JSON.parse(line);
      console.log(`\n📦 Response ${index + 1}:`);
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log(`\n📝 Raw output ${index + 1}: ${line}`);
    }
  });
}

testMCPServer().catch(console.error);
