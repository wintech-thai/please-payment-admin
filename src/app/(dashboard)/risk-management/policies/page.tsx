'use client'

import { useLang } from '@/context/LanguageContext'
import { ShieldCheck } from 'lucide-react'

export default function PoliciesPage() {
  const { t } = useLang()

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8 text-primary-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{t.nav.policies}</h1>
      <p className="text-sm text-gray-400">{t.nav.comingSoon}</p>
    </div>
  )
}
