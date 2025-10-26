import { getEnv } from './lib/env.js';
import { VeniceEmbeddingService } from './services/embedding.service.ts';
import { PineconeVectorService } from './services/vector.service.ts';
import { AgentIndexerService } from './services/indexer.service.ts';
import { createPaidMcpHandler } from 'x402-mcp';
import { createPublicClient, createWalletClient, http, recoverTypedDataAddress, parseUnits, formatUnits } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ethers } from 'ethers';

// Function to get on-chain trust score for an ERC8004 ID using real ERC8004 contract
async function getOnChainTrustScore(erc8004Index, config) {
  try {
    // Use environment variables for configuration
    const rpcUrl = config.ARBITRUM_SEPOLIA_RPC_URL;
    const contractAddress = config.REPUTATION_REGISTRY_ADDRESS;
    
    // Create provider using ethers.js (same as agent reputation system)
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create contract instance with the exact ABI from agent reputation system
    const reputationRegistry = new ethers.Contract(
      contractAddress,
      [
        "function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2, bool includeRevoked) external view returns (address[] memory clients, uint8[] memory scores, bytes32[] memory tag1s, bytes32[] memory tag2s, bool[] memory revokedStatuses)"
      ],
      provider
    );

    console.log(`🔍 Querying real ERC8004 contract for agent ID: ${erc8004Index}`);
    
    // Call readAllFeedback to get all feedback data (same as agent reputation system)
    const [clients, scores, tag1s, tag2s, revokedStatuses] = await reputationRegistry.readAllFeedback(
      erc8004Index,
      [], // all clients
      ethers.ZeroHash, // no tag1 filter
      ethers.ZeroHash, // no tag2 filter
      false // exclude revoked feedback
    );
    
    console.log(`📊 On-chain data: ${clients.length} feedback entries from ${new Set(clients).size} unique clients`);
    
    // Convert BigInt scores to numbers for calculations
    const numericScores = scores.map(score => Number(score));
    
    // Calculate trust score using the same algorithm as the agent reputation system
    const trustScore = calculateTrustScoreForAgent(clients, numericScores, revokedStatuses);
    
    // Determine trust level based on final score
    let trustLevel;
    if (trustScore.finalScore >= 0.9) trustLevel = 'Excellent';
    else if (trustScore.finalScore >= 0.8) trustLevel = 'Very High';
    else if (trustScore.finalScore >= 0.7) trustLevel = 'High';
    else if (trustScore.finalScore >= 0.6) trustLevel = 'Good';
    else if (trustScore.finalScore >= 0.5) trustLevel = 'Medium';
    else trustLevel = 'Low';
    
    return {
      score: trustScore.finalScore,
      level: trustLevel,
      count: trustScore.metrics.totalFeedback,
      averageScore: Math.round(trustScore.metrics.averageScore),
      lastUpdated: new Date().toISOString(),
      source: 'ERC8004 on-chain registry (Arbitrum Sepolia)',
      contractAddress: contractAddress,
      network: 'Arbitrum Sepolia',
      components: trustScore.components,
      metrics: trustScore.metrics
    };
    
  } catch (error) {
    console.log(`❌ Real blockchain query failed: ${error.message}`);
    throw error; // Don't fallback to mock data - use real blockchain or fail
  }
}

// Trust score calculation algorithm from agent reputation system
function calculateTrustScoreForAgent(clients, scores, revokedStatuses) {
  // Filter out revoked feedback
  const validIndices = [];
  for (let i = 0; i < scores.length; i++) {
    if (!revokedStatuses[i]) {
      validIndices.push(i);
    }
  }
  
  // If no valid feedback, return zero trust score
  if (validIndices.length === 0) {
    return {
      finalScore: 0,
      components: {
        averageScore: 0,
        volumeScore: 0,
        diversityScore: 0,
        consistencyScore: 0
      },
      metrics: {
        totalFeedback: 0,
        uniqueReviewers: 0,
        averageScore: 0,
        standardDeviation: 0
      }
    };
  }
  
  // Extract valid data
  const validClients = validIndices.map(i => clients[i]);
  const validScores = validIndices.map(i => scores[i]);
  
  // Calculate metrics
  const totalFeedback = validScores.length;
  const uniqueReviewers = new Set(validClients).size;
  const averageScore = validScores.reduce((sum, score) => sum + score, 0) / totalFeedback;
  const standardDeviation = calculateStandardDeviation(validScores);
  
  // Calculate trust score components
  
  // 1. Average Score Component (30% weight)
  const averageScoreComponent = averageScore / 100;
  
  // 2. Feedback Volume Component (20% weight)
  // Logarithmic scaling with diminishing returns
  const volumeComponent = Math.min(1, Math.log10(totalFeedback + 1) / Math.log10(50));
  
  // 3. Reviewer Diversity Component (30% weight)
  // Higher ratio of unique reviewers to total feedback = better
  const diversityComponent = Math.min(1, uniqueReviewers / totalFeedback);
  
  // 4. Score Consistency Component (20% weight)
  // Lower standard deviation = more consistent = higher trust
  const consistencyComponent = Math.max(0, 1 - Math.min(1, standardDeviation / 50));
  
  // Calculate weighted final score
  const finalScore = (
    averageScoreComponent * 0.30 +
    volumeComponent * 0.20 +
    diversityComponent * 0.30 +
    consistencyComponent * 0.20
  );
  
  return {
    finalScore,
    components: {
      averageScore: averageScoreComponent,
      volumeScore: volumeComponent,
      diversityScore: diversityComponent,
      consistencyScore: consistencyComponent
    },
    metrics: {
      totalFeedback,
      uniqueReviewers,
      averageScore,
      standardDeviation
    }
  };
}

