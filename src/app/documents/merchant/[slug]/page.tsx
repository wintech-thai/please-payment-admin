import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDoc, isDocLocale, DEFAULT_LOCALE } from '@/lib/docs/markdown'
import DocContent from '@/components/docs/DocContent'

export const dynamic = 'force-dynamic'

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { lang?: string }
}): Metadata {
  const locale = isDocLocale(searchParams.lang) ? searchParams.lang : DEFAULT_LOCALE
  const doc = getDoc(params.slug, locale, undefined, undefined, 'merchant-docs')
  if (!doc) return {}
  return {
    title: `${doc.meta.title} | คู่มือการใช้งาน Merchant`,
    description: doc.meta.summary,
    keywords: doc.meta.keywords,
  }
}

export default function MerchantDocPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { lang?: string }
}) {
  const locale = isDocLocale(searchParams.lang) ? searchParams.lang : DEFAULT_LOCALE
  const doc = getDoc(params.slug, locale, undefined, undefined, 'merchant-docs')
  if (!doc) notFound()
  return <DocContent doc={doc} locale={locale} />
}
