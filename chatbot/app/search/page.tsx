'use client'

import { useState, useEffect } from 'react'
import FaultyTerminal from '@/components/FaultyTerminal'
import { usePaymentAuth } from '@/lib/hooks/use-payment-auth'

interface TrustScore {
  score: number
  level: string
  count: number
  averageScore: number
  lastUpdated: string
  source: string
  contractAddress?: string
  network?: string
  components?: {
    averageScore: number
    volumeScore: number
    diversityScore: number
    consistencyScore: number
  }
  metrics?: {
    totalFeedback: number
    uniqueReviewers: number
    averageScore: number
    standardDeviation: number
  }
  error?: string
}

interface AgentResult {
  rank: number
  name: string
  description: string
  url: string
  score: string
  capabilities: string[]
  skills: string[]
  erc8004Index?: number
  trustScore?: TrustScore
}

interface SearchResponse {
  success: boolean
  results: AgentResult[]
  total: number
  query: string
  timestamp: string
  paymentProcessed?: boolean
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AgentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  
  const { 
    address,
    connectWallet, 
    generateSignature,
    isConnecting
  } = usePaymentAuth()
  
  const [signature, setSignature] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setPaymentRequired(false)
    setResults([])
    
    try {
      const response = await fetch('/api/search-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature && { 'x-402-signature': signature })
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 5,
          x402Signature: signature
        })
      })

      if (response.status === 402) {
        // Payment required
        const errorData = await response.json()
        setPaymentRequired(true)
        setPaymentData(errorData.payment)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Search failed:', errorData.error)
        return
      }

      const data: SearchResponse = await response.json()
      
      if (data.success && data.results) {
        setResults(data.results)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!address) {
      console.log('🔗 Connecting wallet...')
      await connectWallet()
      return
    }

    if (!paymentData) return

    try {
      console.log('💰 Starting payment flow')
      console.log('   Payment info:', paymentData)
      
      const newSignature = await generateSignature(paymentData)
      console.log('✍️ Signature generated:', newSignature.slice(0, 20) + '...')

      // Store the signature for the retry
      setSignature(newSignature)
      
      // Close payment dialog
      setPaymentRequired(false)
      
      // Retry search with signature - call the API directly instead of handleSearch
      setTimeout(async () => {
        try {
          setLoading(true)
          console.log('🔄 Retrying search with signature:', newSignature.slice(0, 20) + '...')
          
          const response = await fetch('/api/search-agents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-402-signature': newSignature
            },
            body: JSON.stringify({
              query: query.trim(),
              limit: 5,
              x402Signature: newSignature
            })
          })

          console.log('📡 Retry response status:', response.status)
          console.log('📡 Retry response headers:', Object.fromEntries(response.headers.entries()))

          if (response.status === 402) {
            // Still getting 402, something is wrong
            console.error('Still getting 402 after payment')
            const errorData = await response.json()
            console.error('402 Error data:', errorData)
            setLoading(false)
            return
          }

          if (!response.ok) {
            const errorData = await response.json()
            console.error('Search failed:', errorData.error)
            setLoading(false)
            return
          }

          const data: SearchResponse = await response.json()
          
          if (data.success && data.results) {
            setResults(data.results)
          }
        } catch (error) {
          console.error('Retry search error:', error)
        } finally {
          setLoading(false)
        }
      }, 1000)
    } catch (error) {
      console.error('Payment error:', error)
    }
  }


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
      <div className="w-full py-6 px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="content-card mb-8">
            <h1 className="text-4xl font-bold mb-6">Search Agents</h1>

            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for AI agents..."
                  className="flex-1 px-4 py-3 bg-black/40 border border-green-400/30 rounded-lg focus:outline-none focus:border-green-400 text-white placeholder-gray-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-green-500 text-black font-semibold rounded-lg hover:bg-green-400 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          </div>

          {/* Payment Required Dialog */}
          {paymentRequired && paymentData && (
            <div className="content-card mb-6 border-2 border-yellow-400 bg-yellow-400/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-yellow-400">Payment Required</h3>
                <div className="text-sm text-gray-400">
                  {paymentData.amount} {paymentData.currency}
                </div>
              </div>
              <p className="text-gray-300 mb-4">
                {paymentData.description || 'Payment required to search agents'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handlePayment}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
                >
                  {isConnecting ? 'Signing...' : address ? 'Pay & Search' : 'Connect Wallet & Pay'}
                </button>
                <button
                  onClick={() => setPaymentRequired(false)}
                  className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((result, idx) => (
                <div key={idx} className="content-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-green-400">{result.name}</h3>
                      <p className="text-gray-300 mb-3">{result.description}</p>
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      <div className="text-green-400 font-semibold">Score: {result.score}</div>
                      <div className="text-xs">Rank #{result.rank}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {result.capabilities?.slice(0, 3).map((capability, capIdx) => (
                      <span
                        key={capIdx}
                        className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded"
                      >
                        {capability}
                      </span>
                    ))}
                    {result.capabilities?.length > 3 && (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">
                        +{result.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>
                        URL: <span className="text-green-300 font-mono">{result.url}</span>
                      </div>
                      {result.erc8004Index !== undefined && (
                        <div>
                          ERC8004 ID: <span className="text-blue-300 font-mono">#{result.erc8004Index}</span>
                        </div>
                      )}
                      {result.trustScore && (
                        <div className="mt-2 p-3 bg-gray-800 rounded border-l-4 border-green-500">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-green-400 font-semibold">🔗 On-Chain Trust Score:</span>
                            <span className="text-white font-mono text-lg">{(result.trustScore.score * 100).toFixed(1)}%</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              result.trustScore.level === 'Excellent' ? 'bg-green-900 text-green-300' :
                              result.trustScore.level === 'Very High' ? 'bg-green-800 text-green-300' :
                              result.trustScore.level === 'High' ? 'bg-blue-800 text-blue-300' :
                              result.trustScore.level === 'Good' ? 'bg-yellow-800 text-yellow-300' :
                              result.trustScore.level === 'Medium' ? 'bg-orange-800 text-orange-300' :
                              'bg-red-800 text-red-300'
                            }`}>
                              {result.trustScore.level}
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-400 mb-2">
                            📊 {result.trustScore.count} feedback entries from {result.trustScore.metrics?.uniqueReviewers || 0} reviewers • {result.trustScore.source}
                          </div>
                          
                          {result.trustScore.components && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-gray-700 p-2 rounded">
                                <div className="text-blue-300">Average Score</div>
                                <div className="text-white font-mono">{(result.trustScore.components.averageScore * 100).toFixed(1)}%</div>
                              </div>
                              <div className="bg-gray-700 p-2 rounded">
                                <div className="text-purple-300">Volume</div>
                                <div className="text-white font-mono">{(result.trustScore.components.volumeScore * 100).toFixed(1)}%</div>
                              </div>
                              <div className="bg-gray-700 p-2 rounded">
                                <div className="text-green-300">Diversity</div>
                                <div className="text-white font-mono">{(result.trustScore.components.diversityScore * 100).toFixed(1)}%</div>
                              </div>
                              <div className="bg-gray-700 p-2 rounded">
                                <div className="text-yellow-300">Consistency</div>
                                <div className="text-white font-mono">{(result.trustScore.components.consistencyScore * 100).toFixed(1)}%</div>
                              </div>
                            </div>
                          )}
                          
                          {result.trustScore.contractAddress && (
                            <div className="text-xs text-gray-500 mt-2">
                              🔗 Contract: {result.trustScore.contractAddress.slice(0, 10)}...{result.trustScore.contractAddress.slice(-8)} • {result.trustScore.network}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => window.open(result.url, '_blank')}
                      className="px-3 py-1 bg-green-500 text-black text-sm font-semibold rounded hover:bg-green-400 transition-colors"
                    >
                      Visit Agent
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="content-card text-center">
                <p className="text-gray-400">
                  {loading ? 'Searching...' : query ? 'No results found' : 'Enter a query to search for agents'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
