export interface AgentCard {
  id: string;
  name: string;
  description: string;
  url: string;
  version?: string;
  provider?: string;
  capabilities?: string[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  skills?: Skill[];
  securitySchemes?: Record<string, any>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  inputModes?: string[];
  outputModes?: string[];
  examples?: string[];
}

export interface SearchResult {
  rank: number;
  agentId: string;
  name: string;
  description: string;
  url: string;
  score: number;
  capabilities?: string[];
  matchReasons?: string[];
  erc8004Index?: number;
}

export interface SearchFilters {
  capabilities?: string[];
  inputMode?: string;
  outputMode?: string;
  minScore?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  timestamp: string;
}
