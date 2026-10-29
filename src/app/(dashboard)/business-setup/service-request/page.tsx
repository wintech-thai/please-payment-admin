'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { serviceRequestApi } from '@/lib/api/service-request.api'
import type { ServiceRequestItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, Link2, Mail, RefreshCw, Copy, Check, X, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useFormatDate } from '@/hooks/useFormatDate'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

const SERVICE_TYPES = [
  { value: 'CustomerRegistration', labelKey: 'serviceTypeCustomerRegistration' as const },
]

function getTimeFilter(tr: TimeRangeValue): { fromDate: string; toDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { fromDate: new Date(tr.start * 1000).toISOString(), toDate: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  let startMs = now
  if (unit === 'm') startMs = now - num * 60_000
  else if (unit === 'h') startMs = now - num * 3_600_000
  else startMs = now - num * 86_400_000
  return { fromDate: new Date(startMs).toISOString(), toDate: new Date(now).toISOString() }
}

function StatusBadge({ status, expiredDate, m }: { status?: string | null; expiredDate?: string | null; m: any }) {
  const isExpired = (status === 'Pending' || status === 'Confirmed') && !!expiredDate && new Date(expiredDate) < new Date()
  const effective = isExpired ? 'Expired' : (status || 'Pending')
  const cfg: Record<string, { bg: string; dot: string; label: string }> = {
    Pending: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400', label: m.statusPending },
    Confirmed: { bg: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', label: m.statusConfirmed },
    Approved: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: m.statusApproved },
    Rejected: { bg: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', label: m.statusRejected },
    Expired: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', label: m.statusExpired },
  }
  const c = cfg[effective] ?? cfg.Pending
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', c.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

function TypeBadge({ serviceType, m }: { serviceType?: string | null; m: any }) {
  const label = serviceType === 'CustomerRegistration' ? m.serviceTypeCustomerRegistration : (serviceType ?? '—')
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 bg-violet-50 text-violet-700 ring-violet-200">
      {label}
    </span>
  )
}

function LinkResultModal({ title, link, onClose, m, doneLabel }: { title: string; link: string; onClose: () => void; m: any; doneLabel: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalLinkLabel}</label>
            <div className="flex items-start gap-2">
              <div className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 break-all select-all">{link}</div>
              <button onClick={handleCopy} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? m.createModalCopied : m.createModalCopy}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">
            {doneLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateLinkModal({ serviceType, onClose, onCreated, m, cancelLabel }: { serviceType: string; onClose: () => void; onCreated: (id: string) => void; m: any; cancelLabel: string }) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [adminDomain, setAdminDomain] = useState(typeof window !== 'undefined' ? window.location.origin : '')
  const [lang, setLang] = useState('en')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const handleSubmit = async () => {
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = m.createModalErrRequired
    if (!adminDomain.trim()) errs.adminDomain = m.createModalErrRequired
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const res = await serviceRequestApi.createRegistrationLink({
        Email: email.trim(),
        AdminDomain: adminDomain.trim(),
        Lang: lang,
        FirstName: firstName.trim() || undefined,
        LastName: lastName.trim() || undefined,
        Phone: phone.trim() || undefined,
      })
      const data = res.data as any
      if (data?.status === 'OK' || data?.Status === 'OK') {
        setLink(data.registrationLink ?? data.RegistrationLink ?? null)
        setCreatedId(data.serviceRequest?.id ?? data.ServiceRequest?.Id ?? null)
      } else {
        toast.error(data?.description ?? data?.Description ?? m.createFailed)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.createFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDone = () => {
    if (createdId) onCreated(createdId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{m.createModalTitle}</h3>
          </div>
          {!submitting && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!link ? (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalEmail} <span className="text-red-500">*</span></label>
              <input value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }} disabled={submitting}
                className={clsx('w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500', errors.email ? 'border-red-400' : 'border-gray-200')} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalFirstName}</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} disabled={submitting} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalLastName}</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} disabled={submitting} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalPhone}</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} disabled={submitting} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalAdminDomain} <span className="text-red-500">*</span></label>
              <input value={adminDomain} onChange={e => { setAdminDomain(e.target.value); setErrors(p => ({ ...p, adminDomain: '' })) }} disabled={submitting}
                className={clsx('w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500', errors.adminDomain ? 'border-red-400' : 'border-gray-200')} />
              {errors.adminDomain && <p className="text-red-500 text-xs mt-1">{errors.adminDomain}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalLang}</label>
              <select value={lang} onChange={e => setLang(e.target.value)} disabled={submitting} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="en">English</option>
                <option value="th">ไทย</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-60">
                {cancelLabel}
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60">
                {submitting ? m.createModalSubmitting : m.createServiceRequest}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{m.createModalSuccessTitle}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalLinkLabel}</label>
              <div className="flex items-start gap-2">
                <div className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 break-all select-all">{link}</div>
                <button onClick={handleCopy} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? m.createModalCopied : m.createModalCopy}
                </button>
              </div>
            </div>
            <button onClick={handleDone} className="w-full py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">
              {m.createModalDone}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ConfirmModal({ title, desc, onConfirm, onCancel, loading, confirmLabel, cancelLabel }: {
  title: string; desc: string; onConfirm: () => void; onCancel: () => void; loading: boolean; confirmLabel: string; cancelLabel: string
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl bg-white text-center px-8 py-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors">
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceRequestListContent() {
  const { t } = useLang()
  const m = t.serviceRequestAdmin
  const { fmtDateTime } = useFormatDate()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [items, setItems] = useState<ServiceRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createServiceType, setCreateServiceType] = useState('CustomerRegistration')
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const typeMenuRef = useRef<HTMLDivElement>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type?: 'regenerate' | 'resend' | 'delete'; item?: ServiceRequestItem }>({ open: false })
  const [linkModal, setLinkModal] = useState<{ open: boolean; title?: string; link?: string }>({ open: false })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('service_request_highlight') ?? null
    return null
  })
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openActionId) {
        const ref = menuRefs.current[openActionId]
        if (ref && !ref.contains(e.target as Node)) setOpenActionId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openActionId])

  const fetchItems = async (p = page, search = searchTerm, status = statusFilter, type = typeFilter, tr = timeRange) => {
    setLoading(true)
    try {
      const offset = (p - 1) * itemsPerPage + 1
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload = {
        FullTextSearch: search || undefined,
        Status: status || undefined,
        ServiceType: type || undefined,
        FromDate: fromDate,
        ToDate: toDate,
        Offset: offset,
        Limit: itemsPerPage,
      }
      const [listRes, countRes] = await Promise.allSettled([
        serviceRequestApi.getServiceRequests(payload),
        serviceRequestApi.getServiceRequestCount(payload),
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

  useEffect(() => { fetchItems() }, [page, itemsPerPage])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`sr-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showTypeMenu && typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setShowTypeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showTypeMenu])

  const applyFilters = () => { setPage(1); fetchItems(1, searchTerm, statusFilter, typeFilter, timeRange) }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    fetchItems(1, searchTerm, statusFilter, typeFilter, tr)
  }

  const handleRowSelect = (id?: string | null) => {
    if (!id) return
    const next = selectedRowId === id ? null : id
    setSelectedRowId(next)
    if (next) sessionStorage.setItem('service_request_highlight', next)
    else sessionStorage.removeItem('service_request_highlight')
  }

  const handleOpenDetail = (id?: string | null) => {
    if (!id) return
    setSelectedRowId(id)
    sessionStorage.setItem('service_request_highlight', id)
    router.push(`/business-setup/service-request/${id}`)
  }

  const handleCreated = (id: string) => {
    sessionStorage.setItem('service_request_highlight', id)
    setSelectedRowId(id)
    fetchItems()
  }

  const handleConfirmAction = async () => {
    const { type, item } = confirmModal
    if (!type || !item?.id) return
    setActionLoading(item.id)
    try {
      if (type === 'regenerate') {
        const res = await serviceRequestApi.regenerateLink(item.id, typeof window !== 'undefined' ? window.location.origin : undefined)
        const data = res.data as any
        if (data?.status === 'OK' || data?.Status === 'OK') {
          const link = data.registrationLink ?? data.RegistrationLink
          toast.success(m.regenerateSuccess)
          fetchItems()
          setConfirmModal({ open: false })
          if (link) setLinkModal({ open: true, title: m.regenerateLinkModalTitle, link })
          setActionLoading(null)
          return
        }
        toast.error(data?.description ?? m.regenerateFailed)
      } else if (type === 'resend') {
        const res = await serviceRequestApi.resendLinkEmail(item.id)
        const data = res.data as any
        if (data?.status === 'OK' || data?.Status === 'OK') { toast.success(m.resendSuccess); fetchItems() }
        else toast.error(data?.description ?? m.resendFailed)
      } else if (type === 'delete') {
        const res = await serviceRequestApi.deleteServiceRequestById(item.id)
        const data = res.data as any
        if (data?.status === 'OK' || data?.Status === 'OK') { toast.success(m.deleteSuccess); setSelectedId(null); fetchItems() }
        else toast.error(data?.status === 'APPROVED_CANNOT_DELETE' ? m.cannotDeleteApproved : (data?.description ?? m.deleteFailed))
      }
      setConfirmModal({ open: false })
    } catch (err: unknown) {
      const failMsg = type === 'regenerate' ? m.regenerateFailed : type === 'resend' ? m.resendFailed : m.deleteFailed
      toast.error(err instanceof Error ? err.message : failMsg)
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = ['', m.colId, m.colCreatedDate, m.colEmail, m.colName, m.colServiceType, m.colShopCode, m.colStatus, m.colExpiredDate, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showCreateModal && (
        <CreateLinkModal
          serviceType={createServiceType}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
          m={m}
          cancelLabel={t.admin.cancel}
        />
      )}

      {linkModal.open && linkModal.link && (
        <LinkResultModal
          title={linkModal.title ?? m.viewLinkModalTitle}
          link={linkModal.link}
          onClose={() => setLinkModal({ open: false })}
          m={m}
          doneLabel={m.createModalDone}
        />
      )}

      {confirmModal.open && (
        <ConfirmModal
          title={confirmModal.type === 'regenerate' ? m.regenerateConfirmTitle : confirmModal.type === 'resend' ? m.resendConfirmTitle : m.deleteConfirmTitle}
          desc={confirmModal.type === 'regenerate' ? m.regenerateConfirmDesc : confirmModal.type === 'resend' ? m.resendConfirmDesc : m.deleteConfirmDesc}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal({ open: false })}
          loading={!!actionLoading}
          confirmLabel={t.admin.confirm}
          cancelLabel={t.admin.cancel}
        />
      )}

      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <div className="relative" ref={typeMenuRef}>
          <button
            onClick={() => setShowTypeMenu(v => !v)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {m.createServiceRequest}
            <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', showTypeMenu && 'rotate-180')} />
          </button>
          {showTypeMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden z-50">
              {SERVICE_TYPES.map(st => (
                <button
                  key={st.value}
                  onClick={() => { setCreateServiceType(st.value); setShowTypeMenu(false); setShowCreateModal(true) }}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  {m[st.labelKey]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="search"
            name="service-request-search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            placeholder={m.searchPlaceholder}
            autoComplete="off"
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setPage(1); fetchItems(1, '', statusFilter, typeFilter, timeRange) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); fetchItems(1, searchTerm, statusFilter, e.target.value, timeRange) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">{m.filterAllServiceTypes}</option>
          {SERVICE_TYPES.map(st => <option key={st.value} value={st.value}>{m[st.labelKey]}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchItems(1, searchTerm, e.target.value, typeFilter, timeRange) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          <option value="">{m.filterAllStatus}</option>
          <option value="Pending">{m.statusPending}</option>
          <option value="Confirmed">{m.statusConfirmed}</option>
          <option value="Approved">{m.statusApproved}</option>
          <option value="Rejected">{m.statusRejected}</option>
        </select>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
        <button onClick={applyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          {t.admin.search}
        </button>
        <button
          onClick={() => {
            const item = items.find(i => i.id === selectedId)
            setConfirmModal({ open: true, type: 'delete', item })
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

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th key={i} className={clsx('px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap', i === 0 && 'rounded-tl-xl', i === cols.length - 1 && 'rounded-tr-xl')}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-gray-400">{t.admin.loading}</span>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-gray-500">{m.noDataFound}</p>
                </td></tr>
              ) : (
                items.map((item, idx) => {
                  const highlighted = !!item.id && selectedRowId === item.id
                  const isChecked = !!item.id && selectedId === item.id
                  const name = [item.firstName, item.lastName].filter(Boolean).join(' ') || '—'
                  const canModify = item.status !== 'Approved' && item.status !== 'Rejected'
                  const busy = actionLoading === item.id
                  return (
                    <tr
                      id={`sr-row-${item.id}`}
                      key={item.id}
                      onClick={() => handleRowSelect(item.id)}
                      className={clsx('cursor-pointer transition-colors', highlighted ? 'bg-primary-100' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')}
                    >
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setSelectedId(prev => prev === item.id ? null : (item.id ?? null))}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <button
                          onClick={e => { e.stopPropagation(); handleOpenDetail(item.id) }}
                          className={clsx('text-sm font-semibold hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                        >
                          {item.id ? item.id.slice(0, 8) : '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">{item.createdDate ? fmtDateTime(item.createdDate, false) : '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm font-semibold text-gray-700">{item.email ?? '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-700">{name}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap"><TypeBadge serviceType={item.serviceType} m={m} /></td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-600">{item.shopCode ?? '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap"><StatusBadge status={item.status} expiredDate={item.expiredDate} m={m} /></td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">{item.expiredDate ? fmtDateTime(item.expiredDate, false) : '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                        <div className="relative" ref={el => { menuRefs.current[item.id ?? ''] = el }}>
                          <button
                            onClick={() => setOpenActionId(prev => prev === item.id ? null : (item.id ?? null))}
                            disabled={busy || !canModify}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openActionId === item.id && (
                            <div className="absolute right-0 top-8 z-50 w-52 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden">
                              {canModify && (
                                <>
                                  <button
                                    onClick={() => { setOpenActionId(null); setConfirmModal({ open: true, type: 'regenerate', item }) }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <RefreshCw className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                    {m.actionRegenerateLink}
                                  </button>
                                  <button
                                    onClick={() => { setOpenActionId(null); setConfirmModal({ open: true, type: 'resend', item }) }}
                                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  >
                                    <Mail className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                    {m.actionResendEmail}
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

        <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{m.rowsPerPage}</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }} className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {m.of} {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ServiceRequestPage() {
  return (
    <Suspense>
      <ServiceRequestListContent />
    </Suspense>
  )
}
