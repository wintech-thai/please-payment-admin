import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getDoc } from '@/lib/docs/markdown'
import DocContent from './DocContent'

export const dynamic = 'force-dynamic'

export default function DocPage({ params }: { params: { slug: string } }) {
  const headersList = headers()
  const rawHost = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const isLocalhost = rawHost.startsWith('localhost') || rawHost.startsWith('127.')

  // map internal cluster TLD (.local) → external public TLD (.com)
  const host = rawHost.replace(/\.local$/, '.com')

  // admin-prod.x → api.x (strip -prod), admin-dev.x → api-dev.x, admin.x → api.x
  const apiUrl = isLocalhost ? undefined : `https://${host
    .replace(/^admin-prod\./, 'api.')
    .replace(/^admin/, 'api')}`

  const doc = getDoc(params.slug, apiUrl)
  if (!doc) notFound()
  return <DocContent doc={doc} />
}
