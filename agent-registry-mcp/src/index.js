import { createPaidMcpHandler } from 'x402-mcp';
import { facilitator } from '@coinbase/x402';
import { getEnv } from './lib/env.js';

export default {
  async fetch(request, env, ctx) {
    const config = getEnv(env);
    
    // Create paid MCP handler inside the fetch function
    const handler = createPaidMcpHandler(
      (server) => {
        // Paid tool: search_agents
        server.paidTool(
          'search_agents',
          'Search the agent registry to find agents with specific capabilities using semantic search',
          { price: 0.001 }, // $0.001 per search
          {
            query: {
              type: 'string',
              description: 'Natural language description of needed capability (e.g., "extract invoice data from PDF", "translate text between languages")',
            },
            limit: {
              type: 'integer',
              description: 'Number of results to return (default: 5, max: 10)',
              default: 5,
              minimum: 1,
              maximum: 10,
            },
            filters: {
              type: 'object',
              description: 'Optional filters to narrow down results',
              properties: {
                capabilities: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by agent capabilities (e.g., ["streaming", "ocr", "batch-processing"])',
                },
                inputMode: {
                  type: 'string',
                  description: 'Filter by input mode (e.g., "application/pdf", "text/plain")',
                },
                outputMode: {
                  type: 'string',
                  description: 'Filter by output mode (e.g., "application/json", "text/csv")',
                },
                minScore: {
                  type: 'number',
                  description: 'Minimum similarity score (0.0 to 1.0, default: 0.5)',
                  minimum: 0.0,
                  maximum: 1.0,
                  default: 0.5,
                },
              },
            },
          },
          {},
          async (args) => {
            try {
              const { query, limit = 5, filters = {} } = args;

              // Validate inputs
              if (!query || typeof query !== 'string') {
                throw new Error('Query is required and must be a string');
              }

              if (limit < 1 || limit > 10) {
                throw new Error('Limit must be between 1 and 10');
              }

              // Call the agent registry API
              const response = await fetch(`${config.AGENT_REGISTRY_URL}/api/agents/search`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query,
                  limit,
                  filters,
                }),
              });

              if (!response.ok) {
                throw new Error(`Agent registry API error: ${response.status} ${response.statusText}`);
              }

              const data = await response.json();

              // Format results for MCP
              const formattedResults = data.results.map((result) => ({
                rank: result.rank,
                agentId: result.agentId,
                name: result.name,
                description: result.description,
                url: result.url,
                score: result.score,
                capabilities: result.capabilities || [],
                matchReasons: result.matchReasons || [],
              }));

              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      query: data.query,
                      results: formattedResults,
                      total: data.total,
                      timestamp: data.timestamp,
                    }, null, 2),
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Error searching agents: ${error.message}`,
                  },
                ],
                isError: true,
              };
            }
          }
        );
      },
      {
        serverInfo: {
          name: 'agent-registry-mcp',
          version: '1.0.0',
        },
      },
      {
        recipient: '0x1234567890abcdef1234567890abcdef12345678', // Mock address for now
        facilitator,
        network: config.NETWORK,
      }
    );

    return handler(request, config, ctx);
  }
};