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
  }
]

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
    content: `You are a helpful AI assistant with access to an agent registry. When users ask for help with tasks (like booking flights, translating documents, parsing PDFs, analyzing data, etc.), you should use the search_agents tool to find specialized AI agents that can help them. 

After receiving agent results, present them in a friendly, organized way and explain how each agent can help with the user's specific request.

Only respond directly without using the tool for general questions, greetings, or when the user explicitly asks not to search for agents.`
  }

  // Ensure system prompt is first
  const messagesWithSystem = messages[0]?.role === 'system' 
    ? messages 
    : [systemPrompt, ...messages]

  try {
    // Use OpenAI client to get tool calls
    console.log('🤖 Calling Venice AI to check for tool calls...')
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: messagesWithSystem,
      temperature: 0.7,
      tools: tools,
      tool_choice: 'auto'
    })

    console.log('📥 Venice response:', {
      hasContent: !!response.choices?.[0]?.message?.content,
      hasToolCalls: !!response.choices?.[0]?.message?.tool_calls,
      toolCallsCount: response.choices?.[0]?.message?.tool_calls?.length || 0
    })

    // Check if Venice wants to call tools
    const toolCalls = response.choices?.[0]?.message?.tool_calls
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0]
      if (toolCall.type === 'function') {
        console.log('🔧 Tool call detected:', toolCall.function.name)
        console.log('   Arguments:', toolCall.function.arguments)
        
        // Handle the tool call
        if (toolCall.function.name === 'search_agents') {
          const args = JSON.parse(toolCall.function.arguments)
          console.log('🔍 Executing search_agents tool...')
          console.log('   Query:', args.query)
          console.log('   Limit:', args.limit)
        
          // Call MCP server (will get 402 if payment required, or success if signature provided)
          const mcpResponse = await callMCPServer('search_agents', args, finalSignature)
        
          // Handle payment required response
          if (mcpResponse.paymentRequired) {
            console.log('💳 x402: Payment required')
            console.log('   Amount:', mcpResponse.payment?.amount, mcpResponse.payment?.currency)
            console.log('   Recipient:', mcpResponse.payment?.recipient)
            console.log('   Network:', mcpResponse.payment?.network)
            
            console.log('🚀 Returning 402 Payment Required to client')
            const response = new Response(JSON.stringify({
              error: 'Payment required',
              payment: mcpResponse.payment
            }), {
              status: 402,
              headers: {
                'Content-Type': 'application/json',
                'X-402-Payment-Required': 'true',
                'X-402-Amount': mcpResponse.payment?.amount || '0.01',
                'X-402-Currency': mcpResponse.payment?.currency || 'USDC',
                'X-402-Recipient': mcpResponse.payment?.recipient || '',
                'X-402-Network': mcpResponse.payment?.network || 'arbitrum-sepolia'
              }
            })
            console.log('📡 Response status:', response.status)
            return response
          }
          
          if (mcpResponse.error) {
            console.error('❌ Tool execution failed:', mcpResponse.error)
            return new Response('Tool execution failed', { status: 500 })
          }
        
          if (mcpResponse.data) {
            console.log('✅ Tool execution successful')
            console.log('📊 Agent search data preview:', typeof mcpResponse.data)
            
            // Parse the search results
            let searchResults
            try {
              // mcpResponse.data might already be parsed or a string
              if (typeof mcpResponse.data === 'string') {
                searchResults = JSON.parse(mcpResponse.data);
              } else {
                searchResults = mcpResponse.data;
              }
              console.log('📊 Parsed search results:', searchResults)
            } catch (e) {
              console.error('❌ Error parsing search results:', e)
              searchResults = { results: [], total: 0 };
            }
            
            // Add the search results as a system message for Venice to use
            if (searchResults.total === 0 || searchResults.results?.length === 0) {
              console.log('📊 No agents found, adding no-results message')
              messagesWithSystem.push({
                role: 'system',
                content: `[TOOL EXECUTION COMPLETE]

The search_agents tool found NO agents matching "${searchResults.query}".

Please inform the user that:
- No suitable agents were found in the registry
- They should try a different search query
- They can check back later when more agents are available`
              })
            } else {
              // Format results in a readable way for Venice
              console.log('📊 Formatting search results for Venice:', searchResults.results.length, 'agents')
              const formattedResults = searchResults.results.map((agent: any, idx: number) => {
                return `${idx + 1}. **${agent.name}** (ID: ${agent.agentId})
   - Description: ${agent.description}
   - Capabilities: ${agent.capabilities?.join(', ') || 'General assistance'}
   - Match Score: ${(agent.score * 100).toFixed(1)}%`
              }).join('\n\n')
              
              const systemMessage = `[TOOL EXECUTION COMPLETE]

The search_agents tool found ${searchResults.total} agent(s) for "${searchResults.query}":

${formattedResults}

Please present these agents to the user in a friendly, conversational way and explain how they can help.`
              
              console.log('📝 System message content length:', systemMessage.length)
              console.log('📝 First 200 chars:', systemMessage.substring(0, 200))
              
              messagesWithSystem.push({
                role: 'system',
                content: systemMessage
              })
            }
          }
        }
      }
    }

    // Now make the final streaming call with tool results (if any)
    console.log('🎬 Making final streaming call to Venice...')
    console.log('   Messages count:', messagesWithSystem.length)
    
    const stream = await client.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: messagesWithSystem,
      temperature: 0.7,
      stream: true,
      tools: tools,
      tool_choice: 'none' // Don't call tools again
    })

    console.log('📡 Final response status: 200')
    console.log('✅ Streaming response received, converting to stream...')
    
    // Convert OpenAI stream to ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.choices?.[0]?.delta?.content) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                choices: [{
                  delta: { content: chunk.choices[0].delta.content }
                }]
              })}\n\n`))
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
