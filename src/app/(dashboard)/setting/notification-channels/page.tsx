'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { notificationApi } from '@/lib/api/notification.api'
import { toast } from 'sonner'
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'payment.success': { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  'payment.failed': { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  'payment.unidentified': { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
}
const DEFAULT_EVENT_COLOR = { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' }
function getEventTypeColor(type: string) {
  return EVENT_TYPE_COLORS[type.toLowerCase()] ?? DEFAULT_EVENT_COLOR
}

function StatusBadge({ status }: { status?: string | null }) {
  const { t } = useLang()
  const m = t.notiChannel
  const isEnabled = status?.toLowerCase() === 'enabled' || !status
  const cfg = isEnabled
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {isEnabled ? m.statusEnabled : m.statusDisabled}
    </span>
  )
}

function DeleteModal({ channelName, onConfirm, onCancel, deleting }: {
  channelName?: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const { t } = useLang()
  const m = t.notiChannel
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
        {channelName && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{channelName}&rdquo;</p>}
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

function ToggleStatusModal({ channelName, action, onConfirm, onCancel, loading }: {
  channelName?: string
  action: 'enable' | 'disable'
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const { t } = useLang()
  const m = t.notiChannel
  const isDisabling = action === 'disable'
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          {isDisabling ? (
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          ) : (
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {isDisabling ? m.confirmDisableTitle : m.confirmEnableTitle}
        </h3>
        {channelName && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{channelName}&rdquo;</p>}
        <p className="text-sm text-white/60 mb-7">
          {isDisabling ? m.confirmDisableDesc : m.confirmEnableDesc}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase"
          >
            {t.admin.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 transition-colors uppercase',
              'bg-red-600/80 hover:bg-red-600'
            )}
          >
            {loading
              ? (isDisabling ? m.disabling : m.enabling)
              : (isDisabling ? m.actionDisable : m.actionEnable)
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function NotiChannelListContent() {
  const { t } = useLang()
  const m = t.notiChannel
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('noti_channel_highlight') ?? null
    return null
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id?: string; name?: string }>({ open: false })
  const [deleting, setDeleting] = useState(false)
  const [statusModal, setStatusModal] = useState<{ open: boolean; item?: any }>({ open: false })
  const [toggling, setToggling] = useState(false)
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const [channelTypes, setChannelTypes] = useState<string[]>([])
  const addDropdownRef = useRef<HTMLDivElement | null>(null)

  const fetchData = async (p = page, search = searchTerm, status = statusFilter) => {
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.allSettled([
        notificationApi.getChannels({ FullTextSearch: search, Status: status, Page: p, Limit: itemsPerPage }),
        notificationApi.getChannelCount({ FullTextSearch: search, Status: status }),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.channels ?? data?.notiChannels ?? data?.items ?? [])
        setItems(list)
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : (raw?.count ?? raw?.Count ?? raw?.totalCount ?? 0))
      }
    } catch {
      toast.error(m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  const fetchChannelTypes = async () => {
    try {
      const res = await notificationApi.getChannelTypes()
      const data = res.data as any
      const types: string[] = Array.isArray(data) ? data : (data?.types ?? data?.channelTypes ?? [])
      setChannelTypes(types.map((t: any) => (typeof t === 'string' ? t : t?.name ?? t?.type ?? String(t))))
    } catch {
      // silently ignore
    }
  }

  useEffect(() => { fetchData(); fetchChannelTypes() }, [])
  useEffect(() => { fetchData() }, [page, itemsPerPage])

  const handleSearch = () => { setPage(1); fetchData(1, searchTerm, statusFilter) }

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`noti-ch-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addDropdownOpen && addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [addDropdownOpen])

  const handleDelete = async () => {
    if (!deleteModal.id) return
    setDeleting(true)
    try {
      await notificationApi.deleteChannelById(deleteModal.id)
      toast.success(m.deleteSuccess)
      setDeleteModal({ open: false })
      setSelectedId(null)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.deleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleStatus = (item: any) => {
    setStatusModal({ open: true, item })
  }

  const handleConfirmToggle = async () => {
    const item = statusModal.item
    if (!item) return
    const id = getChannelId(item)
    const isEnabled = item.status?.toLowerCase() === 'enabled'
    setToggling(true)
    try {
      if (isEnabled) {
        await notificationApi.disableChannelById(id)
        toast.success(m.disableSuccess)
      } else {
        await notificationApi.enableChannelById(id)
        toast.success(m.enableSuccess)
      }
      setStatusModal({ open: false })
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (isEnabled ? m.disableFailed : m.enableFailed))
    } finally {
      setToggling(false)
    }
  }

  const getChannelId = (item: any): string =>
    item?.channelId ?? item?.id ?? item?.notiChannelId ?? item?.Id ?? ''

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return d }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = ['', m.colMerchant, m.colChannelName, m.colDescription, m.colTags, m.colType, m.colEventTypes, m.colStatus, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {statusModal.open && statusModal.item && (
        <ToggleStatusModal
          channelName={statusModal.item.channelName ?? statusModal.item.name ?? statusModal.item.ChannelName}
          action={statusModal.item.status?.toLowerCase() === 'enabled' ? 'disable' : 'enable'}
          onConfirm={handleConfirmToggle}
          onCancel={() => setStatusModal({ open: false })}
          loading={toggling}
        />
      )}
      {deleteModal.open && (
        <DeleteModal
          channelName={deleteModal.name}
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
        {/* + ADD dropdown */}
        <div className="relative" ref={addDropdownRef}>
          <button
            onClick={() => setAddDropdownOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            ADD
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>
          {addDropdownOpen && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden">
              {channelTypes.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">Loading...</div>
              ) : (
                channelTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setAddDropdownOpen(false)
                      router.push(`/setting/notification-channels/create?type=${encodeURIComponent(type)}`)
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {type}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
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
            <button onClick={() => { setSearchTerm(''); fetchData(1, '', statusFilter) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchData(1, searchTerm, e.target.value) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700"
        >
          <option value="">{m.allStatus}</option>
          <option value="Enabled">{m.statusEnabled}</option>
          <option value="Disabled">{m.statusDisabled}</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
        </button>
        <button
          onClick={() => {
            const item = items.find(i => getChannelId(i) === selectedId)
            setDeleteModal({ open: true, id: selectedId ?? undefined, name: item?.channelName ?? item?.name ?? undefined })
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
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={i}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'w-10 rounded-tl-xl',
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
                      <span className="text-sm text-gray-400">{t.admin.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{m.noDataFound}</p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const id = getChannelId(item)
                  const highlighted = !!id && selectedRowId === id
                  const isChecked = selectedId === id
                  const eventTypes: string[] = Array.isArray(item.eventTypes)
                    ? item.eventTypes
                    : (item.EventTypes ? (Array.isArray(item.EventTypes) ? item.EventTypes : [item.EventTypes]) : [])

                  return (
                    <tr
                      id={`noti-ch-row-${id}`}
                      key={id || idx}
                      onClick={() => {
                        const next = selectedRowId === id ? null : id
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem('noti_channel_highlight', next)
                        else sessionStorage.removeItem('noti_channel_highlight')
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedId(prev => prev === id ? null : id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      {/* Merchant — click to edit */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/setting/notification-channels/${id}/update`)}
                          className={clsx('text-sm font-bold hover:underline', highlighted ? 'text-primary-700' : 'text-gray-900 hover:text-primary-600')}
                        >
                          {item.orgId ?? item.org_id ?? item.OrgId ?? '—'}
                        </button>
                      </td>
                      {/* Channel Name */}
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                        {item.channelName ?? item.name ?? item.ChannelName ?? '—'}
                      </td>
                      {/* Description */}
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 max-w-[180px] truncate">
                        {item.description ?? item.Description ?? '—'}
                      </td>
                      {/* Tags */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        {item.tags
                          ? String(item.tags).split(',').map((tag: string) => (
                            <span key={tag} className="inline-flex mr-1 mb-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                          ))
                          : <span className="text-gray-400">—</span>}
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-0.5 bg-violet-50 text-violet-700 ring-1 ring-violet-200 rounded-full text-xs font-semibold">
                          {item.type ?? item.Type ?? '—'}
                        </span>
                      </td>
                      {/* Event Types */}
                      <td className="px-4 py-3 border-b border-gray-100 max-w-[200px]">
                        {eventTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {eventTypes.map(et => {
                              const c = getEventTypeColor(et)
                              return (
                                <span key={et} className={clsx('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1', c.bg, c.text, c.ring)}>
                                  {et}
                                </span>
                              )
                            })}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <StatusBadge status={item.status ?? item.Status} />
                      </td>
                      {/* Action */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {item.status?.toLowerCase() === 'enabled' ? (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-300 rounded-full hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                            {m.actionDisable}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-300 rounded-full hover:bg-emerald-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {m.actionEnable}
                          </button>
                        )}
                      </td>
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

export default function NotiChannelPage() {
  return (
    <Suspense>
      <NotiChannelListContent />
    </Suspense>
  )
}
