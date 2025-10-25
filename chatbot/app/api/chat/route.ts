import { OpenAIStream, StreamingTextResponse } from 'ai'

export const runtime = 'edge'

// MCP client for agent registry
async function callMCPTool(toolName: string, args: any) {
  const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002/mcp'
  
  try {
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    
    const data = await response.json()
    return data.result?.content?.[0]?.text || JSON.stringify(data.result)
  } catch (error) {
    console.error('MCP Error:', error)
    return `Error calling MCP tool: ${error}`
  }
}

export async function POST(req: Request) {
  const json = await req.json()
  const { messages } = json

  const apiKey = process.env.VENICE_API_KEY
  
  if (!apiKey) {
    return new Response('Venice API key not configured', { status: 500 })
  }

  // Check if the latest message is asking for agent search
  const lastMessage = messages[messages.length - 1]
  const searchKeywords = ['find agent', 'search agent', 'book flight', 'translate', 'find flights', 'agent for', 'who can help']
  const needsAgentSearch = searchKeywords.some(keyword => 
    lastMessage.content.toLowerCase().includes(keyword)
  )

  // If agent search is needed, call MCP first
  if (needsAgentSearch) {
    console.log('🔍 Detected agent search request, calling MCP...')
    const agentResults = await callMCPTool('search_agents', {
      query: lastMessage.content,
      limit: 3
    })
    
    // Add agent results as a system message
    messages.push({
      role: 'system',
      content: `Agent Search Results:\n${agentResults}\n\nUse these results to help the user. Present the agents in a friendly way with their capabilities.`
    })
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
