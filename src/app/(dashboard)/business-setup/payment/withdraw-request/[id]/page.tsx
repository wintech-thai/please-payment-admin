'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { PayOutRequestDetail, BankItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

interface AccountOption {
  bankAccountId: string
  bankCode?: string | null
  accountNumber?: string | null
  accountName?: string | null
  accountType?: string | null
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
  const [qrBanks, setQrBanks] = useState<BankItem[]>([])
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([])

  // Bank selection state
  const [selectedBankCode, setSelectedBankCode] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({})

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const isPending = detail?.status?.toLowerCase() === 'pending'
  const isRejected = detail?.status?.toLowerCase() === 'rejected'

  // ── Computed ────────────────────────────────────────────────────────────────

  const filteredAccounts = selectedBankCode
    ? allAccounts.filter(a =>
        selectedBankCode === 'PP'
          ? a.accountType?.toLowerCase() === 'promptpay' || a.bankCode === 'PP'
          : a.bankCode === selectedBankCode
      )
    : []

  // Only show banks that actually have accounts for this merchant
  const availableBankCodes = new Set(
    allAccounts.map(a =>
      a.accountType?.toLowerCase() === 'promptpay' || a.bankCode === 'PP' ? 'PP' : a.bankCode
    ).filter(Boolean) as string[]
  )
  const availableBanks = qrBanks.filter(b => availableBankCodes.has(b.bankCode ?? ''))

  const bankLabel = (b: BankItem) =>
    lang === 'th'
      ? (b.bankNameTh || b.bankNameEng || b.bankShortName || b.bankCode || '')
      : (b.bankNameEng || b.bankNameTh || b.bankShortName || b.bankCode || '')

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentRequestApi.getPaymentRequestById(id)
        const data = res.data as any
        const req: PayOutRequestDetail = data?.paymentRequest ?? data?.paymentRequests ?? data
        setDetail(req)

        if (req.merchantId) {
          const [banksRes, accountsRes] = await Promise.allSettled([
            bankAccountApi.getAvailableSupportQrBanks(),
            bankAccountApi.getPayInBankAccountsForMerchant(req.merchantId),
          ])

          if (banksRes.status === 'fulfilled') {
            const raw = banksRes.value.data as any
            setQrBanks(Array.isArray(raw) ? raw : (raw?.banks ?? raw?.Banks ?? []))
          }

          if (accountsRes.status === 'fulfilled') {
            const raw = accountsRes.value.data as any
            const list: any[] = Array.isArray(raw)
              ? raw
              : (raw?.bankAccounts ?? raw?.BankAccounts ?? raw?.accounts ?? [])
            // Map same way as QR Payment modal — handle both camelCase and PascalCase
            const mapped: AccountOption[] = list.map(a => ({
              // Global accounts have bankAccountId=null — fall back to their top-level id
              bankAccountId: a.bankAccountId ?? a.BankAccountId ?? a.id ?? a.Id ?? '',
              bankCode: a.bankCode ?? a.BankCode ?? null,
              accountNumber: a.accountNumber ?? a.AccountNumber ?? null,
              accountName: a.accountName ?? a.AccountName ?? null,
              accountType: a.accountType ?? a.AccountType ?? null,
            }))
            setAllAccounts(mapped)

            // Pre-select previously saved source bank account (stored as payoutBankAccountId)
            const savedAccountId = (req as any).payoutBankAccountId ?? null
            if (savedAccountId) {
              const savedAccount = mapped.find(a => a.bankAccountId === savedAccountId)
              if (savedAccount) {
                setSelectedAccountId(savedAccountId)
                // Determine bank code: PP for PromptPay accounts, otherwise use bankCode
                const bankCode =
                  savedAccount.accountType?.toLowerCase() === 'promptpay' || savedAccount.bankCode === 'PP'
                    ? 'PP'
                    : (savedAccount.bankCode ?? '')
                setSelectedBankCode(bankCode)
              }
            }
          } else {
            toast.error(m.toastFailedToLoadBanks)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

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

            {/* Payout destination bank — stored in payinBank* fields (set via PayinBankAccountId at create) */}
            <InfoRow label={m.fieldDestBank}>
              {detail?.payinBankCode || detail?.payinBankAccountNo ? (
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">
                    {[detail.payinBankCode, detail.payinBankAccountNo].filter(Boolean).join(' · ')}
                  </span>
                  {detail.payinBankAccountName && (
                    <span className="text-gray-500 text-xs">{detail.payinBankAccountName}</span>
                  )}
                  <PromptPayBadge accountType={detail.payinAccountType} promptPayId={detail.payinPromptPayId} />
                </div>
              ) : '—'}
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
            /* Pending — editable bank selection */
            <div className="max-w-md grid grid-cols-1 gap-3">
                  {/* BANK */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {t.merchant.qrFieldBank} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedBankCode}
                      onChange={e => { setSelectedBankCode(e.target.value); setSelectedAccountId(''); setBankErrors(p => ({ ...p, account: '' })) }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                    >
                      <option value="">{t.merchant.qrSelectBankPlaceholder}</option>
                      {availableBanks.map(b => (
                        <option key={b.bankCode} value={b.bankCode ?? ''}>
                          {b.bankCode} — {bankLabel(b)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* BANK ACCOUNT */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {t.merchant.qrFieldBankAccount} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={e => { setSelectedAccountId(e.target.value); setBankErrors(p => ({ ...p, account: '' })) }}
                      disabled={!selectedBankCode}
                      className={clsx(
                        'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white',
                        bankErrors.account ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300',
                        !selectedBankCode && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <option value="">{t.merchant.qrSelectAccountPlaceholder}</option>
                      {filteredAccounts.map(a => (
                        <option key={a.bankAccountId} value={a.bankAccountId}>
                          {[a.bankCode, a.accountNumber, a.accountName ? `— ${a.accountName}` : ''].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                    {bankErrors.account && <p className="text-red-500 text-xs mt-1">{bankErrors.account}</p>}
                    {selectedBankCode && filteredAccounts.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">{t.merchant.qrNoAccountFound}</p>
                    )}
                  </div>
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
