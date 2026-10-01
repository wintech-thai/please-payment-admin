import type { Metadata } from 'next'
import { getNav } from '@/lib/docs/markdown'
import DocsLayoutClient from '@/components/docs/DocsLayoutClient'

export const metadata: Metadata = {
  title: 'คู่มือการติดตั้งโปรแกรม',
}

export default function InstallDocsLayout({ children }: { children: React.ReactNode }) {
  const nav = getNav('install-docs')
  return (
    <DocsLayoutClient
      nav={nav}
      title="คู่มือการติดตั้ง"
      homeHref="/documents/install/overview"
      basePath="/documents/install"
    >
      {children}
    </DocsLayoutClient>
  )
}
