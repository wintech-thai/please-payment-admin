'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { RefreshCcw, X, ShieldAlert, Code2, Users, Globe, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { useLang } from '@/context/LanguageContext'
import { AuditLogHistogram } from '@/components/AuditLogHistogram'
import { TopNPanel, type TopNBucket } from '@/components/TopNPanel'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

function getTimeFilter(tr: TimeRangeValue): { gte: string; lte?: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { gte: new Date(tr.start * 1000).toISOString(), lte: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  let startMs = now
  if (unit === 'm') startMs = now - num * 60_000
  else if (unit === 'h') startMs = now - num * 3_600_000
  else startMs = now - num * 86_400_000
  return { gte: new Date(startMs).toISOString() }
}

function calculateInterval(tr: TimeRangeValue): string {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    const diffH = (tr.end - tr.start) / 3600
    if (diffH <= 1) return '30s'
    if (diffH <= 24) return '30m'
    return '1d'
  }
  const v = tr.value
  if (v.endsWith('m') || v === '1h') return '30s'
  if (v === '24h' || v === '1d') return '30m'
  if (v.endsWith('d')) return '1d'
  return '1h'
}

const REFRESH_OPTIONS = [
  { value: '0', key: 'refreshOff' },
  { value: '10000', key: 'refresh10s' },
  { value: '30000', key: 'refresh30s' },
  { value: '60000', key: 'refresh1m' },
  { value: '300000', key: 'refresh5m' },
] as const

