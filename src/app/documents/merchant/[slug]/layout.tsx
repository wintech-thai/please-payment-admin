import type { Metadata } from 'next'
import { getNav } from '@/lib/docs/markdown'
import DocsLayoutClient from '@/components/docs/DocsLayoutClient'

export const metadata: Metadata = {
  title: 'คู่มือการใช้งาน Merchant',
}

export default function MerchantDocsLayout({ children }: { children: React.ReactNode }) {
  const nav = getNav('merchant-docs')
  return (
    <DocsLayoutClient
      nav={nav}
      title="คู่มือการใช้งาน Merchant"
      homeHref="/documents/merchant/overview"
      basePath="/documents/merchant"
    >
      {children}
    </DocsLayoutClient>
  )
}
