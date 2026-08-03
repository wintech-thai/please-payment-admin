'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { paymentDocumentApi } from '@/lib/api/payment-document.api'
import type { PayInSlipItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Upload, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

function getTimeFilter(tr: TimeRangeValue): { FromDate: string; ToDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { FromDate: new Date(tr.start * 1000).toISOString(), ToDate: new Date(tr.end * 1000).toISOString() }
  }
  const now = Date.now()
  const val = tr.type === 'relative' ? tr.value ?? '24h' : '24h'
  const num = parseInt(val)
  const unit = val.replace(/[0-9]/g, '')
  let startMs = now - 24 * 3_600_000
  if (unit === 'h') startMs = now - num * 3_600_000
  else startMs = now - num * 86_400_000
  return { FromDate: new Date(startMs).toISOString(), ToDate: new Date(now).toISOString() }
}

const HIGHLIGHTED_KEY = 'payInSlip_highlightedId'
const FILTER_KEY = 'payInSlip_filter'

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'approved') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
      {status}
    </span>
  )
  if (s === 'rejected') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
      {status ?? 'Pending'}
    </span>
  )
}

export default function PayInSlipListPage() {
  const router = useRouter()
  const { t } = useLang()
  const m = t.payInSlip

  const [items, setItems] = useState<PayInSlipItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.statusFilter ?? '') : ''
  )
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.timeRange ?? { type: 'relative', value: '24h' }) : { type: 'relative', value: '24h' }
  )
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [highlightedId, setHighlightedId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? ''
    }
    return ''
  })

  const fetchData = useCallback(async (tr: TimeRangeValue, s: string, status: string) => {
    if (typeof window !== 'undefined') sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search: s, statusFilter: status, timeRange: tr }))
    setLoading(true)
    try {
      const { FromDate, ToDate } = getTimeFilter(tr)
      const payload = { FullTextSearch: s || undefined, Status: status || undefined, FromDate, ToDate }
      const [listRes, countRes] = await Promise.all([
        paymentDocumentApi.getPayInDocuments(payload),
        paymentDocumentApi.getPayInDocumentCount(payload),
      ])
      const listData = listRes.data as any
      const countData = countRes.data as any
      const list: PayInSlipItem[] = Array.isArray(listData)
        ? listData
        : (listData?.paymentDocuments ?? listData?.PaymentDocuments ?? [])
      const count: number = typeof countData === 'number'
        ? countData
        : (countData?.count ?? countData?.Count ?? list.length)
      setItems(list)
      setTotal(count)
      setPage(1)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoad)
    } finally {
      setLoading(false)
    }
  }, [m.failedToLoad])

  useEffect(() => { fetchData(timeRange, search, statusFilter) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => fetchData(timeRange, search, statusFilter)

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    fetchData(tr, search, statusFilter)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  const handleNavigate = (id: string) => {
    handleRowHighlight(id)
    router.push(`/business-setup/payment/pay-in-slip/${id}`)
  }

  const displayTotal = search.trim() ? items.length : total
  const totalPages = Math.max(1, Math.ceil(
    (search.trim() ? items.length : items.length) / itemsPerPage
  ))
  const pagedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const startRow = items.length === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, items.length)

  const cols = [m.colRefId, m.colMerchant, m.colAmount, m.colBankAccount, m.colStatus, m.colCreatedDate]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <button
          onClick={() => router.push('/business-setup/payment/pay-in-slip/upload')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Upload className="w-4 h-4" />
          {m.uploadBtn}
        </button>
      </div>

      {/* Filters */}
      <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center mb-4">

        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
          <option>{m.searchField}</option>
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={m.search}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
        </button>

        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value)
            setPage(1)
            fetchData(timeRange, search, e.target.value)
          }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.filterAll}</option>
          <option value="Pending">{m.filterPending}</option>
          <option value="Approved">{m.filterApproved}</option>
          <option value="Rejected">{m.filterRejected}</option>
        </select>

        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />

        <button
          onClick={() => fetchData(timeRange, search, statusFilter)}
          disabled={loading}
          title={m.refresh}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 table-fixed min-w-[800px]">
            <colgroup>
              <col className="w-[18%]" /><col className="w-[18%]" /><col className="w-[13%]" /><col className="w-[24%]" /><col className="w-[12%]" /><col className="w-[15%]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-left',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl',
                      i === 2 && 'text-right'
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
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{m.noData}</p>
                  </td>
                </tr>
              ) : pagedItems.map((item, idx) => {
                const id = item.id
                const isHighlighted = highlightedId === id
                return (
                  <tr
                    key={id || idx}
                    onClick={() => handleRowHighlight(id)}
                    className={clsx(
                      'cursor-pointer transition-colors',
                      isHighlighted
                        ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                        : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                    )}
                  >
                    {/* Ref ID */}
                    <td
                      className="px-4 py-3 border-b border-gray-100 overflow-hidden cursor-pointer group"
                      onClick={e => { e.stopPropagation(); handleNavigate(id) }}
                    >
                      <span className="text-sm text-gray-800 truncate block group-hover:text-primary-600 group-hover:underline">
                        {item.refId ?? '—'}
                      </span>
                    </td>

                    {/* Merchant */}
                    <td className="px-4 py-3 border-b border-gray-100 overflow-hidden">
                      {item.merchantCode || item.merchantName ? (
                        <>
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.merchantCode ?? '—'}</p>
                          {item.merchantName && <p className="text-xs text-gray-500 mt-0.5 truncate">{item.merchantName}</p>}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">—</p>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-800 tabular-nums">{formatAmount(item.txAmountDecimal)}</p>
                    </td>

                    {/* Bank Account */}
                    <td className="px-4 py-3 border-b border-gray-100 overflow-hidden">
                      {item.payInBankCode || item.payInBankAccountNo ? (
                        <>
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {[item.payInBankCode, item.payInBankAccountNo].filter(Boolean).join(' · ')}
                          </p>
                          {item.payInBankAccountName && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.payInBankAccountName}</p>
                          )}
                          {(item.payInAccountType || item.payInPromptPayId) && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {item.payInAccountType && (
                                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
                                  {item.payInAccountType}
                                </span>
                              )}
                              {item.payInAccountType?.toLowerCase() === 'promptpay' && item.payInPromptPayId && (
                                <span className="text-[10px] text-gray-500">{item.payInPromptPayId}</span>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">—</p>
                      )}
                    </td>

                    {/* Status + Reject Reason / Payment Tx link */}
                    <td className="px-4 py-3 border-b border-gray-100">
                      <StatusBadge status={item.status} />
                      {item.status?.toLowerCase() === 'approved' && item.paymentTransactionId && (
                        <a
                          href={`/business-setup/payment/pay-in-transactions/${item.paymentTransactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 mt-1 text-[11px] text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          <span className="truncate max-w-[120px]">{item.paymentTransactionId}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      )}
                      {item.rejectReason && (
                        <p className="text-[11px] text-red-500 mt-1 truncate max-w-[140px]" title={item.rejectReason}>
                          {item.rejectReason}
                        </p>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatDateTime(item.createdDate)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{total}</span> {m.foundCount}
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  const n = Number(e.target.value)
                  setItemsPerPage(n)
                  setPage(1)
                }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
              >
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">
                {items.length === 0 ? '0-0' : `${startRow}-${endRow}`} of {items.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages || items.length === 0 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
