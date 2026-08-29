import type { Metadata } from 'next'
import { getNav } from '@/lib/docs/markdown'
import DocsLayoutClient from './DocsLayoutClient'

export const metadata: Metadata = {
  title: 'API Documentation',
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const nav = getNav()
  return <DocsLayoutClient nav={nav}>{children}</DocsLayoutClient>
}
