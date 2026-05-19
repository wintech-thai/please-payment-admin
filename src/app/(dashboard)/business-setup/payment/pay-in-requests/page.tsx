'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

function getTimeFilter(tr: TimeRangeValue): { fromDate: string; toDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return {
      fromDate: new Date(tr.start * 1000).toISOString(),
      toDate: new Date(tr.end * 1000).toISOString(),
    }
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

function StatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'match' || s === 'paid') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
      {status}
    </span>
  )
  if (s === 'error') return (
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

function formatDateTime(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}


export default function PayInRequestsPage() {
  const { t } = useLang()
  const m = t.payInRequest
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '24h' })
  const [items, setItems] = useState<PayInRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (currentPage: number, limit: number, tr: TimeRangeValue, q: string) => {
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: Record<string, unknown> = { Page: currentPage, Limit: limit, FromDate: fromDate, ToDate: toDate }
      if (q.trim()) payload.FullTextSearch = q.trim()

      const countPayload = { ...payload }
      delete countPayload.FullTextSearch

      const [listRes, countRes] = await Promise.allSettled([
        paymentRequestApi.getPayInRequests(payload),
        paymentRequestApi.getPayInRequestCount(countPayload),
      ])

      if (listRes.status === 'rejected') throw listRes.reason

      const data = (listRes.value.data as any)
      const list: PayInRequestItem[] = Array.isArray(data)
        ? data
        : (data?.paymentRequests ?? data?.PaymentRequests ?? data?.requests ?? [])
      setItems(list)

      if (countRes.status === 'fulfilled') {
        const countData = countRes.value.data as any
        setTotal(typeof countData === 'number' ? countData : (countData?.count ?? 0))
      } else {
        setTotal(list.length)
      }
    } catch {
      toast.error('Failed to load payment requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1, itemsPerPage, timeRange, search) }, [])

  const handleRefresh = () => {
    setPage(1)
    load(1, itemsPerPage, timeRange, search)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    load(1, itemsPerPage, tr, search)
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  const cols = [m.colDate, m.colMerchant, m.colAmount, m.colBankAccount, m.colStatus, m.colRef]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
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
            onKeyDown={e => e.key === 'Enter' && handleRefresh()}
            placeholder={m.search}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
        </button>

        <AdvancedTimeRangeSelector
          value={timeRange}
          onChange={handleTimeRangeChange}
          disabled={loading}
        />

        <button
          onClick={handleRefresh}
          disabled={loading}
          title={m.refresh}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
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
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'rounded-tl-xl text-left',
                      i === cols.length - 1 && 'rounded-tr-xl text-left',
                      i === 2 ? 'text-right' : 'text-left'
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{m.noData}</p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/business-setup/payment/pay-in-requests/${item.id}`)}
                    className={clsx(
                      'cursor-pointer transition-colors',
                      idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                    )}
                  >
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{formatDateTime(item.createdDate)}</span>
                    </td>

                    <td className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">{item.merchantCode ?? '—'}</p>
                      {item.merchantName && <p className="text-xs text-gray-500 mt-0.5">{item.merchantName}</p>}
                    </td>

                    <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-800 tabular-nums">
                        {item.generatedAmount != null ? item.generatedAmount.toFixed(2) : '—'}
                      </p>
                      <p className="text-xs text-gray-400">{item.currency ?? '—'}</p>
                    </td>

                    <td className="px-4 py-3 border-b border-gray-100 min-w-[180px]">
                      {item.payinBankCode || item.payinBankAccountNo ? (
                        <p className="text-sm font-semibold text-gray-800">{[item.payinBankCode, item.payinBankAccountNo].filter(Boolean).join(' · ')}</p>
                      ) : (
                        <p className="text-sm text-gray-400">—</p>
                      )}
                      {item.payinBankAccountName && <p className="text-xs text-gray-500 mt-0.5">{item.payinBankAccountName}</p>}
                      {(item.payinAccountType || item.payinAccountLevel) && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.payinAccountType && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">{item.payinAccountType}</span>
                          )}
                          {item.payinAccountLevel && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">{item.payinAccountLevel}</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-4 py-3 border-b border-gray-100">
                      {item.refId && <p className="text-sm text-gray-600">{item.refId}</p>}
                      {item.refId1 && <p className="text-sm text-gray-600">{item.refId1}</p>}
                      {item.refId2 && <p className="text-xs text-gray-400 mt-0.5">{item.refId2}</p>}
                      {!item.refId && !item.refId1 && !item.refId2 && <span className="text-sm text-gray-400">—</span>}
                    </td>
                  </tr>
                ))
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
              onChange={e => {
                const n = Number(e.target.value)
                setItemsPerPage(n)
                setPage(1)
                load(1, n, timeRange, search)
              }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setPage(p => p - 1); load(page - 1, itemsPerPage, timeRange, search) }}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => { setPage(p => p + 1); load(page + 1, itemsPerPage, timeRange, search) }}
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
