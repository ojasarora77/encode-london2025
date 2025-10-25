import { indexerService, pineconeService } from '../src/index';
import { AgentCard } from '../src/types/agentcard.types';
import * as fs from 'fs';
import * as path from 'path';

// Agent configurations from test-agents directory
const TEST_AGENTS = [
  { name: 'coder-agent', port: 41242 },
  { name: 'code-reviewer-agent', port: 41244 },
  { name: 'content-generator-agent', port: 41246 },
  { name: 'customer-support-agent', port: 41248 },
  { name: 'email-classifier-agent', port: 41250 },
  { name: 'fraud-detector-agent', port: 41252 },
  { name: 'meeting-analyzer-agent', port: 41254 },
  { name: 'quality-assurance-agent', port: 41256 },
  { name: 'recommendation-engine-agent', port: 41258 },
  { name: 'translator-agent', port: 41260 }
];

// Function to clear all vectors from Pinecone index
async function clearIndex() {
  try {
    console.log('🗑️  Clearing existing index...');
    const index = pineconeService['pinecone'].Index(pineconeService['indexName']);
    
    // Get all vectors and delete them
    const stats = await index.describeIndexStats();
    const totalCount = stats.totalRecordCount || 0;
    console.log(`Found ${totalCount} vectors to delete`);
    
    if (totalCount > 0) {
      // Delete all vectors by querying with a dummy vector and deleting all matches
      // This is a workaround since Pinecone doesn't have a direct "delete all" method
      const dummyVector = new Array(1024).fill(0);
      const queryResponse = await index.query({
        vector: dummyVector,
        topK: 10000, // Get as many as possible
        includeMetadata: true
      });
      
      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const idsToDelete = queryResponse.matches.map(match => match.id);
        await index.deleteMany(idsToDelete);
        console.log(`✅ Deleted ${idsToDelete.length} vectors`);
      }
    }
    
    console.log('✅ Index cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing index:', error);
    throw error;
  }
}

// Function to fetch agent card from running agent
async function fetchAgentCard(agentName: string, port: number): Promise<AgentCard | null> {
  try {
    const url = `http://localhost:${port}/card`;
    console.log(`📡 Fetching agent card from ${agentName} (${url})`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      console.warn(`⚠️  ${agentName} not responding (${response.status})`);
      return null;
    }
    
    const agentCard = await response.json() as AgentCard;
    console.log(`✅ Fetched ${agentName}: ${agentCard.name}`);
    return agentCard;
  } catch (error) {
    console.warn(`⚠️  Failed to fetch ${agentName}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Function to create agent cards from test-agents directory structure
async function loadTestAgents(): Promise<AgentCard[]> {
  console.log('📂 Loading agents from test-agents directory...');
  
  const agentCards: AgentCard[] = [];
  
  for (const agent of TEST_AGENTS) {
    // Try to fetch from running agent first
    const liveCard = await fetchAgentCard(agent.name, agent.port);
    if (liveCard) {
      agentCards.push(liveCard);
      continue;
    }
    
    // If agent is not running, create a basic card from directory structure
    console.log(`📝 Creating basic card for ${agent.name} (agent not running)`);
    
    const agentDir = path.join(__dirname, '../../test-agents', agent.name);
    const packageJsonPath = path.join(agentDir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const basicCard: AgentCard = {
        id: agent.name,
        name: packageJson.name || agent.name,
        description: packageJson.description || `AI agent for ${agent.name.replace(/-/g, ' ')}`,
        url: `http://localhost:${agent.port}`,
        version: packageJson.version || '1.0.0',
        provider: 'Test Agents',
        capabilities: ['streaming', 'api'],
        defaultInputModes: ['text'],
        defaultOutputModes: ['text'],
        skills: [
          {
            id: agent.name.replace('-agent', ''),
            name: agent.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: packageJson.description || `AI agent for ${agent.name.replace(/-/g, ' ')}`,
            tags: [agent.name.replace('-agent', ''), 'ai', 'automation']
          }
        ]
      };
      
      agentCards.push(basicCard);
    }
  }
  
  console.log(`✅ Loaded ${agentCards.length} agents`);
  return agentCards;
}

async function rebuildIndex() {
  try {
    console.log('🚀 Starting agent index rebuild...');
    
    // Initialize Pinecone index
    await pineconeService.initializeIndex();
    
    // Clear existing index
    await clearIndex();
    
    // Load test agents
    const agentCards = await loadTestAgents();
    
    if (agentCards.length === 0) {
      console.log('❌ No agents found to index');
      return;
    }
    
    console.log(`📊 Indexing ${agentCards.length} agents...`);
    
    // Index all agents
    await indexerService.indexAgentsBatch(agentCards);
    console.log('✅ Indexing complete!');
    
    // Test searches
    console.log('\n=== Testing Search Functionality ===');
    
    const testQueries = [
      'generate code',
      'translate text',
      'analyze code quality',
      'customer support',
      'fraud detection'
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Searching for: "${query}"`);
      const results = await indexerService.searchAgents(query, 3);
      console.log(`Found ${results.total} results:`);
      
      results.results.forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.name} (Score: ${result.score.toFixed(3)})`);
        console.log(`     ${result.description}`);
        if (result.matchReasons && result.matchReasons.length > 0) {
          console.log(`     Reasons: ${result.matchReasons.join(', ')}`);
        }
      });
    }
    
    console.log('\n🎉 Index rebuild completed successfully!');
    
  } catch (error) {
    console.error('❌ Error rebuilding index:', error);
    process.exit(1);
  }
}

rebuildIndex();
