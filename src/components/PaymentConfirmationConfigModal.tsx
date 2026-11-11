'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { adminConfigApi } from '@/lib/api/admin-config.api'
import { useLang } from '@/context/LanguageContext'

const API_KEY_HEADER_NAME = 'PP-API-KEY'

function deriveEndpointUrl(): string {
  if (typeof window === 'undefined') return ''
  const apiHost = window.location.hostname.replace('admin', 'api')
  return `https://${apiHost}/admin-api/PaymentConfirmation/org/global/action/PleasePaymentConfirmation`
}

export default function PaymentConfirmationConfigModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const pc = t.paymentConfirmationConfig

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maskedKey, setMaskedKey] = useState('')
  const [hasExistingKey, setHasExistingKey] = useState(false)
  const [changingKey, setChangingKey] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const endpointUrl = deriveEndpointUrl()

  useEffect(() => {
    adminConfigApi.getPaymentConfirmationConfig()
      .then(res => {
        const raw = res.data as any
        if (raw?.status === 'NOT_FOUND') {
          setMaskedKey('')
          setHasExistingKey(false)
          setChangingKey(true)
          return
        }
        const cfg = raw?.configuration?.paymentConfirmationConfig ?? {}
        setMaskedKey(cfg.apiKey ?? '')
        setHasExistingKey(!!cfg.apiKey)
      })
      .catch(() => toast.error(pc.toastLoadFailed))
      .finally(() => setLoading(false))
  }, [pc.toastLoadFailed])

  const handleCopy = () => {
    navigator.clipboard.writeText(endpointUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave() {
    if (!hasExistingKey && !newKey.trim()) {
      setError(pc.apiKeyRequiredOnFirstSetup)
      return
    }
    setSaving(true)
    try {
      await adminConfigApi.setPaymentConfirmationConfig({
        ...(changingKey && newKey ? { apiKey: newKey.trim() } : {}),
      })
      toast.success(pc.toastSaved)
      setChangingKey(false)
      setNewKey('')
      onClose()
    } catch (err: any) {
      toast.error(err?.message || pc.toastSaveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">{pc.modalTitle}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{pc.modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                {pc.fieldEndpointUrl}
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={endpointUrl}
                  readOnly
                  className="flex-1 px-3 py-2.5 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  {copied ? pc.copied : pc.btnCopy}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                {pc.fieldHeaderName}
              </label>
              <input
                value={API_KEY_HEADER_NAME}
                readOnly
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-[11px] text-gray-400 mt-1">{pc.headerNameHint}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                {pc.fieldApiKey}
              </label>
              {changingKey ? (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newKey}
                    onChange={e => { setNewKey(e.target.value); setError('') }}
                    placeholder={pc.fieldApiKeyPlaceholder}
                    autoFocus
                    className={clsx(
                      'flex-1 px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
                      error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                    )}
                  />
                  {hasExistingKey && (
                    <button
                      type="button"
                      onClick={() => { setChangingKey(false); setNewKey(''); setError('') }}
                      className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      {pc.btnCancelChangeKey}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={maskedKey}
                    readOnly
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setChangingKey(true)}
                    className="px-3 py-2 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap"
                  >
                    {pc.btnChangeKey}
                  </button>
                </div>
              )}
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {pc.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {saving ? pc.btnSaving : pc.btnSave}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
