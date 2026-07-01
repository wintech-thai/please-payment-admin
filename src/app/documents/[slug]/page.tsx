import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getDoc } from '@/lib/docs/markdown'
import DocContent from './DocContent'

// force server-side render to derive API URL from request hostname
export const dynamic = 'force-dynamic'

export default function DocPage({ params }: { params: { slug: string } }) {
  const host = headers().get('x-forwarded-host') || headers().get('host') || ''
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.')
  // admin-dev.example.com → api-dev.example.com, admin.example.com → api.example.com
  const apiUrl = isLocalhost ? undefined : `https://${host.replace(/^admin/, 'api')}`

  const doc = getDoc(params.slug, apiUrl)
  if (!doc) notFound()
  return <DocContent doc={doc} />
}
