import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getNav } from '@/lib/docs/markdown'
import DocsLayoutClient from './DocsLayoutClient'

export const metadata: Metadata = {
  title: 'API Documentation',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const nav = getNav()
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <DocsLayoutClient nav={nav}>{children}</DocsLayoutClient>
    </Suspense>
  )
}
