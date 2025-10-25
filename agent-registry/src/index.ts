import dotenv from 'dotenv';
import { VeniceEmbeddingService } from './services/embedding.service';
import { MockEmbeddingService } from './services/mock-embedding.service';
import { PineconeVectorService } from './services/vector.service';
import { AgentIndexerService } from './services/indexer.service';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'VENICE_API_KEY',
  'PINECONE_API_KEY',
  'PINECONE_ENVIRONMENT',
  'PINECONE_INDEX_NAME'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize services
const veniceService = new VeniceEmbeddingService(process.env.VENICE_API_KEY!);

const pineconeService = new PineconeVectorService(
  process.env.PINECONE_API_KEY!,
  process.env.PINECONE_ENVIRONMENT!,
  process.env.PINECONE_INDEX_NAME!
);

const indexerService = new AgentIndexerService(
  veniceService,
  pineconeService
);

// Export for use in other modules
export { indexerService, veniceService, pineconeService };

// Example: Initialize index
async function main() {
  try {
    await pineconeService.initializeIndex();
    console.log('Agent registry ready!');
  } catch (error) {
    console.error('Failed to initialize agent registry:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
