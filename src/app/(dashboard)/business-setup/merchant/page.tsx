'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { merchantApi } from '@/lib/api/merchant.api'
import type { MerchantItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Search, Plus, MoreHorizontal, Ban, CheckCircle, Key, Wallet, QrCode, Building2, ChevronLeft, ChevronRight, Webhook, Coins } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import QrPaymentModal from '@/components/QrPaymentModal'
import QrPaymentP2PModal from '@/components/QrPaymentP2PModal'
import { isCurrencyFeatureEnabled } from '@/lib/feature-flags'

function StatusBadge({ status }: { status?: string | null }) {
  const lower = status?.toLowerCase()
  const cfg =
    lower === 'active'
      ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
      : lower === 'pending'
        ? { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' }
        : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {status ?? 'Unknown'}
    </span>
  )
}

function ConfirmDialog({ title, desc, confirmLabel, onConfirm, onCancel }: {
  title: string; desc: string; confirmLabel: string
  onConfirm: () => void; onCancel: () => void
}) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}>
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase"
          >
            {t.admin.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors uppercase"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatPercent(val?: number | string | null) {
  if (val == null || val === '') return '—'
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? String(val) : `${n}%`
}

function formatRange(min?: number | null, max?: number | null) {
  if (min == null && max == null) return '—'
  const fmt = (n: number) => n.toLocaleString()
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`
  if (min != null) return `${fmt(min)} -`
  return `- ${fmt(max!)}`
}

function MerchantContent() {
  const { t } = useLang()
  const m = t.merchant
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [merchants, setMerchants] = useState<MerchantItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('merchant_highlight') ?? null
    return null
  })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'enable' | 'disable'; merchant: MerchantItem } | null>(null)
  const [qrMerchant, setQrMerchant] = useState<MerchantItem | null>(null)
  const [qrP2PMerchant, setQrP2PMerchant] = useState<MerchantItem | null>(null)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [currencyEnabled, setCurrencyEnabled] = useState(false)

  useEffect(() => { setCurrencyEnabled(isCurrencyFeatureEnabled()) }, [])

  useEffect(() => {
    if (highlightIdParam) {
      setSelectedRowId(highlightIdParam)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('highlight')
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    }
  }, [highlightIdParam, pathname, searchParams])

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

  const fetchMerchants = async (currentPage: number, status = '', search = '') => {
    setLoading(true)
    try {
      const payload = {
        page: currentPage,
        limit: itemsPerPage,
        Status: status || undefined,
        FullTextSearch: search.trim() || undefined,
      }
      const [listRes, countRes] = await Promise.all([
        merchantApi.getMerchants(payload),
        merchantApi.getMerchantCount(payload),
      ])
      const raw = listRes.data
      setMerchants(Array.isArray(raw) ? raw : ((raw as any)?.merchants ?? []))
      const rawCount = countRes.data
      setTotal(typeof rawCount === 'number' ? rawCount : ((rawCount as any)?.count ?? 0))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMerchants(page, statusFilter, appliedSearch) }, [page, itemsPerPage, statusFilter, appliedSearch])

  const handleSearch = () => {
    setAppliedSearch(searchTerm)
    setPage(1)
  }

  const displayMerchants = merchants

  const handleEnable = async (merchant: MerchantItem) => {
    try {
      await merchantApi.enableMerchantById(merchant.id)
      toast.success(m.enabledSuccess)
      fetchMerchants(page, statusFilter, appliedSearch)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToEnable)
    }
  }

  const handleDisable = async (merchant: MerchantItem) => {
    try {
      await merchantApi.disableMerchantById(merchant.id)
      toast.success(m.disabledSuccess)
      fetchMerchants(page, statusFilter, appliedSearch)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToDisable)
    }
  }

  const isActive = (merchant: MerchantItem) => merchant.status?.toLowerCase() === 'active'

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  const cols = [
    m.colCode, m.colName, m.colEmail,
    `${m.colPayInCount} / ${m.colPayOutCount}`,
    m.colStatus,
    m.colPayInPercent, m.colPayOutPercent,
    m.colPayInRange, m.colPayOutRange,
    m.colBalance, m.colAction,
  ]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {qrMerchant && (
        <QrPaymentModal
          merchantId={qrMerchant.id}
          merchantName={qrMerchant.name ?? qrMerchant.code ?? undefined}
          orgId={qrMerchant.orgId}
          onClose={() => setQrMerchant(null)}
        />
      )}
      {qrP2PMerchant && (
        <QrPaymentP2PModal
          merchantId={qrP2PMerchant.id}
          merchantName={qrP2PMerchant.name ?? qrP2PMerchant.code ?? undefined}
          orgId={qrP2PMerchant.orgId}
          onClose={() => setQrP2PMerchant(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.type === 'enable' ? m.enableConfirmTitle : m.disableConfirmTitle}
          desc={confirmDialog.type === 'enable' ? m.enableConfirmDesc : m.disableConfirmDesc}
          confirmLabel={t.admin.yes}
          onConfirm={() => {
            const merch = confirmDialog.merchant
            confirmDialog.type === 'enable' ? handleEnable(merch) : handleDisable(merch)
            setConfirmDialog(null)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <Link
          href="/business-setup/merchant/create"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {m.addMerchant}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={m.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setAppliedSearch('') }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{m.filterAll}</option>
          <option value="Active">{m.filterActive}</option>
          <option value="Pending">{m.filterPending}</option>
          <option value="Disabled">{m.filterDisabled}</option>
        </select>

        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        {!loading && (
          <div className="flex-none px-4 pt-3 pb-1">
            <span className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{total}</span> {m.foundCount}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === cols.length - 2 ? 'text-right' : 'text-left',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl'
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-400">{t.admin.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{m.noMerchantsFound}</p>
                    <p className="text-xs text-gray-400 mt-1">{m.noMerchantsSubtitle}</p>
                  </td>
                </tr>
              ) : (
                displayMerchants.map((merchant, idx) => {
                  const highlighted = selectedRowId === merchant.id
                  return (
                    <tr
                      key={merchant.id}
                      onClick={() => {
                        const next = selectedRowId === merchant.id ? null : merchant.id
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem('merchant_highlight', next)
                        else sessionStorage.removeItem('merchant_highlight')
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
                          href={`/business-setup/merchant/${merchant.id}/update`}
                          onClick={e => e.stopPropagation()}
                          className={clsx('font-semibold text-sm hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {merchant.code ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{merchant.name ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                        {merchant.contactEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); sessionStorage.setItem('merchant_highlight', merchant.id); router.push(`/business-setup/merchant/${merchant.id}/bank-accounts`) }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <span className="text-[9px] text-blue-400">IN</span>
                            {merchant.payInBankAccountCount ?? 0}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); sessionStorage.setItem('merchant_highlight', merchant.id); router.push(`/business-setup/merchant/${merchant.id}/bank-accounts`) }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                          >
                            <span className="text-[9px] text-purple-400">OUT</span>
                            {merchant.payOutBankAccountCount ?? 0}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <StatusBadge status={merchant.status} />
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700 text-center whitespace-nowrap">
                        {formatPercent(merchant.payinFeePct)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700 text-center whitespace-nowrap">
                        {formatPercent(merchant.payoutFeePct)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 text-center whitespace-nowrap">
                        {formatRange(merchant.payinMinAmount, merchant.payinMaxAmount)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 text-center whitespace-nowrap">
                        {formatRange(merchant.payoutMinAmount, merchant.payoutMaxAmount)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm whitespace-nowrap text-right">
                        {merchant.currentBalance != null ? (
                          <Link
                            href={`/business-setup/merchant/${merchant.id}/wallet`}
                            onClick={e => e.stopPropagation()}
                            className="tabular-nums text-gray-700 hover:underline hover:text-primary-600"
                          >
                            {merchant.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions — 3-dot menu */}
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="relative" ref={el => { menuRefs.current[merchant.id] = el }}>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const spaceBelow = window.innerHeight - rect.bottom
                              const right = window.innerWidth - rect.right
                              if (spaceBelow < 300) {
                                setMenuPos({ bottom: window.innerHeight - rect.top + 4, right })
                              } else {
                                setMenuPos({ top: rect.bottom + 4, right })
                              }
                              setOpenMenuId(prev => prev === merchant.id ? null : merchant.id)
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === merchant.id && menuPos && (
                            <div className="fixed w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[9999]"
                              style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}>
                              {/* Enable / Disable */}
                              {isActive(merchant) ? (
                                <button
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(null); setConfirmDialog({ type: 'disable', merchant }) }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Ban className="w-4 h-4 flex-shrink-0" />
                                  {m.disableMerchant}
                                </button>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(null); setConfirmDialog({ type: 'enable', merchant }) }}
                                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                  {m.enableMerchant}
                                </button>
                              )}

                              <div className="border-t border-gray-200 my-1" />

                              {currencyEnabled && (
                                <>
                                  <button
                                    onClick={e => { e.stopPropagation(); setOpenMenuId(null); sessionStorage.setItem('merchant_highlight', merchant.id); router.push(`/business-setup/merchant/${merchant.id}/currency`) }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <Coins className="w-4 h-4 flex-shrink-0" />
                                    {t.currency.menuLabel}
                                  </button>
                                  <div className="border-t border-gray-200 my-1" />
                                </>
                              )}

                              {/* API Keys & Users */}
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); sessionStorage.setItem('merchant_highlight', merchant.id); router.push(`/business-setup/merchant/${merchant.id}/keys-users`) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Key className="w-4 h-4 flex-shrink-0" />
                                {m.apiKeysAndUsers}
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); sessionStorage.setItem('merchant_highlight', merchant.id); router.push(`/business-setup/merchant/${merchant.id}/webhook`) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Webhook className="w-4 h-4 flex-shrink-0" />
                                {t.nav.webhook}
                              </button>
                              <div className="border-t border-gray-200 my-1" />
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); sessionStorage.setItem('merchant_highlight', merchant.id); router.push(`/business-setup/merchant/${merchant.id}/wallet`) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Wallet className="w-4 h-4 flex-shrink-0" />
                                {m.walletSummary}
                              </button>
                              <div className="border-t border-gray-200 my-1" />
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); sessionStorage.setItem('merchant_highlight', merchant.id); router.push(`/business-setup/merchant/${merchant.id}/bank-accounts`) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Building2 className="w-4 h-4 flex-shrink-0" />
                                {m.bankAccounts}
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); setQrMerchant(merchant) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <QrCode className="w-4 h-4 flex-shrink-0" />
                                {m.qrPayment}
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setOpenMenuId(null); setQrP2PMerchant(merchant) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <QrCode className="w-4 h-4 flex-shrink-0" />
                                {m.qrPaymentP2P}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t.admin.rowsPerPage}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || total === 0 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MerchantPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <MerchantContent />
    </Suspense>
  )
}
