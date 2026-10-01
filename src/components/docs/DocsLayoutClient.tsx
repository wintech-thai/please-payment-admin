'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import type { NavSection } from '@/lib/docs/markdown'
import { DOC_LOCALES, DEFAULT_LOCALE, isDocLocale, type DocLocale } from '@/lib/docs/locale'
import { Menu, X, FileText } from 'lucide-react'

const LOCALE_LABELS: Record<DocLocale, string> = {
  th: 'ไทย',
  en: 'English',
  zh: '中文',
}

function LangSwitcher({ locale, pathname }: { locale: DocLocale; pathname: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-zinc-800 p-0.5">
      {DOC_LOCALES.map(code => (
        <Link
          key={code}
          href={code === DEFAULT_LOCALE ? pathname : `${pathname}?lang=${code}`}
          className={clsx(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            locale === code ? 'bg-primary-600 text-white' : 'text-zinc-400 hover:text-white'
          )}
        >
          {LOCALE_LABELS[code]}
        </Link>
      ))}
    </div>
  )
}

// The only two pieces that need useSearchParams() (to read ?lang=). Each has
// its own small Suspense boundary so a re-suspend (e.g. the query string
// changing when switching language, or a not-yet-cached navigation) only
// ever affects this header/sidebar sliver — never the page content in
// <main>, which used to sit inside the same boundary and would flash blank
// on every such navigation.

function DocsHeader({
  title,
  homeHref,
  sidebarOpen,
  setSidebarOpen,
}: {
  title: string
  homeHref: string
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = isDocLocale(searchParams.get('lang')) ? (searchParams.get('lang') as DocLocale) : DEFAULT_LOCALE

  return (
    <div className="flex items-center justify-between flex-1">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden p-1.5 rounded hover:bg-zinc-800 transition-colors"
          onClick={() => setSidebarOpen(v => !v)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link href={homeHref} className="flex items-center gap-2 font-bold text-white text-sm">
          <FileText className="w-4 h-4 text-primary-400" />
          {title}
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <LangSwitcher locale={locale} pathname={pathname} />
      </div>
    </div>
  )
}

function DocsHeaderFallback({ title, homeHref }: { title: string; homeHref: string }) {
  return (
    <div className="flex items-center justify-between flex-1">
      <Link href={homeHref} className="flex items-center gap-2 font-bold text-white text-sm">
        <FileText className="w-4 h-4 text-primary-400" />
        {title}
      </Link>
      <div className="w-[148px] h-7 rounded-lg bg-zinc-800" />
    </div>
  )
}

function DocsSidebar({
  nav,
  basePath,
  sidebarOpen,
  setSidebarOpen,
}: {
  nav: NavSection[]
  basePath: string
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = isDocLocale(searchParams.get('lang')) ? (searchParams.get('lang') as DocLocale) : DEFAULT_LOCALE

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={clsx(
          'fixed md:sticky top-14 z-40 md:z-auto h-[calc(100vh-3.5rem)] w-64 bg-zinc-900 border-r border-zinc-800 overflow-y-auto docs-scrollbar flex-shrink-0 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <nav className="px-4 py-6">
          {nav.map((section, i) => (
            <div
              key={section.section[DEFAULT_LOCALE]}
              className={clsx('mb-6', i > 0 && 'pt-5 mt-1 border-t border-zinc-800/80')}
            >
              <p className="text-xs font-bold text-primary-500 uppercase tracking-[0.1em] mb-3 px-2 select-none pointer-events-none">
                {section.section[locale] ?? section.section[DEFAULT_LOCALE]}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(item => {
                  const href = locale === DEFAULT_LOCALE ? `${basePath}/${item.slug}` : `${basePath}/${item.slug}?lang=${locale}`
                  const active = pathname === `${basePath}/${item.slug}`
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
                        {item.titles[locale] ?? item.titles[DEFAULT_LOCALE]}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

function DocsSidebarFallback() {
  return (
    <aside className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)] w-64 bg-zinc-900 border-r border-zinc-800 flex-shrink-0" />
  )
}

export default function DocsLayoutClient({
  children,
  nav,
  title = 'Public API Docs',
  homeHref = '/documents/overview',
  basePath = '/documents',
}: {
  children: React.ReactNode
  nav: NavSection[]
  title?: string
  homeHref?: string
  basePath?: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 h-14">
        <Suspense fallback={<DocsHeaderFallback title={title} homeHref={homeHref} />}>
          <DocsHeader title={title} homeHref={homeHref} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </Suspense>
      </header>

      <div className="flex flex-1">
        <Suspense fallback={<DocsSidebarFallback />}>
          <DocsSidebar nav={nav} basePath={basePath} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </Suspense>

        {/* Main content — deliberately outside the Suspense boundaries above,
            so it never re-suspends (and flashes blank) on navigation. */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
