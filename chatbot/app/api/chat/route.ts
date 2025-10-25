import { OpenAIStream, StreamingTextResponse } from 'ai'

export const runtime = 'edge'

// Define the search_agents tool for Venice AI
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_agents',
      description: 'Search for AI agents that can help with specific tasks. Use this tool whenever a user asks for help with tasks like: booking flights, translating documents, parsing PDFs, analyzing data, generating content, or any other automated task. The tool will find specialized agents from the registry that can perform these tasks.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of what the user needs help with. For example: "book flights to Moscow", "parse PDF and extract dates", "translate documents to Spanish"'
          },
          limit: {
            type: 'integer',
            description: 'Number of agent results to return (default: 5, max: 10)',
            default: 5,
            minimum: 1,
            maximum: 10
          },
          filters: {
            type: 'object',
            description: 'Optional filters to narrow down results',
            properties: {
              capabilities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by agent capabilities'
              },
              inputMode: {
                type: 'string',
                description: 'Filter by input mode'
              },
              outputMode: {
                type: 'string',
                description: 'Filter by output mode'
              },
              minScore: {
                type: 'number',
                description: 'Minimum similarity score (0.0 to 1.0, default: 0.5)',
                minimum: 0.0,
                maximum: 1.0,
                default: 0.5
              }
            }
          }
        },
        required: ['query']
      }
    }
  }
]

