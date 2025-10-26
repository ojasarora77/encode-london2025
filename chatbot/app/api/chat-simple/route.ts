import { StreamingTextResponse, OpenAIStream } from 'ai'
import OpenAI from 'openai'

export const runtime = 'edge'

const client = new OpenAI({
  apiKey: process.env.VENICE_API_KEY,
  baseURL: 'https://api.venice.ai/api/v1'
})

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_agents',
      description: 'Search for AI agents that can help with specific tasks',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant agents'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of agents to return',
            default: 3
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'execute_agent_task',
      description: 'Execute a task on a specific AI agent using A2A protocol. Use this after finding an agent with search_agents.',
      parameters: {
        type: 'object',
        properties: {
          agent_url: {
            type: 'string',
            description: 'The URL of the agent to execute the task on (from search results)'
          },
          task_description: {
            type: 'string',
            description: 'The task description or instruction for the agent'
          }
        },
        required: ['agent_url', 'task_description']
      }
    }
  }
]

// A2A execution function
async function executeAgentTask(agentUrl: string, taskDescription: string) {
  try {
    const response = await fetch(`${agentUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        task: {
          input: {
            text: taskDescription
          }
        }
      })
    });
    
    if (!response.ok) {
      return { error: `Agent request failed: ${response.status}` };
    }
    
    const result = await response.json();
    return { data: result };
  } catch (error) {
    return { error: `Error calling agent: ${error}` };
  }
}

// MCP call with payment handling
async function callMCPServer(toolName: string, args: any, signature?: string) {
  const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:8787'
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Add payment headers if signature provided
    if (signature) {
      headers['X-402-Signature'] = signature
      headers['X-402-Amount'] = '0.01'
      headers['X-402-Currency'] = 'USDC'
      headers['X-402-Recipient'] = process.env.SELLER_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678'
    }
    
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      })
    })
    
    // Handle 402 Payment Required
    if (response.status === 402) {
      const errorData = await response.json()
      console.log('💳 x402: Payment required')
      console.log('   Amount:', errorData.error?.data?.payment?.amount, errorData.error?.data?.payment?.currency)
      console.log('   Recipient:', errorData.error?.data?.payment?.recipient)
      
      return {
        paymentRequired: true,
        payment: errorData.error?.data?.payment,
        error: 'Payment required to search agents'
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('MCP Error:', response.status, errorText)
      return { error: `MCP error: ${response.status}` }
    }
    
    const data = await response.json()
    
    // Check if payment was processed
    const paymentProcessed = response.headers.get('X-402-Payment-Processed')
    if (paymentProcessed === 'true') {
      console.log('✅ x402: Payment processed successfully')
      console.log('   Amount:', response.headers.get('X-402-Amount'), response.headers.get('X-402-Currency'))
    }
    
    return {
      data: data.result?.content?.[0]?.text || JSON.stringify(data.result),
      paymentProcessed: paymentProcessed === 'true'
    }
  } catch (error) {
    console.error('MCP Error:', error)
    return { error: `Error calling MCP tool: ${error}` }
  }
}

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, x402Signature } = json
  
  // Check if the last message has signature data
  const lastMessage = messages?.[messages.length - 1]
  const signatureFromData = lastMessage?.data?.x402Signature
  
  // Also check for signature in request headers (from localStorage)
  const signatureFromHeader = req.headers.get('x-402-signature')
  
  const finalSignature = x402Signature || signatureFromData || signatureFromHeader
  
  console.log('📨 Chat API received request')
  console.log('   Messages count:', messages?.length)
  console.log('   Has x402Signature:', !!finalSignature)
  console.log('   Signature from data:', !!signatureFromData)
  console.log('   Last message data:', lastMessage?.data)

  const apiKey = process.env.VENICE_API_KEY
  
  if (!apiKey) {
    return new Response('Venice API key not configured', { status: 500 })
  }

  // Add system prompt to guide tool usage
const systemPrompt = {
  role: 'system',
  content: `You are a helpful AI assistant with access to an agent registry and the ability to delegate tasks to specialized AI agents.

When users ask for help with tasks, ALWAYS follow this workflow:
1. Use the search_agents tool to find specialized agents that can help
2. IMMEDIATELY use the execute_agent_task tool to delegate the task to the best agent found
3. Format and present the agent's results to the user in a clear, organized way:
   - Remove file wrappers (like "Generated 1 file(s):" and filename headers)
   - Remove technical metadata (Status, Task ID, etc.)
   - Extract and present only the actual content from the agent
   - Clean up excessive spacing and formatting issues
   - Present the content as if you wrote it directly to the user

CRITICAL: When using search_agents, ALWAYS use broad, general search terms, not specific implementation details:

❌ BAD search queries (too specific):
- "python bubble sort implementation"
- "translate hello to Spanish" 
- "write a blog post about cats"
- "review this specific code snippet"

✅ GOOD search queries (broad categories):
- "coding" or "programming" (for any coding task)
- "translation" (for any translation task)
- "content generation" (for any writing task)
- "code review" (for any code review task)
- "customer support" (for any support task)

Think of it this way: search for the TYPE of agent you need, not the specific task. The agent will handle the specific implementation.

IMPORTANT: After finding agents, you MUST use execute_agent_task to actually solve the user's problem. Don't just list the agents - delegate the task to them!

When using execute_agent_task:
- Use the full URL from the search results (e.g., "http://localhost:41242", not just "coder-agent-001")
- The agent_url should be the complete URL, not just the agent ID

EXAMPLE of proper agent response formatting:
❌ BAD: "🤖 Agent Response\\n\\nGenerated 1 file(s):\\n\\ngenerated_code.js\\n\\nBubble Sort Algorithm...\\n\\n"
✅ GOOD: "Here's a Python implementation of the bubble sort algorithm:\\n\\nCode:\\ndef bubble_sort(arr):\\n    # Implementation here\\n\\nThis algorithm works by..."

Available tools:
- search_agents: Find specialized AI agents for specific tasks
- execute_agent_task: Execute tasks on agents you've found

Only respond directly without using tools for general questions, greetings, or when the user explicitly asks not to use agents.`
}

  // Ensure system prompt is first
  const messagesWithSystem = messages[0]?.role === 'system' 
    ? messages 
    : [systemPrompt, ...messages]

  try {
    // Go straight to streaming call - handle tool calls in the stream
    console.log('🎬 Making streaming call to Venice...')
    console.log('   Messages count:', messagesWithSystem.length)
    
    const stream = await client.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: messagesWithSystem,
      temperature: 0.7,
      stream: true,
      tools: tools,
      tool_choice: 'auto' // Allow tool calls for subsequent requests
    })

    console.log('📡 Final response status: 200')
    console.log('✅ Streaming response received, converting to stream...')
    
    // Convert OpenAI stream to ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let toolCallsAccumulator: any[] = []
          
          for await (const chunk of stream) {
            // Handle content chunks
            if (chunk.choices?.[0]?.delta?.content) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                choices: [{
                  delta: { content: chunk.choices[0].delta.content }
                }]
              })}\n\n`))
            }
            
            // Handle tool calls in streaming response
            if (chunk.choices?.[0]?.delta?.tool_calls) {
              console.log('🔧 Tool call detected in streaming response')
              const toolCalls = chunk.choices[0].delta.tool_calls
              
              // Accumulate tool calls
              toolCallsAccumulator.push(...toolCalls)
              
              // Check if we have complete tool calls
              for (const toolCall of toolCalls) {
                if (toolCall.type === 'function' && toolCall.function?.name) {
                  console.log('🔧 Complete tool call detected:', toolCall.function.name)
                  console.log('   Arguments:', toolCall.function.arguments)
                  
                  // Handle the tool call immediately
                  if (toolCall.function.name === 'search_agents') {
                    try {
                      const args = JSON.parse(toolCall.function.arguments || '{}')
                      console.log('🔍 Executing search_agents tool from stream...')
                      
                      const mcpResponse = await callMCPServer('search_agents', args, finalSignature)
                      
                      if (mcpResponse.paymentRequired) {
                        console.log('💳 Payment required in streaming response')
                        // We need to handle this by stopping the stream and returning 402
                        // But since we're in a stream, we'll add a special marker
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                          choices: [{
                            delta: { 
                              content: `[PAYMENT_REQUIRED:${JSON.stringify(mcpResponse.payment)}]`
                            }
                          }]
                        })}\n\n`))
                        controller.close()
                        return
                      } else if (mcpResponse.data) {
                        console.log('✅ Tool execution successful in stream')
                        
                        // Parse and format the search results properly
                        let searchResults
                        try {
                          if (typeof mcpResponse.data === 'string') {
                            searchResults = JSON.parse(mcpResponse.data);
                          } else {
                            searchResults = mcpResponse.data;
                          }
                        } catch (e) {
                          console.error('❌ Error parsing search results:', e)
                          searchResults = { results: [], total: 0 };
                        }
                        
                        // Format results nicely with better styling
                        if (searchResults.total > 0 && searchResults.results?.length > 0) {
                          const formattedResults = searchResults.results.map((agent: any, idx: number) => {
                            const scoreColor = agent.score > 0.7 ? '🟢' : agent.score > 0.5 ? '🟡' : '🔴'
                            const capabilities = agent.capabilities?.join(' • ') || 'General assistance'
                            const scoreText = agent.score > 0.7 ? 'Excellent Match' : agent.score > 0.5 ? 'Good Match' : 'Fair Match'
                            
                            return `## ${idx + 1}. ${agent.name}
**ID:** \`${agent.agentId}\`
**URL:** \`${agent.url}\`
**Description:** ${agent.description}
**Capabilities:** ${capabilities}
**Match Score:** ${scoreColor} ${(agent.score * 100).toFixed(1)}% (${scoreText})`
                          }).join('\n\n')
                          
                          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                            choices: [{
                              delta: { 
                                content: `\n\n# 🔍 Agent Search Results\n\nFound **${searchResults.total}** agent(s) matching your query:\n\n${formattedResults}\n\n*These agents are ready to help with your specific needs!*`
                              }
                            }]
                          })}\n\n`))
                        } else {
                          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                            choices: [{
                              delta: { 
                                content: `\n\n# 🔍 Agent Search Results\n\n❌ **No agents found** matching your query.\n\n*Try a different search term or check back later when more agents are available.*`
                              }
                            }]
                          })}\n\n`))
                        }
                      }
                    } catch (error) {
                      console.error('❌ Error handling tool call in stream:', error)
                    }
                  } else if (toolCall.function.name === 'execute_agent_task') {
                    try {
                      const args = JSON.parse(toolCall.function.arguments || '{}')
                      console.log('🤖 Executing A2A task on agent...')
                      console.log('   Agent URL:', args.agent_url)
                      console.log('   Task:', args.task_description)
                      
                      const agentResponse = await executeAgentTask(args.agent_url, args.task_description)
                      
                      if (agentResponse.error) {
                        console.error('❌ Agent execution failed:', agentResponse.error)
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                          choices: [{
                            delta: { 
                              content: `\n\n**Agent Error:** ${agentResponse.error}\n\n`
                            }
                          }]
                        })}\n\n`))
                      } else if (agentResponse.data) {
                        console.log('✅ Agent task completed')
                        
                        // Format agent response for display
                        const taskResult = agentResponse.data
                        let formattedResult = `\n\n## 🤖 Agent Response\n\n`
                        
                        if (taskResult.result) {
                          if (taskResult.result.files) {
                            formattedResult += `\nGenerated ${taskResult.result.files.length} file(s):\n\n`
                            taskResult.result.files.forEach((file: any) => {
                              formattedResult += `### ${file.filename}\n\`\`\`\n${file.content}\n\`\`\`\n\n`
                            })
                          } else if (taskResult.result.text) {
                            formattedResult += `\n${taskResult.result.text}\n\n`
                          } else {
                            formattedResult += `\n${JSON.stringify(taskResult.result, null, 2)}\n\n`
                          }
                        }
                        
                        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                          choices: [{
                            delta: { content: formattedResult }
                          }]
                        })}\n\n`))
                      }
                    } catch (error) {
                      console.error('❌ Error handling A2A tool call:', error)
                    }
                  }
                }
              }
            }
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })
    
    return new StreamingTextResponse(readableStream)
    
  } catch (error) {
    console.error('❌ Venice AI error:', error)
    return new Response('Venice AI error', { status: 500 })
  }
}
