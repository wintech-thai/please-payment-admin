'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Database } from 'lucide-react'
import { toast } from 'sonner'
import { useLang } from '@/context/LanguageContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { lokiService, isValidLogQL } from '@/lib/api/loki.api'
import type { LokiLogEntry, VolumeDataPoint } from '@/lib/api/loki.api'
import { LokiQueryBar } from './LokiQueryBar'
import { LokiVolumeChart } from './LokiVolumeChart'
import { LokiOptionsBar, type LokiDisplayOptions } from './LokiOptionsBar'
import { LokiLogTable } from './LokiLogTable'
import { LokiLogFlyout, type FlyoutDict } from './LokiLogFlyout'

/** Convert a relative time value ("5m", "1h", etc.) to seconds */
function parseRelativeDuration(value: string): number {
  const match = value.match(/^(\d+)(m|h|d)$/)
  if (!match) return 3600
  const n = parseInt(match[1])
  switch (match[2]) {
    case 'm': return n * 60
    case 'h': return n * 3600
    case 'd': return n * 86400
    default: return 3600
  }
}

/** Resolve TimeRangeValue to {start, end} unix seconds */
function resolveTimeRange(tr: TimeRangeValue): { start: number; end: number } {
  const now = Math.floor(Date.now() / 1000)
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { start: tr.start, end: tr.end }
  }
  const duration = parseRelativeDuration(tr.value)
  return { start: now - duration, end: now }
}

const DEFAULT_QUERY = ``
const DEFAULT_LINE_LIMIT = 1000

const DEFAULT_TIME_RANGE: TimeRangeValue = { type: 'relative', value: '1h', label: 'Last 1 hour' }

const DEFAULT_OPTIONS: LokiDisplayOptions = {
  showTime: true,
  wrapLines: false,
  prettifyJson: false,
  sortOrder: 'newest',
}

