'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getMerchantBase } from '@/lib/merchant-url'
import { useRouter } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, MoreVertical, X, ChevronDown, Paperclip, Link2, Copy, Check, TriangleAlert, Pencil, Download } from 'lucide-react'
import { masterRefApi, type MasterRefItem } from '@/lib/api/master-ref.api'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import QRCode from 'react-qr-code'
import AuditNoticeDrawer from '@/components/AuditNoticeDrawer'
import ExportCsvModal from '@/components/ExportCsvModal'
import type { CsvCell } from '@/lib/csv-export'

const HIGHLIGHTED_KEY = 'payInRequests_highlightedId'
const FILTER_KEY = 'payInRequests_filter'

function getTimeFilter(tr: TimeRangeValue): { fromDate: string; toDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return {
      fromDate: new Date(tr.start * 1000).toISOString(),
      toDate: new Date(tr.end * 1000).toISOString(),
    }
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

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatAge(createdDate?: string | null): string {
  if (!createdDate) return ''
  const diffMs = Date.now() - new Date(createdDate).getTime()
  if (diffMs < 0) return ''
  const totalMin = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}min`
  return `${hours}h ${mins}min`
}

function formatDateTime(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}

function StatusBadge({ status, createdDate, paymentTxId, statusReason, isPeerToPeer, trailing }: {
  status?: string | null
  createdDate?: string | null
  paymentTxId?: string | null
  statusReason?: string | null
  isPeerToPeer?: boolean | null
  trailing?: React.ReactNode
}) {
  const s = status?.toLowerCase()
  if (s === 'match' || s === 'paid') return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{status}
        </span>
        {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
        {trailing}
      </div>
    </div>
  )
  if (s === 'approved') return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{status}
        </span>
        {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
        {trailing}
      </div>
      {paymentTxId && (
        <a
          href={`/business-setup/payment/pay-in-transactions/${paymentTxId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline ml-1"
        >
          <span className="truncate max-w-[130px]">{paymentTxId}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      )}
      {statusReason && (
        <span className="text-[10px] text-emerald-600 ml-1 max-w-[160px] truncate" title={statusReason}>{statusReason}</span>
      )}
    </div>
  )
  if (s === 'rejected') return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{status}
        </span>
        {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-red-50 text-red-700 ring-red-200">P2P</span>}
        {trailing}
      </div>
      {statusReason && (
        <span className="text-[10px] text-red-500 ml-1 max-w-[160px] truncate" title={statusReason}>{statusReason}</span>
      )}
    </div>
  )
  if (s === 'error') return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{status}
      </span>
      {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-red-50 text-red-700 ring-red-200">P2P</span>}
      {trailing}
    </div>
  )
  const age = formatAge(createdDate)
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />{status ?? 'Pending'}
        </span>
        {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-amber-50 text-amber-700 ring-amber-200">P2P</span>}
        {trailing}
      </div>
      {age && <span className="text-[10px] text-gray-400 ml-1">{age}</span>}
    </div>
  )
}

// ── Slip Upload Link Modal ─────────────────────────────────────────────────

