import { indexerService, pineconeService } from '../src/index';
import { AgentCard } from '../src/types/agentcard.types';
import * as fs from 'fs';
import * as path from 'path';

// Load sample agents from JSON file
function loadSampleAgents(): AgentCard[] {
  const dataPath = path.join(__dirname, '../data/sample-agents.json');
  const data = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(data);
}

async function indexAgents() {
  try {
    console.log('Starting agent indexing...');
    
    // Initialize Pinecone index
    await pineconeService.initializeIndex();
    
    // Load sample agents
    const agentCards = loadSampleAgents();
    console.log(`Loaded ${agentCards.length} agents from sample data`);
    
    // Index all agents
    await indexerService.indexAgentsBatch(agentCards);
    console.log('Indexing complete!');
    
    // Test searches
    console.log('\n=== Testing Search Functionality ===');
    
    const testQueries = [
      'extract invoice data from PDF',
      'translate text between languages',
      'analyze code quality and security',
      'process customer support tickets',
      'detect fraud in financial transactions'
    ];
    
    for (const query of testQueries) {
      console.log(`\nSearching for: "${query}"`);
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
    
    console.log('\n=== Testing with Filters ===');
    
    // Test with capabilities filter
    const filteredResults = await indexerService.searchAgents(
      'extract data from documents',
      3,
      { capabilities: ['streaming', 'ocr'] }
    );
    
    console.log(`\nFiltered search (streaming + ocr capabilities):`);
    filteredResults.results.forEach((result, idx) => {
      console.log(`  ${idx + 1}. ${result.name} (Score: ${result.score.toFixed(3)})`);
    });
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Error indexing agents:', error);
    process.exit(1);
  }
}

indexAgents();