export default function LokiView() {
  const { t: tAll } = useLang()
  const t = tAll.logs

  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(DEFAULT_TIME_RANGE)
  const [lineLimit, setLineLimit] = useState(DEFAULT_LINE_LIMIT)
  const [options, setOptions] = useState<LokiDisplayOptions>(DEFAULT_OPTIONS)
  const [logs, setLogs] = useState<LokiLogEntry[]>([])
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [isLoadingNewer, setIsLoadingNewer] = useState(false)
  const [volumeCollapsed, setVolumeCollapsed] = useState(false)
  const [hasQueried, setHasQueried] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(false)
  const [hasMoreNewer, setHasMoreNewer] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LokiLogEntry | null>(null)
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false)

  // Restore last query/time range from localStorage on mount
  useEffect(() => {
    const savedQuery = localStorage.getItem('loki_query')
    if (savedQuery) setQuery(savedQuery)
    const savedRange = localStorage.getItem('loki_range')
    if (savedRange) {
      try {
        setTimeRange(JSON.parse(savedRange))
      } catch {
        // ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isInitialMount = useRef(true)
  const queryRef = useRef(query)
  queryRef.current = query

  const handleRunQuery = useCallback(async (overrideLimit?: number) => {
    if (!query.trim()) return
    if (!isValidLogQL(query)) {
      toast.error(t.queryBar.syntaxError, { description: t.queryBar.syntaxErrorDesc })
      return
    }

    localStorage.setItem('loki_query', query)
    localStorage.setItem('loki_range', JSON.stringify(timeRange))

    setIsLoading(true)
    setHasQueried(true)
    setHasMoreOlder(false)
    setHasMoreNewer(false)
    const currentLimit = overrideLimit ?? lineLimit

    try {
      const { start, end } = resolveTimeRange(timeRange)

      const [logResult, volumeResult] = await Promise.all([
        lokiService.queryRange(query, start, end, currentLimit),
        lokiService.queryVolume(query, start, end, 48),
      ])

      setLogs(logResult.entries)
      setVolumeData(volumeResult)
      setHasMoreOlder(logResult.entries.length >= currentLimit)
      setHasMoreNewer(false)

      if (logResult.entries.length === 0) {
        toast.info(t.noLogsForQuery)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(`${t.queryFailed}: ${error?.message || ''}`)
      setLogs([])
      setVolumeData([])
      setHasMoreOlder(false)
      setHasMoreNewer(false)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, timeRange, lineLimit, t])

  // Auto-run on mount (if a saved query was restored) and whenever timeRange changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      if (queryRef.current.trim()) handleRunQuery()
      return
    }
    if (queryRef.current.trim()) handleRunQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange])

  const handleLoadOlder = useCallback(async () => {
    if (!query.trim() || logs.length === 0) return
    setIsLoadingOlder(true)

    try {
      const { start } = resolveTimeRange(timeRange)
      const oldestNano = logs.reduce((oldest, log) => (log.timestampNano < oldest ? log.timestampNano : oldest), logs[0].timestampNano)
      const endNano = BigInt(oldestNano) - BigInt(1)
      const endSec = Number(endNano / BigInt(1_000_000_000))

      if (endSec <= start) {
        toast.info(t.pagination.noMoreOlder)
        setHasMoreOlder(false)
        return
      }

      const { entries } = await lokiService.queryRange(query, start, endSec, lineLimit, 'backward')

      if (entries.length === 0) {
        toast.info(t.pagination.noMoreOlder)
        setHasMoreOlder(false)
      } else {
        setLogs((prev) => [...prev, ...entries])
        setHasMoreOlder(entries.length >= lineLimit)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error?.message || t.pagination.failed)
    } finally {
      setIsLoadingOlder(false)
    }
  }, [query, timeRange, logs, lineLimit, t])

  const handleLoadNewer = useCallback(async () => {
    if (!query.trim() || logs.length === 0) return
    setIsLoadingNewer(true)

    try {
      const { end } = resolveTimeRange(timeRange)
      const newestNano = logs.reduce((newest, log) => (log.timestampNano > newest ? log.timestampNano : newest), logs[0].timestampNano)
      const startNano = BigInt(newestNano) + BigInt(1)
      const startSec = Number(startNano / BigInt(1_000_000_000))

      if (startSec >= end) {
        toast.info(t.pagination.noMoreNewer)
        setHasMoreNewer(false)
        return
      }

      const { entries } = await lokiService.queryRange(query, startSec, end, lineLimit, 'forward')

      if (entries.length === 0) {
        toast.info(t.pagination.noMoreNewer)
        setHasMoreNewer(false)
      } else {
        setLogs((prev) => [...entries, ...prev])
        setHasMoreNewer(entries.length >= lineLimit)
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast.error(error?.message || t.pagination.failed)
    } finally {
      setIsLoadingNewer(false)
    }
  }, [query, timeRange, logs, lineLimit, t])

  const handleLineLimitChange = useCallback((newLimit: number) => {
    setLineLimit(newLimit)
    if (hasQueried) handleRunQuery(newLimit)
  }, [handleRunQuery, hasQueried])

  const sortedLogs = useMemo(() => {
    const sorted = [...logs]
    sorted.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime()
      const tb = new Date(b.timestamp).getTime()
      return options.sortOrder === 'newest' ? tb - ta : ta - tb
    })
    return sorted
  }, [logs, options.sortOrder])

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden rounded-2xl border border-slate-800">
      <LokiQueryBar
        query={query}
        onChange={setQuery}
        onSubmit={() => handleRunQuery()}
        isLoading={isLoading}
        t={t.queryBar}
        logoContent={
          <div className="flex items-center gap-2.5 pr-0 md:pr-4 border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 w-full md:w-auto">
            <div className="w-8 h-8 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[13px] font-bold text-white leading-none tracking-tight">{t.title}</h1>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{t.subtitle}</span>
            </div>
          </div>
        }
        timeRangeContent={
          <AdvancedTimeRangeSelector value={timeRange} onChange={setTimeRange} disabled={isLoading} />
        }
      />

      {hasQueried && (
        <LokiVolumeChart
          data={volumeData}
          isCollapsed={volumeCollapsed}
          onToggleCollapse={() => setVolumeCollapsed((v) => !v)}
          t={{ logsVolume: t.logsVolume, tooltipLogs: t.tooltipLogs }}
        />
      )}

      {hasQueried && <LokiOptionsBar options={options} onChange={setOptions} t={t.options} />}

      {hasQueried ? (
        <LokiLogTable
          query={query}
          logs={sortedLogs}
          isLoading={isLoading}
          options={options}
          totalRows={sortedLogs.length}
          lineLimit={lineLimit}
          hasMoreOlder={hasMoreOlder}
          hasMoreNewer={hasMoreNewer}
          isLoadingOlder={isLoadingOlder}
          isLoadingNewer={isLoadingNewer}
          onLoadOlder={handleLoadOlder}
          onLoadNewer={handleLoadNewer}
          onLineLimitChange={handleLineLimitChange}
          onLogSelect={setSelectedLog}
          onIconClick={(log) => {
            setSelectedLog(log)
            setIsFlyoutOpen(true)
          }}
          selectedLog={selectedLog}
          t={{ ...t.table, pagination: t.pagination, logsHeader: t.logsHeader }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/30 border border-slate-800 flex items-center justify-center">
            <Database className="w-7 h-7 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-400 mb-1">{t.emptyStateTitle}</p>
            <p className="text-xs text-slate-600">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-500 font-mono text-[10px]">Ctrl+Enter</kbd>{' '}
              {t.emptyStateHint}
            </p>
          </div>
        </div>
      )}

      {isFlyoutOpen && (
        <LokiLogFlyout
          log={selectedLog}
          onClose={() => setIsFlyoutOpen(false)}
          dict={t.flyout as unknown as FlyoutDict}
        />
      )}
    </div>
  )
}