function SlipUploadLinkModal({ item, onClose }: { item: PayInRequestItem; onClose: () => void }) {
  const { t } = useLang()
  const m = t.payInRequest
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const orgId = item.orgId
        if (!orgId) {
          // Fallback: fetch detail to get orgId
          const res = await paymentRequestApi.getPaymentRequestById(item.id)
          const d = (res.data as any)
          const detail = d?.paymentRequest ?? d
          const oid = detail?.orgId
          if (!oid) throw new Error('orgId not found')
          const tokenRes = await paymentRequestApi.generatePayInSlipUploadToken(oid, item.id)
          const td = (tokenRes.data as any)
          const relUrl = td?.slipUploadUrl ?? td?.SlipUploadUrl
          if (!relUrl) throw new Error('URL not returned')
          setUrl(`${getMerchantBase()}${relUrl}`)
        } else {
          const tokenRes = await paymentRequestApi.generatePayInSlipUploadToken(orgId, item.id)
          const td = (tokenRes.data as any)
          const relUrl = td?.slipUploadUrl ?? td?.SlipUploadUrl
          if (!relUrl) throw new Error('URL not returned')
          setUrl(`${getMerchantBase()}${relUrl}`)
        }
      } catch {
        setErrorMsg(m.slipLinkError)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [item])

  const handleCopy = () => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{m.slipLinkTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
              <svg className="w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">{m.slipLinkLoading}</span>
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-red-500 text-center py-4">{errorMsg}</p>
          ) : url ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">{m.slipLinkDesc}</p>
              <div className="flex justify-center p-3 bg-white border border-gray-200 rounded-xl">
                <QRCode value={url} size={160} />
              </div>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-xs text-gray-700 font-mono break-all">{url}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 hover:underline">
                <ExternalLink className="w-3.5 h-3.5" />
                {m.slipLinkOpen}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── Approve Confirm Modal ────────────────────────────────────────────────────

