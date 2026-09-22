'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ShieldAlert, TerminalSquare } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'

// xterm.js needs the DOM — never render on the server.
const ShellTerminalView = dynamic(() => import('@/components/ShellTerminalView'), { ssr: false })

export default function ShellTerminalPage() {
  const { t } = useLang()
  const st = t.shellTerminal
  // Explicit confirm gate — connecting to the pod exec must never happen just
  // from opening this menu item, only after the user presses this button.
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-6 bg-gray-100">
      <div className="flex-none mb-4">
        <h1 className="text-lg font-bold text-gray-900">{st.title}</h1>
        <p className="text-sm text-gray-500">{st.subtitle}</p>
      </div>

      {!confirmed ? (
        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-12 h-12 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{st.confirmTitle}</h2>
          <p className="text-base text-gray-500 mb-8 max-w-md">{st.confirmDescription}</p>
          <button
            onClick={() => setConfirmed(true)}
            className="inline-flex items-center gap-2.5 bg-primary-600 hover:bg-primary-700 text-white text-base font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <TerminalSquare className="w-5 h-5" />
            {st.confirmButton}
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ShellTerminalView />
        </div>
      )}
    </div>
  )
}
