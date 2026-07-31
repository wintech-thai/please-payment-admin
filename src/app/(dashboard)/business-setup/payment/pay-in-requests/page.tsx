'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, MoreVertical, X } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

const HIGHLIGHTED_KEY = 'payInRequests_highlightedId'

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

function StatusBadge({ status, createdDate, paymentTxId, statusReason, isPeerToPeer }: {
  status?: string | null
  createdDate?: string | null
  paymentTxId?: string | null
  statusReason?: string | null
  isPeerToPeer?: boolean | null
}) {
  const s = status?.toLowerCase()
  const p2pSuffix = isPeerToPeer ? <span className="text-[10px] font-bold text-violet-600 ml-0.5">(P2P)</span> : null
  if (s === 'match' || s === 'paid') return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        {status}{p2pSuffix}
      </span>
    </div>
  )
  if (s === 'approved') return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
        {status}{p2pSuffix}
      </span>
      {paymentTxId && (
        <a
          href={`/business-setup/payment/pay-in-transactions/${paymentTxId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline ml-1"
        >
          <span className="truncate max-w-[130px]">{paymentTxId}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      )}
    </div>
  )
  if (s === 'rejected') return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
        {status}{p2pSuffix}
      </span>
      {statusReason && (
        <span className="text-[10px] text-red-500 ml-1 max-w-[160px] truncate" title={statusReason}>{statusReason}</span>
      )}
    </div>
  )
  if (s === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {status}{p2pSuffix}
    </span>
  )
  const age = formatAge(createdDate)
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
        {status ?? 'Pending'}{p2pSuffix}
      </span>
      {age && <span className="text-[10px] text-gray-400 ml-1">{age}</span>}
    </div>
  )
}

// ── Approve Confirm Modal ────────────────────────────────────────────────────

function ApproveConfirmModal({
  item,
  onSuccess,
  onClose,
}: {
  item: PayInRequestItem
  onSuccess: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await paymentRequestApi.createPaymentTxByPayInRequestId(item.id)
      toast.success(m.toastApproveSuccess)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.toastApproveFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.modalApproveTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            {(item.merchantCode || item.merchantName) && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 font-medium">{m.fieldMerchant}</span>
                <span className="font-semibold text-gray-800 text-right">{item.merchantCode ?? item.merchantName}</span>
              </div>
            )}
            {(item.payinBankCode || item.payinBankAccountNo) && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 font-medium">{m.fieldAccountNo}</span>
                <span className="font-semibold text-gray-800 text-right">
                  {[item.payinBankCode, item.payinBankAccountNo].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 font-medium">{m.fieldAmount}</span>
              <span className="font-bold text-gray-900 tabular-nums">
                {formatAmount(item.generatedAmount)} {item.currency ?? ''}
              </span>
            </div>
            {item.refId1 && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 font-medium">{m.fieldRefId}</span>
                <span className="text-gray-700 text-right truncate max-w-[180px]">{item.refId1}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {m.btnCancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? '...' : m.btnApprove}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  item,
  onSuccess,
  onClose,
}: {
  item: PayInRequestItem
  onSuccess: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await paymentRequestApi.rejectPendingPayInRequestById(item.id, reason)
      toast.success(m.toastRejectSuccess)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.toastRejectFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.modalRejectTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{m.labelRejectReason}</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={m.rejectReasonPlaceholder}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              {m.btnCancel}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60">
              {loading ? '...' : m.btnReject}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Action Menu ───────────────────────────────────────────────────────────────

function ActionMenu({
  item,
  onApprove,
  onReject,
}: {
  item: PayInRequestItem
  onApprove: () => void
  onReject: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const isPending = item.status?.toLowerCase() === 'pending'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropUp(window.innerHeight - rect.bottom < 100)
    }
    setOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className={clsx('absolute right-0 z-20 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden', dropUp ? 'bottom-8' : 'top-8')}>
          <button
            type="button"
            disabled={!isPending}
            onClick={() => { setOpen(false); onApprove() }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {m.menuApprove}
          </button>
          <button
            type="button"
            disabled={!isPending}
            onClick={() => { setOpen(false); onReject() }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {m.menuReject}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PayInRequestsPage() {
  const { t } = useLang()
  const m = t.payInRequest
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '24h' })
  const [items, setItems] = useState<PayInRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [approveTarget, setApproveTarget] = useState<PayInRequestItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PayInRequestItem | null>(null)
  const [highlightedId, setHighlightedId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? ''
    }
    return ''
  })

  const load = useCallback(async (currentPage: number, limit: number, tr: TimeRangeValue, q: string, status: string) => {
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: Record<string, unknown> = { Page: currentPage, Limit: limit, FromDate: fromDate, ToDate: toDate }
      if (q.trim()) payload.FullTextSearch = q.trim()
      if (status) payload.Status = status

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1, itemsPerPage, timeRange, search, statusFilter) }, [])

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

  const cols = [m.colDate, m.colMerchant, m.colAmount, m.colFee, m.colBankAccount, m.colStatus, m.colRef1, m.colRef2, m.colRef3, m.colAction]

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
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Error">Error</option>
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
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[1100px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'rounded-tl-xl text-left',
                      i === cols.length - 1 && 'rounded-tr-xl text-center',
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
                  const isPromptPay = item.payinAccountType?.toLowerCase() === 'promptpay'
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
                      {/* Date + ref */}
                      <td
                        className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer group"
                        onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`/business-setup/payment/pay-in-requests/${item.id}`) }}
                      >
                        <span className="text-sm text-gray-600 group-hover:text-primary-600 group-hover:underline">{formatDateTime(item.createdDate)}</span>
                        {(item.refId || item.refId1) && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.refId ?? item.refId1}</p>
                        )}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800">{item.merchantCode ?? '—'}</p>
                        {item.merchantName && <p className="text-xs text-gray-500 mt-0.5">{item.merchantName}</p>}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-800 tabular-nums">
                          {formatAmount(item.generatedAmount)}
                        </p>
                        <p className="text-xs text-gray-400">{item.currency ?? '—'}</p>
                      </td>

                      {/* Fee */}
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        {item.payInFeeDecimal != null && item.payInFeeDecimal > 0 ? (
                          <>
                            <p className="text-sm font-semibold tabular-nums text-gray-800">{formatAmount(item.payInFeeDecimal)}</p>
                            {item.payInFeePct != null && item.payInFeePct > 0 && (
                              <p className="text-xs text-gray-400">{item.payInFeePct}%</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 min-w-[180px]">
                        {item.payinBankCode || item.payinBankAccountNo ? (
                          <p className="text-sm font-semibold text-gray-800">{[item.payinBankCode, item.payinBankAccountNo].filter(Boolean).join(' · ')}</p>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                        {item.payinBankAccountName && <p className="text-xs text-gray-500 mt-0.5">{item.payinBankAccountName}</p>}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.payinAccountType && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">{item.payinAccountType}</span>
                          )}
                          {isPromptPay && item.payinPromptPayId && (
                            <span className="text-[10px] text-gray-500">{item.payinPromptPayId}</span>
                          )}
                          {item.payinIsPeerToPeer && (
                            <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full ring-1 ring-violet-200">P2P</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        <StatusBadge
                          status={item.status}
                          createdDate={item.createdDate}
                          paymentTxId={item.paymentTxId}
                          statusReason={item.statusReason}
                          isPeerToPeer={item.payinIsPeerToPeer}
                        />
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{item.refId1 ?? '—'}</span>
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{item.refId2 ?? '—'}</span>
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{item.refId3 ?? '—'}</span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 border-b border-gray-100 text-center">
                        <ActionMenu
                          item={item}
                          onApprove={() => setApproveTarget(item)}
                          onReject={() => setRejectTarget(item)}
                        />
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

      {approveTarget && (
        <ApproveConfirmModal
          item={approveTarget}
          onSuccess={handleRefresh}
          onClose={() => setApproveTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onSuccess={handleRefresh}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  )
}
