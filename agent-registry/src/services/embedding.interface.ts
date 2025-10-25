import { AgentCard } from '../types/agentcard.types';

export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  prepareAgentText(agent: AgentCard): string;
}
