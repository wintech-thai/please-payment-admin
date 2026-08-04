'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { masterRefApi, type MasterRefItem } from '@/lib/api/master-ref.api'
import type { PayOutRequestDetail, PaymentTxJob, PaymentTxJobParameter } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, ChevronDown, CheckCircle, AlertCircle, Clock, Search, X, Copy, Check } from 'lucide-react'
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

function StatusBadge({ status, isPartialyPayout }: { status?: string | null; isPartialyPayout?: boolean | null }) {
  const s = status?.toLowerCase()
  if (s === 'paid' || s === 'approved') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />{status}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
    </div>
  )
  if (s === 'rejected') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
        <AlertCircle className="w-3.5 h-3.5" />{status}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-red-50 text-red-700 ring-red-200">P2P</span>}
    </div>
  )
  return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        <Clock className="w-3.5 h-3.5" />{status ?? 'Pending'}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-amber-50 text-amber-700 ring-amber-200">P2P</span>}
    </div>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

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

// ── Raw JSON Modal ────────────────────────────────────────────────────────────

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

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  onCancel, onConfirm,
}: {
  onCancel: () => void
  onConfirm: (reason: string, rejectStatus: string) => void
}) {
  const { t } = useLang()
  const m = t.payOutRequest
  const [reason, setReason] = useState('')
  const [rejectStatusCode, setRejectStatusCode] = useState('')
  const [statuses, setStatuses] = useState<MasterRefItem[]>([])
  const [statusSearch, setStatusSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [statusError, setStatusError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    masterRefApi.getMasterRefs({ RefType: 'PayOutRejectStatus', Limit: 200 })
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectStatusCode) { setStatusError(m.rejectStatusRequired); return }
    onConfirm(reason.trim(), rejectStatusCode)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.rejectModalTitle}</h3>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
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
              onClick={() => setDropdownOpen(true)}
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
              placeholder={m.placeholderRejectReason}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {m.btnCancelReject}
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
              {m.confirmReject}
            </button>
          </div>
        </form>
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
  const [job, setJob] = useState<PaymentTxJob | null>(null)
  const [loadingJob, setLoadingJob] = useState(false)

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
  const [showRawJson, setShowRawJson] = useState(false)

  const isPending = detail?.status?.toLowerCase() === 'pending'
  const isRejected = detail?.status?.toLowerCase() === 'rejected'
  const msg1Lines = (job?.jobMessage ?? '').split('\n').filter(l => l.trim())
  const msg2Lines = (job?.jobMessage2 ?? '').split('\n').filter(l => l.trim())

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

        const jobId = req?.jobId ?? (req as any)?.JobId
        if (jobId) {
          setLoadingJob(true)
          try {
            const jobRes = await paymentRequestApi.getPaymentRequestJobById(id, jobId)
            const jobData = jobRes.data as any
            setJob(jobData?.job ?? jobData?.Job ?? jobData)
          } catch { /* job section will show no data */ }
          finally { setLoadingJob(false) }
        }

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
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.toastFailedToLoad)
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

  const handleReject = async (reason: string, rejectStatus: string) => {
    setShowRejectModal(false)
    setRejecting(true)
    try {
      await paymentRequestApi.rejectPayOutRequestById(id, { RejectReason: reason, RejectStatus: rejectStatus })
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
        {detail && (
          <button onClick={() => setShowRawJson(true)} className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
            {'{ }'}
          </button>
        )}
      </div>

      {showRawJson && detail && <RawJsonModal data={detail} onClose={() => setShowRawJson(false)} />}

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* ── Section 1: Request Info (always read-only) ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionDestination}</SectionHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 max-w-4xl">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">

            <InfoRow label={m.fieldCreated}>{formatDateTime(detail?.createdDate)}</InfoRow>

            <InfoRow label={m.fieldStatus}>
              <StatusBadge status={detail?.status} isPartialyPayout={detail?.isPartialyPayout} />
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
              <div className="flex items-center gap-2 flex-wrap">
                {detail?.payoutFeeDecimal != null && detail.payoutFeeDecimal > 0 ? (
                  <span className="font-semibold tabular-nums text-red-600">
                    -{formatAmount(detail.payoutFeeDecimal)}
                    {detail.payoutFeePct ? <span className="text-xs font-normal text-gray-400 ml-1">({detail.payoutFeePct}%)</span> : null}
                  </span>
                ) : (
                  <span className="font-semibold text-gray-400">0.00</span>
                )}
                {detail?.payoutFeePayer && (
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1',
                    detail.payoutFeePayer === 'Beneficiary'
                      ? 'bg-orange-50 text-orange-700 ring-orange-200'
                      : 'bg-blue-50 text-blue-700 ring-blue-200'
                  )}>
                    {detail.payoutFeePayer}
                  </span>
                )}
              </div>
            </InfoRow>

            <InfoRow label={m.fieldNetAmount}>
              {detail?.payOutTotalAmountDecimal != null ? (
                <span className="font-bold tabular-nums text-emerald-700 text-xl">
                  {formatAmount(detail.payOutTotalAmountDecimal)}
                </span>
              ) : '—'}
              {detail?.isPartialyPayout && detail?.totalPayOutPaidAmountDecimal != null && detail.totalPayOutPaidAmountDecimal > 0 && (
                <div className="mt-1.5 flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400">
                    {m.labelTotalPaid ?? 'Total Paid'}: <span className="font-semibold text-emerald-600 tabular-nums">{formatAmount(detail.totalPayOutPaidAmountDecimal)}</span>
                  </span>
                  {detail.payOutTotalAmountDecimalP2P != null && (
                    <span className="text-xs text-gray-400">
                      {m.fieldRemainingP2P ?? 'P2P Remaining'}: <span className="font-semibold text-primary-600 tabular-nums">{formatAmount(detail.payOutTotalAmountDecimalP2P)}</span>
                    </span>
                  )}
                </div>
              )}
            </InfoRow>

            {detail?.refId1 && <InfoRow label="REF 1">{detail.refId1}</InfoRow>}
            {detail?.refId2 && <InfoRow label="REF 2">{detail.refId2}</InfoRow>}
            {detail?.refId3 && <InfoRow label="REF 3">{detail.refId3}</InfoRow>}

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

            {isRejected && detail?.rejectReason && (
              <InfoRow label={m.labelRejectReason}>
                <span className="text-red-600 font-medium">{detail.rejectReason}</span>
              </InfoRow>
            )}

          </div>

          {/* Right column — QR code and/or reject reason */}
          {(() => {
            const paidAmt = detail?.totalPayOutPaidAmountDecimal ?? 0
            const useP2P = detail?.isPartialyPayout && detail?.qrCodeP2P
            const rawQr = useP2P ? detail!.qrCodeP2P! : (detail?.qrCodeImage ?? detail?.qrCode ?? null)
            if (!rawQr) return null
            const isImage = rawQr ? (rawQr.startsWith('data:') || rawQr.startsWith('iVBOR') || rawQr.startsWith('/9j/')) : false
            return (
              <div className="flex-shrink-0 flex flex-col items-center gap-4 pt-1">
                {rawQr && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide self-start">
                      {useP2P ? 'QR P2P' : 'QR Code'}
                    </p>
                    {isImage ? (
                      <img
                        src={rawQr.startsWith('data:') ? rawQr : `data:image/png;base64,${rawQr}`}
                        alt="QR Code"
                        className="w-56 h-56 rounded-lg border border-gray-200 p-1 bg-white"
                      />
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-gray-200 inline-block">
                        <QRCode value={rawQr} size={200} />
                      </div>
                    )}
                    {useP2P && paidAmt > 0 && detail?.payOutTotalAmountDecimalP2P != null && (
                      <div className="text-center max-w-[220px]">
                        <p className="text-xs font-semibold text-primary-600 tabular-nums">{formatAmount(detail.payOutTotalAmountDecimalP2P)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{m.qrP2PDescription ?? 'ยอดคงเหลือหลัง partial payment'}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

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

        {/* ── Section 3: Partial Payouts (P2P) ── */}
        {detail?.partialPayouts && detail.partialPayouts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionPartialPayouts ?? 'P2P Transfer Records'}</SectionHeader>
            <div className="flex gap-4 mb-4 flex-wrap">
              {detail.totalPayOutPaidAmountDecimal != null && (
                <div className="px-4 py-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-semibold mb-0.5">{m.labelTotalPaid ?? 'Total Paid'}</p>
                  <p className="text-xl font-bold text-emerald-700 tabular-nums">{formatAmount(detail.totalPayOutPaidAmountDecimal)}</p>
                </div>
              )}
              {detail.totalPayOutPendingPaidAmountDecimal != null && (
                <div className="px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-600 font-semibold mb-0.5">{m.labelTotalPending ?? 'Total Pending'}</p>
                  <p className="text-xl font-bold text-amber-700 tabular-nums">{formatAmount(detail.totalPayOutPendingPaidAmountDecimal)}</p>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{m.colPartialDate ?? 'Date'}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{m.colPartialId ?? 'Transaction ID'}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{m.colPartialAmount ?? 'Amount'}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">{m.colPartialStatus ?? 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.partialPayouts.map((p, i) => (
                    <tr key={p.payinRequestId ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">{p.txDate ? formatDateTime(p.txDate) : '—'}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-xs text-gray-500 max-w-[160px] truncate">{p.payinRequestId ?? '—'}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 text-right font-semibold tabular-nums text-gray-800">{formatAmount(p.partialAmount)}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Section 4: Job ── */}
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
