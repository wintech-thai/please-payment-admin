'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCcw, Cpu, MemoryStick } from 'lucide-react'
import clsx from 'clsx'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useLang } from '@/context/LanguageContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import {
  queryPrometheus, queryRangePrometheus, getLabelValues,
  type PrometheusResult, type PrometheusRangeResult,
} from '@/lib/api/prometheus.api'

type WorkloadType = 'ALL' | 'deployment' | 'statefulset' | 'daemonset' | 'cronjob'
const ALL_NS = 'ALL'

const PALETTE = ['#f06b1e', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#eab308', '#6366f1']
function colorFor(i: number) { return PALETTE[i % PALETTE.length] }

function nsMatcher(namespace: string) {
  return namespace !== ALL_NS ? `namespace="${namespace}"` : ''
}
function ownerSelector(namespace: string, workloadType: WorkloadType) {
  const parts = [nsMatcher(namespace)]
  parts.push(workloadType !== 'ALL' ? `workload_type="${workloadType}"` : 'workload_type=~".+"')
  return parts.filter(Boolean).join(',')
}
function groupByClause(namespace: string) {
  return namespace !== ALL_NS ? 'by (namespace, workload, workload_type)' : 'by (namespace)'
}

function cpuUsageQuery(ns: string, wt: WorkloadType) {
  const nsSel = nsMatcher(ns)
  return `sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_rate5m${nsSel ? `{${nsSel}}` : ''}`
    + ` * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{${ownerSelector(ns, wt)}}) ${groupByClause(ns)}`
}
function memUsageQuery(ns: string, wt: WorkloadType) {
  const nsSel = nsMatcher(ns)
  return `sum(container_memory_working_set_bytes{job="kubelet", metrics_path="/metrics/cadvisor", container!="", image!=""${nsSel ? `, ${nsSel}` : ''}}`
    + ` * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{${ownerSelector(ns, wt)}}) ${groupByClause(ns)}`
}
function cpuRequestQuery(ns: string, wt: WorkloadType) {
  const nsSel = nsMatcher(ns)
  return `sum(kube_pod_container_resource_requests{resource="cpu"${nsSel ? `, ${nsSel}` : ''}}`
    + ` * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{${ownerSelector(ns, wt)}}) ${groupByClause(ns)}`
}
function cpuLimitQuery(ns: string, wt: WorkloadType) {
  const nsSel = nsMatcher(ns)
  return `sum(kube_pod_container_resource_limits{resource="cpu"${nsSel ? `, ${nsSel}` : ''}}`
    + ` * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{${ownerSelector(ns, wt)}}) ${groupByClause(ns)}`
}
function memRequestQuery(ns: string, wt: WorkloadType) {
  const nsSel = nsMatcher(ns)
  return `sum(kube_pod_container_resource_requests{resource="memory"${nsSel ? `, ${nsSel}` : ''}}`
    + ` * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{${ownerSelector(ns, wt)}}) ${groupByClause(ns)}`
}
function memLimitQuery(ns: string, wt: WorkloadType) {
  const nsSel = nsMatcher(ns)
  return `sum(kube_pod_container_resource_limits{resource="memory"${nsSel ? `, ${nsSel}` : ''}}`
    + ` * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{${ownerSelector(ns, wt)}}) ${groupByClause(ns)}`
}

function rowKey(m: Record<string, string>, namespace: string) {
  return namespace !== ALL_NS ? (m.workload || 'unknown') : (m.namespace || 'unknown')
}

interface Row { key: string; namespace: string; workloadType: string; usage: number; request: number; limit: number }

function mergeInstant(
  usage: PrometheusResult[], request: PrometheusResult[], limit: PrometheusResult[], namespace: string
): Row[] {
  const map = new Map<string, Row>()
  const ensure = (m: Record<string, string>): Row => {
    const key = rowKey(m, namespace)
    let row = map.get(key)
    if (!row) {
      row = { key, namespace: m.namespace || '', workloadType: m.workload_type || '', usage: 0, request: 0, limit: 0 }
      map.set(key, row)
    }
    return row
  }
  usage.forEach((r) => { ensure(r.metric).usage = parseFloat(r.value[1]) || 0 })
  request.forEach((r) => { ensure(r.metric).request = parseFloat(r.value[1]) || 0 })
  limit.forEach((r) => { ensure(r.metric).limit = parseFloat(r.value[1]) || 0 })
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
}

function mergeRange(results: PrometheusRangeResult[], namespace: string): { data: Record<string, number | string>[]; keys: string[] } {
  const keys = results.map((r) => rowKey(r.metric, namespace))
  const pointsMap = new Map<number, Record<string, number | string>>()
  results.forEach((r, idx) => {
    const key = keys[idx]
    r.values.forEach(([ts, val]) => {
      const tMs = ts * 1000
      if (!pointsMap.has(tMs)) pointsMap.set(tMs, { ts: tMs })
      ;(pointsMap.get(tMs) as Record<string, number>)[key] = parseFloat(val) || 0
    })
  })
  const data = Array.from(pointsMap.values()).sort((a, b) => (a.ts as number) - (b.ts as number))
  return { data, keys: Array.from(new Set(keys)) }
}

function getPromRange(tr: TimeRangeValue): { start: number; end: number; step: number } {
  let start: number
  let end: number
  if (tr.type === 'absolute' && tr.start && tr.end) {
    start = tr.start
    end = tr.end
  } else {
    end = Math.floor(Date.now() / 1000)
    const num = parseInt(tr.value) || 1
    const unit = tr.value.replace(/\d/g, '')
    const secs = unit === 'm' ? num * 60 : unit === 'h' ? num * 3600 : num * 86400
    start = end - secs
  }
  const step = Math.max(15, Math.floor((end - start) / 120))
  return { start, end, step }
}

function fmtCores(v: number) { return `${v.toFixed(3)} core` }
function fmtBytes(v: number) {
  if (v >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(2)} GiB`
  if (v >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(1)} MiB`
  if (v >= 1024) return `${(v / 1024).toFixed(1)} KiB`
  return `${v.toFixed(0)} B`
}
function fmtHHmm(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface ChartTooltipPayloadItem { dataKey: string; value: number | string; color: string }
function ChartTooltip({ active, payload, label, fmt, scrollRef }: {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: number
  fmt: (v: number) => string
  /** Lets the parent scroll this popup via the mouse wheel without the cursor ever entering it
   *  (recharts repositions the popup to follow the cursor, so moving the mouse INTO it to drag
   *  a scrollbar keeps re-targeting a different data point along the way). */
  scrollRef?: React.RefObject<HTMLDivElement>
}) {
  if (!active || !payload || payload.length === 0) return null
  const sorted = [...payload].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-[11px]" style={{ minWidth: 200 }}>
      <div className="bg-gray-50 px-3 py-1.5 font-mono text-gray-500 border-b border-gray-100">
        {fmtHHmm(label ?? 0)}
      </div>
      <div ref={scrollRef} className="max-h-[200px] overflow-y-auto">
        <table className="w-full">
          <tbody>
            {sorted.map((p) => (
              <tr key={p.dataKey} className="border-t border-gray-50 first:border-0">
                <td className="px-3 py-1">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: p.color }} />
                    <span className="text-gray-600 truncate max-w-[140px]">{p.dataKey}</span>
                  </span>
                </td>
                <td className="px-3 py-1 text-right font-mono font-semibold text-gray-900 whitespace-nowrap">
                  {fmt(Number(p.value) || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex-1 min-w-[140px]">
      <div className={clsx('text-[10px] font-semibold uppercase tracking-wider mb-1', colorClass)}>{label}</div>
      <div className="text-lg font-bold text-gray-900 font-mono">{value}</div>
    </div>
  )
}

function ResourceSection({
  title, icon, rows, seriesData, seriesKeys, fmt, loading, namespace, dict, storageKey,
}: {
  title: string
  icon: React.ReactNode
  rows: Row[]
  seriesData: Record<string, number | string>[]
  seriesKeys: string[]
  fmt: (v: number) => string
  loading: boolean
  namespace: string
  dict: typeof import('@/lib/translations').translations.en.resourceMonitoring
  /** sessionStorage key for this section's row-highlight persistence. */
  storageKey: string
}) {
  const totalUsage = rows.reduce((s, r) => s + r.usage, 0)
  const totalRequest = rows.reduce((s, r) => s + r.request, 0)
  const totalLimit = rows.reduce((s, r) => s + r.limit, 0)

  const [highlightedKey, setHighlightedKey] = useState<string>(() => {
    try { return sessionStorage.getItem(storageKey) ?? '' } catch { return '' }
  })
  const toggleHighlight = (key: string) => {
    const next = highlightedKey === key ? '' : key
    setHighlightedKey(next)
    try { sessionStorage.setItem(storageKey, next) } catch {}
  }

  // Lets the mouse WHEEL scroll the popup's list without the cursor ever moving into it —
  // moving the cursor toward the popup to reach a scrollbar crosses back over the plot area,
  // which keeps re-targeting a different data point along the way. Scrolling in place avoids
  // that entirely: the ref points at the popup's current scrollable div (recharts re-renders
  // it via `content`), and the wheel handler lives on the chart wrapper, not the popup itself.
  const tooltipScrollRef = useRef<HTMLDivElement>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = chartWrapperRef.current
    if (!el) return
    // React's synthetic onWheel is attached as a PASSIVE listener, so preventDefault() inside
    // it is silently ignored and the page scrolls anyway — a native listener is required to
    // actually stop that while redirecting the wheel into the popup.
    const handleWheel = (e: WheelEvent) => {
      if (tooltipScrollRef.current) {
        tooltipScrollRef.current.scrollTop += e.deltaY
        e.preventDefault()
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <KpiCard label={dict.kpiTotalUsage} value={fmt(totalUsage)} colorClass="text-primary-600" />
        <KpiCard label={dict.kpiTotalRequest} value={fmt(totalRequest)} colorClass="text-amber-600" />
        <KpiCard label={dict.kpiTotalLimit} value={fmt(totalLimit)} colorClass="text-red-600" />
      </div>

      {/* Time series chart */}
      <div ref={chartWrapperRef} className="bg-white rounded-xl border border-gray-100 p-3 mb-4" style={{ height: 260 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">{dict.loading}</div>
        ) : seriesData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-gray-300">{dict.noData}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="ts" tickFormatter={fmtHHmm} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} width={70} />
              <Tooltip content={<ChartTooltip fmt={fmt} scrollRef={tooltipScrollRef} />} wrapperStyle={{ zIndex: 50 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {totalRequest > 0 && namespace !== ALL_NS && (
                <ReferenceLine y={totalRequest} stroke="#eab308" strokeDasharray="4 4" />
              )}
              {totalLimit > 0 && namespace !== ALL_NS && (
                <ReferenceLine y={totalLimit} stroke="#ef4444" strokeDasharray="4 4" />
              )}
              {seriesKeys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={colorFor(i)} dot={false} activeDot={{ r: 3 }} strokeWidth={1.75} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Snapshot table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-primary-50 text-primary-600 uppercase tracking-wider text-[10px]">
              <th className="text-left px-3 py-2">{namespace !== ALL_NS ? dict.colWorkload : dict.colNamespace}</th>
              {namespace !== ALL_NS && <th className="text-left px-3 py-2">{dict.colType}</th>}
              <th className="text-right px-3 py-2">{dict.colUsage}</th>
              <th className="text-right px-3 py-2">{dict.colRequest}</th>
              <th className="text-right px-3 py-2">{dict.colLimit}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-6 text-gray-400">{dict.loading}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-gray-300">{dict.noData}</td></tr>
            ) : rows.map((r) => (
              <tr
                key={r.key}
                onClick={() => toggleHighlight(r.key)}
                className={clsx(
                  'border-t border-gray-50 cursor-pointer transition-colors',
                  highlightedKey === r.key
                    ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                    : 'hover:bg-gray-50'
                )}
              >
                <td className="px-3 py-2 font-medium text-gray-800">{r.key}</td>
                {namespace !== ALL_NS && <td className="px-3 py-2 text-gray-500">{r.workloadType}</td>}
                <td className="px-3 py-2 text-right font-mono text-gray-900">{fmt(r.usage)}</td>
                <td className="px-3 py-2 text-right font-mono text-amber-600">{fmt(r.request)}</td>
                <td className="px-3 py-2 text-right font-mono text-red-600">{fmt(r.limit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ResourceMonitoringPage() {
  const { t } = useLang()
  const rm = t.resourceMonitoring

  const [namespaces, setNamespaces] = useState<string[]>([])
  const [namespace, setNamespace] = useState<string>(ALL_NS)
  const [workloadType, setWorkloadType] = useState<WorkloadType>('ALL')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '1h' })
  const [loading, setLoading] = useState(true)

  const [cpuRows, setCpuRows] = useState<Row[]>([])
  const [memRows, setMemRows] = useState<Row[]>([])
  const [cpuSeries, setCpuSeries] = useState<{ data: Record<string, number | string>[]; keys: string[] }>({ data: [], keys: [] })
  const [memSeries, setMemSeries] = useState<{ data: Record<string, number | string>[]; keys: string[] }>({ data: [], keys: [] })

  useEffect(() => {
    getLabelValues('namespace').then((ns) => setNamespaces(ns.sort())).catch(() => setNamespaces([]))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end, step } = getPromRange(timeRange)

      const [cpuUsageR, cpuReqR, cpuLimR, memUsageR, memReqR, memLimR, cpuSeriesR, memSeriesR] = await Promise.all([
        queryPrometheus(cpuUsageQuery(namespace, workloadType)),
        queryPrometheus(cpuRequestQuery(namespace, workloadType)),
        queryPrometheus(cpuLimitQuery(namespace, workloadType)),
        queryPrometheus(memUsageQuery(namespace, workloadType)),
        queryPrometheus(memRequestQuery(namespace, workloadType)),
        queryPrometheus(memLimitQuery(namespace, workloadType)),
        queryRangePrometheus(cpuUsageQuery(namespace, workloadType), start, end, step),
        queryRangePrometheus(memUsageQuery(namespace, workloadType), start, end, step),
      ])

      setCpuRows(mergeInstant(cpuUsageR, cpuReqR, cpuLimR, namespace))
      setMemRows(mergeInstant(memUsageR, memReqR, memLimR, namespace))
      setCpuSeries(mergeRange(cpuSeriesR, namespace))
      setMemSeries(mergeRange(memSeriesR, namespace))
    } catch {
      setCpuRows([]); setMemRows([])
      setCpuSeries({ data: [], keys: [] }); setMemSeries({ data: [], keys: [] })
    } finally {
      setLoading(false)
    }
  }, [namespace, workloadType, timeRange])

  useEffect(() => { fetchData() }, [fetchData])

  const namespaceOptions = useMemo(() => [ALL_NS, ...namespaces], [namespaces])

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
      <div className="space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl px-6 py-5 flex items-center justify-between text-white">
          <div>
            <h1 className="text-lg font-bold">{rm.title}</h1>
            <p className="text-primary-100 text-xs mt-0.5">{rm.subtitle}</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors px-3 py-2 rounded-lg text-xs font-semibold"
          >
            <RefreshCcw size={14} className={clsx(loading && 'animate-spin')} />
            {rm.refresh}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">{rm.namespaceLabel}</label>
            <select
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {namespaceOptions.map((ns) => (
                <option key={ns} value={ns}>{ns === ALL_NS ? rm.namespaceAll : ns}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">{rm.workloadTypeLabel}</label>
            <select
              value={workloadType}
              onChange={(e) => setWorkloadType(e.target.value as WorkloadType)}
              disabled={namespace === ALL_NS}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-40"
            >
              <option value="ALL">{rm.workloadTypeAll}</option>
              <option value="deployment">Deployment</option>
              <option value="statefulset">StatefulSet</option>
              <option value="daemonset">DaemonSet</option>
              <option value="cronjob">CronJob</option>
            </select>
          </div>

          <div className="ml-auto">
            <AdvancedTimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        </div>

        {namespace === ALL_NS && (
          <p className="text-xs text-gray-400 -mt-2">{rm.selectNamespaceHint}</p>
        )}

        <ResourceSection
          title={rm.cpuTitle}
          icon={<Cpu size={16} className="text-primary-600" />}
          rows={cpuRows}
          seriesData={cpuSeries.data}
          seriesKeys={cpuSeries.keys}
          fmt={fmtCores}
          loading={loading}
          namespace={namespace}
          dict={rm}
          storageKey="resourceMonitoring_cpu_highlight"
        />

        <ResourceSection
          title={rm.memoryTitle}
          icon={<MemoryStick size={16} className="text-primary-600" />}
          rows={memRows}
          seriesData={memSeries.data}
          seriesKeys={memSeries.keys}
          fmt={fmtBytes}
          loading={loading}
          namespace={namespace}
          dict={rm}
          storageKey="resourceMonitoring_mem_highlight"
        />
      </div>
    </div>
  )
}
