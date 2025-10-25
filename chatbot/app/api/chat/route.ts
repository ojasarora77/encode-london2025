import { OpenAIStream, StreamingTextResponse } from 'ai'

export const runtime = 'edge'

export async function POST(req: Request) {
  const json = await req.json()
  const { messages } = json

  const apiKey = process.env.VENICE_API_KEY
  
  if (!apiKey) {
    return new Response('Venice API key not configured', { status: 500 })
  }

  // Make direct fetch call to Venice API (openai-edge doesn't work well with custom basePath)
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
