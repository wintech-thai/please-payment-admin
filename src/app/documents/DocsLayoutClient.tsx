'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import type { NavSection } from '@/lib/docs/markdown'
import { Menu, X, FileText } from 'lucide-react'

export default function DocsLayoutClient({
  children,
  nav,
}: {
  children: React.ReactNode
  nav: NavSection[]
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function getAdminUrl(path: string) {
    if (typeof window === 'undefined') return path
    return window.location.origin + path
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-1.5 rounded hover:bg-zinc-800 transition-colors"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/documents/overview" className="flex items-center gap-2 font-bold text-white text-sm">
            <FileText className="w-4 h-4 text-primary-400" />
            Please Payment Docs
          </Link>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-white font-medium">API Reference</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left sidebar */}
        <aside
          className={clsx(
            'fixed md:sticky top-14 z-40 md:z-auto h-[calc(100vh-3.5rem)] w-64 bg-zinc-900 border-r border-zinc-800 overflow-y-auto flex-shrink-0 transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          <nav className="px-4 py-6">
            {nav.map(section => (
              <div key={section.section} className="mb-6">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
                  {section.section}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map(item => {
                    const href = `/documents/${item.slug}`
                    const active = pathname === href
                    return (
                      <li key={item.slug}>
                        <Link
                          href={href}
                          onClick={() => setSidebarOpen(false)}
                          className={clsx(
                            'block px-3 py-2 rounded-lg text-sm transition-colors',
                            active
                              ? 'bg-primary-600 text-white font-semibold'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                          )}
                        >
                          {item.title}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
