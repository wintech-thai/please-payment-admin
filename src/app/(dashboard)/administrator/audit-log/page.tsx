'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, RefreshCcw, Eye, ChevronLeft, ChevronRight, Clock, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { auditLogApi, type AuditLogDocument, type AuditLogPayload } from '@/lib/api/audit-log.api'
import { useLang } from '@/context/LanguageContext'
import AuditLogFlyout from '@/components/AuditLogFlyout'

// ── Colour helpers ────────────────────────────────────────────────────────────

const PALETTE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#f26ed5', '#a4de6c', '#d0ed57', '#ffc658']

function getApiColor(name: string): string {
  if (!name) return '#94a3b8'
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ── Date helpers (no external library) ───────────────────────────────────────

function calcFrom(rangeValue: string): Date {
  const now = new Date()
  const num = parseInt(rangeValue)
  const unit = rangeValue.replace(/\d/g, '')
  if (unit === 'm') return new Date(now.getTime() - num * 60_000)
  if (unit === 'h') return new Date(now.getTime() - num * 3_600_000)
  return new Date(now.getTime() - num * 86_400_000)
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(new Date(iso))
  } catch { return iso }
}

// ── Response normaliser ───────────────────────────────────────────────────────

function mapItem(item: Record<string, unknown>, idx: number): AuditLogDocument {
  const data = (item.data as Record<string, unknown>) || {}
  const userInfo = (data.userInfo as Record<string, unknown>) || (data.user as Record<string, unknown>) || {}
  const api = (data.api as Record<string, unknown>) || {}
  return {
    id: String(item.auditLogId ?? item.id ?? item._id ?? idx),
    '@timestamp': String(item['@timestamp'] ?? item.createdDate ?? item.timestamp ?? ''),
    user_name: String(userInfo.UserName ?? userInfo.userName ?? item.userName ?? ''),
    id_type: String(userInfo.IdentityType ?? userInfo.identityType ?? item.identityType ?? '-'),
    role: String(userInfo.Role ?? userInfo.role ?? item.role ?? '-'),
    action: String(api.ApiName ?? api.apiName ?? data.Path ?? data.path ?? item.action ?? '-'),
    path: String(data.Path ?? data.path ?? item.path ?? ''),
    resource: String(api.Controller ?? api.controller ?? ''),
    status_code: Number(data.StatusCode ?? data.statusCode ?? api.statusCode ?? item.statusCode ?? 200),
    client_ip: String(data.CfClientIp ?? data.ClientIp ?? data.clientIp ?? item.clientIp ?? '-'),
    ...item,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { t } = useLang()
  const tAL = t.auditLog

  const TIME_RANGES = [
    { value: '5m',  label: tAL.last5m },
    { value: '15m', label: tAL.last15m },
    { value: '30m', label: tAL.last30m },
    { value: '1h',  label: tAL.last1h },
    { value: '3h',  label: tAL.last3h },
    { value: '6h',  label: tAL.last6h },
    { value: '12h', label: tAL.last12h },
    { value: '24h', label: tAL.last24h },
    { value: '2d',  label: tAL.last2d },
    { value: '7d',  label: tAL.last7d },
    { value: '30d', label: tAL.last30d },
  ]

  const [logs, setLogs] = useState<AuditLogDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [inputValue, setInputValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState('all')
  const [timeRange, setTimeRange] = useState('24h')
  const [timeOpen, setTimeOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogDocument | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const timeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) setTimeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const from = calcFrom(timeRange).toISOString()
      const to = new Date().toISOString()
      const offset = (page - 1) * itemsPerPage
      const payload: AuditLogPayload = { limit: itemsPerPage, offset, from, to }
      if (searchTerm) {
        if (searchField === 'username') payload.search = searchTerm
        else if (searchField === 'api') payload.apiSearch = searchTerm
        else if (searchField === 'ip') payload.ipSearch = searchTerm
        else payload.search = searchTerm
      }
      const res = await auditLogApi.getAuditLogs(payload)
      const raw = res.data as Record<string, unknown>
      const arr = (Array.isArray(raw)
        ? raw
        : ((raw?.auditLogs ?? raw?.data ?? raw?.items ?? []) as unknown[])) as Record<string, unknown>[]
      const total = raw?.total ?? raw?.totalCount ?? arr.length
      setLogs(arr.map(mapItem))
      setTotalCount(typeof total === 'number' ? total : 0)
    } catch {
      setLogs([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [page, itemsPerPage, searchTerm, searchField, timeRange])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = () => { setPage(1); setSearchTerm(inputValue) }

  const handleReset = () => {
    setInputValue(''); setSearchTerm(''); setSearchField('all')
    setTimeRange('24h'); setPage(1)
  }

  const handleOpenFlyout = (log: AuditLogDocument, idx: number) => {
    setSelectedLog(log); setSelectedIndex(idx)
  }
  const handleCloseFlyout = () => { setSelectedLog(null); setSelectedIndex(-1) }
  const handleNavigate = (idx: number) => {
    if (idx >= 0 && idx < logs.length) { setSelectedLog(logs[idx]); setSelectedIndex(idx) }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startRow = totalCount === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, totalCount)
  const selectedRangeLabel = TIME_RANGES.find(r => r.value === timeRange)?.label ?? timeRange

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tAL.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{tAL.subtitle}</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center">

        {/* Search field */}
        <select
          value={searchField}
          onChange={e => setSearchField(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">{tAL.searchFieldAll}</option>
          <option value="username">{tAL.searchFieldUsername}</option>
          <option value="api">{tAL.searchFieldApi}</option>
          <option value="ip">{tAL.searchFieldIp}</option>
        </select>

        {/* Text input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tAL.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSearch}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Time range */}
        <div className="relative" ref={timeRef}>
          <button
            onClick={() => setTimeOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="min-w-[100px]">{selectedRangeLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </button>
          {timeOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
              {TIME_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => { setTimeRange(r.value); setPage(1); setTimeOpen(false) }}
                  className={clsx(
                    'w-full text-left px-4 py-2 text-sm transition-colors',
                    timeRange === r.value
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset */}
        <button
          onClick={handleReset}
          title={tAL.reset}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">{tAL.colTime}</th>
                <th className="px-4 py-3">{tAL.colUsername}</th>
                <th className="px-4 py-3">{tAL.colIdType}</th>
                <th className="px-4 py-3">{tAL.colApi}</th>
                <th className="px-4 py-3">{tAL.colStatus}</th>
                <th className="px-4 py-3">{tAL.colRole}</th>
                <th className="px-4 py-3">{tAL.colIp}</th>
                <th className="px-4 py-3 text-center">{tAL.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400 animate-pulse">
                    {tAL.loading}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">
                    {tAL.noData}
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => {
                  const isError = log.status_code && log.status_code !== 200
                  const isSelected = selectedLog?.id === log.id
                  return (
                    <tr
                      key={log.id || idx}
                      onClick={() => handleOpenFlyout(log, idx)}
                      className={clsx(
                        'cursor-pointer transition-colors text-sm',
                        isError
                          ? clsx('bg-red-50 hover:bg-red-100', isSelected && 'bg-red-100 border-l-[3px] border-l-red-400')
                          : clsx('hover:bg-gray-50', isSelected && 'bg-primary-50 border-l-[3px] border-l-primary-400')
                      )}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">
                        {formatDate(log['@timestamp'])}
                      </td>
                      <td className={clsx('px-4 py-3 font-medium', isError ? 'text-red-600' : 'text-primary-700')}>
                        {log.user_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.id_type}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!isError && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getApiColor(log.action) }}
                            />
                          )}
                          <span className={clsx(
                            'truncate max-w-[200px] text-xs',
                            isError ? 'text-red-600' : 'text-gray-700'
                          )}>
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                          isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        )}>
                          {log.status_code || 200}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.role}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.client_ip}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); handleOpenFlyout(log, idx) }}
                          className={clsx(
                            'p-1.5 rounded-lg transition-colors',
                            isSelected
                              ? 'bg-primary-100 text-primary-600'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{tAL.rowsPerPage}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="border-none bg-transparent text-gray-700 font-medium focus:ring-0 outline-none cursor-pointer text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="tabular-nums">{startRow}–{endRow} {tAL.of} {totalCount}</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || totalPages === 0}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail flyout */}
      <AuditLogFlyout
        event={selectedLog}
        events={logs}
        currentIndex={selectedIndex}
        onNavigate={handleNavigate}
        onClose={handleCloseFlyout}
      />
    </div>
  )
}