export default function SystemMonitoringPage() {
  const { t } = useLang()
  const sm = t.systemMonitoring
  const tAL = t.auditLog

  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '24h' })
  const [refreshMs, setRefreshMs] = useState('0')
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [chartData, setChartData] = useState<any[]>([])
  const [chartMax, setChartMax] = useState(1)
  const [chartInterval, setChartInterval] = useState('30m')
  const [apiBuckets, setApiBuckets] = useState<TopNBucket[]>([])
  const [userBuckets, setUserBuckets] = useState<TopNBucket[]>([])
  const [ipBuckets, setIpBuckets] = useState<TopNBucket[]>([])
  const [statusBuckets, setStatusBuckets] = useState<TopNBucket[]>([])
  const [bruteforceBuckets, setBruteforceBuckets] = useState<TopNBucket[]>([])

  const [filterApi, setFilterApi] = useState<string | null>(null)
  const [filterUser, setFilterUser] = useState<string | null>(null)
  const [filterIp, setFilterIp] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const getOrgId = () => typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''

  const fetchData = useCallback(async () => {
    const orgId = getOrgId()
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const currentInterval = calculateInterval(timeRange)
      setChartInterval(currentInterval)

      const { gte, lte } = getTimeFilter(timeRange)
      const tsFilter: any = { gte }
      if (lte) tsFilter.lte = lte
      const queryMust: any[] = [{ range: { '@timestamp': tsFilter } }]

      if (filterApi) queryMust.push({ term: { 'data.api.ApiName.keyword': filterApi } })
      if (filterUser) queryMust.push({ term: { 'data.userInfo.UserName.keyword': filterUser } })
      if (filterIp) queryMust.push({ term: { 'data.ClientIp.keyword': filterIp } })
      if (filterStatus) queryMust.push({ term: { 'data.StatusCode': Number(filterStatus) } })

      const esPayload = {
        size: 0,
        track_total_hits: true,
        query: { bool: { must: queryMust } },
        aggs: {
          timeline: {
            date_histogram: { field: '@timestamp', fixed_interval: currentInterval, min_doc_count: 0 },
            aggs: { group_by_api: { terms: { field: 'data.api.ApiName.keyword', size: 4 } } },
          },
          by_api: { terms: { field: 'data.api.ApiName.keyword', size: 10 } },
          by_user: { terms: { field: 'data.userInfo.UserName.keyword', size: 10 } },
          by_ip: { terms: { field: 'data.ClientIp.keyword', size: 10 } },
          by_status: { terms: { field: 'data.StatusCode', size: 10 } },
          bruteforce: {
            filter: { term: { 'data.StatusCode': 401 } },
            aggs: { by_ip: { terms: { field: 'data.ClientIp.keyword', size: 10 } } },
          },
        },
      }

      const res = await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
        body: JSON.stringify({ esPayload }),
      })
      const result = await res.json()

      if (result.status === 'OK') {
        setTotalCount(result.total)
        const aggs = result.aggregations || {}
        const tlBuckets = aggs.timeline?.buckets || []
        setChartData(tlBuckets)
        setChartMax(Math.max(1, ...tlBuckets.map((b: any) => b.doc_count as number)))
        setApiBuckets((aggs.by_api?.buckets || []).map((b: any) => ({ key: String(b.key), doc_count: b.doc_count })))
        setUserBuckets((aggs.by_user?.buckets || []).map((b: any) => ({ key: String(b.key), doc_count: b.doc_count })))
        setIpBuckets((aggs.by_ip?.buckets || []).map((b: any) => ({ key: String(b.key), doc_count: b.doc_count })))
        setStatusBuckets((aggs.by_status?.buckets || []).map((b: any) => ({ key: String(b.key), doc_count: b.doc_count })))
        setBruteforceBuckets((aggs.bruteforce?.by_ip?.buckets || []).map((b: any) => ({ key: String(b.key), doc_count: b.doc_count })))
      } else {
        throw new Error(result.message)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tAL.failedToLoad)
      setChartData([])
      setApiBuckets([])
      setUserBuckets([])
      setIpBuckets([])
      setStatusBuckets([])
      setBruteforceBuckets([])
    } finally {
      setIsLoading(false)
    }
  }, [timeRange, filterApi, filterUser, filterIp, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh polling
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const ms = Number(refreshMs)
    if (ms > 0) {
      intervalRef.current = setInterval(() => fetchData(), ms)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [refreshMs, fetchData])

  const activeFilters = [
    filterApi && { label: filterApi, clear: () => setFilterApi(null) },
    filterUser && { label: filterUser, clear: () => setFilterUser(null) },
    filterIp && { label: filterIp, clear: () => setFilterIp(null) },
    filterStatus && { label: filterStatus, clear: () => setFilterStatus(null) },
  ].filter(Boolean) as { label: string; clear: () => void }[]

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl px-6 py-5 shadow-md shadow-primary-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary-100 uppercase tracking-widest">{sm.subtitle}</p>
                <h1 className="text-xl font-bold text-white mt-0.5">{sm.title}</h1>
              </div>
            </div>
            <button onClick={() => fetchData()} disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50 border border-white/25">
              <RefreshCcw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
              {sm.refreshLabel}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">{sm.filteredBy}:</span>
              {activeFilters.map(f => (
                <span key={f.label} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 bg-primary-50 text-primary-700 ring-1 ring-primary-200 rounded-full text-xs font-medium">
                  {f.label}
                  <button onClick={f.clear} className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-primary-200 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <AdvancedTimeRangeSelector value={timeRange} onChange={setTimeRange} disabled={isLoading} />

            <select
              value={refreshMs}
              onChange={e => setRefreshMs(e.target.value)}
              title={sm.refreshLabel}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
            >
              {REFRESH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{sm.refreshLabel}: {sm[opt.key]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline histogram (by API) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
          <AuditLogHistogram
            data={chartData}
            totalHits={totalCount}
            interval={chartInterval}
            maxDocCount={chartMax}
            dict={{ totalLogs: tAL.totalLogs }}
            height={160}
          />
        </div>

        {/* Top N grids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TopNPanel
            title={sm.panelByApi}
            data={apiBuckets}
            activeKey={filterApi}
            onSelect={key => setFilterApi(prev => prev === key ? null : key)}
            colCountLabel={sm.colCount}
            loading={isLoading}
            icon={Code2}
            iconWrapClassName="bg-primary-50 text-primary-600"
            topBarClassName="bg-gradient-to-r from-primary-400 to-primary-600"
          />
          <TopNPanel
            title={sm.panelByUser}
            data={userBuckets}
            activeKey={filterUser}
            onSelect={key => setFilterUser(prev => prev === key ? null : key)}
            colCountLabel={sm.colCount}
            loading={isLoading}
            accentClassName="bg-violet-500"
            icon={Users}
            iconWrapClassName="bg-violet-50 text-violet-600"
            topBarClassName="bg-gradient-to-r from-violet-400 to-violet-600"
          />
          <TopNPanel
            title={sm.panelByIp}
            data={ipBuckets}
            activeKey={filterIp}
            onSelect={key => setFilterIp(prev => prev === key ? null : key)}
            colCountLabel={sm.colCount}
            loading={isLoading}
            accentClassName="bg-amber-500"
            icon={Globe}
            iconWrapClassName="bg-amber-50 text-amber-600"
            topBarClassName="bg-gradient-to-r from-amber-400 to-orange-500"
          />
          <TopNPanel
            title={sm.panelByStatus}
            data={statusBuckets}
            activeKey={filterStatus}
            onSelect={key => setFilterStatus(prev => prev === key ? null : key)}
            colCountLabel={sm.colCount}
            loading={isLoading}
            accentClassName="bg-emerald-500"
            icon={AlertTriangle}
            iconWrapClassName="bg-emerald-50 text-emerald-600"
            topBarClassName="bg-gradient-to-r from-emerald-400 to-teal-500"
          />
        </div>

        {/* Bruteforce detection */}
        <TopNPanel
          title={sm.panelBruteforce}
          data={bruteforceBuckets}
          activeKey={filterIp}
          onSelect={key => setFilterIp(prev => prev === key ? null : key)}
          colCountLabel={sm.colCount}
          loading={isLoading}
          emptyLabel={sm.noBruteforceFound}
          icon={ShieldAlert}
          variant="warning"
        />

      </div>
    </div>
  )
}
