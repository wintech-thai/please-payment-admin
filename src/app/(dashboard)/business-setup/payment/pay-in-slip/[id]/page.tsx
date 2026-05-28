'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentDocumentApi } from '@/lib/api/payment-document.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { PayInSlipDetail, BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, XCircle, Clock, ImageIcon } from 'lucide-react'
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

  const [approving, setApproving] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentDocumentApi.getPaymentDocumentById(id)
        const d = res.data as any
        const doc: PayInSlipDetail = (d?.paymentDocument ?? d?.PaymentDocument ?? d) as PayInSlipDetail
        setDetail(doc)
        setBankAccountId(doc.payInBankAccountId ?? '')
        setAmount(doc.txAmountDecimal != null ? String(doc.txAmountDecimal) : '')
        setRefId(doc.refId ?? '')

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
      } catch {
        toast.error(m.toastFailedToLoadDetail)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, m.toastFailedToLoadDetail])

  const isPending = detail?.status?.toLowerCase() === 'pending'
  const isReadOnly = !isPending

  const handleApprove = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error(m.validAmountRequired); return }
    if (!bankAccountId) { toast.error(m.validBankRequired); return }
    if (!refId.trim()) { toast.error(m.validRefIdRequired); return }
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

  const previewImageUrl = detail?.previewUrl ? buildStorageUrl(detail.previewUrl) : null

  return (
    <>
      {showRejectModal && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
          loading={rejecting}
          m={m}
        />
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
          <StatusBadge status={detail?.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
          {/* Left: Slip Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              <SectionHeader>{m.sectionSlip}</SectionHeader>
              {previewImageUrl ? (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img src={previewImageUrl} alt={m.previewAlt} className="w-full object-contain max-h-[600px]" />
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
            {/* Read-only info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5">
                <SectionHeader>{m.sectionInfo}</SectionHeader>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label={m.colStatus}>
                    <StatusBadge status={detail?.status} />
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

            {/* Editable fields */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 space-y-4">
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

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 justify-end">
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
                onClick={handleApprove}
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
