'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { merchantApi } from '@/lib/api/merchant.api'
import type { BankAccountItem, BankItem, BankAccountMerchantItem, MerchantItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Globe, Users, Check, Loader2, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

interface MerchantRow {
  merchantId: string
  merchantName: string
  merchantCode?: string | null
  isSelected: boolean
  toggling: boolean
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="w-full px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">
        {value || '—'}
      </div>
    </div>
  )
}

export default function MerchantLinkPage() {
  const { t, lang } = useLang()
  const m = t.bankAccount
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [bankAccount, setBankAccount] = useState<BankAccountItem | null>(null)
  const [bankName, setBankName] = useState('')
  const [merchants, setMerchants] = useState<MerchantRow[]>([])
  const [search, setSearch] = useState('')

  // Build merchant rows by merging GetMerchants with GetMerchantsForBankAccount
  const buildMerchantRows = (allMerchants: MerchantItem[], linkedItems: BankAccountMerchantItem[]): MerchantRow[] => {
    // API returns only the selected merchants (no isSelected field) — presence in list = selected
    const selectedSet = new Set(linkedItems.map(i => i.merchantId))
    return allMerchants.map(mer => ({
      merchantId: mer.id,
      merchantName: mer.name || mer.code || mer.id,
      merchantCode: mer.code,
      isSelected: selectedSet.has(mer.id),
      toggling: false,
    }))
  }

  useEffect(() => {
    Promise.allSettled([
      bankAccountApi.getBankAccountById(id),
      bankAccountApi.getAvailableBanks(),
      merchantApi.getMerchants({ limit: 500 }),
      bankAccountApi.getMerchantsForBankAccount(id),
    ]).then(([accountRes, banksRes, merchantRes, linkRes]) => {
      let account: BankAccountItem | null = null
      if (accountRes.status === 'fulfilled') {
        const raw = accountRes.value.data as any
        account = raw?.bankAccount ?? raw?.BankAccount ?? raw
        setBankAccount(account)
      }

      if (banksRes.status === 'fulfilled') {
        const raw = banksRes.value.data as any
        const banks: BankItem[] = Array.isArray(raw) ? raw : (raw?.banks ?? raw?.Banks ?? [])
        const match = banks.find(b => b.bankCode === account?.bankCode)
        if (match) {
          setBankName(
            lang === 'th'
              ? (match.bankNameTh || match.bankNameEng || match.bankShortName || '')
              : (match.bankNameEng || match.bankNameTh || match.bankShortName || '')
          )
        }
      }

      let allMerchants: MerchantItem[] = []
      if (merchantRes.status === 'fulfilled') {
        const raw = merchantRes.value.data as any
        allMerchants = Array.isArray(raw) ? raw : (raw?.merchants ?? raw?.Merchants ?? [])
      }

      let linkedItems: BankAccountMerchantItem[] = []
      if (linkRes.status === 'fulfilled') {
        const raw = linkRes.value.data as any
        linkedItems = Array.isArray(raw) ? raw : (raw?.merchants ?? raw?.Merchants ?? [])
      }

      setMerchants(buildMerchantRows(allMerchants, linkedItems))
    }).finally(() => setLoading(false))
  }, [id])

  const refreshLinked = async (pinnedId: string, pinnedState: boolean) => {
    try {
      const res = await bankAccountApi.getMerchantsForBankAccount(id)
      const raw = res.data as any
      const items: BankAccountMerchantItem[] = Array.isArray(raw) ? raw : (raw?.merchants ?? raw?.Merchants ?? [])
      // API returns only selected merchants — presence in list = selected
      const selectedSet = new Set(items.map(i => i.merchantId))
      setMerchants(prev => prev.map(mer =>
        // Always keep the intended state for the merchant we just toggled
        mer.merchantId === pinnedId
          ? { ...mer, isSelected: pinnedState }
          : { ...mer, isSelected: selectedSet.has(mer.merchantId) }
      ))
    } catch {
      // silent
    }
  }

  const handleToggle = async (merchantId: string, currentSelected: boolean) => {
    const newState = !currentSelected
    // Optimistic update — flip immediately so UI responds at once
    setMerchants(prev => prev.map(r =>
      r.merchantId === merchantId ? { ...r, isSelected: newState, toggling: true } : r
    ))
    try {
      if (currentSelected) {
        await bankAccountApi.unselectMerchant(id, merchantId)
      } else {
        await bankAccountApi.selectMerchant(id, merchantId)
      }
      // Satisfy requirement: call GetMerchantsForBankAccount, but pin this merchant's state
      refreshLinked(merchantId, newState)
    } catch (err: unknown) {
      // Revert optimistic update on error
      setMerchants(prev => prev.map(r =>
        r.merchantId === merchantId ? { ...r, isSelected: currentSelected, toggling: false } : r
      ))
      toast.error(err instanceof Error ? err.message : m.failedToToggleMerchant)
      return
    }
    setMerchants(prev => prev.map(r => r.merchantId === merchantId ? { ...r, toggling: false } : r))
  }

  const isGlobal = bankAccount?.accountLevel?.toLowerCase() === 'global'
  const selectedCount = merchants.filter(r => r.isSelected).length

  const filtered = search.trim()
    ? merchants.filter(r =>
        r.merchantName.toLowerCase().includes(search.toLowerCase()) ||
        (r.merchantCode?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : merchants

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

  const bankLabel = bankAccount?.bankCode
    ? bankName ? `${bankAccount.bankCode} — ${bankName}` : bankAccount.bankCode
    : '—'

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/business-setup/pay-in-bank-account?highlight=${id}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.merchantLinkTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.merchantLinkSubtitle}</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-5 pb-4">

        {/* Bank Account Info Card (readonly) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            {m.accountInfoSection}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReadonlyField label={m.fieldBank} value={bankLabel} />
            <ReadonlyField label={m.fieldAccountNumber} value={bankAccount?.accountNumber || '—'} />
            <ReadonlyField label={m.fieldAccountName} value={bankAccount?.accountName || '—'} />
            <ReadonlyField label={m.fieldAccountLevel} value={bankAccount?.accountLevel || '—'} />
          </div>
        </div>

        {/* Merchant Section */}
        {isGlobal ? (
          /* Global — no merchant selection */
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">{m.merchantLinkGlobalTitle}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{m.merchantLinkGlobalDesc}</p>
              </div>
            </div>
          </div>
        ) : (
          /* Selected — show merchant checkboxes */
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-700">{m.merchantLinkLinkedSection}</span>
                <span className="text-xs font-bold text-white bg-primary-500 rounded-full px-2 py-0.5 leading-5">
                  {selectedCount}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {merchants.length} {t.admin.all?.toLowerCase() || 'total'}
              </span>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={m.searchPlaceholder}
                  className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                )}
              </div>
            </div>

            {/* Merchant list */}
            <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto custom-scrollbar">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">{m.noAvailableMerchants}</p>
              ) : (
                filtered.map(row => (
                  <label
                    key={row.merchantId}
                    className={clsx(
                      'flex items-center gap-3.5 px-5 py-3.5 cursor-pointer transition-colors select-none',
                      row.toggling
                        ? 'opacity-60 pointer-events-none'
                        : row.isSelected
                          ? 'bg-primary-50 hover:bg-primary-100/60'
                          : 'bg-white hover:bg-gray-50'
                    )}
                  >
                    {/* Checkbox / spinner */}
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      {row.toggling ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={row.isSelected}
                          onChange={() => handleToggle(row.merchantId, row.isSelected)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      )}
                    </div>

                    {/* Name + code */}
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-sm font-semibold truncate',
                        row.isSelected ? 'text-primary-700' : 'text-gray-800'
                      )}>
                        {row.merchantName}
                      </p>
                      {row.merchantCode && (
                        <p className="text-xs text-gray-400 mt-0.5">{row.merchantCode}</p>
                      )}
                    </div>

                    {/* Selected indicator */}
                    {row.isSelected && (
                      <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => router.push(`/business-setup/pay-in-bank-account?highlight=${id}`)}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t.admin.cancel}
        </button>
      </div>
    </div>
  )
}
