'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { merchantApi } from '@/lib/api/merchant.api'
import type { MerchantItem, BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

// ── helpers ──────────────────────────────────────────────────────────────────

function genRefId() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CreatePayOutRequestPage() {
  const { t } = useLang()
  const m = t.payOutRequest
  const router = useRouter()

  // Form state
  const [merchantId, setMerchantId] = useState('')
  const [payoutBankAccountId, setPayoutBankAccountId] = useState('')
  const [refId, setRefId] = useState('')
  const [refId1, setRefId1] = useState('')
  const [refId2, setRefId2] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [payoutFeePayer, setPayoutFeePayer] = useState<'Merchant' | 'Beneficiary'>('Merchant')

  // Data lists
  const [merchants, setMerchants] = useState<MerchantItem[]>([])
  const [payoutAccounts, setPayoutAccounts] = useState<BankAccountItem[]>([])

  // UI state
  const [loadingMerchants, setLoadingMerchants] = useState(true)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Searchable merchant combobox
  const [merchantSearch, setMerchantSearch] = useState('')
  const [merchantOpen, setMerchantOpen] = useState(false)
  const merchantRef = useRef<HTMLDivElement>(null)

  // Destination bank account dropdown
  const [bankOpen, setBankOpen] = useState(false)
  const bankRef = useRef<HTMLDivElement>(null)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  // Auto-generate RefId on mount
  useEffect(() => { setRefId(genRefId()) }, [])

  // Load merchants on mount
  useEffect(() => {
    setLoadingMerchants(true)
    merchantApi.getMerchants({ limit: 500 })
      .then(res => {
        const data = res.data as any
        const list: MerchantItem[] = Array.isArray(data)
          ? data
          : (data?.merchants ?? data?.Merchants ?? [])
        setMerchants(list)
      })
      .catch(() => toast.error(m.toastFailedToLoadMerchants))
      .finally(() => setLoadingMerchants(false))
  }, [])

  // Load payout bank accounts when merchant changes
  useEffect(() => {
    if (!merchantId) { setPayoutAccounts([]); setPayoutBankAccountId(''); return }
    setLoadingAccounts(true)
    setPayoutBankAccountId('')
    bankAccountApi.getPayOutBankAccountsForMerchant(merchantId)
      .then(res => {
        const data = res.data as any
        const list: BankAccountItem[] = Array.isArray(data)
          ? data
          : (data?.bankAccounts ?? data?.BankAccounts ?? [])
        setPayoutAccounts(list)
      })
      .catch(() => toast.error(m.toastFailedToLoadBanks))
      .finally(() => setLoadingAccounts(false))
  }, [merchantId])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (merchantRef.current && !merchantRef.current.contains(e.target as Node)) {
        setMerchantOpen(false)
      }
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) {
        setBankOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Merchant combobox helpers
  const getMerchantLabel = (mc: MerchantItem) =>
    mc.code ? `${mc.code}${mc.name ? ` — ${mc.name}` : ''}` : mc.name ?? mc.id

  const selectedMerchant = merchants.find(mc => mc.id === merchantId)

  const filteredMerchants = merchantSearch.trim()
    ? merchants.filter(mc => getMerchantLabel(mc).toLowerCase().includes(merchantSearch.toLowerCase()))
    : merchants

  const mark = () => { if (!isDirty) setIsDirty(true) }
  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const selectedBankAccount = payoutAccounts.find(ba => (ba.bankAccountId ?? ba.accountId) === payoutBankAccountId)

  const getBankLabel = (ba: BankAccountItem) =>
    [ba.bankCode, ba.accountNumber].filter(Boolean).join(' · ') + (ba.accountName ? ` — ${ba.accountName}` : '')

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!merchantId) errs.merchantId = m.merchantRequired
    if (!payoutBankAccountId) errs.payoutBankAccountId = m.payoutBankAccountRequired
    if (!refId.trim()) errs.refId = m.refIdRequired
    if (!amount.trim()) {
      errs.amount = m.amountRequired
    } else {
      const n = parseFloat(amount)
      if (isNaN(n) || n <= 0) {
        errs.amount = m.amountInvalid
      } else if (selectedMerchant) {
        const min = selectedMerchant.payoutMinAmount
        const max = selectedMerchant.payoutMaxAmount
        if (min != null && n < min) errs.amount = `${m.amountBelowMin ?? 'ต่ำกว่าขั้นต่ำ'} (${min.toLocaleString()})`
        if (max != null && n > max) errs.amount = `${m.amountAboveMax ?? 'เกินขีดสูงสุด'} (${max.toLocaleString()})`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      MerchantId: merchantId,
      RefId: refId.trim(),
      RefId1: refId.trim(),
      RefId2: refId1.trim() || undefined,
      RefId3: refId2.trim() || undefined,
      Description: description.trim() || undefined,
      Currency: 'THB' as const,
      RequestedAmount: parseFloat(amount),
      QrProvider: 'PP' as const,
      PayinBankAccountId: payoutBankAccountId,
    }
    console.log('[CreatePayOut] payload:', JSON.stringify(payload))
    try {
      await paymentRequestApi.createPayOutRequest({
        MerchantId: merchantId,
        RefId: refId.trim(),
        RefId1: refId.trim(),
        RefId2: refId1.trim() || undefined,
        RefId3: refId2.trim() || undefined,
        Description: description.trim() || undefined,
        Currency: 'THB',
        RequestedAmount: parseFloat(amount),
        QrProvider: 'PP',
        PayinBankAccountId: payoutBankAccountId,
        PayoutFeePayer: payoutFeePayer,
      })
      setIsDirty(false)
      toast.success(m.toastCreateSuccess)
      router.push('/business-setup/payment/withdraw-request')
    } catch (err: any) {
      toast.error(err?.message ?? m.toastCreateFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push('/business-setup/payment/withdraw-request'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.createTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.createSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

          {/* Section 1: Merchant */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionMerchant}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <FormField label={m.fieldMerchantSelect} required error={errors.merchantId}>
                {/* Searchable combobox */}
                <div ref={merchantRef} className="relative">
                  <input
                    type="text"
                    value={merchantOpen
                      ? merchantSearch
                      : (selectedMerchant ? getMerchantLabel(selectedMerchant) : '')}
                    onFocus={() => { setMerchantOpen(true); setMerchantSearch('') }}
                    onChange={e => { setMerchantSearch(e.target.value); setMerchantOpen(true) }}
                    placeholder={loadingMerchants ? t.admin.loading : m.placeholderMerchantSelect}
                    disabled={loadingMerchants}
                    autoComplete="off"
                    className={clsx(inputCls(!!errors.merchantId), 'pr-8')}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>

                  {merchantOpen && !loadingMerchants && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto custom-scrollbar">
                      {filteredMerchants.length === 0 ? (
                        <div className="px-3 py-2.5 text-sm text-gray-400">ไม่พบข้อมูล</div>
                      ) : (
                        filteredMerchants.map(mc => (
                          <button
                            key={mc.id}
                            type="button"
                            onClick={() => {
                              setMerchantId(mc.id)
                              setMerchantOpen(false)
                              setMerchantSearch('')
                              mark(); clearErr('merchantId')
                            }}
                            className={clsx(
                              'w-full text-left px-3 py-2 text-sm transition-colors',
                              merchantId === mc.id
                                ? 'bg-primary-50 text-primary-700 font-medium'
                                : 'text-gray-800 hover:bg-gray-50'
                            )}
                          >
                            {getMerchantLabel(mc)}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </FormField>

              {selectedMerchant && (
                <div className="flex flex-col gap-2 justify-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{m.payoutRange ?? 'Payout Range'}</p>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{m.minAmount ?? 'Min'}</span>
                      <span className="text-sm font-semibold text-gray-700 tabular-nums">
                        {selectedMerchant.payoutMinAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{m.maxAmount ?? 'Max'}</span>
                      <span className="text-sm font-semibold text-gray-700 tabular-nums">
                        {selectedMerchant.payoutMaxAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Destination Payout Bank Account */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionPayoutBank}</SectionHeader>
            <div className="flex flex-wrap items-start gap-4">

              {/* Bank account picker */}
              <div className="flex-1 min-w-0 max-w-md">
                <FormField label={m.fieldPayoutBankAccount} required error={errors.payoutBankAccountId}>
                  <div ref={bankRef} className="relative">
                    <button
                      type="button"
                      disabled={!merchantId || loadingAccounts}
                      onClick={() => { if (merchantId && !loadingAccounts) setBankOpen(p => !p) }}
                      className={clsx(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm border rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:border-transparent',
                        errors.payoutBankAccountId ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500',
                        (!merchantId || loadingAccounts) ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        {selectedBankAccount ? (
                          <>
                            <span className="flex items-center flex-wrap gap-1.5 min-w-0 flex-1">
                              <span className="font-semibold text-gray-900 text-sm">
                                {[selectedBankAccount.bankCode, selectedBankAccount.accountNumber].filter(Boolean).join(' ')}
                              </span>
                              {selectedBankAccount.accountName && (
                                <span className="text-gray-400 text-sm font-normal">— {selectedBankAccount.accountName}</span>
                              )}
                              <AccountTypeBadge type={selectedBankAccount.accountType} />
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">
                            {!merchantId ? m.placeholderMerchantSelect : loadingAccounts ? t.admin.loading : m.placeholderPayoutBankAccount}
                          </span>
                        )}
                      </span>
                      <span className="text-gray-400 text-xs flex-shrink-0">▾</span>
                    </button>

                    {bankOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => { setPayoutBankAccountId(''); setBankOpen(false); mark(); clearErr('payoutBankAccountId') }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
                        >
                          {m.placeholderPayoutBankAccount}
                        </button>
                        {payoutAccounts.map(ba => {
                          const id = ba.bankAccountId ?? ba.accountId
                          const bankPart = [ba.bankCode, ba.accountNumber].filter(Boolean).join(' ')
                          const namePart = ba.accountName
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => { setPayoutBankAccountId(id); setBankOpen(false); mark(); clearErr('payoutBankAccountId') }}
                              className={clsx(
                                'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0',
                                payoutBankAccountId === id
                                  ? 'bg-primary-50'
                                  : 'hover:bg-gray-50'
                              )}
                            >
                              <span className="flex-1 min-w-0 flex items-center flex-wrap gap-1.5">
                                <span className={clsx('text-sm font-semibold', payoutBankAccountId === id ? 'text-primary-700' : 'text-gray-900')}>
                                  {bankPart}
                                </span>
                                {namePart && (
                                  <span className="text-sm text-gray-400 font-normal">— {namePart}</span>
                                )}
                                <AccountTypeBadge type={ba.accountType} />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {merchantId && !loadingAccounts && payoutAccounts.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">{m.noPayoutBankAccounts}</p>
                  )}
                </FormField>
              </div>

              {/* Fee Payer Switch */}
              <div className="flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{m.fieldFeePayer ?? 'Fee Payer'}</p>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(['Merchant', 'Beneficiary'] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { setPayoutFeePayer(opt); mark() }}
                      className={clsx(
                        'px-4 py-2.5 text-sm font-semibold transition-colors',
                        payoutFeePayer === opt
                          ? opt === 'Merchant'
                            ? 'bg-blue-600 text-white'
                            : 'bg-orange-500 text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      )}
                    >
                      {opt === 'Merchant' ? (m.feePayerMerchant ?? 'Merchant') : (m.feePayerBeneficiary ?? 'Beneficiary')}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Request Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionRequestInfo}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Ref ID — auto-generated with re-gen button */}
              <FormField label={m.fieldRefId} required error={errors.refId}>
                <div className="flex gap-2">
                  <input
                    value={refId}
                    onChange={e => { setRefId(e.target.value); mark(); clearErr('refId') }}
                    placeholder={m.placeholderRefId}
                    className={clsx(inputCls(!!errors.refId), 'flex-1 min-w-0')}
                  />
                  <button
                    type="button"
                    onClick={() => { setRefId(genRefId()); mark(); clearErr('refId') }}
                    title="Re-generate"
                    className="flex-shrink-0 px-2.5 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Auto-generated · YYMMDDHHMMSS</p>
              </FormField>

              <FormField label={m.fieldRequestedAmount} required error={errors.amount}>
                <input
                  value={amount}
                  onChange={e => {
                    const v = e.target.value
                    if (/^\d*\.?\d{0,2}$/.test(v) || v === '') {
                      setAmount(v); mark(); clearErr('amount')
                    }
                  }}
                  placeholder={m.placeholderAmount}
                  inputMode="decimal"
                  className={inputCls(!!errors.amount)}
                />
              </FormField>

              <FormField label={m.fieldRefId1}>
                <input
                  value={refId1}
                  onChange={e => { setRefId1(e.target.value); mark() }}
                  placeholder={m.placeholderRefId1}
                  className={inputCls(false)}
                />
              </FormField>

              <FormField label={m.fieldRefId2}>
                <input
                  value={refId2}
                  onChange={e => { setRefId2(e.target.value); mark() }}
                  placeholder={m.placeholderRefId2}
                  className={inputCls(false)}
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField label={m.fieldDescription}>
                  <textarea
                    value={description}
                    onChange={e => { setDescription(e.target.value); mark() }}
                    placeholder={m.placeholderDescription}
                    rows={2}
                    className={clsx(inputCls(false), 'resize-none')}
                  />
                </FormField>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push('/business-setup/payment/withdraw-request'))}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.admin.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Spinner />}
            {saving ? t.admin.saving : t.admin.save}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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

const inputCls = (hasError: boolean) =>
  clsx(
    'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
  )

function AccountTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null
  const isPromptPay = type.toLowerCase() === 'promptpay'
  return (
    <span className={clsx(
      'inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
      isPromptPay
        ? 'border-blue-300 text-blue-600 bg-blue-50'
        : 'border-blue-300 text-blue-600 bg-blue-50'
    )}>
      {isPromptPay ? 'PromptPay' : 'Native'}
    </span>
  )
}
