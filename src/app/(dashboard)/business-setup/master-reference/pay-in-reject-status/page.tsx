'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { masterRefApi, type MasterRefItem } from '@/lib/api/master-ref.api'

const REF_TYPE = 'PayInRejectStatus'
const BASE_PATH = '/business-setup/master-reference/pay-in-reject-status'
const ROW_KEY = 'payin_reject_status_highlight'

function DeleteModal({ name, onConfirm, onCancel, deleting }: {
  name?: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const { t } = useLang()
  const m = t.payInRejectStatus
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <Trash2 className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{m.deleteTitle}</h3>
        {name && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{name}&rdquo;</p>}
        <p className="text-sm text-white/60 mb-7">{m.deleteDesc} {m.deleteCannotUndo}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {t.admin.cancel}
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600/80 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors uppercase">
            {deleting ? t.admin.deleting : t.admin.delete}
          </button>
        </div>
      </div>
    </div>
  )
}

function PayInRejectStatusListContent() {
  const { t } = useLang()
  const m = t.payInRejectStatus
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [items, setItems] = useState<MasterRefItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem(ROW_KEY) ?? null
    return null
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id?: string; name?: string }>({ open: false })
  const [deleting, setDeleting] = useState(false)

  const fetchData = async (p = page, search = searchTerm) => {
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.allSettled([
        masterRefApi.getMasterRefs({ RefType: REF_TYPE, FullTextSearch: search, Page: p, Limit: itemsPerPage }),
        masterRefApi.getMasterRefCount({ RefType: REF_TYPE, FullTextSearch: search }),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        setItems(Array.isArray(data) ? data : [])
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
  }

  useEffect(() => { fetchData() }, [page, itemsPerPage])

  const handleSearch = () => { setPage(1); fetchData(1, searchTerm) }

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`payin-reject-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  const handleDelete = async () => {
    if (!deleteModal.id) return
    setDeleting(true)
    try {
      await masterRefApi.deleteMasterRefById(deleteModal.id)
      toast.success(m.deleteSuccess)
      setDeleteModal({ open: false })
      setSelectedId(null)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {deleteModal.open && (
        <DeleteModal
          name={deleteModal.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal({ open: false })}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <button
          onClick={() => router.push(`${BASE_PATH}/create`)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {m.addButton}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={m.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); fetchData(1, '') }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
        </button>
        <button
          onClick={() => {
            const item = items.find(i => i.id === selectedId)
            setDeleteModal({ open: true, id: selectedId ?? undefined, name: item?.code ?? undefined })
          }}
          disabled={!selectedId}
          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            {t.admin.delete}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="w-12 px-6 py-3.5" />
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{m.colCode}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{m.colDescription}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{m.colTags}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{m.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
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
                  <td colSpan={5} className="py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{m.noDataFound}</p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const highlighted = !!item.id && selectedRowId === item.id
                  const isChecked = selectedId === item.id
                  return (
                    <tr
                      id={`payin-reject-row-${item.id}`}
                      key={item.id}
                      onClick={() => {
                        const next = selectedRowId === item.id ? null : item.id
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem(ROW_KEY, next)
                        else sessionStorage.removeItem(ROW_KEY)
                      }}
                      className={clsx(
                        'border-b border-gray-100 cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-50'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedId(prev => prev === item.id ? null : item.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`${BASE_PATH}/${item.id}/update`) }}
                          className={clsx('text-sm font-semibold hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {item.code}
                        </button>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <span className="text-sm text-gray-600 line-clamp-1">{item.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.tags
                            ? item.tags.split(',').map(tag => (
                              <span key={tag} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                            ))
                            : <span className="text-gray-400 text-sm">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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

export default function PayInRejectStatusPage() {
  return (
    <Suspense>
      <PayInRejectStatusListContent />
    </Suspense>
  )
}
