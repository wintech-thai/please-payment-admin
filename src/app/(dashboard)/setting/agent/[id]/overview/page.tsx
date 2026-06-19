'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import type { AgentEventTimeSeriesItem } from '@/lib/api/agent.api'
import type { AgentItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { AgentEventHistogram } from '@/components/AgentEventHistogram'

interface HeartbeatData {
  CPU?: string | null
  Memory?: string | null
  Battery?: string | null
  Model?: string | null
  DeviceId?: string | null
  Storage?: string | null
  Network?: string | null
  OsVersion?: string | null
  AppVersion?: string | null
  Uptime?: string | null
}

interface BatteryPoint {
  time: string
  battery: number
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value ?? '—'}</p>
    </div>
  )
}

function MetricBar({ label, value, unit = '%', color = 'bg-primary-500' }: {
  label: string; value?: string | null; unit?: string; color?: string
}) {
  const num = value ? parseInt(value) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-sm font-bold text-gray-800">{value ?? '—'}{value ? unit : ''}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(num, 100)}%` }}
        />
      </div>
    </div>
  )
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}

function formatChartTime(d: string) {
  try {
    return new Date(d).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  } catch { return d }
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

const DEFAULT_TIME_RANGE: TimeRangeValue = { type: 'relative', value: '24h', label: 'Last 24 hours' }

export default function AgentOverviewPage() {
  const { t } = useLang()
  const m = t.agent
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<AgentItem | null>(null)
  const [latestHeartbeat, setLatestHeartbeat] = useState<HeartbeatData | null>(null)
  const [heartbeatDate, setHeartbeatDate] = useState<string | null>(null)
  const [batteryHistory, setBatteryHistory] = useState<BatteryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [timeRange, setTimeRange] = useState<TimeRangeValue>(DEFAULT_TIME_RANGE)
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([])
  const [timeSeriesEventTypes, setTimeSeriesEventTypes] = useState<string[]>([])
  const [timeSeriesInterval, setTimeSeriesInterval] = useState<'minute' | 'hour' | 'day'>('hour')
  const [timeSeriesTotal, setTimeSeriesTotal] = useState(0)

  const loadTimeSeries = useCallback(async (tr: TimeRangeValue) => {
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const rangeHours = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 3_600_000
      const interval: 'minute' | 'hour' | 'day' = rangeHours <= 2 ? 'minute' : rangeHours <= 48 ? 'hour' : 'day'
      setTimeSeriesInterval(interval)

      const res = await agentApi.getAgentEventTimeSeries(agentId, { FromDate: fromDate, ToDate: toDate })
      const raw: AgentEventTimeSeriesItem[] = (res.data as any) ?? []
      if (!Array.isArray(raw) || raw.length === 0) {
        setTimeSeriesData([])
        setTimeSeriesEventTypes([])
        setTimeSeriesTotal(0)
        return
      }

      const types = Array.from(new Set(raw.map(r => r.eventType))).filter(Boolean)
      setTimeSeriesEventTypes(types)
      setTimeSeriesTotal(raw.reduce((s, r) => s + r.count, 0))

      const grouped: Record<string, Record<string, number>> = {}
      raw.forEach(r => {
        if (!grouped[r.time]) grouped[r.time] = {}
        grouped[r.time][r.eventType] = (grouped[r.time][r.eventType] ?? 0) + r.count
      })
      const chartData = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, counts]) => ({ time, ...counts }))
      setTimeSeriesData(chartData)
    } catch { /* chart is optional */ }
  }, [agentId])

  const loadBatteryHistory = useCallback(async (tr: TimeRangeValue) => {
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const res = await agentApi.getAgentEvents(agentId, {
        EventType: 'Heartbeat',
        Limit: 200,
        Page: 1,
        FromDate: fromDate,
        ToDate: toDate,
      })
      const eventsData = res.data as any
      const events: any[] = eventsData?.events ?? eventsData ?? []
      const history: BatteryPoint[] = events
        .filter(e => {
          const rd = e?.agentEvent?.rawDataObj ?? e?.AgentEvent?.rawDataObj ?? e?.rawDataObj ?? {}
          return rd?.Battery != null
        })
        .map(e => {
          const rd = e?.agentEvent?.rawDataObj ?? e?.AgentEvent?.rawDataObj ?? e?.rawDataObj ?? {}
          return { time: e.createdDate ?? '', battery: parseInt(rd.Battery ?? '0') || 0 }
        })
        .reverse()
      setBatteryHistory(history)
    } catch { /* optional */ }
  }, [agentId])

  const loadData = useCallback(async (isRefresh = false, tr = timeRange) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const agentRes = await agentApi.getAgentById(agentId)
      const agentData = agentRes.data as any
      setAgent(agentData?.agent ?? agentData)

      // Latest heartbeat — always fetch the most recent regardless of time range
      const latestRes = await agentApi.getAgentEvents(agentId, { EventType: 'Heartbeat', Limit: 1, Page: 1 })
      const latestData = latestRes.data as any
      const latestEvents: any[] = latestData?.events ?? latestData ?? []
      if (latestEvents.length > 0) {
        const latest = latestEvents[0]
        const rawData: HeartbeatData = latest?.agentEvent?.rawDataObj ?? latest?.AgentEvent?.rawDataObj ?? latest?.rawDataObj ?? {}
        setLatestHeartbeat(rawData)
        setHeartbeatDate(latest?.createdDate ?? null)
      }

      await Promise.all([loadTimeSeries(tr), loadBatteryHistory(tr)])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.overviewLoadFailed)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [agentId, m.overviewLoadFailed, loadTimeSeries, loadBatteryHistory, timeRange])

  useEffect(() => { loadData() }, [])

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    loadTimeSeries(tr)
    loadBatteryHistory(tr)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  const batteryNum = latestHeartbeat?.Battery ? parseInt(latestHeartbeat.Battery) : null
  const batteryColor = batteryNum == null ? 'bg-gray-300'
    : batteryNum <= 20 ? 'bg-red-500'
    : batteryNum <= 50 ? 'bg-amber-400'
    : 'bg-emerald-500'

  const networkOnline = latestHeartbeat?.Network && latestHeartbeat.Network.toLowerCase() !== 'none'

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/setting/agent?highlight=${agentId}`)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{m.overviewTitle}</h1>
              {agent?.code && (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{agent.code}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{m.overviewSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
          <button
            onClick={() => loadData(true, timeRange)}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 custom-scrollbar">

        {/* Event histogram */}
        <AgentEventHistogram
          data={timeSeriesData}
          eventTypes={timeSeriesEventTypes}
          total={timeSeriesTotal}
          interval={timeSeriesInterval}
          height={160}
        />

        {!latestHeartbeat ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-12 text-center">
            <p className="text-gray-400 text-sm">{m.overviewNoHeartbeat}</p>
          </div>
        ) : (
          <>
            {/* Last heartbeat timestamp */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {networkOnline
                  ? <Wifi className="w-4 h-4 text-emerald-500" />
                  : <WifiOff className="w-4 h-4 text-gray-400" />
                }
                <span className="text-sm font-semibold text-gray-700">{m.overviewLastHeartbeat}</span>
                <span className="text-sm text-gray-500">{formatDate(heartbeatDate)}</span>
              </div>
              <span className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1',
                networkOnline
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-gray-100 text-gray-500 ring-gray-200'
              )}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', networkOnline ? 'bg-emerald-500' : 'bg-gray-400')} />
                {latestHeartbeat.Network ?? '—'}
              </span>
            </div>

            {/* Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
              <SectionHeader>{m.overviewDeviceInfo}</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <MetricBar label={m.overviewCPU} value={latestHeartbeat.CPU} color="bg-violet-500" />
                <MetricBar label={m.overviewMemory} value={latestHeartbeat.Memory} color="bg-primary-500" />
                <MetricBar label={m.overviewBattery} value={latestHeartbeat.Battery} color={batteryColor} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <InfoRow label={m.overviewModel} value={latestHeartbeat.Model} />
                <InfoRow label={m.overviewDeviceId} value={latestHeartbeat.DeviceId} />
                <InfoRow label={m.overviewStorage} value={latestHeartbeat.Storage} />
                <InfoRow label={m.overviewOsVersion} value={latestHeartbeat.OsVersion} />
                <InfoRow label={m.overviewAppVersion} value={latestHeartbeat.AppVersion} />
                <InfoRow label={m.overviewUptime} value={latestHeartbeat.Uptime ? `${latestHeartbeat.Uptime}s` : null} />
              </div>
            </div>

            {/* Battery trend */}
            {batteryHistory.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
                <SectionHeader>{m.overviewBatteryChart}</SectionHeader>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={batteryHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="rgb(var(--color-primary-500))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatChartTime}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        formatter={(v: any) => [`${v}%`, m.overviewBattery]}
                        labelFormatter={(l: any) => formatDate(String(l))}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="battery"
                        stroke="rgb(var(--color-primary-500))"
                        strokeWidth={2}
                        fill="url(#batteryGrad)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
