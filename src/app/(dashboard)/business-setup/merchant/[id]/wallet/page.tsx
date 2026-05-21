'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { walletApi } from '@/lib/api/wallet.api'
import { merchantApi } from '@/lib/api/merchant.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { paymentTxApi } from '@/lib/api/payment-tx.api'
import type { WalletItem, PointTxItem, MerchantItem, AddPointPayload } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, TrendingUp, TrendingDown, RefreshCw, ExternalLink, X, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-4">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function TagsCell({ tags }: { tags?: string | null }) {
  if (!tags) return <span className="text-gray-400">—</span>
  const parts = tags.split(',').map(p => p.trim()).filter(Boolean)
  return (
    <div className="flex flex-col gap-1">
      {parts.map((part, i) => {
        const match = part.match(/PaymentTxId=\[?([0-9a-f-]{36})\]?/i)
        if (match) {
          const uuid = match[1]
          return (
            <a
              key={i}
              href={`/business-setup/payment/pay-in-transactions/${uuid}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
            >
              <span className="truncate max-w-[160px]">{uuid}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          )
        }
        return (
          <span
            key={i}
            className="inline-flex w-fit items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs ring-1 ring-blue-200"
          >
            {part}
          </span>
        )
      })}
    </div>
  )
}

// ── Add / Deduct Modal ────────────────────────────────────────────────────────

function PointModal({
  mode,
  wallet,
  orgId,
  merchantId,
  onSuccess,
  onClose,
  wt,
}: {
  mode: 'add' | 'deduct'
  wallet: WalletItem
  orgId: string
  merchantId: string
  onSuccess: () => void
  onClose: () => void
  wt: ReturnType<typeof useLang>['t']['merchant']['wallet']
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)

  const currentBalance = wallet.pointBalanceDecimal ?? wallet.pointBalance ?? 0
  const parsedAmount = parseFloat(amount) || 0
  const newBalance = mode === 'add' ? currentBalance + parsedAmount : currentBalance - parsedAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error(wt.toastAmountRequired)
      return
    }
    setLoading(true)
    try {
      const payload: AddPointPayload = {
        TxAmount: Math.floor(parsedAmount),
        TxAmountDecimal: parseFloat(parsedAmount.toFixed(2)),
        Description: description || undefined,
        Tags: tags || undefined,
      }
      if (mode === 'add') {
        await walletApi.addPoint(orgId, merchantId, payload)
        toast.success(wt.toastTopUpSuccess)
      } else {
        await walletApi.deductPoint(orgId, merchantId, payload)
        toast.success(wt.toastDeductSuccess)
      }
      onSuccess()
      onClose()
    } catch {
      toast.error(mode === 'add' ? wt.toastTopUpFailed : wt.toastDeductFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {mode === 'add' ? wt.modalTopUpTitle : wt.modalDeductTitle}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{wt.labelWallet}</label>
            <p className="mt-1 text-sm text-gray-700 truncate">{wallet.id}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{wt.labelCurrentBalance}</label>
            <p className="mt-1 text-lg font-bold text-gray-900 tabular-nums">{formatAmount(currentBalance)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {wt.labelAmount} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={wt.amountPlaceholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{wt.labelNewBalance}</label>
            <p className={clsx(
              'mt-1 text-lg font-bold tabular-nums',
              mode === 'deduct' || newBalance < 0 ? 'text-red-600' : 'text-emerald-600'
            )}>
              {formatAmount(parseFloat(newBalance.toFixed(2)))}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{wt.labelDescription}</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={wt.descPlaceholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{wt.labelTags}</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder={wt.tagsPlaceholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              {wt.btnCancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? wt.btnSaving : wt.btnSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Create Transaction Modal ──────────────────────────────────────────────────

interface PayInBankAccount {
  bankAccountId: string
  bankCode?: string | null
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  accountType?: string | null
}

function CreateTxModal({
  merchantId,
  onSuccess,
  onClose,
  wt,
}: {
  merchantId: string
  onSuccess: () => void
  onClose: () => void
  wt: ReturnType<typeof useLang>['t']['merchant']['wallet']
}) {
  const [bankAccounts, setBankAccounts] = useState<PayInBankAccount[]>([])
  const [bankSearch, setBankSearch] = useState('')
  const [selectedBank, setSelectedBank] = useState<PayInBankAccount | null>(null)
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
        const res = await merchantApi.getPayInBankAccountsForMerchant(merchantId)
        const data = res.data as any
        const list: PayInBankAccount[] = Array.isArray(data)
          ? data
          : (data?.bankAccounts ?? data?.BankAccounts ?? [])
        setBankAccounts(list)
      } catch {
        toast.error(wt.toastFailedToLoadBanks)
      } finally {
        setLoadingBanks(false)
      }
    }
    fetchBankAccounts()
  }, [merchantId, wt.toastFailedToLoadBanks])

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
    if (!selectedBank) { toast.error(wt.toastBankRequired); return }
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) { toast.error(wt.toastPaymentAmountRequired); return }

    setLoading(true)
    try {
      let apiKey: string | undefined
      try {
        const keyRes = await bankAccountApi.getLinePaymentTxNotiApiKeys(selectedBank.bankAccountId)
        const keyData = keyRes.data as any
        const keys: any[] = Array.isArray(keyData) ? keyData : (keyData?.apiKeys ?? keyData?.keys ?? [])
        const active = keys.find((k: any) => k.status?.toLowerCase() === 'active') ?? keys[0]
        apiKey = active?.key ?? active?.apiKey ?? active?.value
      } catch {
        // proceed without key — server may still accept admin token
      }

      await paymentTxApi.submitLinePaymentTxNotification(selectedBank.bankAccountId, {
        PaymentAmount: parseFloat(amount.toFixed(2)),
        RemainAmount: 0,
        TxType: 'PayIn',
        SourceBankCode: sourceBankCode || undefined,
        SourceBankAccountNo: sourceBankAccountNo || undefined,
      }, apiKey)
      toast.success(wt.toastCreateSuccess)
      onSuccess()
      onClose()
    } catch {
      toast.error(wt.toastCreateFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{wt.modalCreateTxTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Bank Account searchable dropdown */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
              {wt.labelBankAccount} <span className="text-red-500">*</span>
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
                  placeholder={loadingBanks ? wt.bankLoadingPlaceholder : wt.bankSearchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {showDropdown && filteredBanks.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredBanks.map(b => (
                    <button
                      key={b.bankAccountId}
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
              {wt.labelPaymentAmount} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder={wt.amountPlaceholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{wt.labelSourceBankCode}</label>
              <input
                type="text"
                value={sourceBankCode}
                onChange={e => setSourceBankCode(e.target.value)}
                placeholder={wt.sourceBankCodePlaceholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{wt.labelSourceAccountNo}</label>
              <input
                type="text"
                value={sourceBankAccountNo}
                onChange={e => setSourceBankAccountNo(e.target.value)}
                placeholder={wt.sourceAccountNoPlaceholder}
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
              {wt.btnCancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? wt.btnCreating : wt.btnCreate}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MerchantWalletPage() {
  const { t } = useLang()
  const wt = t.merchant.wallet
  const params = useParams()
  const router = useRouter()
  const merchantId = params.id as string

  const [wallet, setWallet] = useState<WalletItem | null>(null)
  const [merchant, setMerchant] = useState<MerchantItem | null>(null)
  const [txs, setTxs] = useState<PointTxItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [modal, setModal] = useState<'add' | 'deduct' | 'create' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadWalletAndMerchant = async () => {
    setLoading(true)
    try {
      const [walletRes, merchantRes] = await Promise.allSettled([
        walletApi.getWalletByMerchantId(merchantId),
        merchantApi.getMerchantById(merchantId),
      ])
      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data as any
        setWallet(d?.wallet ?? d?.Wallet ?? d)
      }
      if (merchantRes.status === 'fulfilled') {
        const d = merchantRes.value.data as any
        setMerchant(d?.merchant ?? d?.Merchant ?? d)
      }
    } catch {
      toast.error(wt.toastFailedToLoadWallet)
    } finally {
      setLoading(false)
    }
  }

  const loadTxs = useCallback(async (currentPage: number, limit: number, w: WalletItem) => {
    if (!w.orgId || !w.merchantId) return
    setTxLoading(true)
    try {
      const payload = { Page: currentPage, Limit: limit }
      const [listRes, countRes] = await Promise.allSettled([
        walletApi.getPointTxsByWalletId(w.orgId, w.merchantId, payload),
        walletApi.getPointTxsCountByWalletId(w.orgId, w.merchantId, payload),
      ])
      if (listRes.status === 'fulfilled') {
        const d = listRes.value.data as any
        const list: PointTxItem[] = Array.isArray(d)
          ? d
          : (d?.pointTxs ?? d?.PointTxs ?? d?.pointTransactions ?? d?.PointTransactions ?? d?.transactions ?? [])
        setTxs(list)
      }
      if (countRes.status === 'fulfilled') {
        const d = countRes.value.data as any
        setTotal(typeof d === 'number' ? d : (d?.count ?? d?.Count ?? d?.total ?? 0))
      }
    } catch {
      toast.error(wt.toastFailedToLoadTxs)
    } finally {
      setTxLoading(false)
    }
  }, [wt.toastFailedToLoadTxs])

  useEffect(() => { loadWalletAndMerchant() }, [merchantId])

  useEffect(() => {
    if (wallet) loadTxs(page, itemsPerPage, wallet)
  }, [wallet, page, itemsPerPage])

  const handleRefresh = () => {
    loadWalletAndMerchant()
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-start justify-between pb-4">
        <div>
          <button
            onClick={() => router.push('/business-setup/merchant')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {wt.backToMerchants}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{wt.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{merchant?.code ?? merchantId}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title={wt.btnRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {wt.btnCreateTx}
          </button>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            {wt.btnTopUp}
          </button>
          <button
            onClick={() => setModal('deduct')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
          >
            <TrendingDown className="w-4 h-4" />
            {wt.btnDeduct}
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
        {/* Merchant info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionHeader>{wt.sectionMerchantInfo}</SectionHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{wt.labelCode}</dt>
              <dd className="mt-0.5 font-semibold text-gray-800">{merchant?.code ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{wt.labelName}</dt>
              <dd className="mt-0.5 text-gray-700">{merchant?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{wt.labelStatus}</dt>
              <dd className="mt-0.5">
                {merchant?.status ? (
                  <span className={clsx(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1',
                    merchant.status.toLowerCase() === 'active'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-gray-100 text-gray-500 ring-gray-200'
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', merchant.status.toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-gray-400')} />
                    {merchant.status}
                  </span>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{wt.labelEmail}</dt>
              <dd className="mt-0.5 text-gray-700 truncate">{merchant?.contactEmail ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Wallet info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionHeader>{wt.sectionWallet}</SectionHeader>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="col-span-2">
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{wt.labelWalletId}</dt>
              <dd className="mt-0.5 text-xs text-gray-600 truncate">{wallet?.id ?? '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{wt.labelCurrentBalance}</dt>
              <dd className="mt-1 text-xl font-bold text-gray-900 tabular-nums">
                {formatAmount(wallet?.pointBalanceDecimal ?? wallet?.pointBalance)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100">
          <SectionHeader>{wt.sectionTxs}</SectionHeader>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
            <thead>
              <tr className="bg-gray-50">
                {[wt.colCreatedDate, wt.colTags, wt.colDescription, wt.colPayIn, wt.colPayOut, wt.colType, wt.colPrevBalance, wt.colBalance].map((col, i) => (
                  <th
                    key={col}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      [3, 4, 6, 7].includes(i) ? 'text-right' : 'text-left'
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-400">{t.admin.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : txs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{wt.noTxsFound}</p>
                  </td>
                </tr>
              ) : (
                txs.map((tx, idx) => {
                  const prevBal = tx.previousBalanceDecimal ?? tx.previousBalance ?? 0
                  const currBal = tx.currentBalanceDecimal ?? tx.currentBalance ?? 0
                  const isPayIn = tx.txType != null ? tx.txType > 0 : currBal >= prevBal
                  const amount = tx.txAmountDecimal ?? tx.txAmount
                  const isSelected = selectedId === (tx.id ?? String(idx))
                  return (
                    <tr
                      key={tx.id ?? idx}
                      onClick={() => setSelectedId(prev => prev === (tx.id ?? String(idx)) ? null : (tx.id ?? String(idx)))}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(tx.createdDate)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 max-w-[220px]">
                        <TagsCell tags={tx.tags} />
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 max-w-[200px] truncate">
                        {tx.description || '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        {isPayIn ? (
                          <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                            +{formatAmount(amount)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                        {!isPayIn ? (
                          <span className="text-sm font-semibold text-rose-700 tabular-nums">
                            -{formatAmount(amount)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold',
                          isPayIn
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        )}>
                          {isPayIn ? wt.typePayIn : wt.typePayOut}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap text-sm tabular-nums text-gray-600">
                        {formatAmount(tx.previousBalanceDecimal ?? tx.previousBalance)}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap text-sm tabular-nums font-semibold text-gray-800">
                        {formatAmount(tx.currentBalanceDecimal ?? tx.currentBalance)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{total}</span> {wt.foundCount}
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
              >
                {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {t.merchant.of} {total}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page <= 1 || txLoading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages || total === 0 || txLoading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(modal === 'add' || modal === 'deduct') && wallet && (
        <PointModal
          mode={modal}
          wallet={wallet}
          orgId={wallet.orgId ?? ''}
          merchantId={wallet.merchantId ?? merchantId}
          onSuccess={() => { loadWalletAndMerchant() }}
          onClose={() => setModal(null)}
          wt={wt}
        />
      )}
      {modal === 'create' && (
        <CreateTxModal
          merchantId={merchantId}
          onSuccess={() => { loadWalletAndMerchant() }}
          onClose={() => setModal(null)}
          wt={wt}
        />
      )}
    </div>
  )
}
