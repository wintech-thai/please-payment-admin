'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Plus, ChevronLeft, ChevronRight, Ban, CheckCircle, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { riskPolicyApi, type RiskPolicyItem } from '@/lib/api/risk-policy.api'
import RowActionsMenu from '@/components/RowActionsMenu'

const BASE_PATH = '/risk-management/policies'
const FILTER_KEY = 'riskPolicy_filter'
const HIGHLIGHTED_KEY = 'riskPolicy_highlightedId'

function formatDate(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return d }
}

function StatusBadge({ status, t }: { status?: string | null; t: any }) {
  const isActive = status?.toLowerCase() === 'active'
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1',
      isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', isActive ? 'bg-emerald-500' : 'bg-gray-400')} />
      {isActive ? t.riskPolicy.statusActive : t.riskPolicy.statusDisabled}
    </span>
  )
}

function PoliciesContent() {
  const { t } = useLang()
  const m = t.riskPolicy
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [search, setSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.statusFilter ?? '') : ''
  )

  const [items, setItems] = useState<RiskPolicyItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [highlightedId, setHighlightedId] = useState<string>(() => {
    if (highlightIdParam) return highlightIdParam
    return typeof window !== 'undefined' ? sessionStorage.getItem(HIGHLIGHTED_KEY) ?? '' : ''
  })

  useEffect(() => {
    if (!highlightIdParam) return
    setHighlightedId(highlightIdParam)
    sessionStorage.setItem(HIGHLIGHTED_KEY, highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
  }, [highlightIdParam, pathname, searchParams])
  const [confirm, setConfirm] = useState<{ title: string; danger?: boolean; onConfirm: () => void } | null>(null)

  const load = useCallback(async (currentPage: number, limit: number, q: string, status: string) => {
    if (typeof window !== 'undefined') sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search: q, statusFilter: status }))
    setLoading(true)
    setSelectedIds([])
    try {
      const payload = {
        FullTextSearch: q.trim() || undefined,
        Status: status || undefined,
        Offset: (currentPage - 1) * limit + 1,
        Limit: limit,
      }
      const [listRes, countRes] = await Promise.allSettled([
        riskPolicyApi.getRiskPolicies(payload),
        riskPolicyApi.getRiskPolicyCount(payload),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        setItems(Array.isArray(data) ? data : [])
      } else {
        toast.error(m.loadFailed)
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : 0)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [m.loadFailed])

  useEffect(() => { load(1, itemsPerPage, search, statusFilter) }, [])

  const handleRefresh = () => { setPage(1); load(1, itemsPerPage, search, statusFilter) }
  const handleRowHighlight = (id: string) => { setHighlightedId(id); sessionStorage.setItem(HIGHLIGHTED_KEY, id) }

  const handleToggle = (item: RiskPolicyItem) => {
    const isActive = item.status?.toLowerCase() === 'active'
    setConfirm({
      title: isActive ? m.confirmDisableTitle : m.confirmEnableTitle,
      onConfirm: async () => {
        setConfirm(null)
        try {
          if (isActive) await riskPolicyApi.disableRiskPolicyById(item.id)
          else await riskPolicyApi.enableRiskPolicyById(item.id)
          toast.success(isActive ? m.disableSuccess : m.enableSuccess)
          load(page, itemsPerPage, search, statusFilter)
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : m.failedToToggle)
        }
      },
    })
  }

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return
    setConfirm({
      title: selectedIds.length > 1 ? m.confirmDeleteBulkTitle.replace('{count}', String(selectedIds.length)) : m.confirmDeleteTitle,
      danger: true,
      onConfirm: async () => {
        setConfirm(null)
        try {
          for (const id of selectedIds) await riskPolicyApi.deleteRiskPolicyById(id)
          toast.success(selectedIds.length > 1 ? m.deleteSuccessBulk.replace('{count}', String(selectedIds.length)) : m.deleteSuccess)
          setSelectedIds([])
          load(page, itemsPerPage, search, statusFilter)
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : m.failedToDelete)
        }
      },
    })
  }

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? items.map(i => i.id) : [])
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  const cols = [m.colName, m.colDescription, m.colTags, m.colCreatedDate, m.colStatus, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {confirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfirm(null)}>
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">{confirm.title}</h3>
            {confirm.danger && <p className="text-sm text-white/60 mb-5">{m.confirmDeleteDesc}</p>}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
                {t.admin.cancel}
              </button>
              <button onClick={confirm.onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors uppercase">
                {t.admin.yes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {m.deletePolicy}
          </button>
          <button
            onClick={() => router.push(`${BASE_PATH}/add`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {m.addButton}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRefresh()}
            placeholder={m.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button onClick={handleRefresh} disabled={loading} className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60">
          <Search className="w-4 h-4" />
        </button>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); load(1, itemsPerPage, search, e.target.value) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{m.filterStatus}: {m.all}</option>
          <option value="Active">{m.statusActive}</option>
          <option value="Disabled">{m.statusDisabled}</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                <th className="w-10 px-4 py-3 border-b border-gray-200 rounded-tl-xl">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                  />
                </th>
                {cols.map((col, i) => (
                  <th key={col} className={clsx(
                    'px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                    i === cols.length - 1 && 'rounded-tr-xl text-center'
                  )}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length + 1} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-gray-400">{t.admin.loading}</span>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={cols.length + 1} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-gray-500">{m.noDataFound}</p>
                </td></tr>
              ) : (
                items.map((item, idx) => {
                  const isHighlighted = highlightedId === item.id
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowHighlight(item.id)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isHighlighted ? '!bg-primary-100 border-l-[3px] border-l-primary-500' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleOne(item.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <button
                          onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`${BASE_PATH}/${item.id}`) }}
                          className={clsx('text-sm font-semibold hover:underline', isHighlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {item.name ?? '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 min-w-[220px] max-w-[320px]">
                        {item.description ? <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p> : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {item.tags ? (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag}</span>
                            ))}
                          </div>
                        ) : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-600">{formatDate(item.createdDate)}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <StatusBadge status={item.status} t={t} />
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-center" onClick={e => e.stopPropagation()}>
                        <RowActionsMenu items={[
                          {
                            label: item.status?.toLowerCase() === 'active' ? m.disablePolicy : m.enablePolicy,
                            icon: item.status?.toLowerCase() === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />,
                            danger: item.status?.toLowerCase() === 'active',
                            success: item.status?.toLowerCase() !== 'active',
                            onClick: () => handleToggle(item),
                          },
                        ]} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select
                value={itemsPerPage}
                onChange={e => { const n = Number(e.target.value); setItemsPerPage(n); setPage(1); load(1, n, search, statusFilter) }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
              >
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { const p = page - 1; setPage(p); load(p, itemsPerPage, search, statusFilter) }}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { const p = page + 1; setPage(p); load(p, itemsPerPage, search, statusFilter) }}
                  disabled={page >= totalPages || total === 0 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PoliciesPage() {
  return (
    <Suspense>
      <PoliciesContent />
    </Suspense>
  )
}
