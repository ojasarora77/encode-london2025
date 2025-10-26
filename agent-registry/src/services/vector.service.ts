import { Pinecone } from '@pinecone-database/pinecone';
import { SearchResult, SearchFilters } from '../types/agentcard.types';

export class PineconeVectorService {
  private pinecone: Pinecone;
  private indexName: string;

  constructor(apiKey: string, environment: string, indexName: string) {
    this.pinecone = new Pinecone({
      apiKey
    });
    this.indexName = indexName;
  }

  /**
   * Initialize Pinecone index
   */
  async initializeIndex() {
    try {
      // Try to get the index directly instead of listing all indexes
      const index = this.pinecone.Index(this.indexName);
      
      // Test if we can access the index by getting its stats
      await index.describeIndexStats();
      
      console.log(`Successfully connected to index: ${this.indexName}`);
    } catch (error) {
      console.error('Error connecting to index:', error);
      console.log(`Please ensure the index '${this.indexName}' exists in your Pinecone console.`);
      console.log('Required settings:');
      console.log('- Name: agent-registry');
      console.log('- Dimensions: 1024');
      console.log('- Metric: cosine');
      throw error;
    }
  }

  /**
   * Upsert a single agent embedding
   */
  async upsertAgent(agentId: string, embedding: number[], metadata: Record<string, any>) {
    const index = this.pinecone.Index(this.indexName);
    
    await index.upsert([
      {
        id: agentId,
        values: embedding,
        metadata: {
          ...metadata,
          indexed_at: new Date().toISOString()
        }
      }
    ]);
  }

  /**
   * Batch upsert multiple agents
   */
  async upsertAgentsBatch(
    agents: Array<{ id: string; embedding: number[]; metadata: Record<string, any> }>
  ) {
    const index = this.pinecone.Index(this.indexName);
    
    // Pinecone recommends batches of 100
    const batchSize = 100;
    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize).map(agent => ({
        id: agent.id,
        values: agent.embedding,
        metadata: {
          ...agent.metadata,
          indexed_at: new Date().toISOString()
        }
      }));
      
      await index.upsert(batch);
      console.log(`Upserted batch ${i / batchSize + 1}`);
    }
  }

  /**
   * Search for agents using vector similarity
   */
  async searchAgents(
    queryEmbedding: number[],
    topK: number = 5,
    filters?: SearchFilters
  ): Promise<SearchResult[]> {
    const index = this.pinecone.Index(this.indexName);
    
    // Build metadata filter
    const metadataFilter: Record<string, any> = {};
    
    if (filters?.capabilities && filters.capabilities.length > 0) {
      metadataFilter.capabilities = { $in: filters.capabilities };
    }
    
    if (filters?.inputMode) {
      metadataFilter.inputModes = { $in: [filters.inputMode] };
    }
    
    if (filters?.outputMode) {
      metadataFilter.outputModes = { $in: [filters.outputMode] };
    }

    const queryRequest: any = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    };
    
    if (Object.keys(metadataFilter).length > 0) {
      queryRequest.filter = metadataFilter;
    }

    const queryResponse = await index.query(queryRequest);

    return queryResponse.matches
      ?.filter(match => !filters?.minScore || (match.score ?? 0) >= filters.minScore)
      .map((match, idx) => ({
        rank: idx + 1,
        agentId: match.id,
        name: match.metadata?.name as string,
        description: match.metadata?.description as string,
        url: match.metadata?.url as string,
        score: match.score ?? 0,
        capabilities: match.metadata?.capabilities as string[],
        matchReasons: this.generateMatchReasons(match),
        erc8004Index: match.metadata?.address as number
      })) || [];
  }

  /**
   * Delete an agent from the index
   */
  async deleteAgent(agentId: string) {
    const index = this.pinecone.Index(this.indexName);
    await index.deleteOne(agentId);
  }

  /**
   * Generate human-readable match reasons
   */
  private generateMatchReasons(match: any): string[] {
    const reasons: string[] = [];
    
    if (match.score >= 0.9) {
      reasons.push('Excellent semantic match');
    } else if (match.score >= 0.7) {
      reasons.push('Good semantic match');
    } else if (match.score >= 0.5) {
      reasons.push('Moderate semantic match');
    }
    
    if (match.metadata?.capabilities) {
      reasons.push(`Capabilities: ${match.metadata.capabilities.join(', ')}`);
    }
    
    return reasons;
  }
}