function ApproveConfirmModal({
  item,
  onSuccess,
  onClose,
}: {
  item: PayInRequestItem
  onSuccess: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [loading, setLoading] = useState(false)
  const [approveStatusCode, setApproveStatusCode] = useState('')
  const [reason, setReason] = useState('')
  const [statuses, setStatuses] = useState<MasterRefItem[]>([])
  const [statusSearch, setStatusSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    masterRefApi.getMasterRefs({ RefType: 'PayInApproveStatus', Limit: 200 })
      .then(res => {
        const data = res.data as any
        setStatuses(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = statuses.filter(s =>
    s.code?.toLowerCase().includes(statusSearch.toLowerCase()) ||
    s.description?.toLowerCase().includes(statusSearch.toLowerCase())
  )

  const selectStatus = (s: MasterRefItem) => {
    setApproveStatusCode(s.code ?? '')
    setStatusSearch(s.code ?? '')
    setReason(s.description ?? '')
    setDropdownOpen(false)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await paymentRequestApi.createPaymentTxByPayInRequestId(item.id, {
        StatusCode: approveStatusCode || undefined,
        StatusReason: reason.trim() || undefined,
      })
      toast.success(m.toastApproveSuccess)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.toastApproveFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.modalApproveTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            {(item.merchantCode || item.merchantName) && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 font-medium">{m.fieldMerchant}</span>
                <span className="font-semibold text-gray-800 text-right">{item.merchantCode ?? item.merchantName}</span>
              </div>
            )}
            {(item.payinBankCode || item.payinBankAccountNo) && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 font-medium">{m.fieldAccountNo}</span>
                <span className="font-semibold text-gray-800 text-right">
                  {[item.payinBankCode, item.payinBankAccountNo].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 font-medium">{m.fieldAmount}</span>
              <span className="font-bold text-gray-900 tabular-nums">
                {formatAmount(item.generatedAmount)} {item.currency ?? ''}
              </span>
            </div>
            {item.refId1 && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 font-medium">{m.fieldRefId}</span>
                <span className="text-gray-700 text-right truncate max-w-[180px]">{item.refId1}</span>
              </div>
            )}
          </div>

          {/* Approve Status — searchable dropdown (optional) */}
          <div ref={dropdownRef} className="relative">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {m.labelApproveStatus}
            </label>
            <div
              className={clsx(
                'flex items-center border rounded-lg px-3 py-2 cursor-text bg-white',
                dropdownOpen ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200'
              )}
              onClick={() => setDropdownOpen(true)}
            >
              <input
                value={statusSearch}
                onChange={e => { setStatusSearch(e.target.value); setApproveStatusCode(''); setDropdownOpen(true) }}
                onFocus={() => setDropdownOpen(true)}
                placeholder={m.approveStatusPlaceholder}
                className="flex-1 text-sm outline-none bg-transparent"
              />
              <ChevronDown className={clsx('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
            </div>
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-400 text-center">—</div>
                ) : (
                  filtered.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectStatus(s) }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-xs font-bold text-primary-700 min-w-[80px]">{s.code}</span>
                      {s.description && <span className="text-xs text-gray-500 truncate">{s.description}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{m.labelApproveReason}</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={m.approveReasonPlaceholder}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {m.btnCancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? '...' : m.btnApprove}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  item,
  onSuccess,
  onClose,
}: {
  item: PayInRequestItem
  onSuccess: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [reason, setReason] = useState('')
  const [rejectStatusCode, setRejectStatusCode] = useState('')
  const [statuses, setStatuses] = useState<MasterRefItem[]>([])
  const [statusSearch, setStatusSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    masterRefApi.getMasterRefs({ RefType: 'PayInRejectStatus', Limit: 200 })
      .then(res => {
        const data = res.data as any
        setStatuses(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = statuses.filter(s =>
    s.code?.toLowerCase().includes(statusSearch.toLowerCase()) ||
    s.description?.toLowerCase().includes(statusSearch.toLowerCase())
  )

  const selectStatus = (item: MasterRefItem) => {
    setRejectStatusCode(item.code ?? '')
    setStatusSearch(item.code ?? '')
    setReason(item.description ?? '')
    setStatusError('')
    setDropdownOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectStatusCode) { setStatusError(m.rejectStatusRequired); return }
    setLoading(true)
    try {
      await paymentRequestApi.rejectPendingPayInRequestById(item.id, reason, rejectStatusCode)
      toast.success(m.toastRejectSuccess)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.toastRejectFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.modalRejectTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Reject Status — searchable dropdown */}
          <div ref={dropdownRef} className="relative">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {m.labelRejectStatus} <span className="text-red-500">*</span>
            </label>
            <div
              className={clsx(
                'flex items-center border rounded-lg px-3 py-2 cursor-text bg-white',
                statusError ? 'border-red-400 ring-1 ring-red-400' : dropdownOpen ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200'
              )}
              onClick={() => { setDropdownOpen(true) }}
            >
              <input
                value={statusSearch}
                onChange={e => { setStatusSearch(e.target.value); setRejectStatusCode(''); setDropdownOpen(true) }}
                onFocus={() => setDropdownOpen(true)}
                placeholder={m.rejectStatusPlaceholder}
                className="flex-1 text-sm outline-none bg-transparent"
              />
              <ChevronDown className={clsx('w-4 h-4 text-gray-400 flex-shrink-0 transition-transform', dropdownOpen && 'rotate-180')} />
            </div>
            {statusError && <p className="text-red-500 text-xs mt-1">{statusError}</p>}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-400 text-center">—</div>
                ) : (
                  filtered.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectStatus(s) }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-xs font-bold text-primary-700 min-w-[80px]">{s.code}</span>
                      {s.description && <span className="text-xs text-gray-500 truncate">{s.description}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{m.labelRejectReason}</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={m.rejectReasonPlaceholder}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              {m.btnCancel}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60">
              {loading ? '...' : m.btnReject}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Slip Quick View Modal (list page) ─────────────────────────────────────────

type SlipQuickItem ={ slipId?: string | null; imageBase64: string; uploadedAt: string; first4?: string | null; last4?: string | null; note?: string | null }

function SlipQuickViewModal({
  item,
  onClose,
  onApprove,
}: {
  item: PayInRequestItem
  onClose: () => void
  onApprove: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [slips, setSlips] = useState<SlipQuickItem[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [dupIds, setDupIds] = useState<string[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editFirst4, setEditFirst4] = useState('')
  const [editLast4, setEditLast4] = useState('')
  const [editNote, setEditNote] = useState('')
  const [saving, setSaving] = useState(false)
  const isPending = item.status?.toLowerCase() === 'pending'

  useEffect(() => {
    paymentRequestApi.getPayInSlipUploads(item.orgId ?? '', item.id)
      .then(r => {
        const d = r.data as any
        const list: any[] = Array.isArray(d) ? d : (d?.slips ?? d?.Slips ?? [])
        setSlips(list.map(s => ({
          slipId: s.slipId ?? s.SlipId ?? null,
          imageBase64: s.imageBase64 ?? s.ImageBase64 ?? '',
          uploadedAt: s.uploadedAt ?? s.UploadedAt ?? '',
          first4: s.first4 ?? s.First4 ?? null,
          last4: s.last4 ?? s.Last4 ?? null,
          note: s.note ?? s.Note ?? null,
        })).sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [item.id])

  const slip = slips[idx]

  useEffect(() => { setEditOpen(false) }, [idx])

  useEffect(() => {
    setDupIds([])
    const f4 = slip?.first4?.trim().toUpperCase()
    const l4 = slip?.last4?.trim().toUpperCase()
    if (!f4 || !l4 || f4.length !== 4 || l4.length !== 4 || !item.orgId) return
    fetch(`/api/proxy/admin-api/AdminPaymentRequest/org/${item.orgId}/action/CheckPayInSlipDup/${item.id}/${f4}/${l4}`)
      .then(r => r.json())
      .then(data => {
        const dups = data?.Duplicates ?? data?.duplicates ?? []
        setDupIds(dups.map((d: { documentId?: string }) => d.documentId).filter(Boolean))
      })
      .catch(() => {})
  }, [idx, slip?.first4, slip?.last4, item.orgId, item.id])

  const handleEditOpen = () => {
    setEditFirst4(slip?.first4 ?? '')
    setEditLast4(slip?.last4 ?? '')
    setEditNote(slip?.note ?? '')
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!slip?.slipId || !item.orgId) return
    setSaving(true)
    try {
      const resp = await fetch(
        `/api/proxy/admin-api/AdminPaymentRequest/org/${item.orgId}/action/UpdatePayInSlipFirst4Last4/${item.id}/${slip.slipId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            First4: editFirst4.trim().toUpperCase() || null,
            Last4: editLast4.trim().toUpperCase() || null,
            Note: editNote.trim() || null,
          }),
        }
      )
      const data = await resp.json()
      if ((data?.Status ?? data?.status) === 'OK') {
        setSlips(prev => prev.map((s, i) =>
          i === idx ? { ...s, first4: editFirst4.trim().toUpperCase() || null, last4: editLast4.trim().toUpperCase() || null, note: editNote.trim() || null } : s
        ))
        setEditOpen(false)
        setDupIds([])
      } else {
        toast.error(data?.Description ?? data?.description ?? 'Save failed')
      }
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex-none flex items-center justify-between px-5 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-semibold">{m.slipViewerTitle} ({slips.length === 0 ? '—' : `${idx + 1} / ${slips.length}`})</span>
          {slip?.uploadedAt && <span className="text-white/60 text-xs">{new Date(slip.uploadedAt).toLocaleString('th-TH')}</span>}
        </div>
        <div className="flex items-center gap-3">
          {isPending && slips.length > 0 && (
            <button type="button" onClick={() => { onClose(); onApprove() }} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
              {m.btnApprove}
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dup warning banner */}
      {dupIds.length > 0 && (
        <div className="flex-none mx-5 mb-1 rounded-lg bg-red-600/90 px-4 py-2.5 flex items-start gap-2" onClick={e => e.stopPropagation()}>
          <TriangleAlert className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white">
            <span className="font-semibold">{m.slipDupFound} ({dupIds.length})</span>
            {dupIds.map(docId => (
              <span key={docId} className="block mt-0.5 opacity-90">
                {m.slipDupViewRequest}{' '}
                <a
                  href={`/business-setup/payment/pay-in-requests/${docId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded underline underline-offset-2"
                  onClick={e => e.stopPropagation()}
                >
                  {docId}
                </a>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-stretch gap-0 min-h-0" onClick={e => e.stopPropagation()}>
        {/* Left metadata panel */}
        {!loading && slips.length > 0 && (
          <div className="flex-none w-56 flex flex-col px-4 py-4 overflow-y-auto gap-0">

            {/* ── Payment Request Section ───────────────────── */}
            {(item.payinBankCode || item.payinBankAccountName || item.payinBankAccountNo || item.payinPromptPayId) && (
              <div>
                <div className="bg-teal-900/60 border border-teal-500/40 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-teal-300/70 uppercase tracking-widest mb-2">{m.slipDestAccount}</p>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {item.payinBankCode && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-500 text-white uppercase tracking-wide">{item.payinBankCode}</span>
                    )}
                    {item.payinIsPeerToPeer && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/80 text-white uppercase tracking-wide">P2P</span>
                    )}
                  </div>
                  {item.payinBankAccountNo && <p className="text-sm font-mono font-bold text-white leading-tight">{item.payinBankAccountNo}</p>}
                  {item.payinBankAccountName && <p className="text-xs text-teal-100 font-medium mt-1">{item.payinBankAccountName}</p>}
                  {item.payinPromptPayId && (
                    <div className="mt-2 pt-2 border-t border-teal-700/50">
                      <p className="text-[9px] font-bold text-teal-400 uppercase tracking-wide mb-0.5">PromptPay</p>
                      <p className="text-xs font-mono font-bold text-yellow-300">{item.payinPromptPayId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {item.generatedAmount != null && (
              <div className="mt-3 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-3">
                <p className="text-[9px] text-amber-300/80 uppercase tracking-widest mb-1">{m.slipAmount}</p>
                <p className="text-base font-bold text-amber-300 tabular-nums">{Number(item.generatedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}

            {/* ── Slip Upload Section — pinned to bottom ────── */}
            <div className="mt-auto pt-3 flex flex-col gap-2">
              {/* REFERENCE section */}
              <div className="bg-white/10 rounded-xl px-3 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest">{m.slipRefLabel}</p>
                  {slip?.slipId ? (
                    <button
                      type="button"
                      onClick={handleEditOpen}
                      className="p-1 rounded hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[8px] text-white/30 italic">cannot edit</span>
                  )}
                </div>
                {editOpen ? (
                  <div className="flex flex-col gap-2">
                    <input
                      maxLength={4}
                      value={editFirst4}
                      onChange={e => setEditFirst4(e.target.value.toUpperCase())}
                      placeholder="First 4"
                      className="w-full bg-white/20 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                    <input
                      maxLength={4}
                      value={editLast4}
                      onChange={e => setEditLast4(e.target.value.toUpperCase())}
                      placeholder="Last 4"
                      className="w-full bg-white/20 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                    <textarea
                      rows={2}
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                      placeholder="Note"
                      className="w-full bg-white/20 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-yellow-400 resize-none"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleEditSave}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setEditOpen(false)}
                        className="flex-1 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-mono font-bold text-yellow-300 tracking-wider">
                    {slip?.first4 || slip?.last4 ? `${slip.first4} — ${slip.last4}` : <span className="text-white/30 text-xs">—</span>}
                  </p>
                )}
              </div>
              {!editOpen && slip?.note && (
                <div className="bg-white/10 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">{m.slipNoteLabel}</p>
                  <p className="text-sm text-white font-medium leading-snug">{slip.note}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav + image */}
        <div className="flex-1 flex items-center gap-4 px-4 min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <svg className="w-8 h-8 animate-spin text-white/60" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : slips.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/60 text-sm">{m.slipViewBtn} — no slips</div>
          ) : (
            <>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx <= 0} className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center justify-center min-h-0">
                {slip && (
                  <img
                    src={`data:image/jpeg;base64,${slip.imageBase64}`}
                    alt={`slip ${idx + 1}`}
                    className="max-h-[calc(100vh-120px)] max-w-full rounded-xl shadow-2xl object-contain"
                  />
                )}
              </div>
              <button onClick={() => setIdx(i => Math.min(slips.length - 1, i + 1))} disabled={idx >= slips.length - 1} className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white disabled:opacity-30 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Action Menu ───────────────────────────────────────────────────────────────

function ActionMenu({
  item,
  onApprove,
  onReject,
  onSlipLink,
}: {
  item: PayInRequestItem
  onApprove: () => void
  onReject: () => void
  onSlipLink: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const isPending = item.status?.toLowerCase() === 'pending'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropUp(window.innerHeight - rect.bottom < 100)
    }
    setOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className={clsx('absolute right-0 z-20 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden', dropUp ? 'bottom-8' : 'top-8')}>
          <button
            type="button"
            disabled={!isPending}
            onClick={() => { setOpen(false); onApprove() }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {m.menuApprove}
          </button>
          <button
            type="button"
            disabled={!isPending}
            onClick={() => { setOpen(false); onReject() }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {m.menuReject}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onSlipLink() }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            Slip Upload Link
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PayInRequestsPage() {
  const { t } = useLang()
  const m = t.payInRequest
  const router = useRouter()

  const [search, setSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.statusFilter ?? '') : ''
  )
  const [p2pFilter, setP2pFilter] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.p2pFilter ?? '') : ''
  )
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.timeRange ?? { type: 'relative', value: '24h' }) : { type: 'relative', value: '24h' }
  )
  const [items, setItems] = useState<PayInRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [approveTarget, setApproveTarget] = useState<PayInRequestItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PayInRequestItem | null>(null)
  const [slipLinkTarget, setSlipLinkTarget] = useState<PayInRequestItem | null>(null)
  const [slipViewerTarget, setSlipViewerTarget] = useState<PayInRequestItem | null>(null)
  const [noticeTarget, setNoticeTarget] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? ''
    }
    return ''
  })

  const load = useCallback(async (currentPage: number, limit: number, tr: TimeRangeValue, q: string, status: string, p2p: string) => {
    if (typeof window !== 'undefined') sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search: q, statusFilter: status, p2pFilter: p2p, timeRange: tr }))
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: Record<string, unknown> = { Page: currentPage, Limit: limit, FromDate: fromDate, ToDate: toDate }
      if (q.trim()) payload.FullTextSearch = q.trim()
      if (status) payload.Status = status
      if (p2p) payload.IsPeerToPeer = p2p === 'true'

      const countPayload = { ...payload }
      delete countPayload.FullTextSearch

      const [listRes, countRes] = await Promise.allSettled([
        paymentRequestApi.getPayInRequests(payload),
        paymentRequestApi.getPayInRequestCount(countPayload),
      ])

      if (listRes.status === 'rejected') throw listRes.reason

      const data = (listRes.value.data as any)
      const list: PayInRequestItem[] = Array.isArray(data)
        ? data
        : (data?.paymentRequests ?? data?.PaymentRequests ?? data?.requests ?? [])
      setItems(list)

      if (countRes.status === 'fulfilled') {
        const countData = countRes.value.data as any
        setTotal(typeof countData === 'number' ? countData : (countData?.count ?? 0))
      } else {
        setTotal(list.length)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1, itemsPerPage, timeRange, search, statusFilter, p2pFilter) }, [])

  const handleRefresh = () => {
    setPage(1)
    load(1, itemsPerPage, timeRange, search, statusFilter, p2pFilter)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    load(1, itemsPerPage, tr, search, statusFilter, p2pFilter)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  const displayTotal = search.trim() ? items.length : total
  const totalPages = Math.ceil(displayTotal / itemsPerPage)
  const startRow = displayTotal === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, displayTotal)

  const cols = [m.colDate, m.colMerchant, m.colAmount, m.colFee, m.colBankAccount, m.colPayer, m.colStatus, 'REF', m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center mb-4">

        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
          <option>{m.searchField}</option>
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRefresh()}
            placeholder={m.search}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
        </button>

        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value)
            setPage(1)
            load(1, itemsPerPage, timeRange, search, e.target.value, p2pFilter)
          }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.statusAll}</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Error">Error</option>
        </select>

        <select
          value={p2pFilter}
          onChange={e => {
            setP2pFilter(e.target.value)
            setPage(1)
            load(1, itemsPerPage, timeRange, search, statusFilter, e.target.value)
          }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.p2pAll}</option>
          <option value="true">{m.p2pOnly}</option>
          <option value="false">{m.p2pNone}</option>
        </select>

        <AdvancedTimeRangeSelector
          value={timeRange}
          onChange={handleTimeRangeChange}
          disabled={loading}
        />

        <button
          onClick={handleRefresh}
          disabled={loading}
          title={m.refresh}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>

        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          {t.common.export.button}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[1100px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'rounded-tl-xl text-left',
                      i === cols.length - 1 && 'rounded-tr-xl text-center',
                      (i === 2 || i === 3) ? 'text-right' : 'text-left'
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
                    <p className="text-sm font-semibold text-gray-500">{m.noData}</p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isHighlighted = highlightedId === item.id
                  const isPromptPay = item.payinAccountType?.toLowerCase() === 'promptpay'
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowHighlight(item.id)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isHighlighted
                          ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      {/* Date + ref */}
                      <td
                        className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer group"
                        onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`/business-setup/payment/pay-in-requests/${item.id}`) }}
                      >
                        <span className="text-sm text-gray-600 group-hover:text-primary-600 group-hover:underline">{formatDateTime(item.createdDate)}</span>
                        {item.refId1 && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.refId1}</p>
                        )}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800">{item.merchantCode ?? '—'}</p>
                        {item.merchantName && <p className="text-xs text-gray-500 mt-0.5">{item.merchantName}</p>}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-800 tabular-nums">
                          {formatAmount(item.generatedAmount)}
                        </p>
                        <p className="text-xs text-gray-400">{item.currency ?? '—'}</p>
                      </td>

                      {/* Fee */}
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        {item.payInFeePct != null && item.payInFeePct > 0 ? (
                          <>
                            {item.generatedAmount != null && (
                              <p className="text-sm font-semibold tabular-nums text-gray-800">{formatAmount(item.generatedAmount * item.payInFeePct / 100)}</p>
                            )}
                            <p className="text-xs text-gray-400">{item.payInFeePct}%</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 min-w-[180px]">
                        {item.payinBankCode || item.payinBankAccountNo ? (
                          <p className="text-sm font-semibold text-gray-800">{[item.payinBankCode, item.payinBankAccountNo].filter(Boolean).join(' · ')}</p>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                        {item.payinBankAccountName && <p className="text-xs text-gray-500 mt-0.5">{item.payinBankAccountName}</p>}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.payinAccountType && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">{item.payinAccountType}</span>
                          )}
                          {isPromptPay && item.payinPromptPayId && (
                            <span className="text-[10px] text-gray-500">{item.payinPromptPayId}</span>
                          )}
                          {item.payinIsPeerToPeer && (
                            <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full ring-1 ring-violet-200">P2P</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <p className="text-sm text-gray-700">{item.payerName ?? '—'}</p>
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        <StatusBadge
                          status={item.status}
                          createdDate={item.createdDate}
                          paymentTxId={item.paymentTxId}
                          statusReason={item.statusReason}
                          isPeerToPeer={item.payinIsPeerToPeer}
                          trailing={
                            <>
                              {(item.payInSlipUploadCount ?? 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); setSlipViewerTarget(item) }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  {item.payInSlipUploadCount}
                                </button>
                              )}
                              {(item.noticeCount ?? 0) > 0 && (
                                <button
                                  type="button"
                                  onClick={e => { e.stopPropagation(); setNoticeTarget(item.id) }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
                                >
                                  <TriangleAlert className="w-3 h-3" />
                                  {item.noticeCount}
                                </button>
                              )}
                            </>
                          }
                        />
                      </td>

                      {/* REF */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        <div className="flex flex-col gap-0.5">
                          {item.refId1 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId1}</span> : null}
                          {item.refId2 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId2}</span> : null}
                          {item.refId3 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId3}</span> : null}
                          {!item.refId1 && !item.refId2 && !item.refId3 && <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 border-b border-gray-100 text-center">
                        <ActionMenu
                          item={item}
                          onApprove={() => setApproveTarget(item)}
                          onReject={() => setRejectTarget(item)}
                          onSlipLink={() => setSlipLinkTarget(item)}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{displayTotal}</span> {m.foundCount}
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select
                value={itemsPerPage}
                onChange={e => {
                  const n = Number(e.target.value)
                  setItemsPerPage(n)
                  setPage(1)
                  load(1, n, timeRange, search, statusFilter, p2pFilter)
                }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
              >
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{displayTotal === 0 ? '0-0' : `${startRow}-${endRow}`} of {displayTotal}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setPage(p => p - 1); load(page - 1, itemsPerPage, timeRange, search, statusFilter, p2pFilter) }}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setPage(p => p + 1); load(page + 1, itemsPerPage, timeRange, search, statusFilter, p2pFilter) }}
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

      {approveTarget && (
        <ApproveConfirmModal
          item={approveTarget}
          onSuccess={handleRefresh}
          onClose={() => setApproveTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onSuccess={handleRefresh}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {slipLinkTarget && (
        <SlipUploadLinkModal
          item={slipLinkTarget}
          onClose={() => setSlipLinkTarget(null)}
        />
      )}

      {slipViewerTarget && (
        <SlipQuickViewModal
          item={slipViewerTarget}
          onClose={() => setSlipViewerTarget(null)}
          onApprove={() => { setSlipViewerTarget(null); setApproveTarget(slipViewerTarget) }}
        />
      )}
      {noticeTarget && <AuditNoticeDrawer rowId={noticeTarget} onClose={() => setNoticeTarget(null)} />}

      {exportOpen && (
        <ExportCsvModal<PayInRequestItem>
          onClose={() => setExportOpen(false)}
          filenamePrefix="pay-in-requests"
          getTimeFilter={getTimeFilter}
          showP2pFilter
          statusOptions={[
            { value: 'Paid', label: 'Paid' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Rejected', label: 'Rejected' },
            { value: 'Error', label: 'Error' },
          ]}
          headers={[
            'Date/Time', 'Merchant Code', 'Merchant Name', 'Amount', 'Currency', 'Fee Amount', 'Fee %',
            'Bank Code', 'Bank Account No', 'Bank Account Name', 'Account Type', 'PromptPay ID', 'Is P2P',
            'Payer Name', 'Status', 'Status Reason', 'Payment Tx Id', 'Ref1', 'Ref2', 'Ref3',
          ]}
          mapRow={(item): CsvCell[] => [
            formatDateTime(item.createdDate),
            item.merchantCode ?? '',
            item.merchantName ?? '',
            item.generatedAmount ?? '',
            item.currency ?? '',
            item.payInFeePct != null && item.generatedAmount != null ? (item.generatedAmount * item.payInFeePct / 100).toFixed(2) : '',
            item.payInFeePct ?? '',
            item.payinBankCode ?? '',
            item.payinBankAccountNo ?? '',
            item.payinBankAccountName ?? '',
            item.payinAccountType ?? '',
            item.payinPromptPayId ?? '',
            item.payinIsPeerToPeer ? 'Yes' : 'No',
            item.payerName ?? '',
            item.status ?? '',
            item.statusReason ?? '',
            item.paymentTxId ?? '',
            item.refId1 ?? '',
            item.refId2 ?? '',
            item.refId3 ?? '',
          ]}
          fetchCount={async params => {
            const res = await paymentRequestApi.getPayInRequestCount({
              FromDate: params.fromDate, ToDate: params.toDate,
              Status: params.status, IsPeerToPeer: params.isPeerToPeer,
            })
            const d = res.data as any
            return typeof d === 'number' ? d : (d?.count ?? 0)
          }}
          fetchPage={async (params, page, limit) => {
            const res = await paymentRequestApi.getPayInRequests({
              Page: page, Limit: limit, FromDate: params.fromDate, ToDate: params.toDate,
              Status: params.status, IsPeerToPeer: params.isPeerToPeer,
            })
            const d = res.data as any
            return Array.isArray(d) ? d : (d?.paymentRequests ?? d?.PaymentRequests ?? d?.requests ?? [])
          }}
        />
      )}
    </div>
  )
}
