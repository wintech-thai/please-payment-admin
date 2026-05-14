'use client'

import { useLang } from '@/context/LanguageContext'

export default function PayInBankAccountPage() {
  const { t } = useLang()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.overview.comingSoon}</h1>
      <p className="text-gray-500 text-base max-w-sm">{t.overview.comingSoonDesc}</p>
      <div className="flex gap-2 mt-8">
        <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
