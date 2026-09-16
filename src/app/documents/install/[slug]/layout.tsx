import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getNav } from '@/lib/docs/markdown'
import DocsLayoutClient from '@/components/docs/DocsLayoutClient'

export const metadata: Metadata = {
  title: 'คู่มือการติดตั้ง Please Payment',
}

export default function InstallDocsLayout({ children }: { children: React.ReactNode }) {
  const nav = getNav('install-docs')
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <DocsLayoutClient
        nav={nav}
        title="คู่มือการติดตั้ง"
        homeHref="/documents/install/overview"
        basePath="/documents/install"
      >
        {children}
      </DocsLayoutClient>
    </Suspense>
  )
}
