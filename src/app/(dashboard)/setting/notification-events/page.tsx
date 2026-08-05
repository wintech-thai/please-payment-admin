'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { notificationApi } from '@/lib/api/notification.api'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'payment.success':                    { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  'paymentout.success':                 { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  'paymentin.rejected':                 { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200' },
  'paymentout.rejected':                { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200' },
  'payment.failed':                     { bg: 'bg-red-50',     text: 'text-red-700',     ring: 'ring-red-200' },
  'payment.unidentified':               { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200' },
  'payment.dailytxamountlimitexceeded': { bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200' },
  'backup.done':                        { bg: 'bg-sky-50',     text: 'text-sky-700',     ring: 'ring-sky-200' },
}
const DEFAULT_EVENT_COLOR = { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' }
function getEventTypeColor(type: string) {
  return EVENT_TYPE_COLORS[type.toLowerCase()] ?? DEFAULT_EVENT_COLOR
}
const EVENT_TYPE_LABELS: Record<string, string> = {
  'Payment.Success':                    'Payment In Success',
  'PaymentOut.Success':                 'Payment Out Success',
  'PaymentIn.Rejected':                 'Payment In Rejected',
  'PaymentOut.Rejected':                'Payment Out Rejected',
  'Payment.Unidentified':               'Payment Unidentified',
  'Payment.DailyTxAmountLimitExceeded': 'Daily Tx Limit Exceeded',
  'Backup.Done':                        'Backup Done',
}
function getEventTypeLabel(type: string) {
  return EVENT_TYPE_LABELS[type] ?? type
}

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
  const lower = status?.toLowerCase()
  const isDone = lower === 'done' || lower === 'success' || lower === 'completed'
  const isFailed = lower === 'failed' || lower === 'error'
  const cfg = isDone
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : isFailed
    ? { bg: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' }
    : { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {status ?? '—'}
    </span>
  )
}

function NotiEventListContent() {
  const { t } = useLang()
  const m = t.notiEvent
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '24h' })
  const [loading, setLoading] = useState(true)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('noti_event_highlight') ?? null
    return null
  })

  const fetchData = async (
    p = page,
    search = searchTerm,
    status = statusFilter,
    tr = timeRange
  ) => {
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: any = { FromDate: fromDate, ToDate: toDate }
      if (search.trim()) payload.FullTextSearch = search.trim()
      if (status) payload.Status = status

      const [listRes, countRes] = await Promise.allSettled([
        notificationApi.getEvents({ ...payload, Page: p, Limit: itemsPerPage }),
        notificationApi.getEventCount(payload),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.events ?? data?.notiEvents ?? data?.items ?? [])
        setItems(list)
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : (raw?.count ?? raw?.Count ?? raw?.totalCount ?? 0))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchData() }, [page, itemsPerPage])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`noti-ev-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  const handleSearch = () => {
    setPage(1)
    fetchData(1, searchTerm, statusFilter, timeRange)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    fetchData(1, searchTerm, statusFilter, tr)
  }

  const handleReset = () => {
    const defaultTr: TimeRangeValue = { type: 'relative', value: '24h' }
    setSearchTerm('')
    setStatusFilter('')
    setTimeRange(defaultTr)
    setPage(1)
    fetchData(1, '', '', defaultTr)
  }

  const getEventId = (item: any): string =>
    item?.jobId ?? item?.eventId ?? item?.id ?? item?.notiEventId ?? item?.Id ?? ''

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch { return d }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = [m.colEventDate, m.colEventName, m.colDescription, m.colTags, m.colType, m.colStatus]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center mb-4">
        {/* Search type */}
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
          <option>{m.searchField}</option>
        </select>

        {/* Search input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={m.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value)
            setPage(1)
            fetchData(1, searchTerm, e.target.value, timeRange)
          }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.allStatus}</option>
          <option value="Done">Done</option>
          <option value="Failed">Failed</option>
          <option value="Pending">Pending</option>
        </select>

        {/* Time range */}
        <AdvancedTimeRangeSelector
          value={timeRange}
          onChange={handleTimeRangeChange}
          disabled={loading}
        />

        {/* Refresh button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          title="Refresh"
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={i}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl',
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
                    <p className="text-sm font-semibold text-gray-500">{m.noDataFound}</p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const id = getEventId(item)
                  const tags: string = item.tags ?? item.Tags ?? ''
                  const type: string = item.type ?? item.Type ?? item.jobType ?? ''
                  const eventTypes: string[] = Array.isArray(item.eventTypes)
                    ? item.eventTypes
                    : type ? [type] : []

                  const highlighted = !!id && selectedRowId === id

                  return (
                    <tr
                      id={`noti-ev-row-${id}`}
                      key={id || idx}
                      onClick={() => {
                        const next = selectedRowId === id ? null : id
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem('noti_event_highlight', next)
                        else sessionStorage.removeItem('noti_event_highlight')
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      {/* Event Date */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/setting/notification-events/${id}`)}
                          className={clsx('text-sm font-bold hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {formatDate(item.createdDate ?? item.CreatedDate ?? item.eventDate ?? item.EventDate)}
                        </button>
                      </td>
                      {/* Event Name */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-800">
                        {item.name ?? item.Name ?? item.eventName ?? '—'}
                      </td>
                      {/* Description */}
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 max-w-[200px] truncate">
                        {item.description ?? item.Description ?? '—'}
                      </td>
                      {/* Tags */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        {tags
                          ? String(tags).split(',').map((tag: string) => {
                              const c = getEventTypeColor(tag.trim())
                              return (
                                <span key={tag} className={clsx('inline-flex mr-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', c.bg, c.text, c.ring)}>{tag.trim()}</span>
                              )
                            })
                          : <span className="text-gray-400">—</span>}
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        {eventTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {eventTypes.map(et => {
                              const c = getEventTypeColor(et)
                              return (
                                <span key={et} className={clsx('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', c.bg, c.text, c.ring)}>
                                  {getEventTypeLabel(et)}
                                </span>
                              )
                            })}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <StatusBadge status={item.status ?? item.Status ?? item.jobStatus ?? item.JobStatus} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{m.rowsPerPage}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {m.of} {total}</span>
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

export default function NotiEventPage() {
  return (
    <Suspense>
      <NotiEventListContent />
    </Suspense>
  )
}
