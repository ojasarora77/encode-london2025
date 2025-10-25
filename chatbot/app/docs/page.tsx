'use client'

import { useState } from 'react'
import { CollapsibleSidebar } from '@/components/ui/collapsible-sidebar'
import FaultyTerminal from '@/components/FaultyTerminal'

type DocSection = 'overview' | 'dao' | 'mcp' | 'api'

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>('overview')

  const sidebarSections = [
    {
      heading: 'Documentation',
      items: [
        {
          name: 'Overview',
          href: '#overview',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4M3.732 5.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707M2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10m9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5m.754-4.246a.39.39 0 0 0-.527-.02L7.547 9.31a.91.91 0 1 0 1.302 1.258l3.434-4.297a.39.39 0 0 0-.029-.518z"/>
              <path fillRule="evenodd" d="M0 10a8 8 0 1 1 15.547 2.661c-.442 1.253-1.845 1.602-2.932 1.25C11.309 13.488 9.475 13 8 13c-1.474 0-3.31.488-4.615.911-1.087.352-2.49.003-2.932-1.25A8 8 0 0 1 0 10m8-7a7 7 0 0 0-6.603 9.329c.203.575.923.876 1.68.63C4.397 12.533 6.358 12 8 12s3.604.532 4.923.96c.757.245 1.477-.056 1.68-.631A7 7 0 0 0 8 3"/>
            </svg>
          )
        },
        {
          name: 'DAO Governance',
          href: '#dao',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
            </svg>
          )
        },
        {
          name: 'MCP Protocol',
          href: '#mcp',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2zm3.564 1.426L5.596 5 8 5.961 14.154 3.5zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"/>
            </svg>
          )
        },
        {
          name: 'API Reference',
          href: '#api',
          icon: (
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8z"/>
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
      <CollapsibleSidebar sections={sidebarSections} userName="AgentSearch" userRole="Documentation" />

      <main className="ml-[5.5rem] lg:ml-80 mr-3 transition-all duration-300 py-6 px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {activeSection === 'overview' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6">Overview</h1>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  Documentation overview content will be added here.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'dao' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6">DAO Governance</h1>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  DAO governance documentation will be added here.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'mcp' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6">MCP Protocol</h1>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  MCP protocol documentation will be added here.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'api' && (
            <div className="content-card">
              <h1 className="text-4xl font-bold mb-6">API Reference</h1>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  API reference documentation will be added here.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
