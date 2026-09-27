import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDoc, isDocLocale, DEFAULT_LOCALE } from '@/lib/docs/markdown'
import VideoDocContent from '@/components/docs/VideoDocContent'

export const dynamic = 'force-dynamic'

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { lang?: string }
}): Metadata {
  const locale = isDocLocale(searchParams.lang) ? searchParams.lang : DEFAULT_LOCALE
  const doc = getDoc(params.slug, locale, undefined, undefined, 'video-tutorials')
  if (!doc) return {}
  return {
    title: `${doc.meta.title} | วิดีโอสอนการใช้งาน`,
    description: doc.meta.summary,
    keywords: doc.meta.keywords,
  }
}

export default function VideoTutorialPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { lang?: string }
}) {
  const locale = isDocLocale(searchParams.lang) ? searchParams.lang : DEFAULT_LOCALE
  const doc = getDoc(params.slug, locale, undefined, undefined, 'video-tutorials')
  if (!doc) notFound()
  return <VideoDocContent doc={doc} locale={locale} />
}
