import { AgentCard } from '../types/agentcard.types.js';
import { IEmbeddingService } from './embedding.interface';

export class VeniceEmbeddingService implements IEmbeddingService {
  private apiKey: string;
  private apiUrl = 'https://api.venice.ai/api/v1/embeddings';
  private model = 'text-embedding-bge-m3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.data.map((item: any) => item.embedding);
  }

  /**
   * Prepare text from AgentCard for embedding
   */
  prepareAgentText(agent: AgentCard): string {
    const skillsText = agent.skills
      ?.map(s => `${s.name}: ${s.description}`)
      .join('. ') || '';
    
    const capabilitiesText = agent.capabilities?.join(', ') || '';
    
    return `${agent.name}. ${agent.description}. Skills: ${skillsText}. Capabilities: ${capabilitiesText}`;
  }
}
