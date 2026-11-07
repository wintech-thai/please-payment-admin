'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { purchaseCashApi } from '@/lib/api/purchase-cash.api'
import type { PurchaseCashItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useFormatDate } from '@/hooks/useFormatDate'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

function getTimeFilter(tr: TimeRangeValue): { fromDate: string; toDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { fromDate: new Date(tr.start * 1000).toISOString(), toDate: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  let startMs = now
  if (unit === 'm') startMs = now - num * 60_000
  else if (unit === 'h') startMs = now - num * 3_600_000
  else startMs = now - num * 86_400_000
  return { fromDate: new Date(startMs).toISOString(), toDate: new Date(now).toISOString() }
}

function StatusBadge({ status, m }: { status?: string | null; m: any }) {
  const effective = status || 'Pending'
  const cfg: Record<string, { bg: string; dot: string; label: string }> = {
    Pending: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400', label: m.statusPending },
    Approved: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: m.statusApproved },
    Rejected: { bg: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', label: m.statusRejected },
    Cancelled: { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400', label: m.statusCancelled },
  }
  const c = cfg[effective] ?? cfg.Pending
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', c.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

function fmtNum(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PurchaseCashListContent() {
  const { t } = useLang()
  const m = t.purchaseCashAdmin
  const { fmtDateTime } = useFormatDate()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [items, setItems] = useState<PurchaseCashItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [loading, setLoading] = useState(true)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('purchase_cash_highlight') ?? null
    return null
  })

  const fetchItems = async (p = page, search = searchTerm, status = statusFilter, tr = timeRange) => {
    setLoading(true)
    try {
      const offset = (p - 1) * itemsPerPage + 1
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload = {
        FullTextSearch: search || undefined,
        DocumentStatus: status || undefined,
        FromDate: fromDate,
        ToDate: toDate,
        Offset: offset,
        Limit: itemsPerPage,
      }
      const [listRes, countRes] = await Promise.allSettled([
        purchaseCashApi.getPurchaseCashes(payload),
        purchaseCashApi.getPurchaseCashCount(payload),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        setItems(Array.isArray(data) ? data : [])
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : 0)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [page, itemsPerPage])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`pc-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  const applyFilters = () => { setPage(1); fetchItems(1, searchTerm, statusFilter, timeRange) }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    fetchItems(1, searchTerm, statusFilter, tr)
  }

  const handleOpenDetail = (id?: string | null) => {
    if (!id) return
    setSelectedRowId(id)
    sessionStorage.setItem('purchase_cash_highlight', id)
    router.push(`/business-setup/purchase-cash/${id}`)
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = [m.colDocNo, m.colCreatedDate, m.colMerchant, m.colSubType, m.colAmount, m.colStatus]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
      </div>

      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="search"
            name="purchase-cash-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            placeholder={m.searchPlaceholder}
            autoComplete="off"
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setPage(1); fetchItems(1, '', statusFilter, timeRange) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchItems(1, searchTerm, e.target.value, timeRange) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">{m.filterAllStatus}</option>
          <option value="Pending">{m.statusPending}</option>
          <option value="Approved">{m.statusApproved}</option>
          <option value="Rejected">{m.statusRejected}</option>
          <option value="Cancelled">{m.statusCancelled}</option>
        </select>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
        <button onClick={applyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          {t.admin.search}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th key={i} className={clsx('px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap', i === 0 && 'rounded-tl-xl', i === cols.length - 1 && 'rounded-tr-xl')}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-gray-400">{t.admin.loading}</span>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-gray-500">{m.noDataFound}</p>
                </td></tr>
              ) : (
                items.map((item, idx) => {
                  const highlighted = !!item.id && selectedRowId === item.id
                  return (
                    <tr
                      id={`pc-row-${item.id}`}
                      key={item.id}
                      onClick={() => item.id && setSelectedRowId(item.id)}
                      className={clsx('cursor-pointer transition-colors', highlighted ? 'bg-primary-100' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')}
                    >
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer" onClick={e => { e.stopPropagation(); handleOpenDetail(item.id) }}>
                        <span className={clsx('text-sm font-semibold hover:text-primary-600 hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800')}>{item.documentNo ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">{item.createdDate ? fmtDateTime(item.createdDate, false) : '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm font-semibold text-gray-700">{item.orgId ?? '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-600">{item.documentSubType ?? '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-700 tabular-nums">{fmtNum(item.grandTotal ?? item.totalPrice)}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap"><StatusBadge status={item.status} m={m} /></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{m.rowsPerPage}</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }} className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {m.of} {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PurchaseCashPage() {
  return (
    <Suspense>
      <PurchaseCashListContent />
    </Suspense>
  )
}
