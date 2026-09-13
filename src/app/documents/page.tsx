import Link from 'next/link'
import clsx from 'clsx'
import { FileText, Wrench } from 'lucide-react'
import { DOC_LOCALES, DEFAULT_LOCALE, isDocLocale, type DocLocale } from '@/lib/docs/locale'

const LOCALE_LABELS: Record<DocLocale, string> = {
  th: 'ไทย',
  en: 'English',
  zh: '中文',
}

const CONTENT: Record<
  DocLocale,
  { heading: string; sub: string; api: string; apiDesc: string; install: string; installDesc: string }
> = {
  th: {
    heading: 'เอกสาร Please Payment',
    sub: 'เลือกเอกสารที่ต้องการดู',
    api: 'Public API Docs',
    apiDesc: 'เอกสารสำหรับนักพัฒนาที่เชื่อมต่อ API',
    install: 'คู่มือการติดตั้ง',
    installDesc: 'วิธีติดตั้ง Please Payment บนเครื่อง server ของคุณเอง',
  },
  en: {
    heading: 'Please Payment Documentation',
    sub: 'Choose the documentation you need',
    api: 'Public API Docs',
    apiDesc: 'Documentation for developers integrating the API',
    install: 'Installation Guide',
    installDesc: 'How to install Please Payment on your own server',
  },
  zh: {
    heading: 'Please Payment 文档',
    sub: '请选择需要查看的文档',
    api: 'Public API Docs',
    apiDesc: '面向对接 API 的开发者文档',
    install: '安装指南',
    installDesc: '如何在您自己的服务器上安装 Please Payment',
  },
}

export default function DocsIndexPage({ searchParams }: { searchParams: { lang?: string } }) {
  const locale = isDocLocale(searchParams.lang) ? searchParams.lang : DEFAULT_LOCALE
  const t = CONTENT[locale]
  const withLocale = (path: string) => (locale === DEFAULT_LOCALE ? path : `${path}?lang=${locale}`)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="flex justify-end p-4">
        <div className="flex items-center gap-1 rounded-lg bg-zinc-800 p-0.5">
          {DOC_LOCALES.map(code => (
            <Link
              key={code}
              href={code === DEFAULT_LOCALE ? '/documents' : `/documents?lang=${code}`}
              className={clsx(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                locale === code ? 'bg-primary-600 text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              {LOCALE_LABELS[code]}
            </Link>
          ))}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">{t.heading}</h1>
          <p className="text-zinc-500 text-sm mb-10 text-center">{t.sub}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href={withLocale('/documents/overview')}
              className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-primary-500 hover:bg-zinc-800/60 transition-colors"
            >
              <FileText className="w-6 h-6 text-primary-400 mb-3" />
              <h2 className="text-white font-semibold mb-1">{t.api}</h2>
              <p className="text-sm text-zinc-500">{t.apiDesc}</p>
            </Link>
            <Link
              href={withLocale('/documents/install/overview')}
              className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-primary-500 hover:bg-zinc-800/60 transition-colors"
            >
              <Wrench className="w-6 h-6 text-primary-400 mb-3" />
              <h2 className="text-white font-semibold mb-1">{t.install}</h2>
              <p className="text-sm text-zinc-500">{t.installDesc}</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