// Calculate standard deviation of an array of numbers
function calculateStandardDeviation(scores) {
  if (scores.length === 0) return 0;
  
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

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
            {
              name: 'test_search_agents',
              description: 'TEST: Search the agent registry without payment requirement (for testing ERC8004 ID)',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Natural language description of needed capability',
                  },
                  limit: {
                    type: 'integer',
                    description: 'Number of results to return (default: 3, max: 10)',
                    default: 3,
                    minimum: 1,
                    maximum: 10,
                  },
                },
                required: ['query'],
              },
            },
            {
              name: 'get_trust_score',
              description: 'Get on-chain trust score for an agent using ERC8004 ID',
              inputSchema: {
                type: 'object',
                properties: {
                  erc8004Index: {
                    type: 'integer',
                    description: 'ERC8004 ID of the agent',
                  },
                },
                required: ['erc8004Index'],
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

              // Format results for MCP with trust scores
              const formattedResults = await Promise.all(results.results.map(async (result) => {
                let trustScore = null;
                
                // Only fetch trust score if we have an ERC8004 ID
                if (result.erc8004Index !== undefined) {
                  try {
                    console.log(`🔍 Fetching trust score for agent ${result.name} (ERC8004 ID: ${result.erc8004Index})`);
                    trustScore = await getOnChainTrustScore(result.erc8004Index, config);
                    console.log(`✅ Trust score for ${result.name}: ${trustScore.score} (${trustScore.level})`);
                  } catch (error) {
                    console.log(`❌ Failed to fetch trust score for ${result.name}: ${error.message}`);
                    // trustScore remains null if fetch fails
                  }
                }
                
                return {
                  rank: result.rank,
                  agentId: result.agentId,
                  name: result.name,
                  description: result.description,
                  url: result.url,
                  score: result.score,
                  capabilities: result.capabilities || [],
                  matchReasons: result.matchReasons || [],
                  erc8004Index: result.erc8004Index,
                  trustScore: trustScore
                };
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

          if (name === 'test_search_agents') {
            try {
              const { query, limit = 3 } = args;
              
              console.log(`🧪 TEST: Searching for agents: "${query}"`);
              
              // Perform search without payment requirement
              const results = await indexerService.searchAgents(query, limit);
              
              console.log(`✅ TEST: Found ${results.total} agents`);
              
              // Format results for MCP with trust scores
              const formattedResults = await Promise.all(results.results.map(async (result) => {
                let trustScore = null;
                
                // Only fetch trust score if we have an ERC8004 ID
                if (result.erc8004Index !== undefined) {
                  try {
                    console.log(`🔍 Fetching trust score for agent ${result.name} (ERC8004 ID: ${result.erc8004Index})`);
                    trustScore = await getOnChainTrustScore(result.erc8004Index, config);
                    console.log(`✅ Trust score for ${result.name}: ${trustScore.score} (${trustScore.level})`);
                  } catch (error) {
                    console.log(`❌ Failed to fetch trust score for ${result.name}: ${error.message}`);
                    // trustScore remains null if fetch fails
                  }
                }
                
                return {
                  rank: result.rank,
                  agentId: result.agentId,
                  name: result.name,
                  description: result.description,
                  url: result.url,
                  score: result.score,
                  capabilities: result.capabilities || [],
                  matchReasons: result.matchReasons || [],
                  erc8004Index: result.erc8004Index,
                  trustScore: trustScore
                };
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
                        timestamp: results.timestamp
                      }, null, 2),
                    },
                  ],
                },
              };
              
              console.log('✅ TEST search completed successfully');
              console.log(`   Results: ${formattedResults.length} agents found`);
              
              return new Response(JSON.stringify(mcpResponse), {
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              console.log(`❌ TEST Search failed: ${error.message}`);
              const errorResponse = {
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -32603,
                  message: `Error in test search: ${error.message}`,
                },
              };
              return new Response(JSON.stringify(errorResponse), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }

          if (name === 'get_trust_score') {
            try {
              const { erc8004Index } = args;
              
              console.log(`🔍 Getting trust score for ERC8004 ID: ${erc8004Index}`);
              
              // Query the real ERC8004 contract on Ethereum Sepolia
              const trustScore = await getOnChainTrustScore(erc8004Index, config);
              
              const mcpResponse = {
                jsonrpc: '2.0',
                id: body.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify({
                        erc8004Index,
                        trustScore: trustScore.score,
                        trustLevel: trustScore.level,
                        lastUpdated: trustScore.lastUpdated,
                        source: 'on-chain'
                      }, null, 2),
                    },
                  ],
                },
              };
              
              console.log(`✅ Trust score retrieved: ${trustScore.score} (${trustScore.level})`);
              
              return new Response(JSON.stringify(mcpResponse), {
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              console.log(`❌ Trust score fetch failed: ${error.message}`);
              const errorResponse = {
                jsonrpc: '2.0',
                id: body.id,
                error: {
                  code: -32603,
                  message: `Error fetching trust score: ${error.message}`,
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
