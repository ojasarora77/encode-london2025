'use client'

import { useState } from 'react'
import { CollapsibleSidebar } from '@/components/ui/collapsible-sidebar'
import FaultyTerminal from '@/components/FaultyTerminal'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      // TODO: Connect to agent search API
      setResults([])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const sidebarSections = [
    {
      heading: 'Search',
      items: [
        {
          name: 'All Agents',
          href: '#all',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
            </svg>
          )
        },
        {
          name: 'Favourites',
          href: '#favourites',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73z"/>
            </svg>
          )
        },
        {
          name: 'Recent',
          href: '#recent',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
            </svg>
          )
        }
      ]
    },
    {
      heading: 'Categories',
      items: [
        {
          name: 'Code Agents',
          href: '#code',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8z"/>
            </svg>
          )
        },
        {
          name: 'Translation',
          href: '#translation',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.545 6.714 4.11 8H3l1.862-5h1.284L8 8H6.833l-.435-1.286zm1.634-.736L5.5 3.956h-.049l-.679 2.022z"/>
              <path d="M0 2a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-3H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm7.138 9.995q.289.451.63.846c-.748.575-1.673 1.001-2.768 1.292.178.217.451.635.555.867 1.125-.359 2.08-.844 2.886-1.494.777.665 1.739 1.165 2.93 1.472.133-.254.414-.673.629-.89-1.125-.253-2.057-.694-2.82-1.284.681-.747 1.222-1.651 1.621-2.757H14V8h-3v1.047h.765c-.318.844-.74 1.546-1.272 2.13a6 6 0 0 1-.415-.492 2 2 0 0 1-.94.31"/>
            </svg>
          )
        },
        {
          name: 'Support',
          href: '#support',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
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
      <CollapsibleSidebar sections={sidebarSections} userName="Search" userRole="Find Agents" />

      <div className="ml-[5.5rem] lg:ml-80 mr-3 transition-all duration-300 py-6 px-8 relative z-10">
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

          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((result, idx) => (
                <div key={idx} className="content-card">
                  <h3 className="text-xl font-semibold mb-2 text-green-400">{result.name}</h3>
                  <p className="text-gray-300">{result.description}</p>
                </div>
              ))
            ) : (
              <div className="content-card text-center">
                <p className="text-gray-400">
                  {query ? 'No results found' : 'Enter a query to search for agents'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
