'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Users, CheckCircle, XCircle, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { summaryApi } from '@/lib/api/summary.api'
import type { MerchantSummaryResponse, MerchantSummaryItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { useLang } from '@/context/LanguageContext'

const CHART_COLORS = ['#c0530f','#059669','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6']

type BreakdownTab = 'payIn' | 'payOut' | 'payInFee' | 'payOutFee'

// same as payment pages
function getTimeFilter(tr: TimeRangeValue): { FromDate: string; ToDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return {
      FromDate: new Date(tr.start * 1000).toISOString(),
      ToDate:   new Date(tr.end   * 1000).toISOString(),
    }
  }
  const num  = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now  = Date.now()
  let startMs = now
  if (unit === 'm') startMs = now - num * 60_000
  else if (unit === 'h') startMs = now - num * 3_600_000
  else startMs = now - num * 86_400_000
  return { FromDate: new Date(startMs).toISOString(), ToDate: new Date(now).toISOString() }
}

function fmt(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtInt(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US')
}
function sumAmount(arr?: MerchantSummaryItem[] | null) {
  return (arr ?? []).reduce((s, x) => s + (x.txAmount ?? 0), 0)
}
function sumFee(arr?: MerchantSummaryItem[] | null) {
  return (arr ?? []).reduce((s, x) => s + (x.feeAmount ?? 0), 0)
}
function itemLabel(m: MerchantSummaryItem) { return m.merchantCode ?? '—' }
function statusCount(arr?: MerchantSummaryItem[] | null, status?: string) {
  return arr?.find(x => x.merchantStatus?.toLowerCase() === status?.toLowerCase())?.merchantCount ?? 0
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1 truncate max-w-[160px]">{label}</p>
      <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(payload[0]?.value)}</p>
    </div>
  )
}
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const total = payload[0]?.payload?.total
  const pct = total ? ((payload[0]?.value / total) * 100).toFixed(1) : null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1 truncate max-w-[160px]">{payload[0]?.name}</p>
      <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(payload[0]?.value)}</p>
      {pct && <p className="text-gray-400 mt-0.5">{pct}%</p>}
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, gradient }: {
  label: string; value: string | number
  icon: React.ElementType; gradient: string
}) {
  return (
    <div className={clsx('rounded-2xl p-5 shadow-md', gradient)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white tabular-nums mt-1.5 truncate">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 ml-3">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

// preset button → TimeRangeValue
type QuickPreset = '1D' | '7D' | '30D' | 'month'
function presetToRange(key: QuickPreset): TimeRangeValue {
  if (key === '1D')    return { type: 'relative', value: '1d',    label: '1 Day' }
  if (key === '7D')    return { type: 'relative', value: '7d',    label: '7 Days' }
  if (key === '30D')   return { type: 'relative', value: '30d',   label: '30 Days' }
  // This Month → absolute
  const now   = Math.floor(Date.now() / 1000)
  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
  return { type: 'absolute', value: 'thisMonth', start: Math.floor(start.getTime() / 1000), end: now }
}
function activePreset(tr: TimeRangeValue): QuickPreset | null {
  if (tr.type === 'relative') {
    if (tr.value === '1d')  return '1D'
    if (tr.value === '7d')  return '7D'
    if (tr.value === '30d') return '30D'
  }
  if (tr.type === 'absolute' && tr.value === 'thisMonth') return 'month'
  return null
}

export default function OverviewPage() {
  const { t } = useLang()
  const m = t.overview
  const [data, setData] = useState<MerchantSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [tab, setTab] = useState<BreakdownTab>('payIn')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async (tr: TimeRangeValue) => {
    setLoading(true)
    try {
      const { FromDate, ToDate } = getTimeFilter(tr)
      const res = await summaryApi.getMerchantSummary({ FromDate, ToDate })
      const d = res.data as any
      setData(d?.summary ?? d?.Summary ?? d)
    } catch {
      toast.error(m.failedToLoad)
    } finally {
      setLoading(false)
    }
  }, [m.failedToLoad])

  useEffect(() => { fetchData(timeRange) }, [])

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    fetchData(tr)
  }

  const handlePreset = (key: QuickPreset) => {
    const tr = presetToRange(key)
    setTimeRange(tr)
    fetchData(tr)
  }

  const totalPayIn    = useMemo(() => sumAmount(data?.merchantsPayInSummary), [data])
  const totalPayOut   = useMemo(() => sumAmount(data?.merchantsPayOutSummary), [data])
  const totalPayInFee = useMemo(() => sumFee(data?.merchantsPayInSummary), [data])
  const totalPayOutFee = useMemo(() => sumFee(data?.merchantsPayOutSummary), [data])
  const totalFee = totalPayInFee + totalPayOutFee

  const barData = useMemo(() => {
    if (!data?.merchantsBalances?.length) return []
    return [...data.merchantsBalances]
      .sort((a, b) => (b.balanceAmount ?? 0) - (a.balanceAmount ?? 0))
      .slice(0, 10)
      .map(x => ({ name: itemLabel(x), value: x.balanceAmount ?? 0 }))
  }, [data])

  const pieData = useMemo(() => {
    if (!data?.merchantsBalances?.length) return []
    const sorted = [...data.merchantsBalances].sort((a, b) => (b.balanceAmount ?? 0) - (a.balanceAmount ?? 0))
    const top  = sorted.slice(0, 10).map(x => ({ name: itemLabel(x), value: x.balanceAmount ?? 0 }))
    const rest = sorted.slice(10)
    if (rest.length) top.push({ name: m.others, value: rest.reduce((s, x) => s + (x.balanceAmount ?? 0), 0) })
    const total = top.reduce((s, x) => s + x.value, 0)
    return top.map(x => ({ ...x, total }))
  }, [data, m.others])

  const breakdownRows = useMemo((): { name: string; value: number }[] => {
    const src    = tab === 'payIn' || tab === 'payInFee' ? data?.merchantsPayInSummary : data?.merchantsPayOutSummary
    const getVal = (x: MerchantSummaryItem) => tab === 'payInFee' || tab === 'payOutFee' ? (x.feeAmount ?? 0) : (x.txAmount ?? 0)
    return (src ?? []).map(x => ({ name: itemLabel(x), value: getVal(x) })).sort((a, b) => b.value - a.value)
  }, [data, tab])

  const maxBreakdown = breakdownRows[0]?.value ?? 1
  const curPreset    = activePreset(timeRange)

  const quickPresets: { key: QuickPreset; label: string }[] = [
    { key: '1D',    label: m.preset1D },
    { key: '7D',    label: m.preset7D },
    { key: '30D',   label: m.preset30D },
    { key: 'month', label: m.presetThisMonth },
    // { key: 'all', label: m.presetAll },  // disabled until backend supports empty-range query
  ]

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-100">
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 rounded-2xl px-6 py-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">{m.title}</h1>
              <p className="text-sm text-white/70 mt-0.5">{m.subtitle}</p>
            </div>
            <button onClick={() => fetchData(timeRange)} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50 border border-white/25">
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              {m.refresh}
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            {quickPresets.map(p => (
              <button key={p.key} onClick={() => handlePreset(p.key)}
                className={clsx('px-3 py-1.5 text-xs font-semibold rounded-xl transition-all',
                  curPreset === p.key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-gray-400">{t.admin.loading}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label={m.totalFeeIncome}    value={fmt(totalFee)}                                                icon={Wallet}       gradient="bg-gradient-to-br from-primary-500 to-primary-700" />
              <SummaryCard label={m.totalMerchants}    value={fmtInt(data?.merchantCount)}                                 icon={Users}        gradient="bg-gradient-to-br from-blue-500 to-blue-700" />
              <SummaryCard label={m.activeMerchants}   value={fmtInt(statusCount(data?.merchantCountByStatus, 'active'))}  icon={CheckCircle}  gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
              <SummaryCard label={m.disabledMerchants} value={fmtInt(statusCount(data?.merchantCountByStatus, 'disabled'))} icon={XCircle}     gradient="bg-gradient-to-br from-slate-500 to-slate-700" />
            </div>

            {/* Pay-In / Pay-Out 4 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label={m.totalPayIn}     value={fmt(totalPayIn)}     icon={ArrowUpRight}   gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" />
              <SummaryCard label={m.totalPayOut}    value={fmt(totalPayOut)}    icon={ArrowDownRight} gradient="bg-gradient-to-br from-rose-500 to-rose-700" />
              <SummaryCard label={m.totalPayInFee}  value={fmt(totalPayInFee)}  icon={TrendingUp}     gradient="bg-gradient-to-br from-violet-500 to-violet-700" />
              <SummaryCard label={m.totalPayOutFee} value={fmt(totalPayOutFee)} icon={TrendingDown}   gradient="bg-gradient-to-br from-amber-400 to-orange-600" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
                <div className="p-5">
                <p className="text-sm font-semibold text-gray-800 mb-1">{m.chartBalanceTop10}</p>
                <p className="text-xs text-gray-400 mb-4">{m.sectionBalances}</p>
                {mounted && barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-38} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="value" fill="#c0530f" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60 gap-2">
                    <TrendingUp className="w-8 h-8 text-gray-200" />
                    <p className="text-sm text-gray-400">{m.noData}</p>
                  </div>
                )}
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500" />
                <div className="p-5">
                <p className="text-sm font-semibold text-gray-800 mb-1">{m.chartBalancePie}</p>
                <p className="text-xs text-gray-400 mb-4">{m.sectionBalances}</p>
                {mounted && pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="44%" innerRadius={55} outerRadius={85}
                        dataKey="value" paddingAngle={2} stroke="none">
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }}
                        formatter={v => <span className="text-gray-600">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60 gap-2">
                    <TrendingDown className="w-8 h-8 text-gray-200" />
                    <p className="text-sm text-gray-400">{m.noData}</p>
                  </div>
                )}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-violet-400 to-purple-500" />
              <div className="px-5 pt-4 pb-0">
                <p className="text-sm font-semibold text-gray-800">{m.sectionBreakdown}</p>
              </div>
              <div className="flex gap-1 px-5 pt-3 border-b border-gray-100">
                {([
                  { key: 'payIn',    label: m.tabPayIn },
                  { key: 'payOut',   label: m.tabPayOut },
                  { key: 'payInFee', label: m.tabPayInFee },
                  { key: 'payOutFee',label: m.tabPayOutFee },
                ] as { key: BreakdownTab; label: string }[]).map(({ key, label: tl }) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={clsx('pb-3 px-1 mr-4 text-xs font-medium transition-all border-b-2 whitespace-nowrap',
                      tab === key ? 'text-primary-600 border-primary-500 -mb-px' : 'text-gray-400 border-transparent hover:text-gray-600')}>
                    {tl}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-gray-50">
                {breakdownRows.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-2">
                    <TrendingDown className="w-8 h-8 text-gray-200" />
                    <p className="text-sm text-gray-400">{m.noData}</p>
                  </div>
                ) : breakdownRows.map((row, i) => {
                  const pct = maxBreakdown > 0 ? (row.value / maxBreakdown) * 100 : 0
                  const isIncome = tab === 'payIn' || tab === 'payInFee'
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <span className="w-5 text-xs text-gray-400 flex-shrink-0 text-right">{i + 1}</span>
                      <span className="w-28 text-xs font-medium text-gray-700 truncate flex-shrink-0">{row.name}</span>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={clsx('h-full rounded-full', isIncome ? 'bg-emerald-400' : 'bg-rose-400')}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className={clsx('text-sm font-semibold tabular-nums w-28 text-right flex-shrink-0', isIncome ? 'text-emerald-700' : 'text-rose-600')}>
                          {fmt(row.value)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
