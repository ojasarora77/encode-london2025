import { AgentCard } from '../types/agentcard.types';
import { IEmbeddingService } from './embedding.interface';

export class MockEmbeddingService implements IEmbeddingService {
  private dimension = 1024;

  constructor() {
    console.log('Using Mock Embedding Service for testing');
  }

  /**
   * Generate mock embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Create a more semantic embedding based on keywords
    const keywords = this.extractKeywords(text.toLowerCase());
    const embedding = new Array(this.dimension).fill(0);
    
    // Create semantic clusters based on keywords
    keywords.forEach((keyword, index) => {
      const keywordHash = this.simpleHash(keyword);
      const clusterStart = (keywordHash % 10) * 100; // 10 clusters of 100 dimensions each
      
      for (let i = 0; i < 100; i++) {
        const pos = clusterStart + i;
        if (pos < this.dimension) {
          embedding[pos] += Math.sin(keywordHash + i) * 0.3;
        }
      }
    });
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < this.dimension; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }

  /**
   * Generate mock embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
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

  /**
   * Extract keywords from text for semantic clustering
   */
  private extractKeywords(text: string): string[] {
    const words = text.split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
    
    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'shall', 'this', 'that', 'these', 'those',
      'a', 'an', 'some', 'any', 'all', 'each', 'every', 'no', 'not', 'only'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Simple hash function for deterministic embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
