'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { paymentTxApi } from '@/lib/api/payment-tx.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { merchantApi } from '@/lib/api/merchant.api'
import type { PayInTxItem, BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, Plus, X, Scissors, MoreVertical, TriangleAlert } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import AuditNoticeDrawer from '@/components/AuditNoticeDrawer'

const HIGHLIGHTED_KEY = 'payInTx_highlightedId'
const FILTER_KEY = 'payInTx_filter'

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

function StatusBadge({ status, createdDate, paymentRequestId, statusReason, txIsPeerToPeer }: {
  status?: string | null
  createdDate?: string | null
  paymentRequestId?: string | null
  statusReason?: string | null
  txIsPeerToPeer?: boolean | null
}) {
  const s = status?.toLowerCase()
  if (s === 'identified' || s === 'approved') return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{status}
        </span>
        {txIsPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
      </div>
      {paymentRequestId && (
        <a
          href={`/business-setup/payment/pay-in-requests/${paymentRequestId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline ml-1"
        >
          <span className="truncate max-w-[130px]">{paymentRequestId}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      )}
    </div>
  )
  if (s === 'unidentified' || s === 'rejected') {
    const isRejected = s === 'rejected'
    const age = !isRejected ? formatAge(createdDate) : null
    return (
      <div className="flex flex-col gap-0.5 items-start">
        <div className="inline-flex items-center gap-1">
          <span className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1',
            isRejected
              ? 'bg-red-50 text-red-700 ring-red-200'
              : 'bg-amber-50 text-amber-700 ring-amber-200'
          )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', isRejected ? 'bg-red-500' : 'bg-amber-400')} />
            {status}
          </span>
          {txIsPeerToPeer && <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1', isRejected ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200')}>P2P</span>}
        </div>
        {age && <span className="text-[10px] text-gray-400 ml-1">{age}</span>}
        {statusReason && (
          <span className="text-[10px] text-red-500 ml-1 max-w-[160px] truncate" title={statusReason}>{statusReason}</span>
        )}
      </div>
    )
  }
  if (s === 'error' || s === 'failed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
      {status ?? '—'}
    </span>
  )
}

// ── Create Transaction Modal ──────────────────────────────────────────────────

function CreatePayInTxModal({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInTx
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [bankSearch, setBankSearch] = useState('')
  const [selectedBank, setSelectedBank] = useState<BankAccountItem | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [sourceBankCode, setSourceBankCode] = useState('')
  const [sourceBankAccountNo, setSourceBankAccountNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingBanks, setLoadingBanks] = useState(false)

  useEffect(() => {
    const fetchBankAccounts = async () => {
      setLoadingBanks(true)
      try {
        const res = await bankAccountApi.getBankAccounts()
        const data = res.data as any
        const list: BankAccountItem[] = Array.isArray(data)
          ? data
          : (data?.bankAccounts ?? data?.BankAccounts ?? [])
        setBankAccounts(list)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.toastFailedToLoadBanks)
      } finally {
        setLoadingBanks(false)
      }
    }
    fetchBankAccounts()
  }, [m.toastFailedToLoadBanks])

  const filteredBanks = bankAccounts.filter(b => {
    const q = bankSearch.toLowerCase()
    return (
      b.bankCode?.toLowerCase().includes(q) ||
      b.accountNumber?.toLowerCase().includes(q) ||
      b.accountName?.toLowerCase().includes(q) ||
      b.bankName?.toLowerCase().includes(q)
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBank) { toast.error(m.toastBankRequired); return }
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { toast.error(m.toastPaymentAmountRequired); return }

    setLoading(true)
    try {
      const bankId = (selectedBank as any).bankAccountId ?? (selectedBank as any).BankAccountId ?? selectedBank.accountId ?? (selectedBank as any).id ?? ''
      let apiKey: string | undefined
      try {
        const keyRes = await bankAccountApi.getLinePaymentTxNotiApiKeys(bankId)
        const keyData = keyRes.data as any
        const keys: any[] = Array.isArray(keyData) ? keyData : (keyData?.apiKeys ?? keyData?.keys ?? [])
        const active = keys.find((k: any) => k.status?.toLowerCase() === 'active') ?? keys[0]
        apiKey = active?.key ?? active?.apiKey ?? active?.value
      } catch {
        // proceed without key — server may still accept admin token
      }

      await paymentTxApi.submitLinePaymentTxNotification(bankId, {
        PaymentAmount: parseFloat(amount.toFixed(2)),
        RemainAmount: 0,
        TxType: 'PayIn',
        SourceBankCode: sourceBankCode || undefined,
        SourceBankAccountNo: sourceBankAccountNo || undefined,
      }, apiKey)
      toast.success(m.toastCreateSuccess)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.toastCreateFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.modalCreateTxTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Bank Account searchable dropdown */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {m.labelBankAccount} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={selectedBank
                    ? `${selectedBank.bankCode} · ${selectedBank.accountNumber}`
                    : bankSearch}
                  onChange={e => {
                    setBankSearch(e.target.value)
                    setSelectedBank(null)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={loadingBanks ? m.bankLoadingPlaceholder : m.bankSearchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {showDropdown && filteredBanks.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredBanks.map(b => (
                    <button
                      key={(b as any).bankAccountId ?? (b as any).id ?? b.accountId}
                      type="button"
                      onClick={() => {
                        setSelectedBank(b)
                        setBankSearch('')
                        setShowDropdown(false)
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-semibold text-gray-800">{b.bankCode} · {b.accountNumber}</p>
                      {b.accountName && <p className="text-xs text-gray-500">{b.accountName}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {m.labelPaymentAmount} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder={m.amountPlaceholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{m.labelSourceBankCode}</label>
              <input
                type="text"
                value={sourceBankCode}
                onChange={e => setSourceBankCode(e.target.value)}
                placeholder={m.sourceBankCodePlaceholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{m.labelSourceAccountNo}</label>
              <input
                type="text"
                value={sourceBankAccountNo}
                onChange={e => setSourceBankAccountNo(e.target.value)}
                placeholder={m.sourceAccountNoPlaceholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {m.btnCancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? m.btnCreating : m.btnCreate}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Approve Modal ─────────────────────────────────────────────────────────────

interface MerchantOption { id: string; code?: string | null; name?: string | null; status?: string | null }

function normalizeMerchant(m: any): MerchantOption {
  return {
    id: m.merchantId ?? m.id ?? '',
    code: m.merchantCode ?? m.code ?? null,
    name: m.merchantName ?? m.name ?? null,
    status: m.merchantStatus ?? m.status ?? null,
  }
}

function ApproveModal({
  tx,
  onSuccess,
  onClose,
}: {
  tx: PayInTxItem
  onSuccess: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInTx
  const [merchants, setMerchants] = useState<MerchantOption[]>([])
  const [merchantSearch, setMerchantSearch] = useState('')
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantOption | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMerchants, setLoadingMerchants] = useState(false)

  useEffect(() => {
    const fetchMerchants = async () => {
      setLoadingMerchants(true)
      try {
        let list: any[] = []
        const bankAccountId = tx.payInBankAccountId ?? ''
        if (bankAccountId) {
          // Try to get merchants linked to this specific bank account
          const res = await bankAccountApi.getMerchantsForBankAccount(bankAccountId)
          const d = res.data as any
          const linked: any[] = Array.isArray(d) ? d : (d?.merchants ?? d?.Merchants ?? [])
          if (linked.length > 0) {
            list = linked
          } else {
            // Bank account might be Global — fall back to merchants with includeGlobalBankAccount
            const res2 = await merchantApi.getMerchants({ IncludeGlobalBankAccount: true, limit: 500 })
            const d2 = res2.data as any
            list = Array.isArray(d2) ? d2 : (d2?.merchants ?? d2?.Merchants ?? [])
          }
        } else {
          // No bank account ID — load all merchants
          const res = await merchantApi.getMerchants({ limit: 500 })
          const d = res.data as any
          list = Array.isArray(d) ? d : (d?.merchants ?? d?.Merchants ?? [])
        }
        setMerchants(list.map(normalizeMerchant))
      } catch {
        // silent
      } finally {
        setLoadingMerchants(false)
      }
    }
    fetchMerchants()
  }, [])

  const filteredMerchants = merchants.filter(merch => {
    const q = merchantSearch.toLowerCase()
    return (
      merch.code?.toLowerCase().includes(q) ||
      merch.name?.toLowerCase().includes(q)
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMerchant) { toast.error(m.toastMerchantRequired); return }
    setLoading(true)
    try {
      await paymentTxApi.approveUnidentifiedPaymentTx(tx.id, selectedMerchant.id)
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.modalApproveTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Bank account info (readonly) */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{m.labelBankAccount}</p>
            <p className="text-sm font-semibold text-gray-800">
              {[tx.payInBankCode, tx.payInBankAccountNo].filter(Boolean).join(' · ') || '—'}
            </p>
            {tx.payInBankAccountName && <p className="text-xs text-gray-500">{tx.payInBankAccountName}</p>}
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-semibold">{formatAmount(tx.txAmountDecimal ?? tx.txAmount)}</span>
              {tx.currency ? ` ${tx.currency}` : ''}
            </p>
          </div>

          {/* Merchant picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {m.labelMerchant} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={selectedMerchant ? `${selectedMerchant.code ?? selectedMerchant.id} · ${selectedMerchant.name ?? ''}`.replace(/ · $/, '') : merchantSearch}
                onChange={e => {
                  setMerchantSearch(e.target.value)
                  setSelectedMerchant(null)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={loadingMerchants ? 'Loading...' : 'Search merchant...'}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {showDropdown && filteredMerchants.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredMerchants.map(merch => (
                    <button
                      key={merch.id}
                      type="button"
                      onClick={() => {
                        setSelectedMerchant(merch)
                        setMerchantSearch('')
                        setShowDropdown(false)
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">{merch.code ?? merch.id}</p>
                        {merch.status && (
                          <span className={clsx(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                            merch.status.toLowerCase() === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          )}>
                            {merch.status}
                          </span>
                        )}
                      </div>
                      {merch.name && <p className="text-xs text-gray-500">{merch.name}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              {m.btnCancel}
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-60">
              {loading ? '...' : m.btnApprove}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  tx,
  onSuccess,
  onClose,
}: {
  tx: PayInTxItem
  onSuccess: () => void
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payInTx
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await paymentTxApi.rejectUnidentifiedPaymentTx(tx.id, reason)
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
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{m.modalRejectTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
          <div className="flex gap-3 pt-2">
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

// ── Action Menu ───────────────────────────────────────────────────────────────

function ActionMenu({
  tx,
  onApprove,
  onReject,
}: {
  tx: PayInTxItem
  onApprove: () => void
  onReject: () => void
}) {
  const { t } = useLang()
  const m = t.payInTx
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const isUnidentified = tx.status?.toLowerCase() === 'unidentified'

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
            disabled={!isUnidentified}
            onClick={() => { setOpen(false); onApprove() }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {m.menuApprove}
          </button>
          <button
            type="button"
            disabled={!isUnidentified}
            onClick={() => { setOpen(false); onReject() }}
            className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {m.menuReject}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PayInTransactionsPage() {
  const { t } = useLang()
  const m = t.payInTx
  const router = useRouter()

  const [search, setSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.statusFilter ?? '') : ''
  )
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.timeRange ?? { type: 'relative', value: '24h' }) : { type: 'relative', value: '24h' }
  )
  const [items, setItems] = useState<PayInTxItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [approveTarget, setApproveTarget] = useState<PayInTxItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PayInTxItem | null>(null)
  const [noticeTarget, setNoticeTarget] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? ''
    }
    return ''
  })

  const load = useCallback(async (currentPage: number, limit: number, tr: TimeRangeValue, q: string, status: string) => {
    if (typeof window !== 'undefined') sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search: q, statusFilter: status, timeRange: tr }))
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: Record<string, unknown> = { Page: currentPage, Limit: limit, FromDate: fromDate, ToDate: toDate }
      if (q.trim()) payload.FullTextSearch = q.trim()
      if (status) payload.Status = status

      const countPayload = { ...payload }
      delete countPayload.FullTextSearch

      const [listRes, countRes] = await Promise.allSettled([
        paymentTxApi.getPayInTransactions(payload),
        paymentTxApi.getPayInTransactionCount(countPayload),
      ])

      if (listRes.status === 'rejected') throw listRes.reason

      const data = listRes.value.data as any
      const list: PayInTxItem[] = Array.isArray(data)
        ? data
        : (data?.payInTransactions ?? data?.PayInTransactions ?? data?.transactions ?? data?.Transactions ?? [])
      setItems(list)

      if (countRes.status === 'fulfilled') {
        const countData = countRes.value.data as any
        setTotal(typeof countData === 'number' ? countData : (countData?.count ?? countData?.Count ?? 0))
      } else {
        setTotal(list.length)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1, itemsPerPage, timeRange, search, statusFilter) }, [])

  const handleRefresh = () => {
    setPage(1)
    load(1, itemsPerPage, timeRange, search, statusFilter)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    load(1, itemsPerPage, tr, search, statusFilter)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  const displayTotal = search.trim() ? items.length : total
  const totalPages = Math.ceil(displayTotal / itemsPerPage)
  const startRow = displayTotal === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, displayTotal)

  const cols = [m.colDate, m.colMerchant, m.colAmount, m.colFee, m.colBankAccount, m.colStatus, 'REF', m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg opacity-40 cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {m.btnCreateTx}
        </button>
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
            load(1, itemsPerPage, timeRange, search, e.target.value)
          }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.statusAll}</option>
          <option value="Identified">Identified</option>
          <option value="UnIdentified">UnIdentified</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Error">Error</option>
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
                      {/* Date */}
                      <td
                        className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer group"
                        onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`/business-setup/payment/pay-in-transactions/${item.id}`) }}
                      >
                        <span className="text-sm text-gray-600 group-hover:text-primary-600 group-hover:underline">
                          {formatDateTime(item.createdDate)}
                        </span>
                        {item.refId1 && <p className="text-xs text-gray-400 mt-0.5">{item.refId1}</p>}
                      </td>

                      {/* Merchant */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        {item.merchantCode || item.merchantName ? (
                          <>
                            <p className="text-sm font-semibold text-gray-800">{item.merchantCode ?? '—'}</p>
                            {item.merchantName && <p className="text-xs text-gray-500 mt-0.5">{item.merchantName}</p>}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-800 tabular-nums">
                          {formatAmount(item.txAmountDecimal ?? item.txAmount)}
                        </p>
                        <p className="text-xs text-gray-400">{item.currency ?? '—'}</p>
                      </td>

                      {/* Fee */}
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-800 tabular-nums flex items-center justify-end gap-1">
                          {item.discardCent && (
                            <span title={m.discardCentHint} className="inline-flex flex-shrink-0">
                              <Scissors className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                          {formatAmount(item.payInFeeDecimal ?? item.payInFee)}
                        </p>
                        {item.payInFeePct != null && (
                          <p className="text-xs text-gray-400 tabular-nums">{item.payInFeePct}%</p>
                        )}
                      </td>

                      {/* Bank Account */}
                      <td className="px-4 py-3 border-b border-gray-100 min-w-[180px]">
                        {item.payInBankCode || item.payInBankAccountNo ? (
                          <p className="text-sm font-semibold text-gray-800">
                            {[item.payInBankCode, item.payInBankAccountNo].filter(Boolean).join(' · ')}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                        {item.payInBankAccountName && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.payInBankAccountName}</p>
                        )}
                        <div className="flex gap-1 mt-1 flex-wrap items-center">
                          {item.payInPromptPayId ? (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">PromptPay</span>
                          ) : item.payInAccountType ? (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">{item.payInAccountType}</span>
                          ) : null}
                          {item.payInPromptPayId && (
                            <span className="text-[10px] text-gray-500">{item.payInPromptPayId}</span>
                          )}
                          {item.txIsPeerToPeer && (
                            <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full ring-1 ring-violet-200">P2P</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <StatusBadge
                            status={item.status}
                            createdDate={item.createdDate}
                            paymentRequestId={item.paymentRequestId}
                            statusReason={item.statusReason}
                            txIsPeerToPeer={item.txIsPeerToPeer}
                          />
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
                        </div>
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
                          tx={item}
                          onApprove={() => setApproveTarget(item)}
                          onReject={() => setRejectTarget(item)}
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
                  load(1, n, timeRange, search, statusFilter)
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
                  onClick={() => { setPage(p => p - 1); load(page - 1, itemsPerPage, timeRange, search, statusFilter) }}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setPage(p => p + 1); load(page + 1, itemsPerPage, timeRange, search, statusFilter) }}
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

      {showCreateModal && (
        <CreatePayInTxModal
          onSuccess={handleRefresh}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {approveTarget && (
        <ApproveModal
          tx={approveTarget}
          onSuccess={handleRefresh}
          onClose={() => setApproveTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          tx={rejectTarget}
          onSuccess={handleRefresh}
          onClose={() => setRejectTarget(null)}
        />
      )}
      {noticeTarget && <AuditNoticeDrawer rowId={noticeTarget} onClose={() => setNoticeTarget(null)} />}
    </div>
  )
}
