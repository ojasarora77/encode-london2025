import { NextRequest, NextResponse } from 'next/server'

// Removed: export const runtime = 'edge' - using Node.js runtime instead

// MCP call with payment handling for search page
async function callMCPServer(toolName: string, args: any, signature?: string) {
  const mcpUrl = process.env.MCP_SERVER_URL || 'https://agent-registry-mcp.dawid-pisarczyk.workers.dev'
  
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
      console.log('💳 x402: Payment required for search')
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

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 5, x402Signature } = await req.json()
    
    console.log('🔍 Search API received request')
    console.log('   Query:', query)
    console.log('   Limit:', limit)
    console.log('   Has x402Signature:', !!x402Signature)
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }
    
    if (limit < 1 || limit > 10) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 10' },
        { status: 400 }
      )
    }
    
    // Call MCP server
    const mcpResponse = await callMCPServer('search_agents', { query, limit }, x402Signature)
    
    if (mcpResponse.paymentRequired) {
      console.log('💳 Payment required for search')
      return NextResponse.json(
        {
          error: 'Payment required',
          payment: mcpResponse.payment
        },
        {
          status: 402,
          headers: {
            'X-402-Amount': mcpResponse.payment.amount,
            'X-402-Currency': mcpResponse.payment.currency,
            'X-402-Recipient': mcpResponse.payment.recipient,
            'X-402-Network': mcpResponse.payment.network,
            'X-402-Description': mcpResponse.payment.description,
            'X-402-Relayer': mcpResponse.payment.relayer
          }
        }
      )
    }
    
    if (mcpResponse.error) {
      console.log('❌ Search failed:', mcpResponse.error)
      return NextResponse.json(
        { error: mcpResponse.error },
        { status: 500 }
      )
    }
    
    if (mcpResponse.data) {
      console.log('✅ Search completed successfully')
      
      // Parse the JSON response from MCP
      let searchResults
      try {
        searchResults = JSON.parse(mcpResponse.data)
      } catch (parseError) {
        console.error('Failed to parse MCP response:', parseError)
        return NextResponse.json(
          { error: 'Failed to parse search results' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        results: searchResults.results || [],
        total: searchResults.total || 0,
        query: searchResults.query,
        timestamp: searchResults.timestamp,
        paymentProcessed: mcpResponse.paymentProcessed
      })
    }
    
    return NextResponse.json(
      { error: 'No data received from MCP server' },
      { status: 500 }
    )
    
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
