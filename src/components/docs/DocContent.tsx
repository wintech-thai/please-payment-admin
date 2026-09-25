'use client'

import { useEffect, useState } from 'react'
import type { DocContent, DocLocale } from '@/lib/docs/markdown'
import clsx from 'clsx'
import { Check } from 'lucide-react'

const LABELS: Record<DocLocale, { version: string; updatedAt: string; copied: string }> = {
  th: { version: 'เวอร์ชัน', updatedAt: 'อัปเดตล่าสุด', copied: 'คัดลอกลิงก์แล้ว' },
  en: { version: 'Version', updatedAt: 'Last updated', copied: 'Link copied' },
  zh: { version: '版本', updatedAt: '最后更新', copied: '已复制链接' },
}

export default function DocContentComponent({ doc, locale = 'th' }: { doc: DocContent; locale?: DocLocale }) {
  const { meta, html, headings } = doc
  const labels = LABELS[locale]
  const [activeId, setActiveId] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string>('')

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest('[data-copy-link]') as HTMLElement | null
    if (!target) return
    const id = target.getAttribute('data-copy-link')
    if (!id) return
    const url = `${window.location.origin}${window.location.pathname}#${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(current => (current === id ? '' : current)), 2000)
  }

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
      <article className="flex-1 min-w-0 px-8 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">{meta.title}</h1>
        {(meta.version || meta.updatedAt) && (
          <p className="text-sm text-zinc-500 mb-2">
            {meta.version && <span>{labels.version}: {meta.version}</span>}
            {meta.version && meta.updatedAt && <span className="mx-2">|</span>}
            {meta.updatedAt && <span>{labels.updatedAt}: {meta.updatedAt}</span>}
          </p>
        )}
        {meta.summary && (
          <p className="text-base text-zinc-400 mb-8 leading-relaxed">{meta.summary}</p>
        )}
        <div
          className="prose-docs"
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>

      {/* Copy-link toast */}
      {copiedId && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-4 py-2.5 rounded-lg shadow-xl">
          <Check className="w-4 h-4 text-primary-400" />
          {labels.copied}
        </div>
      )}

      {/* Right TOC */}
      {tocHeadings.length > 0 && (
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto docs-scrollbar py-10 pr-6">
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
