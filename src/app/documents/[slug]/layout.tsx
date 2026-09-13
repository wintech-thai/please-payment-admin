import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getNav } from '@/lib/docs/markdown'
import DocsLayoutClient from '@/components/docs/DocsLayoutClient'

export const metadata: Metadata = {
  title: 'API Documentation',
}

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  const nav = getNav('documents')
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <DocsLayoutClient nav={nav} title="Public API Docs" homeHref="/documents/overview" basePath="/documents">
        {children}
      </DocsLayoutClient>
    </Suspense>
  )
}
