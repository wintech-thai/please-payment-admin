'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { PayOutRequestDetail } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock, Search, X } from 'lucide-react'
import QRCode from 'react-qr-code'
import clsx from 'clsx'

interface AccountOption {
  bankAccountId: string
  bankCode?: string | null
  accountNumber?: string | null
  accountName?: string | null
  accountType?: string | null
  currentWalletBalance?: number | null
  category?: 'PayIn' | 'Transit'
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'paid' || s === 'approved') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'rejected') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <AlertCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-3.5 h-3.5" />{status ?? 'Pending'}
    </span>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

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

function PromptPayBadge({ accountType, promptPayId }: { accountType?: string | null; promptPayId?: string | null }) {
  return (
    <div className="flex gap-1.5 flex-wrap mt-1">
      {accountType && (
        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
          {accountType}
        </span>
      )}
      {accountType?.toLowerCase() === 'promptpay' && promptPayId && (
        <span className="text-[10px] text-gray-500">{promptPayId}</span>
      )}
    </div>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  title, desc, labelReason, placeholder, btnCancel, btnConfirm, onCancel, onConfirm,
}: {
  title: string; desc: string; labelReason: string; placeholder: string
  btnCancel: string; btnConfirm: string
  onCancel: () => void; onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{desc}</p>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">{labelReason}</label>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value); setErr('') }}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
        />
        {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {btnCancel}
          </button>
          <button
            onClick={() => { if (!reason.trim()) { setErr('Required'); return } onConfirm(reason.trim()) }}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            {btnConfirm}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PayOutRequestDetailPage() {
  const { t, lang } = useLang()
  const m = t.payOutRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Data
  const [detail, setDetail] = useState<PayOutRequestDetail | null>(null)
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([])

  // Bank selection state
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({})
  const [sourceTab, setSourceTab] = useState<'PayIn' | 'Transit'>('PayIn')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const isPending = detail?.status?.toLowerCase() === 'pending'
  const isRejected = detail?.status?.toLowerCase() === 'rejected'

  // ── Computed ────────────────────────────────────────────────────────────────

  const accountLabel = (a: AccountOption) =>
    [a.bankCode, a.accountNumber, a.accountName ? `— ${a.accountName}` : ''].filter(Boolean).join(' ')

  const tabAccounts = allAccounts.filter(a => a.category === sourceTab)
  const filteredAccounts = accountSearch.trim()
    ? tabAccounts.filter(a => {
        const q = accountSearch.toLowerCase()
        return (
          a.bankCode?.toLowerCase().includes(q) ||
          a.accountNumber?.toLowerCase().includes(q) ||
          a.accountName?.toLowerCase().includes(q)
        )
      })
    : tabAccounts

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentRequestApi.getPaymentRequestById(id)
        const data = res.data as any
        const req: PayOutRequestDetail = data?.paymentRequest ?? data?.paymentRequests ?? data
        setDetail(req)

        const [payinRes, transitRes] = await Promise.allSettled([
          bankAccountApi.getPayInBankAccountsWithGlobalAll(),
          bankAccountApi.getTransitBankAccountsAll(),
        ])
        const toOption = (a: any, category: 'PayIn' | 'Transit'): AccountOption => ({
          bankAccountId: a.bankAccountId || a.BankAccountId || a.id || a.Id || a.accountId || a.AccountId || '',
          bankCode: a.bankCode ?? a.BankCode ?? null,
          accountNumber: a.accountNumber ?? a.AccountNumber ?? null,
          accountName: a.accountName ?? a.AccountName ?? null,
          accountType: a.accountType ?? a.AccountType ?? null,
          currentWalletBalance: a.currentWalletBalance ?? a.CurrentWalletBalance ?? a.currentWalletBalanceDecimal ?? null,
          category,
        })
        const payinList = payinRes.status === 'fulfilled'
          ? (() => { const r = payinRes.value.data as any; return (Array.isArray(r) ? r : (r?.bankAccounts ?? r?.BankAccounts ?? [])) })()
          : []
        const transitList = transitRes.status === 'fulfilled'
          ? (() => { const r = transitRes.value.data as any; return (Array.isArray(r) ? r : (r?.bankAccounts ?? r?.BankAccounts ?? [])) })()
          : []
        const mapped: AccountOption[] = [
          ...payinList.map((a: any) => toOption(a, 'PayIn')),
          ...transitList.map((a: any) => toOption(a, 'Transit')),
        ]
        setAllAccounts(mapped)

        // Pre-fill search box with previously saved account label
        const savedAccountId = (req as any).payoutBankAccountId ?? null
        if (savedAccountId) {
          const saved = mapped.find(a => a.bankAccountId === savedAccountId)
          if (saved) {
            setSelectedAccountId(savedAccountId)
            setAccountSearch([saved.bankCode, saved.accountNumber, saved.accountName ? `— ${saved.accountName}` : ''].filter(Boolean).join(' '))
          }
        }
      } catch {
        toast.error(m.toastFailedToLoad)
        router.push('/business-setup/payment/withdraw-request')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const validateBankSelection = () => {
    if (!selectedAccountId) {
      setBankErrors({ account: m.sourceAccountRequired })
      return false
    }
    setBankErrors({})
    return true
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Try camelCase first, fall back to PascalCase (API may return either)
      const d = detail as any
      const merchantId: string | undefined =
        d?.merchantId || d?.MerchantId || undefined
      const payload: { MerchantId?: string; PayoutBankAccountId?: string } = {
        MerchantId: merchantId,
      }
      if (selectedAccountId) payload.PayoutBankAccountId = selectedAccountId
      await paymentRequestApi.updatePayOutRequestById(id, payload)
      toast.success(m.toastSaveSuccess)
      router.push('/business-setup/payment/withdraw-request')
    } catch (err: any) {
      toast.error(err?.message ?? m.toastSaveFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!validateBankSelection()) return
    const amt = detail?.generatedAmount ?? 0
    const min = (detail as any)?.merchantMinPayout
    const max = (detail as any)?.merchantMaxPayout
    if (min != null && amt < min) {
      toast.error(`ยอด ${amt.toLocaleString()} ต่ำกว่าขั้นต่ำ ${min.toLocaleString()}`)
      return
    }
    if (max != null && amt > max) {
      toast.error(`ยอด ${amt.toLocaleString()} เกินขีดสูงสุด ${max.toLocaleString()}`)
      return
    }
    setApproving(true)
    try {
      await paymentRequestApi.approvePayOutRequestById(id, {
        PayoutBankAccountId: selectedAccountId || undefined,
      })
      toast.success(m.toastApproveSuccess)
      router.push('/business-setup/payment/withdraw-request')
    } catch (err: any) {
      toast.error(err?.message ?? m.toastApproveFailed)
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (reason: string) => {
    setShowRejectModal(false)
    setRejecting(true)
    try {
      await paymentRequestApi.rejectPayOutRequestById(id, { RejectReason: reason })
      toast.success(m.toastRejectSuccess)
      router.push('/business-setup/payment/withdraw-request')
    } catch (err: any) {
      toast.error(err?.message ?? m.toastRejectFailed)
    } finally {
      setRejecting(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {showRejectModal && (
        <RejectModal
          title={m.rejectModalTitle}
          desc={m.rejectModalDesc}
          labelReason={m.labelRejectReason}
          placeholder={m.placeholderRejectReason}
          btnCancel={m.btnCancelReject}
          btnConfirm={m.confirmReject}
          onCancel={() => setShowRejectModal(false)}
          onConfirm={handleReject}
        />
      )}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/business-setup/payment/withdraw-request')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* ── Section 1: Request Info (always read-only) ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionDestination}</SectionHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 max-w-4xl">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">

            <InfoRow label={m.fieldCreated}>{formatDateTime(detail?.createdDate)}</InfoRow>

            <InfoRow label={m.fieldStatus}>
              <StatusBadge status={detail?.status} />
            </InfoRow>

            <InfoRow label={m.fieldMerchant}>
              <span className="font-semibold">{detail?.merchantCode ?? '—'}</span>
              {detail?.merchantName && (
                <span className="text-gray-500 ml-2 text-xs">{detail.merchantName}</span>
              )}
            </InfoRow>

            <InfoRow label={m.fieldCurrency}>{detail?.currency ?? '—'}</InfoRow>

            <InfoRow label={m.fieldAmount}>
              {detail?.generatedAmount != null
                ? <span className="font-semibold tabular-nums">{formatAmount(detail.generatedAmount)}</span>
                : '—'}
            </InfoRow>

            {(detail?.merchantMinPayout != null || detail?.merchantMaxPayout != null) && (
              <InfoRow label={m.payoutRange ?? 'Payout Range'}>
                <div className="flex gap-3 mt-0.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{m.minAmount ?? 'Min'}</span>
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">{formatAmount(detail.merchantMinPayout)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{m.maxAmount ?? 'Max'}</span>
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">{formatAmount(detail.merchantMaxPayout)}</span>
                  </div>
                </div>
              </InfoRow>
            )}

            <InfoRow label={m.fieldFee}>
              {detail?.payoutFeeDecimal != null && detail.payoutFeeDecimal > 0 ? (
                <span className="font-semibold tabular-nums text-red-600">
                  -{formatAmount(detail.payoutFeeDecimal)}
                  {detail.payoutFeePct ? <span className="text-xs font-normal text-gray-400 ml-1">({detail.payoutFeePct}%)</span> : null}
                </span>
              ) : (
                <span className="font-semibold text-gray-400">0.00</span>
              )}
            </InfoRow>

            <InfoRow label={m.fieldNetAmount}>
              {detail?.payOutTotalAmountDecimal != null ? (
                <span className="font-bold tabular-nums text-emerald-700 text-xl">
                  {formatAmount(detail.payOutTotalAmountDecimal)}
                </span>
              ) : '—'}
            </InfoRow>

            <InfoRow label={m.fieldRefId}>{detail?.refId ?? '—'}</InfoRow>

            {(detail?.refId1 || detail?.refId2) && (
              <>
                <InfoRow label={m.fieldRefId1}>{detail?.refId1 ?? '—'}</InfoRow>
                <InfoRow label={m.fieldRefId2}>{detail?.refId2 ?? '—'}</InfoRow>
              </>
            )}

            <InfoRow label={m.fieldDescription}>
              <span className="text-gray-600">{detail?.description ?? '—'}</span>
            </InfoRow>

            {/* Payout destination bank — use Override fields when isPayInBankAccountOverride = true */}
            <InfoRow label={m.fieldDestBank}>
              {(() => {
                const bankCode = detail?.isPayInBankAccountOverride ? detail.payinBankCodeOverride : detail?.payinBankCode
                const bankAccountNo = detail?.isPayInBankAccountOverride ? detail.payinBankAccountNoOverride : detail?.payinBankAccountNo
                const bankAccountName = detail?.isPayInBankAccountOverride ? detail.payinBankAccountNameOverride : detail?.payinBankAccountName
                const accountType = detail?.isPayInBankAccountOverride ? detail.payinAccountTypeOverride : detail?.payinAccountType
                const promptPayId = detail?.isPayInBankAccountOverride ? detail.payinPromptPayIdOverride : detail?.payinPromptPayId
                return bankCode || bankAccountNo ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {[bankCode, bankAccountNo].filter(Boolean).join(' · ')}
                    </span>
                    {bankAccountName && (
                      <span className="text-gray-500 text-xs">{bankAccountName}</span>
                    )}
                    <PromptPayBadge accountType={accountType} promptPayId={promptPayId} />
                  </div>
                ) : '—'
              })()}
            </InfoRow>

            {/* Reject reason */}
            {isRejected && detail?.rejectReason && (
              <div className="sm:col-span-2">
                <InfoRow label={m.labelRejectReason}>
                  <span className="text-red-600 font-medium">{detail.rejectReason}</span>
                </InfoRow>
              </div>
            )}

          </div>

          {/* QR Code — shown on the right when qrCode or qrCodeImage field has data */}
          {(detail?.qrCodeImage || detail?.qrCode) && (
            <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide self-start">QR Code</p>
              {detail.qrCodeImage ? (
                <img
                  src={detail.qrCodeImage.startsWith('data:') ? detail.qrCodeImage : `data:image/png;base64,${detail.qrCodeImage}`}
                  alt="QR Code"
                  className="w-56 h-56 rounded-lg border border-gray-200 p-1 bg-white"
                />
              ) : (
                <div className="p-3 bg-white rounded-lg border border-gray-200 inline-block">
                  <QRCode value={detail.qrCode!} size={200} />
                </div>
              )}
            </div>
          )}

          </div>
        </div>

        {/* ── Section 2: Source Bank Account ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionSource}</SectionHeader>

          {!isPending ? (
            /* Locked — source bank stored in payoutBank* fields (set via PayoutBankAccountId at save/approve) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label={m.fieldSourceAccount}>
                {detail?.payoutBankCode || detail?.payoutBankAccountNo ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {[detail.payoutBankCode, detail.payoutBankAccountNo].filter(Boolean).join(' · ')}
                    </span>
                    {detail.payoutBankAccountName && (
                      <span className="text-gray-500 text-xs">{detail.payoutBankAccountName}</span>
                    )}
                    <PromptPayBadge accountType={detail.payoutAccountType} promptPayId={detail.payoutPromptPayId} />
                  </div>
                ) : '—'}
              </InfoRow>
            </div>
          ) : (
            /* Pending — tab switch + searchable single account picker */
            <div className="max-w-md">
              {/* Source type tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3 w-fit">
                <button
                  type="button"
                  onClick={() => { setSourceTab('PayIn'); setAccountSearch(''); setSelectedAccountId(''); setBankErrors({}) }}
                  className={clsx(
                    'px-4 py-1.5 text-sm font-semibold rounded-md transition-colors',
                    sourceTab === 'PayIn'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  PayIn
                </button>
                <button
                  type="button"
                  onClick={() => { setSourceTab('Transit'); setAccountSearch(''); setSelectedAccountId(''); setBankErrors({}) }}
                  className={clsx(
                    'px-4 py-1.5 text-sm font-semibold rounded-md transition-colors',
                    sourceTab === 'Transit'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  Transit
                </button>
              </div>

              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {m.fieldSourceAccount} <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <div className={clsx(
                  'flex items-center border rounded-lg bg-white overflow-hidden',
                  bankErrors.account ? 'border-red-400' : 'border-gray-200',
                )}>
                  <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={e => {
                      setAccountSearch(e.target.value)
                      setSelectedAccountId('')
                      setBankErrors(p => ({ ...p, account: '' }))
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder={m.placeholderSourceAccount}
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                  />
                  {(accountSearch || selectedAccountId) && (
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setAccountSearch(''); setSelectedAccountId(''); setBankErrors(p => ({ ...p, account: '' })) }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {filteredAccounts.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">{m.noSourceAccounts}</p>
                    ) : (
                      filteredAccounts.map(a => (
                        <button
                          key={a.bankAccountId}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setSelectedAccountId(a.bankAccountId)
                            setAccountSearch(accountLabel(a))
                            setBankErrors(p => ({ ...p, account: '' }))
                            setShowDropdown(false)
                          }}
                          className={clsx(
                            'w-full px-4 py-2.5 text-left text-sm transition-colors',
                            selectedAccountId === a.bankAccountId
                              ? 'bg-primary-50 text-primary-700 font-semibold'
                              : 'hover:bg-gray-50 text-gray-700'
                          )}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">{a.bankCode}</span>
                            {a.accountNumber && <span>{a.accountNumber}</span>}
                            {a.accountName && <span className="text-gray-400 text-xs">— {a.accountName}</span>}
                            {a.category && (
                              <span className={clsx(
                                'px-1.5 py-0.5 text-[10px] font-bold rounded-full ring-1',
                                a.category === 'Transit'
                                  ? 'bg-purple-50 text-purple-700 ring-purple-200'
                                  : 'bg-blue-50 text-blue-700 ring-blue-200'
                              )}>
                                {a.category}
                              </span>
                            )}
                            {a.accountType && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full ring-1 bg-gray-50 text-gray-600 ring-gray-200">
                                {a.accountType}
                              </span>
                            )}
                          </div>
                          {a.currentWalletBalance != null && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[10px] text-gray-400">Balance:</span>
                              <span className={clsx(
                                'text-xs font-semibold tabular-nums',
                                a.currentWalletBalance > 0 ? 'text-emerald-600' : 'text-red-500'
                              )}>
                                {a.currentWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {bankErrors.account && <p className="text-red-500 text-xs mt-1">{bankErrors.account}</p>}
              {selectedAccountId && (
                <p className="text-xs text-emerald-600 mt-1">✓ Selected</p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Footer Action Bar ── */}
      <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => router.push('/business-setup/payment/withdraw-request')}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t.admin.cancel}
        </button>

        {isPending && (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || approving || rejecting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Spinner />}
              {saving ? m.btnSaving : m.btnSave}
            </button>

            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={saving || approving || rejecting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {rejecting && <Spinner />}
              {rejecting ? m.btnRejecting : m.btnReject}
            </button>

            <button
              type="button"
              onClick={handleApprove}
              disabled={saving || approving || rejecting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {approving && <Spinner />}
              {approving ? m.btnApproving : m.btnApprove}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
