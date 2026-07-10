'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { RefreshCw, Receipt, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { summaryApi } from '@/lib/api/summary.api'
import { toast } from 'sonner'
import { useLang } from '@/context/LanguageContext'

const PIE_COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#a78bfa']
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]
const HIGHLIGHTED_KEY = 'expenseSummary_highlightedKey'

interface DailyExpenseItem {
  date?: string | null
  amount?: number | null
  count?: number | null
}

interface ExpenseCategoryItem {
  code?: string | null
  desc?: string | null
  amount?: number | null
  count?: number | null
}

interface ExpenseSummaryResponse {
  totalAmount?: number | null
  totalCount?: number | null
  dailyExpense?: DailyExpenseItem[] | null
  expenseByCategory?: ExpenseCategoryItem[] | null
}

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

type QuickPreset = '1D' | '7D' | '30D' | 'month'

function presetToRange(key: QuickPreset): TimeRangeValue {
  if (key === '1D')  return { type: 'relative', value: '1d',  label: '1 Day' }
  if (key === '7D')  return { type: 'relative', value: '7d',  label: '7 Days' }
  if (key === '30D') return { type: 'relative', value: '30d', label: '30 Days' }
  const now = Math.floor(Date.now() / 1000)
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

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[140px]">
      <p className="text-gray-500 mb-2 truncate max-w-[180px] font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="tabular-nums font-medium">{fmt(p.value)}</span>
        </div>
      ))}
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

