'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SidebarItem {
  name: string
  href: string
  icon: React.ReactNode
  onClick?: () => void
}

interface SidebarSection {
  heading: string
  items: SidebarItem[]
}

interface CollapsibleSidebarProps {
  sections: SidebarSection[]
  logo?: string
  userName?: string
  userRole?: string
}

export function CollapsibleSidebar({ sections, logo, userName, userRole }: CollapsibleSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <aside className={`fixed left-3 top-[4.5rem] bottom-3 bg-black/60 backdrop-blur-xl border border-green-400/20 rounded-xl shadow-2xl shadow-green-400/5 transition-all duration-300 ${isExpanded ? 'w-72' : 'w-20'} z-40`}>
      <nav className="flex flex-col h-full p-3">
        <header className="flex flex-col gap-3 mb-6">
          <div className="flex justify-end h-12">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-full aspect-square hover:bg-green-400/10 hover:border hover:border-green-400/30 rounded-lg transition-all flex items-center justify-center group"
              aria-label="Toggle sidebar"
            >
              {isExpanded ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 group-hover:text-green-400 transition-colors">
                  <path d="M18.707 6.707a1 1 0 0 0-1.414-1.414L12 10.586 6.707 5.293a1 1 0 0 0-1.414 1.414L10.586 12l-5.293 5.293a1 1 0 1 0 1.414 1.414L12 13.414l5.293 5.293a1 1 0 0 0 1.414-1.414L13.414 12z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 group-hover:text-green-400 transition-colors">
                  <path d="M3 5a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2zM2 12a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1M2 18a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1" />
                </svg>
              )}
            </button>
          </div>

          {(logo || userName) && (
            <figure className="flex flex-col items-center gap-1.5">
              {logo && (
                <img
                  src={logo}
                  alt="Logo"
                  className={`rounded-full object-cover transition-all ${isExpanded ? 'w-16 h-16' : 'w-9 h-9'}`}
                />
              )}
              {isExpanded && userName && (
                <figcaption className="text-center">
                  <p className="text-sm font-medium text-green-400">{userName}</p>
                  {userRole && <p className="text-xs text-gray-400">{userRole}</p>}
                </figcaption>
              )}
            </figure>
          )}
        </header>

        <section className="flex flex-col gap-4 overflow-y-auto flex-1">
          {sections.map((section, sectionIdx) => (
            <ul key={sectionIdx} className="list-none p-0 m-0 flex flex-col gap-1">
              {isExpanded && (
                <li className="flex items-end h-10 mb-2 px-2">
                  <h2 className="text-xs uppercase tracking-wide font-medium text-gray-500">
                    {section.heading}
                  </h2>
                </li>
              )}
              {section.items.map((item, itemIdx) => (
                <li key={itemIdx} className="h-12 rounded-lg">
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className="flex items-center gap-3 h-full px-3 rounded-lg hover:bg-green-400/10 border border-transparent hover:border-green-400/30 transition-all duration-200 group relative w-full text-left"
                      title={!isExpanded ? item.name : undefined}
                    >
                      <span className="flex items-center justify-center w-6 h-6 text-gray-400 group-hover:text-green-400 transition-colors duration-200">
                        {item.icon}
                      </span>
                      {isExpanded && (
                        <span className="text-base font-medium text-gray-300 group-hover:text-green-400 transition-colors duration-200">
                          {item.name}
                        </span>
                      )}
                      {!isExpanded && (
                        <span className="absolute left-20 bg-black/90 border border-green-400/30 text-green-400 text-sm font-medium px-3 py-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                          {item.name}
                        </span>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 h-full px-3 rounded-lg hover:bg-green-400/10 border border-transparent hover:border-green-400/30 transition-all duration-200 group relative"
                      title={!isExpanded ? item.name : undefined}
                    >
                      <span className="flex items-center justify-center w-6 h-6 text-gray-400 group-hover:text-green-400 transition-colors duration-200">
                        {item.icon}
                      </span>
                      {isExpanded && (
                        <span className="text-base font-medium text-gray-300 group-hover:text-green-400 transition-colors duration-200">
                          {item.name}
                        </span>
                      )}
                      {!isExpanded && (
                        <span className="absolute left-20 bg-black/90 border border-green-400/30 text-green-400 text-sm font-medium px-3 py-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ))}
        </section>
      </nav>
    </aside>
  )
}
