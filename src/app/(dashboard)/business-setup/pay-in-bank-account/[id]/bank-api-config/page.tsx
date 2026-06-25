'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="w-full px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">{value || '—'}</div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors font-mono'

export default function BankApiConfigPage() {
  const { t } = useLang()
  const m = t.bankAccount
  const router = useRouter()
  const params = useParams()
  const bankAccountId = params.id as string

  const [account, setAccount] = useState<BankAccountItem | null>(null)
  const [isSandbox, setIsSandbox] = useState(false)
  const [billerId, setBillerId] = useState('')
  const [ref3Prefix, setRef3Prefix] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await bankAccountApi.getBankAccountById(bankAccountId)
        const data = res.data as any
        const acct: BankAccountItem = data?.bankAccount ?? data
        setAccount(acct)
        const cfg = acct?.bankConfigObj
        setIsSandbox(cfg?.isSandbox ?? false)
        setBillerId(cfg?.billerId ?? '')
        setRef3Prefix(cfg?.ref3Prefix ?? '')
        setApiKey(cfg?.apiKey ?? '')
        setApiSecret(cfg?.apiSecret ?? '')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.failedToLoadConfig)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [bankAccountId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await bankAccountApi.updateBankAccountConfigById(bankAccountId, {
        IsSandbox: isSandbox,
        BillerId: billerId.trim() || undefined,
        Ref3Prefix: ref3Prefix.trim() || undefined,
        ApiKey: apiKey.trim() || undefined,
        ApiSecret: apiSecret.trim() || undefined,
      })
      toast.success(m.savedConfigSuccess)
      router.push(`/business-setup/pay-in-bank-account?highlight=${bankAccountId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToSaveConfig)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/business-setup/pay-in-bank-account?highlight=${bankAccountId}`)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.bankConfigTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.bankConfigSubtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Bank Account Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.title}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadonlyField label={m.colBank} value={account?.bankCode ?? '—'} />
            <ReadonlyField label={m.colAccountNumber} value={account?.accountNumber ?? '—'} />
            <ReadonlyField label={m.colAccountName} value={account?.accountName ?? '—'} />
            <ReadonlyField label={m.colAccountType} value={account?.accountType ?? '—'} />
          </div>
        </div>

        {/* Bank API Config */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.bankConfigTitle}</SectionHeader>

          <div className="mb-5">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSandbox}
                onChange={e => setIsSandbox(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-gray-700">{m.fieldIsSandbox}</span>
                <p className="text-xs text-gray-400 mt-0.5">{m.fieldIsSandboxHint}</p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={m.fieldBillerId}>
              <input value={billerId} onChange={e => setBillerId(e.target.value)} placeholder={m.fieldBillerIdPlaceholder} className={inputCls} />
            </FormField>
            <FormField label={m.fieldRef3Prefix}>
              <input value={ref3Prefix} onChange={e => setRef3Prefix(e.target.value)} placeholder={m.fieldRef3PrefixPlaceholder} className={inputCls} />
            </FormField>
            <FormField label={m.fieldApiKey}>
              <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={m.fieldApiKeyPlaceholder} className={inputCls} />
            </FormField>
            <FormField label={m.fieldApiSecret}>
              <input value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder={m.fieldApiSecretPlaceholder} className={inputCls} />
            </FormField>
          </div>
        </div>

      </div>

      {/* Sticky footer */}
      <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => router.push(`/business-setup/pay-in-bank-account?highlight=${bankAccountId}`)}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t.admin.cancel}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={clsx('flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors')}
        >
          {saving && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saving ? t.admin.saving : t.admin.saveChanges}
        </button>
      </div>
    </div>
  )
}
