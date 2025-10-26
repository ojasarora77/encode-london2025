import { getEnv } from './lib/env.js';
import { VeniceEmbeddingService } from './services/embedding.service.ts';
import { PineconeVectorService } from './services/vector.service.ts';
import { AgentIndexerService } from './services/indexer.service.ts';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables
const config = getEnv(process.env);

// Initialize services
const embeddingService = new VeniceEmbeddingService(config.VENICE_API_KEY);
const vectorService = new PineconeVectorService(
  config.PINECONE_API_KEY,
  config.PINECONE_ENVIRONMENT,
  config.PINECONE_INDEX_NAME
);
const indexerService = new AgentIndexerService(embeddingService, vectorService);

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const body = req.body;
    
    // Handle MCP initialization
    if (body.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'agent-registry-mcp',
            version: '1.0.0',
          },
        },
      };
      return res.json(response);
    }

    // Handle notifications/initialized
    if (body.method === 'notifications/initialized') {
      // No response needed for notifications
      return res.status(204).send();
    }
    
    // Handle MCP requests
    if (body.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'search_agents',
              description: 'Search the agent registry to find agents with specific capabilities. Example: "find flights to Ibiza" or "translate documents"',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Natural language description of what the user needs (e.g., "book flights", "translate text", "extract invoice data")',
                  },
                  limit: {
                    type: 'integer',
                    description: 'Number of agent results to return (default: 3, max: 10)',
                    default: 3,
                    minimum: 1,
                    maximum: 10,
                  },
                },
                required: ['query'],
              },
            },
            {
              name: 'test_search_agents',
              description: 'TEST: Search the agent registry without payment requirement (for testing ERC8004 ID)',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Natural language description of what the user needs',
                  },
                  limit: {
                    type: 'integer',
                    description: 'Number of agent results to return (default: 3, max: 10)',
                    default: 3,
                    minimum: 1,
                    maximum: 10,
                  },
                },
                required: ['query'],
              },
            },
          ],
        },
      };
      return res.json(response);
    }
    
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;

      if (name === 'search_agents') {
        const { query, limit = 3 } = args;
        
        console.log(`🔍 Searching for agents: "${query}"`);
        
        // Perform search
        const results = await indexerService.searchAgents(query, limit);
        
        console.log(`✅ Found ${results.total} agents`);
        
        // Format results
        const formattedResults = results.results.map((agent, index) => ({
          rank: index + 1,
          name: agent.name,
          description: agent.description,
          url: agent.url || 'N/A',
          score: agent.score.toFixed(3),
          capabilities: agent.capabilities || [],
          skills: agent.skills?.map(s => s.name) || [],
          erc8004Index: agent.erc8004Index
        }));
        
        const response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  query,
                  results: formattedResults,
                  total: results.total,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }
            ]
          }
        };
        
        return res.json(response);
      }
      
      if (name === 'test_search_agents') {
        const { query, limit = 3 } = args;
        
        console.log(`🧪 TEST: Searching for agents: "${query}"`);
        
        // Perform search without payment requirement
        const results = await indexerService.searchAgents(query, limit);
        
        console.log(`✅ TEST: Found ${results.total} agents`);
        
        // Format results
        const formattedResults = results.results.map((agent, index) => ({
          rank: index + 1,
          name: agent.name,
          description: agent.description,
          url: agent.url || 'N/A',
          score: agent.score.toFixed(3),
          capabilities: agent.capabilities || [],
          skills: agent.skills?.map(s => s.name) || [],
          erc8004Index: agent.erc8004Index
        }));
        
        const response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  query,
                  results: formattedResults,
                  total: results.total,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }
            ]
          }
        };
        
        return res.json(response);
      }
    }
    
    // Unknown method
    return res.status(400).json({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32601,
        message: `Unknown method: ${body.method}`
      }
    });
    
  } catch (error) {
    console.error('MCP Error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP info endpoint
app.get('/mcp', (req, res) => {
  res.json({
    name: 'Agent Registry MCP Server',
    version: '1.0.0',
    description: 'Semantic agent search using Venice AI and Pinecone',
    endpoint: '/mcp',
    method: 'POST',
    tools: ['search_agents']
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Agent Registry MCP Server running on http://localhost:${PORT}`);
  console.log(`📍 MCP endpoint: http://localhost:${PORT}/mcp`);
});
