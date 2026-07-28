'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { backupApi } from '@/lib/api/backup.api'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, RefreshCw, Settings, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
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
  const lower = status?.toLowerCase()
  const isDone = lower === 'done' || lower === 'success'
  const isRunning = lower === 'running'
  const isFailed = lower === 'failed' || lower === 'error'
  const cfg = isDone
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : isRunning
    ? { bg: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500 animate-pulse' }
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

interface BackupPolicy {
  StorageUrl: string
  StorageKey: string
  StorageSecret: string
  Bucket: string
  Path: string
  FilePrefix: string
  ScheduleInterval: string
  ScheduleStartHour: number
  IsEnabled: boolean
}

const EMPTY_POLICY: BackupPolicy = {
  StorageUrl: '',
  StorageKey: '',
  StorageSecret: '',
  Bucket: '',
  Path: '',
  FilePrefix: '',
  ScheduleInterval: 'daily',
  ScheduleStartHour: 2,
  IsEnabled: false,
}

function PolicyModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const m = t.backup
  const [policy, setPolicy] = useState<BackupPolicy>(EMPTY_POLICY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    backupApi.getPolicy()
      .then(res => {
        const cfg = (res.data as any)?.Configuration?.BackupPolicy
        if (cfg) setPolicy({ ...EMPTY_POLICY, ...cfg })
      })
      .catch(() => toast.error(m.toastLoadFailed))
      .finally(() => setLoading(false))
  }, [])

  const set = (k: keyof BackupPolicy, v: string | number | boolean) =>
    setPolicy(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await backupApi.setPolicy({ BackupPolicy: policy })
      toast.success(m.toastSaved)
      onClose()
    } catch {
      toast.error(m.toastSaveFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-8 pt-7 pb-5"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)' }}
        >
          <h2 className="text-lg font-bold text-white">{m.policyTitle}</h2>
          <p className="text-sm text-white/70 mt-0.5">{m.policySubtitle}</p>
        </div>

        {/* Body */}
        <div className="bg-white px-8 py-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10">
              <svg className="w-6 h-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label={m.fieldStorageUrl}>
                <input type="text" value={policy.StorageUrl} onChange={e => set('StorageUrl', e.target.value)}
                  placeholder={m.fieldStorageUrlPlaceholder} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={m.fieldKey}>
                  <input type="text" value={policy.StorageKey} onChange={e => set('StorageKey', e.target.value)}
                    placeholder={m.fieldKeyPlaceholder} className={inputCls} />
                </Field>
                <Field label={m.fieldSecret}>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={policy.StorageSecret}
                      onChange={e => set('StorageSecret', e.target.value)}
                      placeholder={m.fieldSecretPlaceholder}
                      className={clsx(inputCls, 'pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(v => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label={m.fieldBucket}>
                  <input type="text" value={policy.Bucket} onChange={e => set('Bucket', e.target.value)}
                    placeholder={m.fieldBucketPlaceholder} className={inputCls} />
                </Field>
                <Field label={m.fieldPath}>
                  <input type="text" value={policy.Path} onChange={e => set('Path', e.target.value)}
                    placeholder={m.fieldPathPlaceholder} className={inputCls} />
                </Field>
              </div>

              <Field label={m.fieldPrefix}>
                <input type="text" value={policy.FilePrefix} onChange={e => set('FilePrefix', e.target.value)}
                  placeholder={m.fieldPrefixPlaceholder} className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={m.fieldInterval}>
                  <select value={policy.ScheduleInterval} onChange={e => set('ScheduleInterval', e.target.value)}
                    className={inputCls}>
                    <option value="4h">{m.fieldInterval4h}</option>
                    <option value="8h">{m.fieldInterval8h}</option>
                    <option value="12h">{m.fieldInterval12h}</option>
                    <option value="daily">{m.fieldIntervalDaily}</option>
                  </select>
                </Field>
                <Field label={m.fieldStartHour}>
                  <input type="number" min={0} max={23} value={policy.ScheduleStartHour}
                    onChange={e => set('ScheduleStartHour', Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    className={inputCls} />
                </Field>
              </div>

              {/* Enable toggle */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{m.fieldEnabled}</span>
                <button
                  type="button"
                  onClick={() => set('IsEnabled', !policy.IsEnabled)}
                  className={clsx(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    policy.IsEnabled ? 'bg-primary-600' : 'bg-gray-300'
                  )}
                >
                  <span className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    policy.IsEnabled ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {m.btnCancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving ? m.btnSaving : m.btnSave}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors'

function BackupContent() {
  const { t } = useLang()
  const m = t.backup
  const searchParams = useSearchParams()

  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '24h' })
  const [loading, setLoading] = useState(true)
  const [showPolicy, setShowPolicy] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    const p = searchParams.get('highlight')
    if (p) return p
    if (typeof window !== 'undefined') return sessionStorage.getItem('backup_highlight') ?? null
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
        backupApi.getJobs({ ...payload, Page: p, Limit: itemsPerPage }),
        backupApi.getJobCount(payload),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.jobs ?? data?.items ?? [])
        setItems(list)
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : (raw?.count ?? raw?.Count ?? raw?.totalCount ?? 0))
      }
    } catch {
      toast.error(m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchData() }, [page, itemsPerPage])

  const handleTriggerNow = async () => {
    setTriggering(true)
    try {
      await backupApi.triggerNow()
      toast.success(m.backupNowSuccess)
      setTimeout(() => fetchData(1), 2000)
    } catch {
      toast.error(m.backupNowFailed)
    } finally {
      setTriggering(false)
    }
  }

  const handleSearch = () => { setPage(1); fetchData(1) }
  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr); setPage(1); fetchData(1, searchTerm, statusFilter, tr)
  }
  const handleReset = () => {
    const defaultTr: TimeRangeValue = { type: 'relative', value: '24h' }
    setSearchTerm(''); setStatusFilter(''); setTimeRange(defaultTr); setPage(1)
    fetchData(1, '', '', defaultTr)
  }

  const getJobId = (item: any): string => item?.id ?? item?.Id ?? item?.jobId ?? ''
  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch { return d }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = [m.colDate, m.colName, m.colDescription, m.colTags, m.colType, m.colStatus]

  return (
    <>
      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}

      <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
        {/* Header */}
        <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerNow}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm"
            >
              {triggering
                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>
              }
              {m.backupNowBtn}
            </button>
            <button
              onClick={() => setShowPolicy(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
            >
              <Settings className="w-4 h-4" />
              {m.policyBtn}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center mb-4">
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>{m.searchField}</option>
          </select>
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
          <button onClick={handleSearch} disabled={loading}
            className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60">
            <Search className="w-4 h-4" />
          </button>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchData(1, searchTerm, e.target.value, timeRange) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">{m.allStatus}</option>
            <option value="Done">Done</option>
            <option value="Running">Running</option>
            <option value="Failed">Failed</option>
            <option value="Pending">Pending</option>
          </select>
          <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
          <button onClick={handleReset} disabled={loading} title="Refresh"
            className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
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
                    <th key={i} className={clsx(
                      'px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl',
                    )}>
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
                    const id = getJobId(item)
                    const tags: string = item.tags ?? item.Tags ?? ''
                    const type: string = item.type ?? item.Type ?? ''
                    const highlighted = !!id && selectedRowId === id

                    return (
                      <tr
                        key={id || idx}
                        onClick={() => {
                          const next = selectedRowId === id ? null : id
                          setSelectedRowId(next)
                          if (next) sessionStorage.setItem('backup_highlight', next)
                          else sessionStorage.removeItem('backup_highlight')
                        }}
                        className={clsx(
                          'cursor-pointer transition-colors',
                          highlighted
                            ? 'bg-primary-100'
                            : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                        )}
                      >
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm font-medium text-gray-800">
                          {formatDate(item.createdDate ?? item.CreatedDate ?? item.startDate ?? item.StartDate)}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-800">
                          {item.name ?? item.Name ?? '—'}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 max-w-[220px] truncate">
                          {item.description ?? item.Description ?? '—'}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100">
                          {tags
                            ? String(tags).split(',').map((tag: string) => (
                              <span key={tag} className="inline-flex mr-1 px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                            ))
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100">
                          {type ? (
                            <span className="inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 ring-1 ring-purple-200 rounded-full text-[10px] font-semibold">{type}</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          <StatusBadge status={item.status ?? item.Status} />
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
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function BackupPage() {
  return (
    <Suspense>
      <BackupContent />
    </Suspense>
  )
}