export default function ExpenseSummaryPage() {
  const { t } = useLang()
  const m = t.expenseSummary
  const [data, setData] = useState<ExpenseSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [highlightedKey, setHighlightedKey] = useState<string>(() => {
    try { return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? '' } catch { return '' }
  })
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async (tr: TimeRangeValue) => {
    setLoading(true)
    try {
      const { FromDate, ToDate } = getTimeFilter(tr)
      const res = await summaryApi.getExpenseSummary({ fromDate: FromDate, toDate: ToDate })
      const d = res.data as any
      setData(d)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoad)
    } finally {
      setLoading(false)
    }
  }, [m.failedToLoad])

  useEffect(() => { fetchData(timeRange) }, [])

  const handleTimeRangeChange = (tr: TimeRangeValue) => { setTimeRange(tr); fetchData(tr) }
  const handlePreset = (key: QuickPreset) => { const tr = presetToRange(key); setTimeRange(tr); fetchData(tr) }

  const totalAmount = data?.totalAmount ?? 0
  const totalCount  = data?.totalCount  ?? 0

  const dailyData = useMemo(() => {
    return (data?.dailyExpense ?? [])
      .filter((x): x is DailyExpenseItem & { date: string } => !!x.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(x => ({
        date: new Date(x.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        amount: x.amount ?? 0,
      }))
  }, [data])

  const categoryData = useMemo(() => {
    const rows = (data?.expenseByCategory ?? []).slice(0, 10)
    const grandTotal = rows.reduce((s, x) => s + (x.amount ?? 0), 0)
    return rows.map(x => ({
      name: x.desc ?? x.code ?? '(unknown)',
      code: x.code ?? '',
      amount: x.amount ?? 0,
      count: x.count ?? 0,
      total: grandTotal,
    }))
  }, [data])

  const tableRows = useMemo(() => {
    return (data?.expenseByCategory ?? []).map(x => ({
      code: x.code ?? '',
      desc: x.desc ?? '',
      amount: x.amount ?? 0,
      count: x.count ?? 0,
    }))
  }, [data])

  useEffect(() => { setPage(1) }, [tableRows])

  const totalPages = Math.max(1, Math.ceil(tableRows.length / itemsPerPage))
  const startRow = tableRows.length === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, tableRows.length)
  const pagedRows = tableRows.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const curPreset = activePreset(timeRange)
  const quickPresets: { key: QuickPreset; label: string }[] = [
    { key: '1D',    label: m.preset1D },
    { key: '7D',    label: m.preset7D },
    { key: '30D',   label: m.preset30D },
    { key: 'month', label: m.presetThisMonth },
  ]

  const yTickFormatter = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000 ? `${(v / 1000).toFixed(0)}k`
    : String(v)

  const handleExportCsv = () => {
    const headers = [m.colCode, m.colDesc, m.colAmount, m.colCount]
    const rows = pagedRows.map(r => [r.code, r.desc, r.amount.toFixed(2), String(r.count)])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'expense-summary.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
      <div className="p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl px-6 py-5 shadow-md shadow-primary-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-primary-100 uppercase tracking-widest">{m.subtitle}</p>
                <h1 className="text-xl font-bold text-white mt-0.5">{m.title}</h1>
              </div>
            </div>
            <button onClick={() => fetchData(timeRange)} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50 border border-white/25">
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              {m.refresh}
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {quickPresets.map(p => (
              <button key={p.key} onClick={() => handlePreset(p.key)}
                className={clsx('px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  curPreset === p.key
                    ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600')}>
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
            <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { label: m.cardTotalExpense, value: fmt(totalAmount),      gradient: 'bg-gradient-to-br from-primary-500 to-primary-700', icon: Receipt, sub: null },
                { label: m.cardTotalCount,   value: totalCount.toLocaleString(), gradient: 'bg-gradient-to-br from-amber-400 to-orange-500', icon: TrendingDown, sub: m.countUnit },
              ] as const).map((s, i) => (
                <div key={i} className={clsx('rounded-2xl p-5 shadow-md', s.gradient)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">{s.label}</p>
                      <p className="text-2xl font-bold text-white tabular-nums mt-1.5 truncate">{s.value}</p>
                      {s.sub && <p className="text-xs text-white/70 mt-1">{s.sub}</p>}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 ml-3">
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pie + Category Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
                <div className="px-5 pt-4 pb-1">
                  <p className="text-sm font-semibold text-gray-800">{m.chartPieTitle}</p>
                </div>
                <div className="p-5">
                  {mounted && categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="44%" innerRadius={60} outerRadius={90}
                          dataKey="amount" nameKey="name" paddingAngle={3} stroke="none">
                          {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }}
                          formatter={v => <span className="text-gray-600 truncate" style={{ maxWidth: 120, display: 'inline-block' }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-60 gap-2">
                      <Receipt className="w-8 h-8 text-gray-200" />
                      <p className="text-sm text-gray-400">{m.noData}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                <div className="px-5 pt-4 pb-1">
                  <p className="text-sm font-semibold text-gray-800">{m.chartByCategoryTitle}</p>
                </div>
                <div className="p-5">
                  {mounted && categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={categoryData} margin={{ top: 4, right: 4, left: 0, bottom: 56 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-38} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                          tickFormatter={yTickFormatter} width={44} />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: '#f9fafb' }} />
                        <Bar dataKey="amount" name={m.amountLabel} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-60 gap-2">
                      <Receipt className="w-8 h-8 text-gray-200" />
                      <p className="text-sm text-gray-400">{m.noData}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Daily expense chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div className="px-5 pt-4 pb-1">
                <p className="text-sm font-semibold text-gray-800">{m.chartDailyTitle}</p>
              </div>
              <div className="p-5">
                {mounted && dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: dailyData.length > 14 ? 48 : 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        angle={dailyData.length > 14 ? -38 : 0}
                        textAnchor={dailyData.length > 14 ? 'end' : 'middle'}
                        interval={dailyData.length > 30 ? Math.floor(dailyData.length / 15) : 0}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                        tickFormatter={yTickFormatter} width={44} />
                      <Tooltip content={<BarTooltip />} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="amount" name={m.amountLabel} fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60 gap-2">
                    <Receipt className="w-8 h-8 text-gray-200" />
                    <p className="text-sm text-gray-400">{m.noData}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Category table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{m.tableTitle}</p>
              </div>

              <div className="overflow-auto custom-scrollbar">
                <table className="w-full text-sm table-fixed min-w-[580px]">
                  <colgroup>
                    <col className="w-[14%]" /><col className="w-[30%]" /><col className="w-[18%]" /><col className="w-[22%]" /><col className="w-[16%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{m.colCode}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{m.colDesc}</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">สัดส่วน</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{m.colAmount}</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{m.colCount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">{m.noData}</td></tr>
                    ) : pagedRows.map((r, i) => {
                      const grandTotal = pagedRows.reduce((s, x) => s + x.amount, 0)
                      const pct = grandTotal > 0 ? ((r.amount / grandTotal) * 100).toFixed(1) : '0.0'
                      const rowKey = r.code || String(i)
                      const isHighlighted = highlightedKey === rowKey
                      return (
                      <tr
                        key={i}
                        onClick={() => {
                          const next = isHighlighted ? '' : rowKey
                          setHighlightedKey(next)
                          try { sessionStorage.setItem(HIGHLIGHTED_KEY, next) } catch {}
                        }}
                        className={clsx(
                          'cursor-pointer transition-colors',
                          isHighlighted
                            ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                            : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        )}
                      >
                        <td className="py-3 px-5 text-xs font-medium text-primary-700 border-b border-gray-100">{r.code || '—'}</td>
                        <td className="py-3 px-3 text-sm text-gray-800 border-b border-gray-100">{r.desc || '—'}</td>
                        <td className="py-3 px-3 text-sm tabular-nums text-right text-gray-500 border-b border-gray-100">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-1.5 rounded-full bg-primary-400" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-10 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm tabular-nums text-right font-semibold text-gray-900 border-b border-gray-100">{fmt(r.amount)}</td>
                        <td className="py-3 px-5 text-sm tabular-nums text-right text-gray-600 border-b border-gray-100">{r.count.toLocaleString()}</td>
                      </tr>
                    )})}
                  </tbody>
                  {pagedRows.length > 0 && (
                    <tfoot className="bg-white border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={2} className="py-3 px-5 text-xs font-bold text-gray-600 uppercase tracking-wide">{m.colTotal}</td>
                        <td className="py-3 px-3 text-sm tabular-nums text-right text-gray-500">100%</td>
                        <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-gray-900">{fmt(pagedRows.reduce((s, r) => s + r.amount, 0))}</td>
                        <td className="py-3 px-5 text-sm tabular-nums text-right font-bold text-gray-700">{pagedRows.reduce((s, r) => s + r.count, 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pagination */}
              <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                <span>
                  <span className="font-semibold text-gray-800">{tableRows.length}</span> {m.totalItems}
                </span>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{m.rowsPerPage}</span>
                    <select
                      value={itemsPerPage}
                      onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
                      className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
                    >
                      {ITEMS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {tableRows.length === 0 ? '0-0' : `${startRow}-${endRow}`} of {tableRows.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
