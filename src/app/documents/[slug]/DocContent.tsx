'use client'

import { useEffect, useState } from 'react'
import type { DocContent } from '@/lib/docs/markdown'
import clsx from 'clsx'

export default function DocContentComponent({ doc }: { doc: DocContent }) {
  const { meta, html, headings } = doc
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-20% 0% -70% 0%' }
    )
    document.querySelectorAll('h2[id], h3[id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [html])

  const tocHeadings = headings.filter(h => h.level === 2 || h.level === 3)

  return (
    <div className="flex">
      {/* Content */}
      <article className="flex-1 min-w-0 px-8 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-2">{meta.title}</h1>
        {(meta.version || meta.updatedAt) && (
          <p className="text-sm text-zinc-500 mb-8">
            {meta.version && <span>เวอร์ชัน: {meta.version}</span>}
            {meta.version && meta.updatedAt && <span className="mx-2">|</span>}
            {meta.updatedAt && <span>อัปเดตล่าสุด: {meta.updatedAt}</span>}
          </p>
        )}
        <div
          className="prose-docs"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      {/* Right TOC */}
      {tocHeadings.length > 0 && (
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-10 pr-6">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">On this page</p>
          <ul className="space-y-1">
            {tocHeadings.map(h => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className={clsx(
                    'block text-xs py-1 transition-colors',
                    h.level === 3 ? 'pl-3' : '',
                    activeId === h.id
                      ? 'text-primary-400 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-200'
                  )}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}
