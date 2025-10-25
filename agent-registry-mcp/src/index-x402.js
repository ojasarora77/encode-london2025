import { getEnv } from './lib/env.js';

export default {
  async fetch(request, env, ctx) {
    const config = getEnv(env);
    
    // Handle HTTP requests
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        
        // Handle MCP requests with x402 payment integration
        if (body.method === 'tools/list') {
          const response = {
            jsonrpc: '2.0',
            id: body.id,
            result: {
              tools: [
                {
                  name: 'search_agents',
                  description: 'Search the agent registry to find agents with specific capabilities using semantic search (PAID TOOL - $0.001 USDC)',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'Natural language description of needed capability',
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
                            description: 'Filter by agent capabilities',
                          },
                          inputMode: {
                            type: 'string',
                            description: 'Filter by input mode',
                          },
                          outputMode: {
                            type: 'string',
                            description: 'Filter by output mode',
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
            },
          };
          return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (body.method === 'tools/call') {
          const { name, arguments: args } = body.params;

          if (name === 'search_agents') {
            // Check for x402 payment headers
            const paymentHeader = request.headers.get('X-402-Payment');
            const paymentAmount = request.headers.get('X-402-Amount');
            const paymentTx = request.headers.get('X-402-Transaction');
            
            console.log('🔍 x402 Payment Check:');
            console.log(`   Payment Header: ${paymentHeader}`);
            console.log(`   Payment Amount: ${paymentAmount}`);
            console.log(`   Payment Transaction: ${paymentTx}`);
            
            // For now, we'll simulate payment acceptance
            // In a real implementation, you'd verify the payment transaction
            if (paymentHeader === 'required' && !paymentTx) {
              // Return payment request
              const paymentRequest = {
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -402,
                  message: 'Payment required',
                  data: {
                    payment: {
                      amount: '0.001',
                      currency: 'USDC',
                      network: config.NETWORK,
                      recipient: '0x1234567890abcdef1234567890abcdef12345678', // Mock seller address
                      description: 'Agent Registry Search - $0.001 USDC'
                    }
                  }
                }
              };
              return new Response(JSON.stringify(paymentRequest), {
                status: 402,
                headers: { 
                  'Content-Type': 'application/json',
                  'X-402-Payment-Required': 'true',
                  'X-402-Amount': '0.001',
                  'X-402-Currency': 'USDC',
                  'X-402-Network': config.NETWORK,
                  'X-402-Recipient': '0x1234567890abcdef1234567890abcdef12345678'
                }
              });
            }
            
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

              const mcpResponse = {
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        query: data.query,
                        results: formattedResults,
                        total: data.total,
                        timestamp: data.timestamp,
                        payment: {
                          amount: '0.001',
                          currency: 'USDC',
                          transaction: paymentTx || 'mock-tx-hash',
                          network: config.NETWORK
                        }
                      }, null, 2),
                    },
                  ],
                },
              };

              return new Response(JSON.stringify(mcpResponse), {
                headers: { 
                  'Content-Type': 'application/json',
                  'X-402-Payment-Processed': 'true',
                  'X-402-Amount': '0.001',
                  'X-402-Currency': 'USDC'
                }
              });
            } catch (error) {
              const errorResponse = {
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -32603,
                  message: `Error searching agents: ${error.message}`,
                },
              };
              return new Response(JSON.stringify(errorResponse), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }

          const errorResponse = {
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`,
            },
          };
          return new Response(JSON.stringify(errorResponse), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ error: 'Unknown method' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Not found', { status: 404 });
  }
};
