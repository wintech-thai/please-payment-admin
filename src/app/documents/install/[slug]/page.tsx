import { notFound } from 'next/navigation'
import { getDoc, isDocLocale, DEFAULT_LOCALE } from '@/lib/docs/markdown'
import DocContent from '@/components/docs/DocContent'

export const dynamic = 'force-dynamic'

export default function InstallDocPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { lang?: string }
}) {
  const locale = isDocLocale(searchParams.lang) ? searchParams.lang : DEFAULT_LOCALE
  const doc = getDoc(params.slug, locale, undefined, undefined, 'install-docs')
  if (!doc) notFound()
  return <DocContent doc={doc} locale={locale} />
}
