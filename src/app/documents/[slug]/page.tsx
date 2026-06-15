import { notFound } from 'next/navigation'
import { getDoc, getAllSlugs } from '@/lib/docs/markdown'
import DocContent from './DocContent'

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = getDoc(params.slug)
  if (!doc) notFound()
  return <DocContent doc={doc} />
}
