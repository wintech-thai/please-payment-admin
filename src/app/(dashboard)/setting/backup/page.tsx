'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
        const raw = (res.data as any)
        const cfg = raw?.configuration?.backupPolicy ?? raw?.Configuration?.BackupPolicy
        if (cfg) {
          setPolicy({
            StorageUrl:        cfg.StorageUrl        ?? cfg.storageUrl        ?? '',
            StorageKey:        cfg.StorageKey        ?? cfg.storageKey        ?? '',
            StorageSecret:     cfg.StorageSecret     ?? cfg.storageSecret     ?? '',
            Bucket:            cfg.Bucket            ?? cfg.bucket            ?? '',
            Path:              cfg.Path              ?? cfg.path              ?? '',
            FilePrefix:        cfg.FilePrefix        ?? cfg.filePrefix        ?? '',
            ScheduleInterval:  cfg.ScheduleInterval  ?? cfg.scheduleInterval  ?? 'daily',
            ScheduleStartHour: cfg.ScheduleStartHour ?? cfg.scheduleStartHour ?? 2,
            IsEnabled:         cfg.IsEnabled         ?? cfg.isEnabled         ?? false,
          })
        }
      })
      .catch((err: any) => { if (err?.code !== 'NOT_FOUND') toast.error(m.toastLoadFailed) })
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
        className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
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
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {/* Left column — Storage */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Storage</p>
                <Field label={m.fieldStorageUrl}>
                  <input type="text" value={policy.StorageUrl} onChange={e => set('StorageUrl', e.target.value)}
                    placeholder={m.fieldStorageUrlPlaceholder} className={inputCls} />
                </Field>
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
                <Field label={m.fieldBucket}>
                  <input type="text" value={policy.Bucket} onChange={e => set('Bucket', e.target.value)}
                    placeholder={m.fieldBucketPlaceholder} className={inputCls} />
                </Field>
                <Field label={m.fieldPath}>
                  <input type="text" value={policy.Path} onChange={e => set('Path', e.target.value)}
                    placeholder={m.fieldPathPlaceholder} className={inputCls} />
                </Field>
              </div>

              {/* Right column — Schedule */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Schedule</p>
                <Field label={m.fieldPrefix}>
                  <input type="text" value={policy.FilePrefix} onChange={e => set('FilePrefix', e.target.value)}
                    placeholder={m.fieldPrefixPlaceholder} className={inputCls} />
                </Field>
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

                {/* Enable toggle */}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg mt-2">
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
  const router = useRouter()
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
  const [showConfirm, setShowConfirm] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [restoreFiles, setRestoreFiles] = useState<any[]>([])
  const [restoreFilesLoading, setRestoreFilesLoading] = useState(false)
  const [restoreSelected, setRestoreSelected] = useState<any>(null)
  const [restoreConfirmText, setRestoreConfirmText] = useState('')
  const [restoring, setRestoring] = useState(false)
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

  const handleOpenRestore = async () => {
    setRestoreSelected(null)
    setRestoreConfirmText('')
    setRestoreFiles([])
    setShowRestore(true)
    setRestoreFilesLoading(true)
    try {
      const res = await backupApi.listFiles()
      setRestoreFiles(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error(m.restoreFailed)
    } finally {
      setRestoreFilesLoading(false)
    }
  }

  const handleTriggerRestore = async () => {
    if (!restoreSelected) return
    setRestoring(true)
    try {
      await backupApi.triggerRestore({
        Filename: restoreSelected.filename,
        Bucket:   restoreSelected.bucket ?? '',
        Folder:   restoreSelected.folder ?? '',
      })
      toast.success(m.restoreSuccess)
      setShowRestore(false)
      fetchData(1)
    } catch {
      toast.error(m.restoreFailed)
    } finally {
      setRestoring(false)
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
  const cols = [m.colDate, m.colName, m.colDescription, m.colTags, m.colType, m.colStatus, m.colFile]

  return (
    <>
      {showPolicy && <PolicyModal onClose={() => setShowPolicy(false)} />}

      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900">{m.confirmTitle}</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-1">{m.confirmDesc}</p>
              <ul className="text-sm text-gray-600 mt-2 mb-4 space-y-1 pl-4 list-disc">
                <li>{m.confirmStep1}</li>
                <li>{m.confirmStep2}</li>
                <li>{m.confirmStep3}</li>
                <li>{m.confirmStep4}</li>
              </ul>
              <p className="text-xs text-gray-400">{m.confirmNote}</p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {m.confirmCancel}
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleTriggerNow() }}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                {m.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestore && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRestore(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{m.restoreModalTitle}</h3>
                  <p className="text-xs text-red-600 font-medium mt-0.5">{m.restoreModalDesc}</p>
                </div>
              </div>

              {/* Running jobs warning */}
              {items.filter(i => (i.status ?? i.Status)?.toLowerCase() === 'running').length > 0 && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {m.restoreRunningWarning.replace('{count}', String(items.filter(i => (i.status ?? i.Status)?.toLowerCase() === 'running').length))}
                  </p>
                </div>
              )}

              {/* File list */}
              <div className="mt-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{m.restoreSelectFile}</p>
                {restoreFilesLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-400 gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    {m.restoreLoadingFiles}
                  </div>
                ) : restoreFiles.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">{m.restoreNoFiles}</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {restoreFiles.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => setRestoreSelected(f)}
                        className={clsx(
                          'w-full text-left px-3 py-2.5 flex items-center gap-3 text-sm transition-colors',
                          restoreSelected?.key === f.key
                            ? 'bg-primary-50 text-primary-700'
                            : 'hover:bg-gray-50 text-gray-800'
                        )}
                      >
                        <span className={clsx('w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors',
                          restoreSelected?.key === f.key ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{f.filename}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {f.lastModified ? new Date(f.lastModified).toLocaleString('th-TH') : ''}{' '}
                            {f.size ? `· ${(f.size / 1024 / 1024).toFixed(1)} MB` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm input */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.restoreConfirmLabel}</label>
                <input
                  type="text"
                  value={restoreConfirmText}
                  onChange={e => setRestoreConfirmText(e.target.value)}
                  placeholder={m.restoreConfirmPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowRestore(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {m.confirmCancel}
              </button>
              <button
                onClick={handleTriggerRestore}
                disabled={!restoreSelected || restoreConfirmText !== 'restore' || restoring}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {restoring
                  ? <svg className="w-4 h-4 animate-spin inline" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : m.restoreConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
        {/* Header */}
        <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenRestore}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              {m.restoreBtn}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
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
                        id={`backup-row-${id}`}
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
                        {/* Date — clickable link */}
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/setting/backup/${id}`)}
                            className={clsx('text-sm font-bold hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                          >
                            {formatDate(item.createdDate ?? item.CreatedDate ?? item.startDate ?? item.StartDate)}
                          </button>
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
                        <td className="px-4 py-3 border-b border-gray-100 max-w-[200px]">
                          {(() => {
                            try {
                              const meta = JSON.parse(item.metadata ?? item.Metadata ?? 'null')
                              if (!meta?.filename) return <span className="text-gray-400">—</span>
                              return <span className="text-sm text-gray-600 truncate block">{meta.filename}</span>
                            } catch { return <span className="text-gray-400">—</span> }
                          })()}
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
