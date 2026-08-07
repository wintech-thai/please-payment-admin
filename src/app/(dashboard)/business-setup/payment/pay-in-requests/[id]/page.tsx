'use client'

import { useState, useEffect } from 'react'
import { getMerchantBase } from '@/lib/merchant-url'
import { useRouter, useParams } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestDetail, PaymentTxJob, PaymentTxJobParameter } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock, ExternalLink, X, Copy, Check, ChevronRight, Link2, Paperclip } from 'lucide-react'
import QRCode from 'react-qr-code'

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

function StatusBadge({ status, createdDate, isPeerToPeer }: { status?: string | null; createdDate?: string | null; isPeerToPeer?: boolean | null }) {
  const s = status?.toLowerCase()
  const isPending = s !== 'match' && s !== 'paid' && s !== 'approved' && s !== 'rejected' && s !== 'error'
  const age = isPending ? formatAge(createdDate) : ''
  if (s === 'match' || s === 'paid' || s === 'approved') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />{status}
      </span>
      {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
    </div>
  )
  if (s === 'rejected' || s === 'error') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
        <AlertCircle className="w-3.5 h-3.5" />{status}
      </span>
      {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-red-50 text-red-700 ring-red-200">P2P</span>}
    </div>
  )
  return (
    <div className="flex flex-col gap-0.5 w-fit">
      <div className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Clock className="w-3.5 h-3.5" />{status ?? 'Pending'}
        </span>
        {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-amber-50 text-amber-700 ring-amber-200">P2P</span>}
      </div>
      {age && <span className="text-xs text-gray-400">{age}</span>}
    </div>
  )
}

function JobStatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'success' || s === 'completed' || s === 'done') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'failed' || s === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <AlertCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-3.5 h-3.5" />{status ?? 'Unknown'}
    </span>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
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