// x402 MCP client with payment handling
async function callMCPToolWithPayment(toolName: string, args: any, x402Signature?: string) {
  const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002/mcp'
  
  try {
    // First attempt - check if payment is required
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Add x402 headers if signature provided
    if (x402Signature) {
      headers['X-402-Signature'] = x402Signature
      headers['X-402-Amount'] = '0.01'
      headers['X-402-Currency'] = 'USDC'
      headers['X-402-Recipient'] = process.env.SELLER_ADDRESS || ''
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
    
    // Check if payment is required (402)
    if (response.status === 402) {
      const paymentData = await response.json()
      console.log('💳 x402: Payment required')
      console.log('   Amount:', paymentData.error?.data?.payment?.amount, paymentData.error?.data?.payment?.currency)
      console.log('   Recipient:', paymentData.error?.data?.payment?.recipient)
      console.log('   Network:', paymentData.error?.data?.payment?.network)
      
      // Return payment required response to client
      return {
        paymentRequired: true,
        payment: paymentData.error?.data?.payment,
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
  const { messages, x402Signature, toolCallId } = json

  console.log('📨 Chat API received request')
  console.log('   Messages count:', messages?.length)
  console.log('   Has x402Signature:', !!x402Signature)
  console.log('   Tool call ID:', toolCallId)
  if (x402Signature) {
    console.log('   Signature:', x402Signature.slice(0, 20) + '...')
  }

  const apiKey = process.env.VENICE_API_KEY
  
  if (!apiKey) {
    return new Response('Venice API key not configured', { status: 500 })
  }

  // Add system prompt to guide tool usage
  const systemPrompt = {
    role: 'system',
    content: `You are a helpful AI assistant with access to an agent registry. When users ask for help with tasks (like booking flights, translating documents, parsing PDFs, analyzing data, etc.), you should use the search_agents tool to find specialized AI agents that can help them. 

After receiving agent results, present them in a friendly, organized way and explain how each agent can help with the user's specific request.

Only respond directly without using the tool for general questions, greetings, or when the user explicitly asks not to search for agents.`
  }

  // Ensure system prompt is first
  const messagesWithSystem = messages[0]?.role === 'system' 
    ? messages 
    : [systemPrompt, ...messages]

  // First, make a non-streaming call to check if Venice wants to call tools
  console.log('🤖 Calling Venice AI to check for tool calls...')
  const initialResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: messagesWithSystem,
      temperature: 0.7,
      stream: false, // Non-streaming to detect tool calls
      tools: tools,
      tool_choice: 'auto'
    })
  })

  if (!initialResponse.ok) {
    const error = await initialResponse.text()
    console.error('Venice API Error:', initialResponse.status, error)
    return new Response(`Venice API Error: ${initialResponse.status}`, { status: initialResponse.status })
  }

  const initialData = await initialResponse.json()
  const assistantMessage = initialData.choices[0].message
  
  console.log('📥 Venice response:', {
    hasContent: !!assistantMessage.content,
    hasToolCalls: !!assistantMessage.tool_calls,
    toolCallsCount: assistantMessage.tool_calls?.length || 0
  })

  // If Venice just responded with content (no tool calls), we need to make a streaming call
  if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
    console.log('💬 No tool calls needed - making streaming call for response')
    
    // Make a streaming call with the original messages (Venice will respond the same way)
    const streamResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: messagesWithSystem,
        temperature: 0.7,
        stream: true
      })
    })

    if (!streamResponse.ok) {
      const error = await streamResponse.text()
      console.error('Venice API Error:', streamResponse.status, error)
      return new Response(`Venice API Error: ${streamResponse.status}`, { status: streamResponse.status })
    }

    const stream = OpenAIStream(streamResponse)
    return new StreamingTextResponse(stream)
  }

  // Check if Venice wants to call a tool
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCall = assistantMessage.tool_calls[0]
    console.log('🔧 Tool call detected:', toolCall.function.name)
    console.log('   Arguments:', toolCall.function.arguments)
    
    if (toolCall.function.name === 'search_agents') {
      const args = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments
      
      console.log('🔍 Executing search_agents tool...')
      console.log('   Query:', args.query)
      console.log('   Limit:', args.limit || 5)
      
      const mcpResponse = await callMCPToolWithPayment('search_agents', {
        query: args.query,
        limit: args.limit || 5,
        filters: args.filters || {}
      }, x402Signature)
      
      console.log('📦 MCP Response:', {
        paymentRequired: mcpResponse.paymentRequired,
        paymentProcessed: mcpResponse.paymentProcessed,
        hasData: !!mcpResponse.data,
        hasError: !!mcpResponse.error
      })
      
      // Handle payment required
      if (mcpResponse.paymentRequired) {
        console.log('💳 Returning 402 Payment Required to client')
        return new Response(JSON.stringify({
          paymentRequired: true,
          payment: mcpResponse.payment,
          toolCall: toolCall,
          assistantMessage: assistantMessage,
          message: '💳 Payment required: $0.01 USDC to search agents. Please authorize payment to continue.'
        }), {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'X-402-Payment-Required': 'true',
            'X-402-Amount': mcpResponse.payment?.amount || '0.01',
            'X-402-Currency': mcpResponse.payment?.currency || 'USDC',
            'X-402-Network': mcpResponse.payment?.network || 'arbitrum-sepolia',
            'X-402-Recipient': mcpResponse.payment?.recipient || '',
          }
        })
      }
      
      // Handle error
      if (mcpResponse.error) {
        console.error('❌ MCP call failed:', mcpResponse.error)
        
        // Add error as a system message - don't include tool call since we removed tools from final call
        messagesWithSystem.push({
          role: 'system',
          content: `The search_agents tool was executed but failed: ${mcpResponse.error}. Please inform the user that agent search is temporarily unavailable.`
        })
      } else {
        // Success - add tool results as a system message
        console.log('✅ Tool execution successful')
        
        const paymentNote = mcpResponse.paymentProcessed 
          ? '\n✅ Payment of $0.01 USDC was processed successfully.' 
          : ''
        
        console.log('📊 Agent search data preview:', mcpResponse.data?.slice(0, 200))
        
        // Parse the response to check if we got results
        let searchResults;
        try {
          searchResults = JSON.parse(mcpResponse.data);
        } catch (e) {
          searchResults = { results: [], total: 0 };
        }
        
        // Add the search results as a system message for Venice to use
        if (searchResults.total === 0 || searchResults.results?.length === 0) {
          messagesWithSystem.push({
            role: 'system',
            content: `[TOOL EXECUTION COMPLETE]${paymentNote}

The search_agents tool found NO agents matching "${searchResults.query}".

Please inform the user that:
- No suitable agents were found in the registry
- They should try a different search query
- They can check back later when more agents are available`
          })
        } else {
          // Format results in a readable way for Venice
          const formattedResults = searchResults.results.map((agent: any, idx: number) => {
            return `${idx + 1}. **${agent.name}** (ID: ${agent.agentId})
   - Description: ${agent.description}
   - Capabilities: ${agent.capabilities?.join(', ') || 'General assistance'}
   - Match Score: ${(agent.score * 100).toFixed(1)}%`
          }).join('\n\n')
          
          messagesWithSystem.push({
            role: 'system',
            content: `[TOOL EXECUTION COMPLETE]${paymentNote}

The search_agents tool found ${searchResults.total} agent(s) for "${searchResults.query}":

${formattedResults}

Please present these agents to the user in a friendly, conversational way and explain how they can help.`
          })
        }
      }
    }
  }

  // Now make the final streaming call with tool results (if any)
  console.log('🎬 Making final streaming call to Venice...')
  console.log('   Messages count:', messagesWithSystem.length)
  
  // Log full messages for debugging
  console.log('📨 Full messages being sent:')
  messagesWithSystem.forEach((msg: any, idx) => {
    console.log(`   [${idx}] ${msg.role}: ${msg.content?.substring(0, 200)}...`)
  })
  
  const finalResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages: messagesWithSystem,
      temperature: 0.7,
      stream: true
      // Don't include tools in final call - we already executed them
    })
  })

  console.log('📡 Final response status:', finalResponse.status)
  
  if (!finalResponse.ok) {
    const error = await finalResponse.text()
    console.error('❌ Venice API Error:', finalResponse.status, error)
    return new Response(`Venice API Error: ${finalResponse.status}`, { status: finalResponse.status })
  }

  console.log('✅ Streaming response received, converting to stream...')
  
  // Log the first few chunks to debug
  const responseClone = finalResponse.clone()
  const reader = responseClone.body?.getReader()
  const decoder = new TextDecoder()
  let sampleChunks = ''
  let chunkCount = 0
  
  if (reader) {
    try {
      while (chunkCount < 5) {
        const { done, value } = await reader.read()
        if (done) break
        sampleChunks += decoder.decode(value)
        chunkCount++
      }
      console.log('📄 First stream chunks:', sampleChunks.slice(0, 500))
    } catch (e) {
      console.error('❌ Error reading sample chunks:', e)
    }
  }
  
  // Convert the response to a stream that AI SDK can use
  const stream = OpenAIStream(finalResponse)

  console.log('🚀 Returning streaming response to client')
  
  return new StreamingTextResponse(stream)
}
