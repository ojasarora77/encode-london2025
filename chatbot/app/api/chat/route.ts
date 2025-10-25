import { OpenAIStream, StreamingTextResponse } from 'ai'

export const runtime = 'edge'

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
  const { messages, x402Signature } = json // Client can pass signature if they have it

  console.log('📨 Chat API received request')
  console.log('   Messages count:', messages?.length)
  console.log('   Has x402Signature:', !!x402Signature)
  if (x402Signature) {
    console.log('   Signature:', x402Signature.slice(0, 20) + '...')
  }

  const apiKey = process.env.VENICE_API_KEY
  
  if (!apiKey) {
    return new Response('Venice API key not configured', { status: 500 })
  }

  // Check if the latest message is asking for agent search
  const lastMessage = messages[messages.length - 1]
  console.log('   Last message:', lastMessage?.content?.slice(0, 50))
  
  const searchKeywords = ['find agent', 'search agent', 'book flight', 'translate', 'find flights', 'agent for', 'who can help']
  const needsAgentSearch = searchKeywords.some(keyword => 
    lastMessage.content.toLowerCase().includes(keyword)
  )

  console.log('   Needs agent search:', needsAgentSearch)

  // If agent search is needed, call MCP with x402
  if (needsAgentSearch) {
    console.log('🔍 Detected agent search request, calling MCP with x402...')
    
    const mcpResponse = await callMCPToolWithPayment('search_agents', {
      query: lastMessage.content,
      limit: 3
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
      // Return payment info to client
      return new Response(JSON.stringify({
        paymentRequired: true,
        payment: mcpResponse.payment,
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
      console.error('MCP call failed:', mcpResponse.error)
      messages.push({
        role: 'system',
        content: `Error searching agents: ${mcpResponse.error}. Please inform the user that agent search is temporarily unavailable.`
      })
    } else {
      // Success - add results as system message
      const paymentNote = mcpResponse.paymentProcessed 
        ? '\n\n✅ Payment processed: $0.01 USDC' 
        : ''
      
      messages.push({
        role: 'system',
        content: `Agent Search Results:${paymentNote}\n${mcpResponse.data}\n\nUse these results to help the user. Present the agents in a friendly way with their capabilities.`
      })
    }
  }

  // Make direct fetch call to Venice API
  const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages,
      temperature: 0.7,
      stream: true
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Venice API Error:', response.status, error)
    return new Response(`Venice API Error: ${response.status}`, { status: response.status })
  }

  // Convert the response to a stream that AI SDK can use
  const stream = OpenAIStream(response)

  return new StreamingTextResponse(stream)
}
