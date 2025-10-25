import { IEmbeddingService } from './embedding.interface';
import { PineconeVectorService } from './vector.service';
import { AgentCard, SearchFilters, SearchResponse } from '../types/agentcard.types';

export class AgentIndexerService {
  constructor(
    private embeddingService: IEmbeddingService,
    private vectorService: PineconeVectorService
  ) {}

  /**
   * Index a single agent
   */
  async indexAgent(agent: AgentCard): Promise<void> {
    // Prepare text for embedding
    const text = this.embeddingService.prepareAgentText(agent);
    
    // Generate embedding
    const embedding = await this.embeddingService.generateEmbedding(text);
    
    // Prepare metadata
    const metadata = {
      name: agent.name,
      description: agent.description,
      url: agent.url,
      version: agent.version || '1.0.0',
      provider: agent.provider,
      capabilities: agent.capabilities || [],
      inputModes: agent.defaultInputModes || [],
      outputModes: agent.defaultOutputModes || [],
      skillCount: agent.skills?.length || 0
    };
    
    // Upsert to Pinecone
    await this.vectorService.upsertAgent(agent.id, embedding, metadata);
    
    console.log(`Indexed agent: ${agent.name}`);
  }

  /**
   * Batch index multiple agents
   */
  async indexAgentsBatch(agents: AgentCard[]): Promise<void> {
    console.log(`Indexing ${agents.length} agents...`);
    
    // Prepare all texts
    const texts = agents.map(agent => 
      this.embeddingService.prepareAgentText(agent)
    );
    
    // Generate embeddings in batch
    const embeddings = await this.embeddingService.generateBatchEmbeddings(texts);
    
    // Prepare batch data
    const batchData = agents.map((agent, idx) => ({
      id: agent.id,
      embedding: embeddings[idx],
      metadata: {
        name: agent.name,
        address: idx,
        description: agent.description,
        url: agent.url,
        version: agent.version || '1.0.0',
        provider: agent.provider,
        capabilities: agent.capabilities || [],
        inputModes: agent.defaultInputModes || [],
        outputModes: agent.defaultOutputModes || [],
        skillCount: agent.skills?.length || 0
      }
    }));
    
    // Upsert batch to Pinecone
    await this.vectorService.upsertAgentsBatch(batchData);
    
    console.log(`Successfully indexed ${agents.length} agents`);
  }

  /**
   * Search for agents
   */
  async searchAgents(
    query: string,
    limit: number = 5,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    // Search Pinecone
    const results = await this.vectorService.searchAgents(
      queryEmbedding,
      limit,
      filters
    );
    
    return {
      query,
      results,
      total: results.length,
      timestamp: new Date().toISOString()
    };
  }
}