function highlightJson(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span style="color:#6366f1;font-weight:600">${match}</span>`
        return `<span style="color:#059669">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span style="color:#d97706">${match}</span>`
      if (/null/.test(match)) return `<span style="color:#9ca3af">${match}</span>`
      return `<span style="color:#0284c7">${match}</span>`
    }
  )
}

function JsonHighlight({ json }: { json: string }) {
  return (
    <pre
      className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed text-gray-800"
      dangerouslySetInnerHTML={{ __html: highlightJson(json) }}
    />
  )
}

function RawJsonModal({ data, onClose }: { data: unknown; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)
  const copy = () => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-none">
          <span className="text-sm font-semibold text-gray-700 font-mono">Raw JSON</span>
          <div className="flex items-center gap-2">
            <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <pre
          className="overflow-auto p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-gray-50"
          dangerouslySetInnerHTML={{ __html: highlightJson(json) }}
        />
      </div>
    </div>
  )
}

// ── Slip Viewer Modal ─────────────────────────────────────────────────────────

function ApproveFromSlipButton({ paymentRequestId, onDone }: { paymentRequestId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const handle = async () => {
    setLoading(true)
    try {
      await paymentRequestApi.createPaymentTxByPayInRequestId(paymentRequestId)
      toast.success('Approved successfully')
      onDone()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
    >
      {loading ? '...' : 'Approve'}
    </button>
  )
}

function SlipViewerModal({
  slips,
  isPending,
  paymentRequestId,
  onClose,
  onApproved,
}: {
  slips: Array<{ imageBase64: string; uploadedAt: string }>
  isPending: boolean
  paymentRequestId: string
  onClose: () => void
  onApproved: () => void
}) {
  const [idx, setIdx] = useState(0)
  const slip = slips[idx]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-5 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-semibold">
            สลิปที่อัปโหลด ({idx + 1} / {slips.length})
          </span>
          {slip?.uploadedAt && (
            <span className="text-white/60 text-xs">
              {new Date(slip.uploadedAt).toLocaleString('th-TH')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isPending && (
            <ApproveFromSlipButton
              paymentRequestId={paymentRequestId}
              onDone={() => { onClose(); onApproved() }}
            />
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image + nav */}
      <div className="flex-1 flex items-center gap-4 px-4 min-h-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx <= 0}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white disabled:opacity-30 transition-colors"
        >
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
        <button
          onClick={() => setIdx(i => Math.min(slips.length - 1, i + 1))}
          disabled={idx >= slips.length - 1}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// ── Slip Upload Link Modal ─────────────────────────────────────────────────────

function SlipLinkModal({
  orgId,
  paymentRequestId,
  onClose,
}: {
  orgId: string
  paymentRequestId: string
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInRequest
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await paymentRequestApi.generatePayInSlipUploadToken(orgId, paymentRequestId)
        const d = res.data as any
        const relUrl = d?.slipUploadUrl ?? d?.SlipUploadUrl
        if (!relUrl) throw new Error('URL not returned')
        setUrl(`${getMerchantBase()}${relUrl}`)
      } catch {
        setErrorMsg(m.slipLinkError)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId, paymentRequestId])

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
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 hover:underline"
              >
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

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PayInRequestDetailPage() {
  const { t } = useLang()
  const m = t.payInRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayInRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<PaymentTxJob | null>(null)
  const [loadingJob, setLoadingJob] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)
  const [slips, setSlips] = useState<Array<{ imageBase64: string; uploadedAt: string }>>([])
  const [loadingSlips, setLoadingSlips] = useState(false)
  const [showSlipViewer, setShowSlipViewer] = useState(false)
  const [showSlipLink, setShowSlipLink] = useState(false)

  const loadDetail = async () => {
    setLoading(true)
    try {
      const res = await paymentRequestApi.getPaymentRequestById(id)
      const data = res.data as any
      const raw = data?.paymentRequest ?? data
      setDetail(raw)

      const orgId = raw?.orgId
      if (orgId) {
        setLoadingSlips(true)
        paymentRequestApi.getPayInSlipUploads(orgId, id)
          .then(r => {
            const d = (r.data as any)
            const list = d?.slips ?? d?.Slips ?? []
            const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) =>
              new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
            )
            setSlips(sorted)
          })
          .catch(() => {})
          .finally(() => setLoadingSlips(false))
      }

      const jobId = raw?.jobId ?? raw?.JobId
      if (jobId) {
        setLoadingJob(true)
        try {
          const jobRes = await paymentRequestApi.getPaymentRequestJobById(id, jobId)
          const jobData = jobRes.data as any
          setJob(jobData?.job ?? jobData?.Job ?? jobData)
        } catch { /* job section will show no data */ }
        finally { setLoadingJob(false) }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load payment request detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDetail() }, [id])

  const responseJson = (() => {
    if (!detail?.responseDataObj) return null
    try {
      const parsed = typeof detail.responseDataObj === 'string'
        ? JSON.parse(detail.responseDataObj)
        : detail.responseDataObj
      if (parsed && typeof parsed === 'object') {
        const { qrCodeImage, QrCodeImage, ...rest } = parsed
        return JSON.stringify(rest, null, 2)
      }
      return JSON.stringify(parsed, null, 2)
    } catch {
      return String(detail.responseDataObj)
    }
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  const statusLower = detail?.status?.toLowerCase()
  const isApproved = statusLower === 'approved'
  const isRejected = statusLower === 'rejected'
  const isPending = statusLower === 'pending'
  const msg1Lines = (job?.jobMessage ?? '').split('\n').filter(l => l.trim())
  const msg2Lines = (job?.jobMessage2 ?? '').split('\n').filter(l => l.trim())

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Slips button */}
          {(loadingSlips || slips.length > 0) && (
            <button
              onClick={() => setShowSlipViewer(true)}
              disabled={loadingSlips || slips.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-3.5 h-3.5" />
              สลิป
              {slips.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-800">{slips.length}</span>
              )}
            </button>
          )}
          {/* Slip Upload Link button */}
          {detail?.orgId && isPending && (
            <button
              onClick={() => setShowSlipLink(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Slip Link
            </button>
          )}
          {detail && (
            <button onClick={() => setShowRawJson(true)} className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
              {'{ }'}
            </button>
          )}
        </div>
      </div>

      {showRawJson && detail && <RawJsonModal data={detail} onClose={() => setShowRawJson(false)} />}

      {showSlipViewer && slips.length > 0 && (
        <SlipViewerModal
          slips={slips}
          isPending={isPending}
          paymentRequestId={id}
          onClose={() => setShowSlipViewer(false)}
          onApproved={() => { setShowSlipViewer(false); window.location.reload() }}
        />
      )}

      {showSlipLink && detail?.orgId && (
        <SlipLinkModal
          orgId={detail.orgId}
          paymentRequestId={id}
          onClose={() => setShowSlipLink(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* General Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionGeneral}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow label={m.fieldCreated}>{formatDateTime(detail?.createdDate)}</InfoRow>
            <InfoRow label={m.fieldStatus}>
              <StatusBadge status={detail?.status} createdDate={detail?.createdDate} isPeerToPeer={detail?.payinIsPeerToPeer} />
            </InfoRow>
            <InfoRow label={m.fieldMerchant}>
              <span className="font-semibold">{detail?.merchantCode ?? '—'}</span>
              {detail?.merchantName && <span className="text-gray-500 ml-2 text-xs">{detail.merchantName}</span>}
            </InfoRow>
            <InfoRow label={m.fieldCurrency}>{detail?.currency ?? '—'}</InfoRow>
            <InfoRow label={m.fieldRequested}>
              {detail?.requestedAmount != null
                ? <span className="font-semibold tabular-nums">{formatAmount(detail.requestedAmount)}</span>
                : '—'}
            </InfoRow>
            <InfoRow label={m.fieldAmount}>
              {detail?.generatedAmount != null
                ? <span className="font-semibold tabular-nums">{formatAmount(detail.generatedAmount)}</span>
                : '—'}
            </InfoRow>
            <InfoRow label={m.fieldBank}>{detail?.payinBankCode ?? '—'}</InfoRow>
            <InfoRow label={m.fieldAccountNo}>{detail?.payinBankAccountNo ?? '—'}</InfoRow>
            <InfoRow label={m.fieldAccountName}>{detail?.payinBankAccountName ?? '—'}</InfoRow>
            <InfoRow label={m.fieldAccountType}>
              {detail?.payinAccountType ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full ring-1 ring-blue-200">{detail.payinAccountType}</span>
                  {detail.payinAccountType.toLowerCase() === 'promptpay' && detail.payinPromptPayId && (
                    <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full ring-1 ring-sky-200">{detail.payinPromptPayId}</span>
                  )}
                </div>
              ) : '—'}
            </InfoRow>
            <InfoRow label={m.fieldRefId}>{detail?.refId1 ?? '—'}</InfoRow>
            <InfoRow label={m.fieldRefId1}>{detail?.refId2 ?? '—'}</InfoRow>
            <InfoRow label={m.fieldRefId2}>{detail?.refId3 ?? '—'}</InfoRow>
            {isApproved && (
              <InfoRow label={m.fieldPaymentTxId}>
                {detail?.paymentTxId ? (
                  <a
                    href={`/business-setup/payment/pay-in-transactions/${detail.paymentTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary-600 hover:underline text-sm"
                  >
                    {detail.paymentTxId}
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                ) : '—'}
              </InfoRow>
            )}
            {isRejected && detail?.statusCode && (
              <InfoRow label={m.fieldStatusCode}>
                <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 ring-1 ring-red-200">
                  {detail.statusCode}
                </span>
              </InfoRow>
            )}
            {isRejected && detail?.statusReason && (
              <InfoRow label={m.fieldStatusReason}>
                <span className="text-red-600 font-medium">{detail.statusReason}</span>
              </InfoRow>
            )}
          </div>
        </div>

        {/* Response Data */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionResponse}</SectionHeader>
          {responseJson ? (
            <JsonHighlight json={responseJson} />
          ) : (
            <p className="text-sm text-gray-400">{m.noResponseData}</p>
          )}
        </div>

        {/* Processing Steps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionProcessing}</SectionHeader>
          {detail?.processingSteps && detail.processingSteps.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {detail.processingSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-400">{m.noProcessingSteps}</p>
          )}
        </div>

        {/* Job */}
        {(detail?.jobId || loadingJob) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionJob}</SectionHeader>
            {loadingJob ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.admin.loading}
              </div>
            ) : job ? (
              <div className="flex flex-col gap-6">

                {/* Job ID + Status + Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InfoRow label={m.fieldJobId}>
                    <span className="text-xs text-gray-600 break-all">{job.id ?? detail?.jobId ?? '—'}</span>
                  </InfoRow>
                  <InfoRow label={m.fieldJobStatus}>
                    <JobStatusBadge status={job.status} />
                  </InfoRow>
                  {job.type && (
                    <InfoRow label={m.fieldJobType}>
                      <span className="text-sm font-medium text-gray-700">{job.type}</span>
                    </InfoRow>
                  )}
                  {job.description && (
                    <InfoRow label={m.fieldJobDescription}>
                      <span className="text-sm text-gray-600">{job.description}</span>
                    </InfoRow>
                  )}
                  {(job.succeedCount != null || job.failedCount != null) && (
                    <InfoRow label={m.fieldJobResult}>
                      <span className="text-sm">
                        <span className="text-emerald-600 font-semibold">{job.succeedCount ?? 0}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-red-500 font-semibold">{job.failedCount ?? 0}</span>
                        <span className="text-gray-400 ml-1 text-xs">(success / failed)</span>
                      </span>
                    </InfoRow>
                  )}
                </div>

                {/* Job Messages */}
                {(msg1Lines.length > 0 || msg2Lines.length > 0) && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{m.fieldJobMessage}</p>
                    {msg1Lines.length > 0 && (
                      <div>
                        {msg2Lines.length > 0 && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">Message 1</span>}
                        <ol className="flex flex-col gap-2">
                          {msg1Lines.map((line, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                              <span className="text-sm text-gray-700 leading-relaxed break-all">{line}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {msg2Lines.length > 0 && (
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 mb-2">Message 2</span>
                        <ol className="flex flex-col gap-2">
                          {msg2Lines.map((line, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                              <span className="text-sm text-gray-700 leading-relaxed break-all">{line}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {/* Parameters */}
                {job.parameters && job.parameters.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{m.fieldJobParameters}</p>
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">{m.fieldJobParamName}</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{m.fieldJobParamValue}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {job.parameters.map((p: PaymentTxJobParameter, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-2 text-xs text-gray-600 font-medium">{p.name ?? '—'}</td>
                              <td className="px-4 py-2 text-xs text-gray-700">{p.value ?? <span className="text-gray-300">null</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <p className="text-sm text-gray-400">{m.noJobData}</p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
