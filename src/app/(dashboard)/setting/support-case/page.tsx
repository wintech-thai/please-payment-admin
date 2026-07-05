'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { supportCaseApi } from '@/lib/api/support-case.api'
import type { SupportCaseItem } from '@/lib/api/support-case.api'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

type CaseStatus = 'New' | 'Open' | 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Closed' | 'Cancelled'

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Open': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'In Progress': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Waiting for Customer': 'bg-purple-50 text-purple-700 ring-purple-200',
  'Resolved': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Closed': 'bg-gray-100 text-gray-500 ring-gray-200',
  'Cancelled': 'bg-red-50 text-red-500 ring-red-200',
}

const PRIORITY_COLORS: Record<string, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-yellow-50 text-yellow-700',
  'High': 'bg-orange-50 text-orange-700',
  'Critical': 'bg-red-50 text-red-700',
}

const ALL_STATUSES: (CaseStatus | 'All')[] = ['All', 'New', 'Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed', 'Cancelled']

function normalize(raw: any): SupportCaseItem {
  return {
    id: raw.id ?? raw.Id ?? raw.case_id ?? '',
    orgId: raw.orgId ?? raw.OrgId ?? '',
    ref: raw.ref ?? raw.Ref ?? '',
    subject: raw.subject ?? raw.Subject ?? '',
    priority: raw.priority ?? raw.Priority ?? '',
    status: raw.status ?? raw.Status ?? '',
    createdBy: raw.createdBy ?? raw.CreatedBy ?? '',
    createdDate: raw.createdDate ?? raw.CreatedDate ?? '',
    updatedDate: raw.updatedDate ?? raw.UpdatedDate ?? '',
  }
}

function SupportCaseListContent() {
  const { lang } = useLang()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [cases, setCases] = useState<SupportCaseItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'All'>('All')
  const [orgFilter, setOrgFilter] = useState('')
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('support_case_highlight') ?? null
    return null
  })

  const fetchCases = async (p = page, s = search, st = statusFilter, org = orgFilter, limit = itemsPerPage) => {
    setLoading(true)
    try {
      const payload = {
        FullTextSearch: s,
        Status: st === 'All' ? '' : st,
        OrgIdFilter: org.trim() || undefined,
        Limit: limit,
        Offset: p,
      }
      const [listRes, countRes] = await Promise.allSettled([
        supportCaseApi.getCases(payload),
        supportCaseApi.getCaseCount(payload),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        const list: any[] = Array.isArray(data) ? data : []
        setCases(list.map(normalize))
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : 0)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCases() }, [page, itemsPerPage])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`case-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  const handleSearch = () => { setPage(1); fetchCases(1, search, statusFilter, orgFilter) }
  const handleStatusChange = (s: CaseStatus | 'All') => { setStatusFilter(s); setPage(1); fetchCases(1, search, s, orgFilter) }

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  const cols = [
    lang === 'th' ? 'Ref' : 'Ref',
    lang === 'th' ? 'Org' : 'Org',
    lang === 'th' ? 'หัวข้อ' : 'Subject',
    lang === 'th' ? 'สถานะ' : 'Status',
    lang === 'th' ? 'ความสำคัญ' : 'Priority',
    lang === 'th' ? 'ผู้สร้าง' : 'Created By',
    lang === 'th' ? 'วันที่สร้าง' : 'Created',
    lang === 'th' ? 'อัปเดตล่าสุด' : 'Updated',
  ]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Case</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lang === 'th' ? 'รายการ Support Case ของทุก Merchant' : 'All merchant support cases'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={lang === 'th' ? 'ค้นหา Ref, ผู้สร้าง, หัวข้อ...' : 'Search ref, creator, subject...'}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {search && (
            <button onClick={() => { setSearch(''); fetchCases(1, '', statusFilter, orgFilter) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <input
          type="text"
          value={orgFilter}
          onChange={e => setOrgFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={lang === 'th' ? 'กรอง Org ID...' : 'Filter by Org ID...'}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white shadow-sm w-44"
        />
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value as CaseStatus | 'All')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white shadow-sm"
        >
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{s === 'All' ? (lang === 'th' ? 'ทุกสถานะ' : 'All Status') : s}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {lang === 'th' ? 'ค้นหา' : 'Search'}
        </button>
      </div>

      {/* Table card */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={i}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl',
                    )}
                  >
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
                      <span className="text-sm text-gray-400">{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</span>
                    </div>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-500">{lang === 'th' ? 'ไม่พบข้อมูล Support Case' : 'No support cases found'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cases.map((c, idx) => {
                  const highlighted = !!c.id && selectedRowId === c.id
                  return (
                    <tr
                      id={`case-row-${c.id}`}
                      key={c.id}
                      onClick={() => {
                        const next = selectedRowId === c.id ? null : c.id ?? null
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem('support_case_highlight', next)
                        else sessionStorage.removeItem('support_case_highlight')
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      {/* Ref — navigate on click only */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/setting/support-case/${c.id}`)}
                          className={clsx('text-sm font-semibold font-mono hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {c.ref || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500 whitespace-nowrap max-w-[120px] truncate">{c.orgId || '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700 max-w-xs truncate">{c.subject || '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        {c.status ? (
                          <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1', STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500 ring-gray-200')}>
                            {c.status}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        {c.priority ? (
                          <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[c.priority] ?? 'bg-gray-100 text-gray-600')}>
                            {c.priority}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500 whitespace-nowrap">{c.createdBy || '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500 whitespace-nowrap">{formatDate(c.createdDate)}</td>
                      <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500 whitespace-nowrap">{formatDate(c.updatedDate)}</td>
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
            <span>{lang === 'th' ? 'แถวต่อหน้า' : 'Rows per page'}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {lang === 'th' ? 'จาก' : 'of'} {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
  )
}

export default function SupportCasePage() {
  return (
    <Suspense>
      <SupportCaseListContent />
    </Suspense>
  )
}
