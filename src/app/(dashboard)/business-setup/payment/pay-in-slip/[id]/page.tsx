'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentDocumentApi } from '@/lib/api/payment-document.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { PayInSlipDetail, BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, XCircle, Clock, ImageIcon, Save, ShieldCheck, X, Copy, Check } from 'lucide-react'
import clsx from 'clsx'

function buildStorageUrl(rawUrl: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const isLocalhost = /localhost|127\.0\.0\.1/.test(origin)
  const base = isLocalhost ? (process.env.NEXT_PUBLIC_API_URL ?? '') : origin
  const storageBase = base.replace(/^(https?:\/\/)[^.]+\./, '$1storage-api.')
  return rawUrl.replace('<STORAGE-API-BASE>', storageBase)
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

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'approved') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-4 h-4" />{status}
    </span>
  )
  if (s === 'rejected') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <XCircle className="w-4 h-4" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-4 h-4" />{status ?? 'Pending'}
    </span>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-4">
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

// Reject modal
function RejectModal({
  onConfirm,
  onCancel,
  loading,
  m,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
  m: any
}) {
  const [reason, setReason] = useState('')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { toast.error(m.rejectReasonRequired); return }
    onConfirm(reason.trim())
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6">
          <h3 className="text-base font-bold text-gray-900 mb-1">{m.rejectModalTitle}</h3>
          <p className="text-sm text-gray-500 mb-4">{m.rejectModalDesc}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={m.placeholderRejectReason}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {m.btnCancelReject}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? m.btnRejecting : m.confirmReject}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function PayInSlipDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { t } = useLang()
  const m = t.payInSlip

  const [detail, setDetail] = useState<PayInSlipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Editable fields
  const [bankAccountId, setBankAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [refId, setRefId] = useState('')

  // Original values for dirty check
  const [origBankAccountId, setOrigBankAccountId] = useState('')
  const [origAmount, setOrigAmount] = useState('')
  const [origRefId, setOrigRefId] = useState('')

  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ found: boolean; item: any } | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentDocumentApi.getPaymentDocumentById(id)
        const d = res.data as any
        const doc: PayInSlipDetail = (d?.paymentDocument ?? d?.PaymentDocument ?? d) as PayInSlipDetail
        setDetail(doc)
        const initBankId = doc.payInBankAccountId ?? ''
        const initAmount = doc.txAmountDecimal != null ? String(doc.txAmountDecimal) : ''
        const initRefId = doc.refId ?? ''
        setBankAccountId(initBankId)
        setAmount(initAmount)
        setRefId(initRefId)
        setOrigBankAccountId(initBankId)
        setOrigAmount(initAmount)
        setOrigRefId(initRefId)

        // Load bank accounts for the merchant
        if (doc.merchantId) {
          setLoadingBanks(true)
          try {
            const baRes = await bankAccountApi.getPayInBankAccountsForMerchant(doc.merchantId)
            const baData = baRes.data as any
            setBankAccounts(Array.isArray(baData) ? baData : (baData?.bankAccounts ?? baData?.BankAccounts ?? []))
          } catch {}
          finally { setLoadingBanks(false) }
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.toastFailedToLoadDetail)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, m.toastFailedToLoadDetail])

  const isPending = detail?.status?.toLowerCase() === 'pending'
  const isReadOnly = !isPending

  const handleUpdate = async () => {
    if (!bankAccountId) { toast.error(m.validBankRequired); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error(m.validAmountRequired); return }
    if (!refId.trim()) { toast.error(m.validRefIdRequired); return }

    // No changes — go back without calling API
    const isDirty =
      bankAccountId !== origBankAccountId ||
      amount !== origAmount ||
      refId.trim() !== origRefId.trim()
    if (!isDirty) {
      router.push('/business-setup/payment/pay-in-slip')
      return
    }

    setSaving(true)
    try {
      await paymentDocumentApi.updatePayInDocumentById(id, {
        TxAmountDecimal: parseFloat(amount),
        PayInBankAccountId: bankAccountId,
        RefId: refId.trim(),
      })
      toast.success(m.toastUpdateSuccess)
      router.push('/business-setup/payment/pay-in-slip')
    } catch (err: any) {
      toast.error(err?.message ?? m.toastUpdateFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await paymentDocumentApi.getPendingPayInRequestsForPaymentTx({
        GeneratedAmountStr: amount ? String(parseFloat(amount)) : undefined,
        BankAccountId: bankAccountId || undefined,
        MerchantId: detail?.merchantId || undefined,
      })
      const data = res.data as any
      const list: any[] = Array.isArray(data)
        ? data
        : (data?.payInRequests ?? data?.PayInRequests ?? data?.requests ?? data?.items ?? [])
      setVerifyResult({ found: list.length > 0, item: list[0] ?? null })
    } catch (err: any) {
      toast.error(err?.message ?? m.toastVerifyFailed)
    } finally {
      setVerifying(false)
    }
  }

  const handleApproveClick = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error(m.validAmountRequired); return }
    if (!bankAccountId) { toast.error(m.validBankRequired); return }
    if (!refId.trim()) { toast.error(m.validRefIdRequired); return }
    setShowApproveModal(true)
  }

  const handleApproveConfirm = async () => {
    setShowApproveModal(false)
    setApproving(true)
    try {
      await paymentDocumentApi.approvePayInDocumentById(id, {
        TxAmountDecimal: parseFloat(amount),
        TxAmount: parseFloat(amount),
        Currency: 'THB',
        RefId: refId.trim(),
        PayInBankAccountId: bankAccountId,
        MerchantId: detail?.merchantId ?? '',
      })
      toast.success(m.toastApproveSuccess)
      router.push('/business-setup/payment/pay-in-slip')
    } catch (err: any) {
      toast.error(err?.message ?? err?.response?.data?.description ?? err?.response?.data?.message ?? m.toastApproveFailed)
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (reason: string) => {
    setRejecting(true)
    try {
      await paymentDocumentApi.rejectPayInDocumentById(id, {
        TxAmountDecimal: parseFloat(amount) || 0,
        TxAmount: parseFloat(amount) || 0,
        Currency: 'THB',
        RefId: refId.trim(),
        PayInBankAccountId: bankAccountId,
        MerchantId: detail?.merchantId ?? '',
        RejectReason: reason,
      })
      toast.success(m.toastRejectSuccess)
      setShowRejectModal(false)
      router.push('/business-setup/payment/pay-in-slip')
    } catch (err: any) {
      toast.error(err?.message ?? err?.response?.data?.description ?? err?.response?.data?.message ?? m.toastRejectFailed)
    } finally {
      setRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  const previewImageSrc = detail?.imageBase64
    ? `data:image/jpeg;base64,${detail.imageBase64}`
    : (detail?.previewUrl ? buildStorageUrl(detail.previewUrl) : null)

  const selectedBank = bankAccounts.find(ba => (ba.bankAccountId ?? (ba as any).id ?? ba.accountId) === bankAccountId)

  return (
    <>
      {showRawJson && detail && <RawJsonModal data={detail} onClose={() => setShowRawJson(false)} />}

      {showRejectModal && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
          loading={rejecting}
          m={m}
        />
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-base font-bold text-gray-900 mb-1">{m.approveConfirmTitle}</h3>
              <p className="text-sm text-gray-500 mb-4">{m.approveConfirmDesc}</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{m.approveConfirmAmount}</span>
                  <span className="font-semibold tabular-nums text-gray-900">{formatAmount(parseFloat(amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{m.approveConfirmRefId}</span>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]">{refId.trim() || '—'}</span>
                </div>
                {selectedBank && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{m.approveConfirmBank}</span>
                    <span className="font-medium text-gray-900">{selectedBank.bankCode} {selectedBank.accountNumber}</span>
                  </div>
                )}
                {detail?.merchantCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{m.approveConfirmMerchant}</span>
                    <span className="font-medium text-gray-900">{detail.merchantCode}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {m.btnCancelApprove}
                </button>
                <button
                  type="button"
                  onClick={handleApproveConfirm}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {m.btnConfirmApprove}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/business-setup/payment/pay-in-slip')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{m.detailSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {detail?.isPeerToPeer && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>
            )}
            {detail && (
              <button onClick={() => setShowRawJson(true)} className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
                {'{ }'}
              </button>
            )}
            <StatusBadge status={detail?.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
          {/* Left: Slip Image */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              <SectionHeader>
                <span className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0 inline-block" />
                {m.sectionSlip}
              </SectionHeader>
              {previewImageSrc ? (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img src={previewImageSrc} alt={m.previewAlt} className="w-full object-contain max-h-[600px]" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-200 gap-2">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-400">No image</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Info + Editable fields */}
          <div className="space-y-5">
            {/* ── Upload Slip Data ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5">
                <SectionHeader>
                  <span className="w-1 h-5 bg-violet-500 rounded-full flex-shrink-0 inline-block" />
                  Upload Info
                </SectionHeader>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label={m.colStatus}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={detail?.status} />
                      {detail?.isPeerToPeer && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>
                      )}
                    </div>
                  </InfoRow>
                  <InfoRow label={m.colMerchant}>
                    <span className="font-medium">{detail?.merchantCode ?? '—'}</span>
                    {detail?.merchantName && <p className="text-xs text-gray-400 mt-0.5">{detail.merchantName}</p>}
                  </InfoRow>
                  <InfoRow label={m.colCreatedDate}>
                    {formatDateTime(detail?.createdDate)}
                  </InfoRow>
                  {detail?.rejectReason && (
                    <InfoRow label={m.labelRejectReason}>
                      <span className="text-red-600 text-xs">{detail.rejectReason}</span>
                    </InfoRow>
                  )}
                </div>
              </div>
            </div>

            {/* ── Payment Request Data ── */}
            {(detail?.paymentRequestId || detail?.payInBankCode || detail?.fromBankCode || detail?.paymentTransactionId) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5">
                  <SectionHeader>
                    <span className="w-1 h-5 bg-emerald-500 rounded-full flex-shrink-0 inline-block" />
                    Payment Request
                  </SectionHeader>
                  <div className="grid grid-cols-2 gap-4">
                    {detail?.paymentRequestId && (
                      <InfoRow label="Request ID">
                        <span className="text-xs font-mono text-gray-700">{detail.paymentRequestId}</span>
                      </InfoRow>
                    )}
                    {detail?.payInBankCode && (
                      <InfoRow label="Dest Bank">
                        <span className="font-medium">{[detail.payInBankCode, detail.payInBankAccountNo].filter(Boolean).join(' · ')}</span>
                        {detail.payInBankAccountName && <p className="text-xs text-gray-400 mt-0.5">{detail.payInBankAccountName}</p>}
                      </InfoRow>
                    )}
                    {detail?.fromBankCode && (
                      <InfoRow label="From Bank">
                        <span className="font-medium">{[detail.fromBankCode, detail.fromBankAccountNo].filter(Boolean).join(' · ')}</span>
                        {detail.fromBankAccountName && <p className="text-xs text-gray-400 mt-0.5">{detail.fromBankAccountName}</p>}
                      </InfoRow>
                    )}
                    {detail?.paymentTransactionId && (
                      <InfoRow label="Tx ID">
                        <span className="text-xs font-mono text-gray-700">{detail.paymentTransactionId}</span>
                      </InfoRow>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Editable fields — Payment Document Data */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 space-y-4">
                <SectionHeader>
                  <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0 inline-block" />
                  Document Data
                </SectionHeader>
                {/* Bank Account */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelBankAccount} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankAccountId}
                    onChange={e => setBankAccountId(e.target.value)}
                    disabled={isReadOnly || loadingBanks}
                    className={clsx(
                      'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400',
                      isReadOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
                    )}
                  >
                    <option value="">{loadingBanks ? 'Loading...' : m.placeholderBankAccount}</option>
                    {bankAccounts.map(ba => {
                      const baId = ba.bankAccountId ?? (ba as any).id ?? ba.accountId ?? ''
                      return (
                        <option key={baId} value={baId}>
                          {ba.bankCode} — {ba.accountNumber} ({ba.accountName})
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelAmount} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    disabled={isReadOnly}
                    placeholder={m.placeholderAmount}
                    className={clsx(
                      'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400',
                      isReadOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
                    )}
                  />
                </div>

                {/* RefId */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelRefId} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={refId}
                    onChange={e => setRefId(e.target.value)}
                    disabled={isReadOnly}
                    placeholder={m.placeholderRefId}
                    className={clsx(
                      'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400',
                      isReadOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Verify result */}
            {verifyResult !== null && (
              <div className={clsx(
                'rounded-xl border px-4 py-3',
                verifyResult.found ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              )}>
                <p className="text-xs font-bold uppercase tracking-wide mb-1 text-gray-500">{m.verifyResultTitle}</p>
                {verifyResult.found ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-emerald-700">{m.verifyFound}</p>
                    {verifyResult.item?.refId && (
                      <p className="text-xs text-gray-600">Ref ID: <span className="font-medium">{verifyResult.item.refId}</span></p>
                    )}
                    {verifyResult.item?.status && (
                      <p className="text-xs text-gray-600">Status: <span className="font-medium">{verifyResult.item.status}</span></p>
                    )}
                    {verifyResult.item?.requestedAmount != null && (
                      <p className="text-xs text-gray-600">Requested: <span className="font-medium tabular-nums">
                        {Number(verifyResult.item.requestedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span></p>
                    )}
                    {verifyResult.item?.generatedAmount != null && (
                      <p className="text-xs text-gray-600">QR Amount: <span className="font-medium tabular-nums text-emerald-700">
                        {Number(verifyResult.item.generatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span> <span className="text-gray-400">(เทียบกับ slip)</span></p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-amber-700">{m.verifyNotFound}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 justify-end">
              {/* Verify */}
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 disabled:opacity-50"
              >
                {verifying ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <ShieldCheck className="w-4 h-4" />}
                {verifying ? m.btnVerifying : m.btnVerify}
              </button>

              {/* Save (Pending only) */}
              <button
                onClick={handleUpdate}
                disabled={!isPending || saving}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                  !isPending
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-200 disabled:opacity-50'
                )}
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Save className="w-4 h-4" />}
                {saving ? m.btnUpdating : m.btnUpdate}
              </button>

              {/* Reject */}
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={!isPending}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                  !isPending
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200'
                )}
              >
                <XCircle className="w-4 h-4" />
                {m.btnReject}
              </button>

              {/* Approve */}
              <button
                onClick={handleApproveClick}
                disabled={!isPending || approving}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                  !isPending
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200 disabled:opacity-50'
                )}
              >
                {approving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <CheckCircle className="w-4 h-4" />}
                {approving ? m.btnApproving : m.btnApprove}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
