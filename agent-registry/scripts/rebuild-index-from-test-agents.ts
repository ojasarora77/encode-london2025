import { indexerService, pineconeService } from '../src/index';
import { AgentCard } from '../src/types/agentcard.types';
import * as fs from 'fs';
import * as path from 'path';

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

// Function to load agents from sample-agents.json
async function loadSampleAgents(): Promise<AgentCard[]> {
  console.log('📂 Loading agents from sample-agents.json...');
  
  try {
    const sampleAgentsPath = path.join(__dirname, '../data/sample-agents.json');
    const sampleAgentsData = fs.readFileSync(sampleAgentsPath, 'utf8');
    const agentCards: AgentCard[] = JSON.parse(sampleAgentsData);
    
    console.log(`✅ Loaded ${agentCards.length} agents from sample data`);
    return agentCards;
  } catch (error) {
    console.error('❌ Error loading sample agents:', error);
    throw error;
  }
}

async function rebuildIndex() {
  try {
    console.log('🚀 Starting agent index rebuild...');
    
    // Initialize Pinecone index
    await pineconeService.initializeIndex();
    
    // Clear existing index
    await clearIndex();
    
    // Load sample agents
    const agentCards = await loadSampleAgents();
    
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
