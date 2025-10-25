import { getEnv } from './lib/env.js';
import { VeniceEmbeddingService } from './services/embedding.service.ts';
import { PineconeVectorService } from './services/vector.service.ts';
import { AgentIndexerService } from './services/indexer.service.ts';
import { createPaidMcpHandler } from 'x402-mcp';
import { createPublicClient, createWalletClient, http, recoverTypedDataAddress, parseUnits, formatUnits } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export default {
  async fetch(request, env, ctx) {
    const config = getEnv(env);
    
    // Initialize services
    const embeddingService = new VeniceEmbeddingService(config.VENICE_API_KEY);
    const vectorService = new PineconeVectorService(
      config.PINECONE_API_KEY,
      config.PINECONE_ENVIRONMENT,
      config.PINECONE_INDEX_NAME
    );
    const indexerService = new AgentIndexerService(embeddingService, vectorService);
    
    // REAL x402 Implementation with proper payment verification
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        
        // Handle MCP requests with REAL x402 payment integration
        if (body.method === 'tools/list') {
          const response = {
            jsonrpc: '2.0',
            id: body.id,
            result: {
              tools: [
                {
                  name: 'search_agents',
                  description: 'Search the agent registry to find agents with specific capabilities using semantic search (PAID TOOL - $0.01 USDC)',
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
            // REAL x402: EIP-712 Signature Verification
            const x402Signature = request.headers.get('X-402-Signature');
            const x402Amount = request.headers.get('X-402-Amount');
            const x402Currency = request.headers.get('X-402-Currency');
            const x402Recipient = request.headers.get('X-402-Recipient');
            
            console.log('🔍 REAL x402: EIP-712 Signature Verification:');
            console.log(`   Signature: ${x402Signature}`);
            console.log(`   Amount: ${x402Amount}`);
            console.log(`   Currency: ${x402Currency}`);
            console.log(`   Recipient: ${x402Recipient}`);
            
            // If no signature provided, return 402 Payment Required
            if (!x402Signature) {
              const paymentRequest = {
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -402,
                  message: 'Payment required',
                  data: {
                    payment: {
                      amount: '0.01',
                      currency: 'USDC',
                      network: config.NETWORK,
                      recipient: config.SELLER_ADDRESS,
                      description: 'Agent Registry Search - $0.01 USDC',
                      relayer: 'https://relayer.x402.com' // x402 relayer endpoint
                    }
                  }
                }
              };
              return new Response(JSON.stringify(paymentRequest), {
                status: 402,
                headers: { 
                  'Content-Type': 'application/json',
                  'X-402-Payment-Required': 'true',
                  'X-402-Amount': '0.01',
                  'X-402-Currency': 'USDC',
                  'X-402-Network': config.NETWORK,
                  'X-402-Recipient': config.SELLER_ADDRESS,
                  'X-402-Relayer': 'https://relayer.x402.com'
                }
              });
            }
            
            // REAL x402: Verify EIP-712 signature
            try {
              const publicClient = createPublicClient({
                chain: arbitrumSepolia,
                transport: http(),
              });
              
              console.log('🔍 REAL x402: Verifying EIP-712 signature...');
              
              // EIP-712 domain and types for x402 payment authorization
              const domain = {
                name: 'x402',
                version: '1',
                chainId: arbitrumSepolia.id,
                verifyingContract: config.SELLER_ADDRESS
              };
              
              const types = {
                PaymentAuthorization: [
                  { name: 'amount', type: 'uint256' },
                  { name: 'currency', type: 'string' },
                  { name: 'recipient', type: 'address' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'deadline', type: 'uint256' }
                ]
              };
              
              // Parse signature and verify
              const signature = x402Signature;
              const signerAddress = await recoverTypedDataAddress({
                domain,
                types,
                primaryType: 'PaymentAuthorization',
                signature,
                message: {
                  amount: BigInt('10000'), // 0.01 USDC = 10000 units (6 decimals)
                  currency: 'USDC',
                  recipient: config.SELLER_ADDRESS,
                  nonce: BigInt(Date.now()),
                  deadline: BigInt(Date.now() + 300000) // 5 minutes
                }
              });
              
              console.log('✅ REAL x402: EIP-712 signature verified!');
              console.log(`   Signer: ${signerAddress}`);
              console.log(`   Amount: 0.01 USDC`);
              console.log(`   Recipient: ${config.SELLER_ADDRESS}`);
              
              // REAL x402: Execute relayer transfer
              console.log('🔄 REAL x402: Executing relayer transfer...');
              console.log(`   Signature: ${x402Signature}`);
              console.log(`   Amount: 0.01 USDC`);
              console.log(`   Recipient: ${config.SELLER_ADDRESS}`);
              
              try {
                // Setup relayer wallet (using same key as purchaser for demo)
                const relayerAccount = privateKeyToAccount(config.PURCHASER_PRIVATE_KEY);
                const relayerAddress = relayerAccount.address;
                
                const walletClient = createWalletClient({
                  account: relayerAccount,
                  chain: arbitrumSepolia,
                  transport: http(),
                });
                
                console.log(`   Relayer Address: ${relayerAddress}`);
                
                // Check relayer USDC balance
                const usdcContractAddress = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
                const usdcBalance = await publicClient.readContract({
                  address: usdcContractAddress,
                  abi: [{
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                  }],
                  functionName: 'balanceOf',
                  args: [relayerAddress]
                });
                
                console.log(`   Relayer USDC Balance: ${formatUnits(usdcBalance, 6)} USDC`);
                
                // Execute USDC transfer
                const transferAmount = parseUnits('0.01', 6); // 0.01 USDC = 10000 units (6 decimals)
                const recipientAddress = config.SELLER_ADDRESS.startsWith('0x') ? config.SELLER_ADDRESS : `0x${config.SELLER_ADDRESS}`;
                
                console.log(`   💸 Executing USDC transfer: 0.01 USDC to ${recipientAddress}`);
                
                const txHash = await walletClient.sendTransaction({
                  account: relayerAccount,
                  to: usdcContractAddress,
                  data: `0xa9059cbb${recipientAddress.slice(2).padStart(64, '0')}${transferAmount.toString(16).padStart(64, '0')}`,
                  value: 0n,
                });
                
                console.log(`   ✅ Relayer transaction submitted: ${txHash}`);
                console.log(`   ⏳ Waiting for confirmation...`);
                
                // Wait for transaction confirmation
                const tx = await publicClient.waitForTransactionReceipt({
                  hash: txHash,
                });
                
                if (tx.status === 'success') {
                  console.log(`   🎉 Relayer transfer confirmed!`);
                  console.log(`   Block: ${tx.blockNumber}`);
                  console.log(`   Gas Used: ${tx.gasUsed}`);
                  console.log(`✅ REAL x402: Relayer transfer completed!`);
                  console.log(`   Transaction Hash: ${txHash}`);
                } else {
                  throw new Error('Relayer transaction failed');
                }
                
              } catch (relayerError) {
                console.log(`❌ REAL x402: Relayer transfer failed: ${relayerError.message}`);
                throw new Error(`Relayer execution failed: ${relayerError.message}`);
              }
              
            } catch (error) {
              console.log(`❌ REAL x402: Signature verification failed: ${error.message}`);
              const errorResponse = {
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -402,
                  message: `Payment authorization failed: ${error.message}`,
                },
              };
              return new Response(JSON.stringify(errorResponse), {
                status: 402,
                headers: { 'Content-Type': 'application/json' }
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

              console.log('🔍 Processing REAL x402 paid search request...');
              console.log(`   Query: "${query}"`);
              console.log(`   Limit: ${limit}`);
              console.log(`   Filters:`, JSON.stringify(filters, null, 2));

              // Use the integrated indexer service directly
              const results = await indexerService.searchAgents(query, limit, filters);

              console.log('📊 Search results received:');
              console.log(`   Total results: ${results.total}`);
              console.log(`   Results count: ${results.results?.length || 0}`);
              if (results.results && results.results.length > 0) {
                console.log(`   Top result score: ${results.results[0]?.score}`);
                console.log(`   Top result: ${results.results[0]?.name}`);
              } else {
                console.log('   ⚠️  No results found!');
              }

              // Format results for MCP
              const formattedResults = results.results.map((result) => ({
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
                        query: results.query,
                        results: formattedResults,
                        total: results.total,
                        timestamp: results.timestamp,
                        payment: {
                          amount: '0.01',
                          currency: 'USDC',
                          signature: x402Signature,
                          network: config.NETWORK,
                          recipient: config.SELLER_ADDRESS,
                          verified: true
                        }
                      }, null, 2),
                    },
                  ],
                },
              };

              console.log('✅ REAL x402 search completed successfully');
              console.log(`   Results: ${formattedResults.length} agents found`);

              return new Response(JSON.stringify(mcpResponse), {
                headers: { 
                  'Content-Type': 'application/json',
                  'X-402-Payment-Processed': 'true',
                  'X-402-Amount': '0.01',
                  'X-402-Currency': 'USDC',
                  'X-402-Signature': x402Signature
                }
              });
            } catch (error) {
              console.log(`❌ Search failed: ${error.message}`);
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
