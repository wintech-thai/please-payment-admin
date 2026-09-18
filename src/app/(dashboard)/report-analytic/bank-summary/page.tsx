'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { RefreshCw, ArrowUpRight, ArrowDownRight, Landmark, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { summaryApi } from '@/lib/api/summary.api'
import type { BankSummaryResponse } from '@/lib/api/types'
import { toast } from 'sonner'
import { useLang } from '@/context/LanguageContext'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]
const HIGHLIGHTED_KEY = 'bankSummary_highlightedKey'

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

export default function BankSummaryPage() {
  const { t } = useLang()
  const m = t.bankSummary
  const [data, setData] = useState<BankSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [merchantFilter, setMerchantFilter] = useState<string>('__all__')
  const [includeP2P, setIncludeP2P] = useState(false)
  const [highlightedKey, setHighlightedKey] = useState<string>(() => {
    try { return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? '' } catch { return '' }
  })
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const fetchData = useCallback(async (tr: TimeRangeValue) => {
    setLoading(true)
    try {
      const { FromDate, ToDate } = getTimeFilter(tr)
      const res = await summaryApi.getBankSummary({
        fromDate: FromDate,
        toDate: ToDate,
        bankCode: bankCode || undefined,
        accountNumber: accountNumber || undefined,
        includeP2P,
      })
      const d = res.data as any
      setData(d?.bankSummary ?? d?.BankSummary ?? d)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoad)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCode, accountNumber, includeP2P, m.failedToLoad])

  useEffect(() => { fetchData(timeRange) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch immediately when the P2P toggle changes, skipping the initial mount (already fetched above).
  const isFirstP2PRender = useRef(true)
  useEffect(() => {
    if (isFirstP2PRender.current) { isFirstP2PRender.current = false; return }
    fetchData(timeRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeP2P])

  const handleTimeRangeChange = (tr: TimeRangeValue) => { setTimeRange(tr); fetchData(tr) }
  const handlePreset = (key: QuickPreset) => { const tr = presetToRange(key); setTimeRange(tr); fetchData(tr) }
  const handleApplyFilters = () => fetchData(timeRange)

  const totalIn = data?.totalPayInAmount ?? 0
  const totalOut = data?.totalPayOutAmount ?? 0
  const totalWithdrawal = data?.totalWithdrawalAmount ?? 0
  const netFlow = totalIn - totalOut - totalWithdrawal

  const allMerchantCodes = useMemo(() => {
    const codes = new Set<string>()
    ;(data?.dailyBankSummary ?? []).forEach(x => { if (x.merchantCode) codes.add(x.merchantCode) })
    return Array.from(codes).sort()
  }, [data])

  const tableRows = useMemo(() => {
    const rows = (data?.dailyBankSummary ?? [])
      .filter((x): x is typeof x & { date: string } => !!x.date)
      .sort((a, b) => (a.date as string).localeCompare(b.date as string) || (a.bankCode ?? '').localeCompare(b.bankCode ?? ''))
      .map(x => ({
        date: new Date(x.date as string).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        bankCode: x.bankCode ?? '-',
        accountNumber: x.accountNumber ?? '-',
        merchant: x.merchantCode ?? '-',
        inAmt: x.payInAmount ?? 0,
        outAmt: x.payOutAmount ?? 0,
        withdrawAmt: x.withdrawalAmount ?? 0,
      }))
    return merchantFilter === '__all__' ? rows : rows.filter(r => r.merchant === merchantFilter)
  }, [data, merchantFilter])

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

  const handleExportCsv = () => {
    const headers = [m.colDate, m.colBankCode, m.colAccountNumber, m.colMerchant, m.colInAmount, m.colOutAmount, m.colWithdrawalAmount]
    const rows = pagedRows.map(r => [
      r.date, r.bankCode, r.accountNumber, r.merchant,
      r.inAmt.toFixed(2), r.outAmt.toFixed(2), r.withdrawAmt.toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'bank-summary.csv'; a.click()
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
                <Landmark className="w-5 h-5 text-white" />
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

        {/* Filters */}
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
          <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
          <input
            value={bankCode}
            onChange={e => setBankCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleApplyFilters() }}
            placeholder={m.filterBankCode}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 w-28"
          />
          <input
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleApplyFilters() }}
            placeholder={m.filterAccountNumber}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 w-36"
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={includeP2P} onChange={e => setIncludeP2P(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-400" />
            {m.filterIncludeP2P}
          </label>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { label: m.cardTotalIn,  value: fmt(totalIn),  icon: ArrowUpRight,  gradient: 'bg-gradient-to-br from-blue-500 to-blue-700' },
                { label: m.cardTotalOut, value: fmt(totalOut), icon: ArrowDownRight, gradient: 'bg-gradient-to-br from-orange-500 to-orange-700' },
                { label: m.cardTotalWithdrawal, value: fmt(totalWithdrawal), icon: ArrowDownRight, gradient: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-700' },
                { label: m.cardNetFlow, value: fmt(netFlow), icon: Landmark, gradient: 'bg-gradient-to-br from-primary-500 to-primary-700' },
              ] as const).map((s, i) => (
                <div key={i} className={clsx('rounded-2xl p-5 shadow-md', s.gradient)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">{s.label}</p>
                      <p className="text-2xl font-bold text-white tabular-nums mt-1.5 truncate">{s.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 ml-3">
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detail table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
              <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-800">{m.tableTitle}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={merchantFilter}
                    onChange={e => setMerchantFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="__all__">{m.filterMerchantAll}</option>
                    {allMerchantCodes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    {m.exportExcel}
                  </button>
                </div>
              </div>

              <div className="overflow-auto custom-scrollbar">
                <table className="w-full text-sm table-fixed min-w-[720px]">
                  <colgroup>
                    <col className="w-[13%]" /><col className="w-[13%]" /><col className="w-[17%]" /><col className="w-[15%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[14%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{m.colDate}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{m.colBankCode}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{m.colAccountNumber}</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{m.colMerchant}</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{m.colInAmount}</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{m.colOutAmount}</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{m.colWithdrawalAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">{m.noData}</td></tr>
                    ) : pagedRows.map((r, i) => {
                      const rowKey = `${r.date}-${r.bankCode}-${r.accountNumber}-${i}`
                      const isHighlighted = highlightedKey === rowKey
                      return (
                        <tr
                          key={rowKey}
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
                          <td className="py-3 px-5 text-xs text-gray-500 whitespace-nowrap border-b border-gray-100">{r.date}</td>
                          <td className="py-3 px-3 text-sm font-medium text-gray-800 border-b border-gray-100">{r.bankCode}</td>
                          <td className="py-3 px-3 text-sm text-gray-600 truncate border-b border-gray-100">{r.accountNumber}</td>
                          <td className="py-3 px-3 text-sm text-gray-600 truncate border-b border-gray-100">{r.merchant}</td>
                          <td className="py-3 px-3 text-sm tabular-nums text-right text-blue-700 border-b border-gray-100">{fmt(r.inAmt)}</td>
                          <td className="py-3 px-3 text-sm tabular-nums text-right text-orange-600 border-b border-gray-100">{fmt(r.outAmt)}</td>
                          <td className="py-3 px-5 text-sm tabular-nums text-right text-fuchsia-600 border-b border-gray-100">{fmt(r.withdrawAmt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {pagedRows.length > 0 && (
                    <tfoot className="bg-white border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={4} className="py-3 px-5 text-xs font-bold text-gray-600 uppercase tracking-wide">{m.colTotal}</td>
                        <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-blue-700">{fmt(pagedRows.reduce((s, r) => s + r.inAmt, 0))}</td>
                        <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-orange-600">{fmt(pagedRows.reduce((s, r) => s + r.outAmt, 0))}</td>
                        <td className="py-3 px-5 text-sm tabular-nums text-right font-bold text-fuchsia-600">{fmt(pagedRows.reduce((s, r) => s + r.withdrawAmt, 0))}</td>
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
