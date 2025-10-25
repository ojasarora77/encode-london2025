'use client'

import FaultyTerminal from '@/components/FaultyTerminal'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div className="absolute inset-0">
        <FaultyTerminal
          scale={3}
          gridMul={[2, 1]}
          digitSize={2.2}
          timeScale={0.5}
          pause={false}
          scanlineIntensity={0.2}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#00ff00"
          mouseReact={true}
          mouseStrength={0.9}
          pageLoadAnimation={true}
          brightness={0.4}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-6">
        <h1 className="text-6xl font-bold mb-4 text-center">AgentSearch</h1>
        <p className="text-xl mb-8 text-center max-w-2xl">
          AI agent semantic search engine with integrated x402 micropayments and ERC-8004 agent reputation protocol
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/search"
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Search Agents
          </Link>
          <Link
            href="/chat"
            className="px-6 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-black transition-colors"
          >
            Chat
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-black transition-colors"
          >
            Documentation
          </Link>
        </div>
      </div>
    </div>
  )
}
