'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import type { AgentItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, Plus, MoreHorizontal, Trash2, ChevronLeft, ChevronRight, Key, ChevronDown, RotateCcw, RefreshCw, QrCode, X, CheckCircle2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import QRCode from 'react-qr-code'

type LineApiStatus = { ok?: boolean; podStatus?: string; login?: string; raw?: string }

function StatusBadge({ status }: { status?: string | null }) {
  const { t } = useLang()
  const lower = status?.toLowerCase()
  const isActive = lower === 'active' || !lower
  const cfg = isActive
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {isActive ? t.agent.statusActive : t.agent.statusInactive}
    </span>
  )
}

function LineApiStatusBadge({ status, labels }: { status?: LineApiStatus | null; labels: { running: string; offline: string; unknown: string } }) {
  const [showRaw, setShowRaw] = useState(false)
  if (!status) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400 ring-1 ring-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse flex-shrink-0" />
      —
    </span>
  )
  const isRunning = status.ok === true
  const isOffline = status.podStatus === 'Offline'
  const cfg = isRunning
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : isOffline
    ? { bg: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' }
    : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  const label = isRunning ? labels.running : isOffline ? labels.offline : labels.unknown
  return (
    <div className="flex flex-col gap-0.5 relative">
      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
        {label}
      </span>
      {status.login != null && (
        <button
          onClick={e => { e.stopPropagation(); setShowRaw(v => !v) }}
          className="text-[10px] text-gray-400 hover:text-gray-600 ml-1 text-left"
        >
          {status.login}
        </button>
      )}
      {showRaw && status.raw && (
        <div className="absolute top-full right-0 z-50 mt-1 w-72 bg-gray-900 text-green-400 text-[10px] font-mono rounded-lg p-3 shadow-xl overflow-auto max-h-48"
          onClick={e => e.stopPropagation()}>
          <pre>{JSON.stringify(JSON.parse(status.raw), null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function AgentTypeBadge({ agentType }: { agentType?: string | null }) {
  if (!agentType) return <span className="text-gray-400">—</span>
  const isLine = agentType.toLowerCase() === 'line api'
  return (
    <span className={clsx(
      'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1',
      isLine
        ? 'bg-green-50 text-green-700 ring-green-200'
        : 'bg-blue-50 text-blue-700 ring-blue-200'
    )}>
      {agentType}
    </span>
  )
}

function DeleteModal({ agentCode, onConfirm, onCancel, deleting }: {
  agentCode?: string; onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const { t } = useLang()
  const m = t.agent
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
        {agentCode && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{agentCode}&rdquo;</p>}
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

function ConfirmActionModal({ title, desc, onConfirm, onCancel, loading, t }: {
  title: string; desc: string; onConfirm: () => void; onCancel: () => void; loading: boolean
  t: { cancel: string; confirm: string }
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl bg-white text-center px-8 py-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors uppercase">
            {t.cancel}
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors uppercase">
            {loading ? '...' : t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentListContent() {
  const { t } = useLang()
  const m = t.agent
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [agents, setAgents] = useState<AgentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [agentTypeFilter, setAgentTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('agent_highlight') ?? null
    return null
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; agentId?: string; agentCode?: string }>({ open: false })
  const [deleting, setDeleting] = useState(false)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [showRegisterMenu, setShowRegisterMenu] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type?: 'restart' | 'reload'; agentId?: string; agentCode?: string }>({ open: false })
  const [actionLoading, setActionLoading] = useState(false)
  const [lineApiStatuses, setLineApiStatuses] = useState<Record<string, LineApiStatus>>({})
  const [qrModal, setQrModal] = useState<{ open: boolean; agent?: AgentItem }>({ open: false })
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrFetchError, setQrFetchError] = useState<string | null>(null)
  const [qrLoginState, setQrLoginState] = useState<'waiting' | 'pin_pending' | 'success' | 'timeout'>('waiting')
  const [qrPinCode, setQrPinCode] = useState<string | null>(null)
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrElapsedRef = useRef(0)

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const registerMenuRef = useRef<HTMLDivElement | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAgents = async (p = page, search = searchTerm, typeFilter = agentTypeFilter) => {
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.allSettled([
        agentApi.getAgents({ FullTextSearch: search, AgentType: typeFilter || undefined, Page: p, Limit: itemsPerPage }),
        agentApi.getAgentCount({ FullTextSearch: search, AgentType: typeFilter || undefined }),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.agents ?? data?.Agents ?? [])
        const normalized = list.map(item => ({
          ...item,
          agentId: item.agentId ?? item.AgentId ?? item.id ?? item.Id ?? '',
          agentType: item.agentType ?? item.AgentType ?? null,
          agentConfigObj: item.agentConfigObj ?? item.AgentConfigObj ?? null,
          lastSeenDate: item.lastSeenDate ?? item.LastSeenDate ?? item.lastSeen ?? item.LastSeen ?? null,
          lastSeenErrorDate: item.lastSeenErrorDate ?? item.LastSeenErrorDate ?? null,
        }))
        normalized.sort((a, b) => {
          const ta = a.createdDate ? new Date(a.createdDate).getTime() : 0
          const tb = b.createdDate ? new Date(b.createdDate).getTime() : 0
          return tb - ta
        })
        setAgents(normalized)
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : (raw?.count ?? raw?.Count ?? raw?.totalCount ?? raw?.TotalCount ?? 0))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [page, itemsPerPage])

  // Background polling for Line Api agents every 10 seconds
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    const lineApiIds = agents
      .filter(a => a.agentType?.toLowerCase() === 'line api')
      .map(a => a.agentId)

    if (lineApiIds.length === 0) return

    const poll = async () => {
      await Promise.allSettled(
        lineApiIds.map(id =>
          agentApi.getLineApiAgentStatus(id)
            .then(res => {
              const data = res.data as any
              setLineApiStatuses(prev => ({ ...prev, [id]: data }))
            })
            .catch(() => {})
        )
      )
    }

    poll()
    pollingRef.current = setInterval(poll, 10_000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [agents]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); fetchAgents(1, searchTerm, agentTypeFilter) }
  const handleTypeFilterChange = (val: string) => { setAgentTypeFilter(val); setPage(1); fetchAgents(1, searchTerm, val) }

  const stopQrPolling = () => {
    if (qrPollingRef.current) { clearInterval(qrPollingRef.current); qrPollingRef.current = null }
    qrElapsedRef.current = 0
  }

  const handleOpenQrModal = async (agent: AgentItem) => {
    setQrModal({ open: true, agent })
    setQrUrl(null)
    setQrFetchError(null)
    setQrLoginState('waiting')
    setQrPinCode(null)
    stopQrPolling()

    // Fetch QR
    setQrLoading(true)
    try {
      const res = await agentApi.getLineApiAgentLoginQr(agent.agentId)
      const data = res.data as any
      if (data?.qrUrl) {
        setQrUrl(data.qrUrl)
        // Start polling login status every 2s, timeout 20s
        qrElapsedRef.current = 0
        qrPollingRef.current = setInterval(async () => {
          qrElapsedRef.current += 2
          if (qrElapsedRef.current >= 60) {
            stopQrPolling()
            setQrLoginState('timeout')
            return
          }
          try {
            const sRes = await agentApi.getLineApiAgentLoginStatus(agent.agentId)
            const sData = sRes.data as any
            if (sData?.state === 'ready') {
              stopQrPolling()
              setQrPinCode(null)
              setQrLoginState('success')
            } else if (sData?.state === 'pin_pending' && sData?.pincode) {
              setQrPinCode(sData.pincode)
              setQrLoginState('pin_pending')
            }
          } catch {}
        }, 2000)
      } else {
        setQrFetchError(data?.error ?? m.qrFetchFailed)
      }
    } catch (err: any) {
      setQrFetchError(err?.message ?? m.qrFetchFailed)
    } finally {
      setQrLoading(false)
    }
  }

  const handleCloseQrModal = () => {
    stopQrPolling()
    setQrModal({ open: false })
  }

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`agent-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openActionId) {
        const ref = menuRefs.current[openActionId]
        if (ref && !ref.contains(e.target as Node)) setOpenActionId(null)
      }
      if (showRegisterMenu && registerMenuRef.current && !registerMenuRef.current.contains(e.target as Node)) {
        setShowRegisterMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openActionId, showRegisterMenu])

  const handleDelete = async () => {
    if (!deleteModal.agentId) return
    setDeleting(true)
    try {
      await agentApi.deleteAgentById(deleteModal.agentId)
      toast.success(m.deleteSuccess)
      setDeleteModal({ open: false })
      setSelectedId(null)
      fetchAgents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.deleteFailed)
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmModal.agentId || !confirmModal.type) return
    setActionLoading(true)
    try {
      if (confirmModal.type === 'restart') {
        await agentApi.restartLineApiAgentById(confirmModal.agentId)
        toast.success(m.restartSuccess)
      } else {
        await agentApi.reloadLineApiAgentById(confirmModal.agentId)
        toast.success(m.reloadSuccess)
      }
      setConfirmModal({ open: false })
    } catch {
      toast.error(confirmModal.type === 'restart' ? m.restartFailed : m.reloadFailed)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  const formatAge = (d?: string | null): string => {
    if (!d) return ''
    const diffMs = Date.now() - new Date(d).getTime()
    if (diffMs < 0) return ''
    const totalMin = Math.floor(diffMs / 60_000)
    const hours = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    if (hours === 0) return `${mins}min`
    return `${hours}h ${mins}min`
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = ['', m.colCode, m.colAgentType, m.colDescription, m.colTags, m.colCreatedDate, m.colLastSeen, m.colLastErrorSeen, m.colStatus, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {deleteModal.open && (
        <DeleteModal
          agentCode={deleteModal.agentCode}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal({ open: false })}
          deleting={deleting}
        />
      )}

      {confirmModal.open && (
        <ConfirmActionModal
          title={confirmModal.type === 'restart' ? m.confirmRestartTitle : m.confirmReloadTitle}
          desc={confirmModal.type === 'restart' ? m.confirmRestartDesc : m.confirmReloadDesc}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal({ open: false })}
          loading={actionLoading}
          t={{ cancel: t.admin.cancel, confirm: m.btnConfirm }}
        />
      )}

      {/* QR Login Modal */}
      {qrModal.open && qrModal.agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">{m.qrModalTitle}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{m.qrModalDesc}</p>
              </div>
              <button onClick={handleCloseQrModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: two columns */}
            <div className="flex">
              {/* Left: agent info + status + PIN */}
              <div className="flex-1 p-6 flex flex-col gap-4 border-r border-gray-100">
                {/* Agent info */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-400 shrink-0 whitespace-nowrap">{m.qrLabelCode}</span>
                    <span className="font-semibold text-gray-900">{qrModal.agent.code}</span>
                  </div>
                  {qrModal.agent.description && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 shrink-0 whitespace-nowrap">{m.qrLabelDesc}</span>
                      <span className="text-gray-700">{qrModal.agent.description}</span>
                    </div>
                  )}
                  {qrModal.agent.tags && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 shrink-0 whitespace-nowrap">{m.qrLabelTags}</span>
                      <div className="flex flex-wrap gap-1">
                        {qrModal.agent.tags.split(',').map(tag => (
                          <span key={tag} className="inline-flex px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* PIN code display */}
                {qrLoginState === 'pin_pending' && qrPinCode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-amber-600 font-medium mb-1">{m.qrPinLabel}</p>
                    <p className="text-3xl font-bold tracking-[0.3em] text-amber-700">{qrPinCode}</p>
                    <p className="text-xs text-amber-600 mt-1">{m.qrPinPending}</p>
                  </div>
                )}

                {/* Login status */}
                {!qrLoading && (qrUrl || qrFetchError) && (
                  <div className={clsx('flex items-center gap-2 text-sm font-medium',
                    qrLoginState === 'success' ? 'text-emerald-600' :
                    qrLoginState === 'timeout' ? 'text-red-500' :
                    qrLoginState === 'pin_pending' ? 'text-amber-600' : 'text-gray-500')}>
                    {(qrLoginState === 'waiting' || qrLoginState === 'pin_pending') && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {qrLoginState === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {qrLoginState === 'timeout' && <AlertCircle className="w-4 h-4" />}
                    {qrFetchError ? qrFetchError :
                     qrLoginState === 'waiting' ? m.qrWaiting :
                     qrLoginState === 'pin_pending' ? m.qrPinPending :
                     qrLoginState === 'success' ? m.qrSuccess : m.qrTimeout}
                  </div>
                )}

                <div className="mt-auto flex justify-end">
                  <button onClick={handleCloseQrModal}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    {m.btnCloseQr}
                  </button>
                </div>
              </div>

              {/* Right: QR code */}
              <div className="flex items-center justify-center p-6 w-56">
                {qrLoading && (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs text-gray-500">{m.qrLoadingQr}</p>
                  </div>
                )}
                {qrFetchError && !qrLoading && (
                  <AlertCircle className="w-10 h-10 text-red-300" />
                )}
                {qrUrl && !qrLoading && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <QRCode value={qrUrl} size={168} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        {/* Register Agent dropdown button */}
        <div className="relative" ref={registerMenuRef}>
          <button
            onClick={() => setShowRegisterMenu(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {m.registerAgent}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showRegisterMenu && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden">
              <button
                onClick={() => { setShowRegisterMenu(false); router.push('/setting/agent/create?type=line-api') }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-green-100 flex items-center justify-center text-green-700 font-bold text-[10px] flex-shrink-0">L</span>
                {m.menuRegisterLineApi}
              </button>
              <button
                onClick={() => { setShowRegisterMenu(false); router.push('/setting/agent/create') }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px] flex-shrink-0">A</span>
                {m.menuRegisterAndroidApp}
              </button>
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
            <button onClick={() => { setSearchTerm(''); fetchAgents(1, '', agentTypeFilter) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        {/* Agent Type filter */}
        <select
          value={agentTypeFilter}
          onChange={e => handleTypeFilterChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">{m.filterAllAgentTypes}</option>
          <option value="Line Api">{m.menuRegisterLineApi}</option>
          <option value="Android App">{m.menuRegisterAndroidApp}</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
        </button>
        <button
          onClick={() => {
            const agent = agents.find(a => a.agentId === selectedId)
            setDeleteModal({ open: true, agentId: selectedId ?? undefined, agentCode: agent?.code ?? undefined })
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
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{m.noAgentsFound}</p>
                  </td>
                </tr>
              ) : (
                agents.map((agent, idx) => {
                  const highlighted = !!agent.agentId && selectedRowId === agent.agentId
                  const isChecked = selectedId === agent.agentId
                  const isLineApi = agent.agentType?.toLowerCase() === 'line api'
                  return (
                    <tr
                      id={`agent-row-${agent.agentId}`}
                      key={agent.agentId}
                      onClick={() => {
                        const next = selectedRowId === agent.agentId ? null : agent.agentId
                        setSelectedRowId(next)
                        if (next) sessionStorage.setItem('agent_highlight', next)
                        else sessionStorage.removeItem('agent_highlight')
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedId(prev => prev === agent.agentId ? null : agent.agentId)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      {/* Code + ID */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/setting/agent/${agent.agentId}/update`) }}
                          className={clsx('text-sm font-semibold hover:underline block', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {agent.code ?? '—'}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{agent.agentId}</p>
                      </td>
                      {/* Agent Type */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <AgentTypeBadge agentType={agent.agentType} />
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 max-w-[200px] truncate">
                        {agent.description ?? '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {agent.tags
                          ? agent.tags.split(',').map(tag => (
                            <span key={tag} className="inline-flex mr-1 mb-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                          ))
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(agent.createdDate)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                        {agent.lastSeenDate ? (
                          <div className="flex flex-col gap-0.5">
                            <span>{formatDate(agent.lastSeenDate)}</span>
                            {formatAge(agent.lastSeenDate) && (
                              <span className="text-xs text-gray-400">{formatAge(agent.lastSeenDate)}</span>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                        {agent.lastSeenErrorDate ? (
                          <div className="flex flex-col gap-0.5">
                            <span>{formatDate(agent.lastSeenErrorDate)}</span>
                            {formatAge(agent.lastSeenErrorDate) && (
                              <span className="text-xs text-gray-400">{formatAge(agent.lastSeenErrorDate)}</span>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        {isLineApi
                          ? <LineApiStatusBadge status={lineApiStatuses[agent.agentId] ?? null} labels={{ running: m.podRunning, offline: m.podOffline, unknown: m.podUnknown }} />
                          : <StatusBadge status={agent.agentStatus} />
                        }
                      </td>
                      {/* Action menu */}
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="relative" ref={el => { menuRefs.current[agent.agentId] = el }}>
                          <button
                            onClick={() => setOpenActionId(prev => prev === agent.agentId ? null : agent.agentId)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openActionId === agent.agentId && (
                            <div className="absolute right-0 top-8 z-50 w-56 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden">
                              {/* Endpoint & API Keys — always enabled */}
                              <button
                                onClick={() => { setOpenActionId(null); router.push(`/setting/agent/${agent.agentId}/endpoint-keys`) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Key className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                {m.actionEndpointKeys}
                              </button>
                              {/* Overview — disabled for Line Api */}
                              <button
                                onClick={() => { if (!isLineApi) { setOpenActionId(null); router.push(`/setting/agent/${agent.agentId}/overview`) } }}
                                disabled={isLineApi}
                                className={clsx(
                                  'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors',
                                  isLineApi ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                                )}
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                {m.actionOverview}
                              </button>
                              <button
                                onClick={() => { setOpenActionId(null); router.push(`/setting/agent/${agent.agentId}/messages`) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors text-gray-700 hover:bg-gray-50"
                              >
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                {m.actionMessages}
                              </button>
                              {/* Restart — only for Line Api */}
                              {isLineApi && (
                                <>
                                  <div className="my-1 border-t border-gray-100" />
                                  <button
                                    onClick={() => { setOpenActionId(null); setConfirmModal({ open: true, type: 'restart', agentId: agent.agentId, agentCode: agent.code ?? undefined }) }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                                  >
                                    <RotateCcw className="w-4 h-4 flex-shrink-0" />
                                    {m.actionRestart}
                                  </button>
                                  <button
                                    onClick={() => { setOpenActionId(null); setConfirmModal({ open: true, type: 'reload', agentId: agent.agentId, agentCode: agent.code ?? undefined }) }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                                  >
                                    <RefreshCw className="w-4 h-4 flex-shrink-0" />
                                    {m.actionReload}
                                  </button>
                                  <button
                                    onClick={() => { setOpenActionId(null); handleOpenQrModal(agent) }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <QrCode className="w-4 h-4 flex-shrink-0" />
                                    {m.actionLoginWithQr}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
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

export default function AgentPage() {
  return (
    <Suspense>
      <AgentListContent />
    </Suspense>
  )
}
