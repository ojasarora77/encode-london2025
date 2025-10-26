'use client'

import { useState } from 'react'
import { CollapsibleSidebar } from '@/components/ui/collapsible-sidebar'
import FaultyTerminal from '@/components/FaultyTerminal'

type DocSection = 'overview' | 'x402' | 'api' | 'dao'

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('overview')

  const sidebarSections = [
    {
      heading: 'Documentation',
      items: [
        {
          name: 'Overview',
          href: '#overview',
          onClick: () => setActiveSection('overview'),
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4M3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707M2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.39.39 0 0 0-.029-.518z"/>
              <path fillRule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A8 8 0 0 1 0 10m8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3"/>
            </svg>
          )
        },
        {
          name: 'x402 Payments',
          href: '#x402',
          onClick: () => setActiveSection('x402'),
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4M3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707M2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.39.39 0 0 0-.029-.518z"/>
              <path fillRule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A8 8 0 0 1 0 10m8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3"/>
            </svg>
          )
        },
        {
          name: 'API/MCP Reference',
          href: '#api',
          onClick: () => setActiveSection('api'),
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8z"/>
            </svg>
          )
        },
        {
          name: 'DAO Governance',
          href: '#dao',
          onClick: () => setActiveSection('dao'),
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
            </svg>
          )
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen pt-20 relative">
      <div className="fixed inset-0 z-0">
        <FaultyTerminal
          scale={2.2}
          gridMul={[2, 1]}
          digitSize={1.7}
          timeScale={0.1}
          pause={false}
          scanlineIntensity={0.2}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.11}
          tint="#52744E"
          mouseReact={false}
          mouseStrength={0.3}
          pageLoadAnimation={false}
          brightness={0.2}
        />
      </div>
      <CollapsibleSidebar sections={sidebarSections} userName="CompassDAO" userRole="Documentation" />

      <main className="ml-[5.5rem] lg:ml-80 mr-3 transition-all duration-300 py-6 px-8 relative z-10">
        <div className="max-w-5xl mx-auto">

          {/* Content */}
          {activeSection === 'overview' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6 text-green-400">CompassDAO Documentation</h1>
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">What is CompassDAO?</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    CompassDAO is an ERC-8004 Agent Semantic Search Engine that utilizes vectorized embeddings to simplify discovery of useful ERC-8004 Agents. 
                    It combines blockchain technology, AI, and micropayments to create a decentralized agent discovery platform.
                  </p>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    Built on the Model Context Protocol (MCP) standard, CompassDAO enables AI agents to discover and interact with other agents 
                    through a semantic search interface powered by Venice AI embeddings and Pinecone vector database.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Key Features</h2>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Semantic Search:</strong> Find agents using natural language queries</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>x402 Micropayments:</strong> Pay $0.01 USDC per search with automatic signatures</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Agent-2-Agent (A2A):</strong> Direct communication between AI agents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Trust Scoring:</strong> Reputation-based agent ranking using ERC-8004</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>DAO Governance:</strong> Community-driven agent verification and feedback</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Tech Stack</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Frontend</h3>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Next.js 13.4.10</li>
                        <li>• React 18.2.0</li>
                        <li>• Tailwind CSS</li>
                        <li>• Vercel AI SDK</li>
                      </ul>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Backend</h3>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Cloudflare Workers</li>
                        <li>• Venice AI (Llama 3.3 70B)</li>
                        <li>• Pinecone Vector DB</li>
                        <li>• Arbitrum Sepolia</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {activeSection === 'x402' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6 text-green-400">x402 Micropayments</h1>
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">What is x402?</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    x402 is a protocol built on top of HTTP for doing fully accountless payments easily, quickly, cheaply and securely. 
                    It enables micropayments without requiring users to connect wallets or approve transactions manually.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Payment Flow</h2>
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <ol className="text-gray-300 space-y-3">
                      <li className="flex items-start">
                        <span className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                        <span>User submits search query</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                        <span>Server responds with 402 Payment Required</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                        <span>Frontend shows payment dialog ($0.01 USDC)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                        <span>User clicks "Pay & Search" - auto-signs with local key</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</span>
                        <span>Request retried with EIP-712 signature</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">6</span>
                        <span>Server verifies signature and executes USDC transfer</span>
                      </li>
                      <li className="flex items-start">
                        <span className="bg-green-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">7</span>
                        <span>Search results returned to user</span>
                      </li>
                    </ol>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Pricing</h2>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">$0.01 USDC</div>
                      <div className="text-gray-300">per search query</div>
                      <div className="text-sm text-gray-400 mt-2">No gas fees • Instant payments • No wallet connection required</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6 text-green-400">API/MCP Reference</h1>
              <div className="space-y-8">
                
                {/* MCP Server Overview */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">MCP Server Overview</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    The CompassDAO MCP (Model Context Protocol) server provides a standardized interface for agent discovery and search. 
                    It implements JSON-RPC 2.0 protocol with x402 micropayment support for paid operations.
                  </p>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Base URL</h3>
                    <code className="text-gray-300">https://agent-registry-mcp.workers.dev</code>
                  </div>
                </div>

                {/* Available Tools */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Available Tools</h2>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">GET /tools/list</h3>
                    <p className="text-gray-300 mb-3">List all available tools and their schemas</p>
                    <div className="bg-gray-900 p-3 rounded text-sm mb-3">
                      <pre className="text-gray-300">
{`curl -X POST https://agent-registry-mcp.workers.dev \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
                      </pre>
                    </div>
                    <div className="bg-gray-900 p-3 rounded text-sm">
                      <pre className="text-gray-300">
{`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_agents",
        "description": "Search the agent registry...",
        "inputSchema": { ... }
      }
    ]
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Search Agents Tool */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">search_agents Tool</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    The primary tool for discovering agents using semantic search. Requires x402 payment of $0.01 USDC per search.
                  </p>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">POST /tools/call</h3>
                    <p className="text-gray-300 mb-3">Execute agent search with payment</p>
                    <div className="bg-gray-900 p-3 rounded text-sm mb-3">
                      <pre className="text-gray-300">
{`curl -X POST https://agent-registry-mcp.workers.dev \\
  -H "Content-Type: application/json" \\
  -H "X-402-Signature: 0x..." \\
  -H "X-402-Amount: 0.01" \\
  -H "X-402-Currency: USDC" \\
  -H "X-402-Recipient: 0x..." \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_agents",
      "arguments": {
        "query": "find translation agents",
        "limit": 5,
        "filters": {
          "capabilities": ["translation"],
          "minScore": 0.7
        }
      }
    }
  }'`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Request Parameters</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th className="text-left py-2 text-green-400">Parameter</th>
                            <th className="text-left py-2 text-green-400">Type</th>
                            <th className="text-left py-2 text-green-400">Required</th>
                            <th className="text-left py-2 text-green-400">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-300">
                          <tr className="border-b border-gray-700">
                            <td className="py-2 font-mono">query</td>
                            <td className="py-2">string</td>
                            <td className="py-2">Yes</td>
                            <td className="py-2">Natural language search query</td>
                          </tr>
                          <tr className="border-b border-gray-700">
                            <td className="py-2 font-mono">limit</td>
                            <td className="py-2">integer</td>
                            <td className="py-2">No</td>
                            <td className="py-2">Number of results (1-10, default: 5)</td>
                          </tr>
                          <tr className="border-b border-gray-700">
                            <td className="py-2 font-mono">filters.capabilities</td>
                            <td className="py-2">string[]</td>
                            <td className="py-2">No</td>
                            <td className="py-2">Filter by agent capabilities</td>
                          </tr>
                          <tr className="border-b border-gray-700">
                            <td className="py-2 font-mono">filters.inputMode</td>
                            <td className="py-2">string</td>
                            <td className="py-2">No</td>
                            <td className="py-2">Filter by input mode (text, image, audio)</td>
                          </tr>
                          <tr className="border-b border-gray-700">
                            <td className="py-2 font-mono">filters.outputMode</td>
                            <td className="py-2">string</td>
                            <td className="py-2">No</td>
                            <td className="py-2">Filter by output mode (text, image, audio)</td>
                          </tr>
                          <tr className="border-b border-gray-700">
                            <td className="py-2 font-mono">filters.minScore</td>
                            <td className="py-2">number</td>
                            <td className="py-2">No</td>
                            <td className="py-2">Minimum similarity score (0.0-1.0, default: 0.5)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Response Format */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Response Format</h2>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Success Response</h3>
                    <div className="bg-gray-900 p-3 rounded text-sm">
                      <pre className="text-gray-300">
{`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\\"query\\": \\"find translation agents\\", \\"total\\": 3, \\"results\\": [
        {
          \\"rank\\": 1,
          \\"name\\": \\"Universal Translator Agent\\",
          \\"description\\": \\"AI-powered translation service...\\",
          \\"capabilities\\": [\\"translation\\", \\"language-detection\\"],
          \\"inputMode\\": \\"text\\",
          \\"outputMode\\": \\"text\\",
          \\"trustScore\\": 0.95,
          \\"agentId\\": \\"0x1234...\\",
          \\"tokenURI\\": \\"https://...\\"
        }
      ]}"
    }]
  }
}`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Payment Required (402)</h3>
                    <div className="bg-gray-900 p-3 rounded text-sm">
                      <pre className="text-gray-300">
{`{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -402,
    "message": "Payment required",
    "data": {
      "payment": {
        "amount": "0.01",
        "currency": "USDC",
        "network": "arbitrum-sepolia",
        "recipient": "0x1234567890abcdef1234567890abcdef12345678",
        "description": "Agent Registry Search - $0.01 USDC",
        "relayer": "https://relayer.x402.com"
      }
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* x402 Headers */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">x402 Payment Headers</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    When making paid requests, include these headers for x402 micropayment processing:
                  </p>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <code className="text-green-400">X-402-Signature</code>
                        <span className="text-gray-300 ml-2">EIP-712 signature of payment authorization</span>
                      </div>
                      <div>
                        <code className="text-green-400">X-402-Amount</code>
                        <span className="text-gray-300 ml-2">Payment amount (e.g., "0.01")</span>
                      </div>
                      <div>
                        <code className="text-green-400">X-402-Currency</code>
                        <span className="text-gray-300 ml-2">Currency code (e.g., "USDC")</span>
                      </div>
                      <div>
                        <code className="text-green-400">X-402-Recipient</code>
                        <span className="text-gray-300 ml-2">Recipient wallet address</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Codes */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Error Codes</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-600">
                          <th className="text-left py-2 text-green-400">Code</th>
                          <th className="text-left py-2 text-green-400">Message</th>
                          <th className="text-left py-2 text-green-400">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-300">
                        <tr className="border-b border-gray-700">
                          <td className="py-2 font-mono">-402</td>
                          <td className="py-2">Payment required</td>
                          <td className="py-2">x402 micropayment needed to access the tool</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 font-mono">-32600</td>
                          <td className="py-2">Invalid Request</td>
                          <td className="py-2">JSON-RPC request format is invalid</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 font-mono">-32601</td>
                          <td className="py-2">Method not found</td>
                          <td className="py-2">Requested method doesn't exist</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 font-mono">-32602</td>
                          <td className="py-2">Invalid params</td>
                          <td className="py-2">Method parameters are invalid</td>
                        </tr>
                        <tr className="border-b border-gray-700">
                          <td className="py-2 font-mono">-32603</td>
                          <td className="py-2">Internal error</td>
                          <td className="py-2">Server-side error occurred</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Rate Limits */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Rate Limits & Pricing</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Pricing</h3>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• $0.01 USDC per search query</li>
                        <li>• No gas fees (x402 handles this)</li>
                        <li>• Instant payment processing</li>
                        <li>• No subscription required</li>
                      </ul>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">Rate Limits</h3>
                      <ul className="text-sm text-gray-300 space-y-1">
                        <li>• No rate limits (pay-per-use)</li>
                        <li>• Concurrent requests supported</li>
                        <li>• Global CDN distribution</li>
                        <li>• 99.9% uptime SLA</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* SDK Examples */}
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">SDK Examples</h2>
                  
                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">JavaScript/TypeScript</h3>
                    <div className="bg-gray-900 p-3 rounded text-sm">
                      <pre className="text-gray-300">
{`import { createMCPClient } from '@modelcontextprotocol/sdk'

const client = createMCPClient({
  serverUrl: 'https://agent-registry-mcp.workers.dev',
  paymentConfig: {
    privateKey: '0x...',
    relayerUrl: 'https://relayer.x402.com'
  }
})

const results = await client.callTool('search_agents', {
  query: 'find code review agents',
  limit: 3,
  filters: {
    capabilities: ['code-review'],
    minScore: 0.8
  }
})`}
                      </pre>
                    </div>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Python</h3>
                    <div className="bg-gray-900 p-3 rounded text-sm">
                      <pre className="text-gray-300">
{`import requests
from eth_account import Account

# Generate payment signature
account = Account.from_key('0x...')
payment_data = {
    "amount": "0.01",
    "currency": "USDC",
    "recipient": "0x..."
}
signature = account.sign_message(payment_data)

# Make request
response = requests.post('https://agent-registry-mcp.workers.dev', 
    headers={
        'Content-Type': 'application/json',
        'X-402-Signature': signature.signature.hex(),
        'X-402-Amount': '0.01',
        'X-402-Currency': 'USDC',
        'X-402-Recipient': '0x...'
    },
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "search_agents",
            "arguments": {
                "query": "find AI agents for data analysis",
                "limit": 5
            }
        }
    }
)`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'dao' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6 text-green-400">DAO Governance</h1>
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Verified Agent Feedback System</h2>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    CompassDAO implements an optimistic contestable feedback system inspired by Polymarket's DAO staking mechanism. 
                    This system economically incentivizes honest reviewing and ensures high-quality agent verification.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">How It Works</h2>
              <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">1. Review Submission</h3>
                      <p className="text-gray-300 text-sm">
                        DAO members can stake tokens to submit a review for an agent. The stake is locked for 2 hours 
                        during which the review is considered pending and can be disputed.
                      </p>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">2. Dispute Window</h3>
                      <p className="text-gray-300 text-sm">
                        During the 2-hour lock period, any other DAO member can dispute the review by staking an equal amount. 
                        If disputed, the DAO gets 24 hours to vote on the legitimacy of the review.
                      </p>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-400 mb-2">3. Voting & Resolution</h3>
                      <p className="text-gray-300 text-sm">
                        If no dispute occurs within 2 hours, the review is automatically accepted and stakes are returned. 
                        If disputed, DAO members vote within 24 hours, and the winner receives all staked tokens.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Timeline & Process</h2>
                  <div className="bg-gray-800 p-6 rounded-lg">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="bg-green-500 text-black px-3 py-1 rounded text-sm font-bold">T+0</div>
                        <span className="text-gray-300">DAO member stakes tokens to submit review</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="bg-yellow-500 text-black px-3 py-1 rounded text-sm font-bold">T+0 to T+2h</div>
                        <span className="text-gray-300">2-hour dispute window - anyone can dispute with equal stake</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold">T+2h</div>
                        <span className="text-gray-300">If no dispute: Review accepted, stakes returned</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold">T+2h to T+26h</div>
                        <span className="text-gray-300">If disputed: DAO has 24 hours to vote</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold">T+26h</div>
                        <span className="text-gray-300">Voting ends, winner receives all staked tokens</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Benefits</h2>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Economic Incentives:</strong> Honest reviewers are rewarded, bad actors are penalized</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Quality Assurance:</strong> Only high-quality agents receive DAO verification</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Decentralized:</strong> No single authority controls agent verification</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Transparent:</strong> All disputes and resolutions are publicly recorded</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Fast Resolution:</strong> 2-hour dispute window prevents long delays</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span><strong>Fair Voting:</strong> 24-hour DAO voting period ensures thorough consideration</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
