'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayOutRequestItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

const HIGHLIGHTED_KEY = 'payOutRequests_highlightedId'
const FILTER_KEY = 'payOutRequests_filter'

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

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatAge(createdDate?: string | null): string {
  if (!createdDate) return ''
  const diffMs = Date.now() - new Date(createdDate).getTime()
  if (diffMs < 0) return ''
  const totalMin = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}min`
  return `${hours}h ${mins}min`
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

function StatusBadge({ status, createdDate, isPartialyPayout }: {
  status?: string | null
  createdDate?: string | null
  isPartialyPayout?: boolean | null
}) {
  const s = status?.toLowerCase()
  if (s === 'paid' || s === 'approved') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{status}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
    </div>
  )
  if (s === 'rejected') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{status}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-red-50 text-red-700 ring-red-200">P2P</span>}
    </div>
  )
  const age = formatAge(createdDate)
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />{status ?? 'Pending'}
        </span>
        {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-amber-50 text-amber-700 ring-amber-200">P2P</span>}
      </div>
      {age && <span className="text-[10px] text-gray-400 ml-1">{age}</span>}
    </div>
  )
}

export default function WithdrawRequestPage() {
  const { t } = useLang()
  const m = t.payOutRequest
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.statusFilter ?? '') : ''
  )
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.timeRange ?? { type: 'relative', value: '24h' }) : { type: 'relative', value: '24h' }
  )
  const [items, setItems] = useState<PayOutRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? ''
    return ''
  })

  const load = useCallback(async (currentPage: number, limit: number, tr: TimeRangeValue, q: string, status: string) => {
    if (typeof window !== 'undefined') sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search: q, statusFilter: status, timeRange: tr }))
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: Record<string, unknown> = { Page: currentPage, Limit: limit, FromDate: fromDate, ToDate: toDate }
      if (q.trim()) payload.FullTextSearch = q.trim()
      if (status) payload.Status = status

      const countPayload = { ...payload }
      delete countPayload.FullTextSearch

      const [listRes, countRes] = await Promise.allSettled([
        paymentRequestApi.getPayOutRequests(payload),
        paymentRequestApi.getPayOutRequestCount(countPayload),
      ])

      if (listRes.status === 'rejected') throw listRes.reason

      const data = (listRes.value.data as any)
      const list: PayOutRequestItem[] = Array.isArray(data)
        ? data
        : (data?.paymentRequests ?? data?.PaymentRequests ?? data?.requests ?? [])
      setItems(list)

      if (countRes.status === 'fulfilled') {
        const countData = countRes.value.data as any
        setTotal(typeof countData === 'number' ? countData : (countData?.count ?? 0))
      } else {
        setTotal(list.length)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoad)
    } finally {
      setLoading(false)
    }
  }, [m.failedToLoad])

  useEffect(() => {
    load(1, itemsPerPage, timeRange, search, statusFilter)
    if (searchParams.get('refresh') === '1') {
      router.replace('/business-setup/payment/withdraw-request')
    }
  }, [])

  const handleRefresh = () => {
    setPage(1)
    load(1, itemsPerPage, timeRange, search, statusFilter)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    load(1, itemsPerPage, tr, search, statusFilter)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  const displayTotal = search.trim() ? items.length : total
  const totalPages = Math.ceil(displayTotal / itemsPerPage)
  const startRow = displayTotal === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, displayTotal)

  const cols = [m.colDate, m.colMerchant, m.colAmount, m.colFee, m.colDestBank, m.colSourceBank, m.colStatus, 'REF']

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <button
          onClick={() => router.push('/business-setup/payment/withdraw-request/create')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span>
          {m.addBtn}
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

        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value)
            setPage(1)
            load(1, itemsPerPage, timeRange, search, e.target.value)
          }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.statusAll}</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Rejected">Rejected</option>
        </select>

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
                      (i === 2 || i === 3) ? 'text-right' : 'text-left'
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
                items.map((item, idx) => {
                  const isHighlighted = highlightedId === item.id
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowHighlight(item.id)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isHighlighted
                          ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      {/* Date — click to navigate (stopPropagation to avoid double highlight) */}
                      <td
                        className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer group"
                        onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`/business-setup/payment/withdraw-request/${item.id}`) }}
                      >
                        <span className="text-sm text-gray-600 group-hover:text-primary-600 group-hover:underline">{formatDateTime(item.createdDate)}</span>
                        {item.refId1 && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.refId1}</p>
                        )}
                      </td>

                      {/* Merchant */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800">{item.merchantCode ?? '—'}</p>
                        {item.merchantName && <p className="text-xs text-gray-500 mt-0.5">{item.merchantName}</p>}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-800 tabular-nums">
                          {formatAmount(item.generatedAmount)}
                        </p>
                        <p className="text-xs text-gray-400">{item.currency ?? '—'}</p>
                        {item.isPartialyPayout && item.totalPayOutPaidAmountDecimal != null && (
                          <p className="text-xs text-emerald-600 tabular-nums mt-0.5">
                            ✓ {formatAmount(item.totalPayOutPaidAmountDecimal)}
                          </p>
                        )}
                      </td>

                      {/* Fee */}
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        {item.payoutFeeDecimal != null && item.payoutFeeDecimal > 0 ? (
                          <>
                            <p className="text-sm font-semibold tabular-nums text-gray-800">{formatAmount(item.payoutFeeDecimal)}</p>
                            {item.payoutFeePct != null && item.payoutFeePct > 0 && (
                              <p className="text-xs text-gray-400">{item.payoutFeePct}%</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                        {item.payoutFeePayer && (
                          <span className={clsx(
                            'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full ring-1 mt-0.5',
                            item.payoutFeePayer.toLowerCase() === 'merchant'
                              ? 'bg-blue-50 text-blue-700 ring-blue-200'
                              : 'bg-orange-50 text-orange-700 ring-orange-200'
                          )}>
                            {item.payoutFeePayer}
                          </span>
                        )}
                      </td>

                      {/* Destination bank — use Override fields when isPayInBankAccountOverride = true */}
                      <td className="px-4 py-3 border-b border-gray-100 min-w-[180px]">
                        {(() => {
                          const bankCode = item.isPayInBankAccountOverride ? item.payinBankCodeOverride : item.payinBankCode
                          const bankAccountNo = item.isPayInBankAccountOverride ? item.payinBankAccountNoOverride : item.payinBankAccountNo
                          const bankAccountName = item.isPayInBankAccountOverride ? item.payinBankAccountNameOverride : item.payinBankAccountName
                          const accountType = item.isPayInBankAccountOverride ? item.payinAccountTypeOverride : item.payinAccountType
                          const promptPayId = item.isPayInBankAccountOverride ? item.payinPromptPayIdOverride : item.payinPromptPayId
                          return (
                            <>
                              {bankCode || bankAccountNo ? (
                                <p className="text-sm font-semibold text-gray-800">
                                  {[bankCode, bankAccountNo].filter(Boolean).join(' · ')}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400">—</p>
                              )}
                              {bankAccountName && (
                                <p className="text-xs text-gray-500 mt-0.5">{bankAccountName}</p>
                              )}
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {accountType && (
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
                                    {accountType}
                                  </span>
                                )}
                                {accountType?.toLowerCase() === 'promptpay' && promptPayId && (
                                  <span className="text-[10px] text-gray-500">{promptPayId}</span>
                                )}
                              </div>
                            </>
                          )
                        })()}
                      </td>

                      {/* Source bank — stored in payoutBank* fields */}
                      <td className="px-4 py-3 border-b border-gray-100 min-w-[180px]">
                        {item.payoutBankCode || item.payoutBankAccountNo ? (
                          <p className="text-sm font-semibold text-gray-800">
                            {[item.payoutBankCode, item.payoutBankAccountNo].filter(Boolean).join(' · ')}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                        {item.payoutBankAccountName && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.payoutBankAccountName}</p>
                        )}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.payoutAccountType && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
                              {item.payoutAccountType}
                            </span>
                          )}
                          {item.payoutAccountType?.toLowerCase() === 'promptpay' && item.payoutPromptPayId && (
                            <span className="text-[10px] text-gray-500">{item.payoutPromptPayId}</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        <StatusBadge
                          status={item.status}
                          createdDate={item.createdDate}
                          isPartialyPayout={item.isPartialyPayout}
                        />
                        {item.status?.toLowerCase() === 'rejected' && item.rejectReason && (
                          <p
                            className="text-[11px] text-red-500 mt-1 truncate max-w-[140px]"
                            title={item.rejectReason}
                          >
                            {item.rejectReason}
                          </p>
                        )}
                      </td>

                      {/* REF */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        <div className="flex flex-col gap-0.5">
                          {item.refId1 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId1}</span> : null}
                          {item.refId2 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId2}</span> : null}
                          {item.refId3 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId3}</span> : null}
                          {!item.refId1 && !item.refId2 && !item.refId3 && <span className="text-xs text-gray-400">—</span>}
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{displayTotal}</span> {m.foundCount}
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
                  load(1, n, timeRange, search, statusFilter)
                }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
              >
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{displayTotal === 0 ? '0-0' : `${startRow}-${endRow}`} of {displayTotal}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setPage(p => p - 1); load(page - 1, itemsPerPage, timeRange, search, statusFilter) }}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setPage(p => p + 1); load(page + 1, itemsPerPage, timeRange, search, statusFilter) }}
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
    </div>
  )
}
