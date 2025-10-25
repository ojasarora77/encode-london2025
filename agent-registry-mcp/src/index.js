import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// MCP Server for Agent Registry Search
const server = new Server(
  {
    name: 'agent-registry-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool for searching agents
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_agents',
      description: 'Search the agent registry to find agents with specific capabilities using semantic search',
      inputSchema: {
        type: 'object',
        properties: {
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
        required: ['query'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'search_agents') {
    try {
      const { query, limit = 5, filters = {} } = args;
      
      // Validate inputs
      if (!query || typeof query !== 'string') {
        throw new Error('Query is required and must be a string');
      }
      
      if (limit < 1 || limit > 10) {
        throw new Error('Limit must be between 1 and 10');
      }

      // Get agent registry URL from environment
      const agentRegistryUrl = process.env.AGENT_REGISTRY_URL || 'http://localhost:3001';
      
      // Call the agent registry API
      const response = await fetch(`${agentRegistryUrl}/api/agents/search`, {
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
      const formattedResults = data.results.map((result, index) => ({
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

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Agent Registry MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
