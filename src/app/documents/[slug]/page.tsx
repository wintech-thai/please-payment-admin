import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getDoc, isDocLocale, DEFAULT_LOCALE } from '@/lib/docs/markdown'
import DocContent from './DocContent'

export const dynamic = 'force-dynamic'

export default function DocPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { lang?: string }
}) {
  const locale = isDocLocale(searchParams.lang) ? searchParams.lang : DEFAULT_LOCALE
  const headersList = headers()
  const rawHost = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const isLocalhost = rawHost.startsWith('localhost') || rawHost.startsWith('127.')

  // map internal cluster TLD (.local) → external public TLD (.com)
  const host = rawHost.replace(/\.local$/, '.com')

  // admin-prod.x → api.x (strip -prod), admin-dev.x → api-dev.x, admin.x → api.x
  const apiUrl = isLocalhost ? undefined : `https://${host
    .replace(/^admin-prod\./, 'api.')
    .replace(/^admin/, 'api')}`

  // admin-prod.x → merchant.x (strip -prod), admin-dev.x → merchant-dev.x, admin.x → merchant.x
  const merchantUrl = isLocalhost ? undefined : `https://${host
    .replace(/^admin-prod\./, 'merchant.')
    .replace(/^admin/, 'merchant')}`

  const doc = getDoc(params.slug, locale, apiUrl, merchantUrl)
  if (!doc) notFound()
  return <DocContent doc={doc} locale={locale} />
}
