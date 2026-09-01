'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { merchantApi } from '@/lib/api/merchant.api'
import { currencyApi } from '@/lib/api/currency.api'
import type { MerchantItem, MerchantCurrencyItem, CurrencyCategory } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Search, MoreHorizontal, Ban, CheckCircle, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import CurrencyLogo from '@/components/CurrencyLogo'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-4">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  const lower = status?.toLowerCase()
  const cfg =
    lower === 'active'
      ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
      : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {status ?? 'Unknown'}
    </span>
  )
}

function formatPercent(val?: number | null) {
  if (val == null) return '—'
  return `${val}%`
}

function formatRange(min?: number | null, max?: number | null) {
  if (min == null && max == null) return '—'
  const fmt = (n: number) => n.toLocaleString()
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`
  if (min != null) return `${fmt(min)} -`
  return `- ${fmt(max!)}`
}

export default function CurrencyListPage() {
  const { t } = useLang()
  const c = t.currency
  const router = useRouter()
  const params = useParams()
  const merchantId = params.id as string

  const [merchant, setMerchant] = useState<MerchantItem | null>(null)
  const [currencies, setCurrencies] = useState<MerchantCurrencyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CurrencyCategory>('CRYPTO')
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const highlightKey = `currency_highlight_${merchantId}`
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem(highlightKey)
    return null
  })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const merchantRes = await merchantApi.getMerchantById(merchantId)
      const raw = (merchantRes.data as any)?.merchant ?? merchantRes.data
      setMerchant(raw)

      const currRes = await currencyApi.getCurrenciesByMerchantId(merchantId)
      const list = currRes.data
      setCurrencies(Array.isArray(list) ? list : [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : c.failedToLoadMerchant)
      router.push(`/business-setup/merchant?highlight=${merchantId}`)
    } finally {
      setLoading(false)
    }
  }, [merchantId])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openMenuId) {
        const ref = menuRefs.current[openMenuId]
        if (ref && !ref.contains(e.target as Node)) setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenuId])

  const filtered = currencies
    .filter(item => (item.currencyCategory ?? '').toUpperCase() === activeTab)
    .filter(item => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (item.currency ?? '').toLowerCase().includes(q) || (item.currencyName ?? '').toLowerCase().includes(q)
    })

  const addLabel = activeTab === 'FIAT' ? c.addFiat : c.addCrypto

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/business-setup/merchant?highlight=${merchantId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{c.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{c.pageSubtitle}</p>
        </div>
      </div>

      {/* Merchant Info */}
      <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4 mb-4">
        <SectionHeader>{c.merchantInfoSection}</SectionHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t.merchant.fieldCode, value: merchant?.code },
            { label: t.merchant.fieldName, value: merchant?.name },
            { label: t.merchant.fieldEmail, value: merchant?.contactEmail },
            { label: t.merchant.fieldPhone, value: merchant?.contactPhone },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
              <input
                readOnly
                value={value ?? ''}
                placeholder="—"
                className="w-full px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Currency table */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-none flex flex-wrap items-center justify-between gap-3 px-7 pt-6 pb-4">
          <div className="flex items-center gap-1">
            {/* Fiat tab hidden for now */}
            <button
              onClick={() => setActiveTab('CRYPTO')}
              className={clsx('px-4 py-1.5 text-sm font-semibold rounded-full transition-colors', activeTab === 'CRYPTO' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 border border-gray-200 hover:bg-gray-50')}
            >
              {c.tabCrypto}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-56 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={c.searchPlaceholder}
                className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
            <Link
              href={`/business-setup/merchant/${merchantId}/currency/new?category=${activeTab}`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              {addLabel}
            </Link>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{c.colCurrency}</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{c.colCurrencyName}</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{c.colPayIn}</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{c.colPayOut}</th>
                  <th className="px-4 py-3 pr-8 text-right text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{c.colBalance}</th>
                  <th className="px-4 py-3 pl-6 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{c.colStatus}</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{c.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-sm text-gray-400">{t.admin.loading}</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <p className="text-sm font-semibold text-gray-500">{c.noCurrenciesFound}</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, idx) => {
                    const highlighted = selectedRowId === item.id
                    return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        const next = selectedRowId === item.id ? null : (item.id ?? null)
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem(highlightKey, next)
                        else sessionStorage.removeItem(highlightKey)
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <Link
                          href={`/business-setup/merchant/${merchantId}/currency/${item.id}`}
                          onClick={e => { e.stopPropagation(); sessionStorage.setItem(highlightKey, item.id ?? '') }}
                          className="inline-flex items-center gap-2 font-semibold text-sm text-gray-800 hover:text-primary-600 hover:underline"
                        >
                          <CurrencyLogo code={item.currency} category={item.currencyCategory} size={22} />
                          {item.currency ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">{item.currencyName ?? '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                        {formatPercent(item.payinFeePct)} · {formatRange(item.payinMinAmount, item.payinMaxAmount)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                        {formatPercent(item.payoutFeePct)} · {formatRange(item.payoutMinAmount, item.payoutMaxAmount)}
                      </td>
                      <td className="px-4 py-3 pr-8 border-b border-gray-100 text-sm text-gray-400 text-right whitespace-nowrap">—</td>
                      <td className="px-4 py-3 pl-6 border-b border-gray-100 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="relative" ref={el => { menuRefs.current[item.id ?? ''] = el }}>
                          <button
                            onClick={e => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const spaceBelow = window.innerHeight - rect.bottom
                              const right = window.innerWidth - rect.right
                              if (spaceBelow < 200) setMenuPos({ bottom: window.innerHeight - rect.top + 4, right })
                              else setMenuPos({ top: rect.bottom + 4, right })
                              setOpenMenuId(prev => prev === item.id ? null : (item.id ?? null))
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === item.id && menuPos && (
                            <div className="fixed w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[9999]"
                              style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}>
                              {item.status?.toLowerCase() === 'active' ? (
                                <button onClick={() => setOpenMenuId(null)} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                  <Ban className="w-4 h-4 flex-shrink-0" />
                                  {c.actionDisable}
                                </button>
                              ) : (
                                <button onClick={() => setOpenMenuId(null)} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors">
                                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                  {c.actionEnable}
                                </button>
                              )}
                              <div className="border-t border-gray-200 my-1" />
                              <button onClick={() => setOpenMenuId(null)} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Wallet className="w-4 h-4 flex-shrink-0" />
                                {c.actionWalletSummary}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}
