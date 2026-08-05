'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, RefreshCw, Search, X } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

function genRefId() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

export default function CreateTransferRequestPage() {
  const { t } = useLang()
  const m = t.transferRequest
  const router = useRouter()

  const [payinBankAccountId, setPayinBankAccountId] = useState('')
  const [payoutBankAccountId, setPayoutBankAccountId] = useState('')
  const [payinMerchantId, setPayinMerchantId] = useState('')
  const [refId, setRefId] = useState('')
  const [refId1, setRefId1] = useState('')
  const [refId2, setRefId2] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const [destAccounts, setDestAccounts] = useState<BankAccountItem[]>([])
  const [transitAccounts, setTransitAccounts] = useState<BankAccountItem[]>([])

  const [loadingDest, setLoadingDest] = useState(true)
  const [loadingTransit, setLoadingTransit] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMode, setSaveMode] = useState<'close' | 'continue'>('close')
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const destRef = useRef<HTMLDivElement>(null)
  const transitRef = useRef<HTMLDivElement>(null)
  const [destOpen, setDestOpen] = useState(false)
  const [transitOpen, setTransitOpen] = useState(false)
  const [destSearch, setDestSearch] = useState('')
  const [transitSearch, setTransitSearch] = useState('')

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  useEffect(() => { setRefId(genRefId()) }, [])

  useEffect(() => {
    setLoadingDest(true)
    bankAccountApi.getPayInBankAccountsWithGlobalAll()
      .then(res => {
        const data = res.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.bankAccounts ?? data?.BankAccounts ?? [])
        setDestAccounts(list.map(normalizeBankAccount))
      })
      .catch(() => toast.error(m.toastFailedToLoadBanks))
      .finally(() => setLoadingDest(false))
  }, [])

  useEffect(() => {
    setLoadingTransit(true)
    bankAccountApi.getTransitBankAccountsAll()
      .then(res => {
        const data = res.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.bankAccounts ?? data?.BankAccounts ?? [])
        setTransitAccounts(list.map(normalizeBankAccount))
      })
      .catch(() => toast.error(m.toastFailedToLoadBanks))
      .finally(() => setLoadingTransit(false))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) setDestOpen(false)
      if (transitRef.current && !transitRef.current.contains(e.target as Node)) setTransitOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const mark = () => { if (!isDirty) setIsDirty(true) }
  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const selectPayinAccount = async (id: string) => {
    setPayinBankAccountId(id)
    setPayinMerchantId('')
    if (!id) return
    const res = await bankAccountApi.getMerchantsForBankAccount(id).catch(() => null)
    const raw = res?.data as any
    const merchants: any[] = Array.isArray(raw) ? raw : (raw?.merchants ?? [])
    const picked = merchants.find((m: any) => m.isSelected) ?? merchants[0]
    if (picked?.merchantId) setPayinMerchantId(picked.merchantId)
  }

  const getBankLabel = (ba: BankAccountItem) =>
    [ba.bankCode, ba.accountNumber].filter(Boolean).join(' · ') + (ba.accountName ? ` — ${ba.accountName}` : '')

  const normalizeBankAccount = (item: any): BankAccountItem => ({
    ...item,
    accountId: item.id || item.bankAccountId || item.BankAccountId || item.accountId || item.AccountId || item.Id || '',
    bankAccountId: item.bankAccountId || item.BankAccountId || item.id || item.Id || item.accountId || item.AccountId || '',
  })

  const selectedDest = destAccounts.find(ba => ba.accountId === payinBankAccountId)
  const selectedTransit = transitAccounts.find(ba => ba.accountId === payoutBankAccountId)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!payinBankAccountId) errs.payinBankAccountId = m.destBankAccountRequired
    if (!payoutBankAccountId) errs.payoutBankAccountId = m.sourceAccountRequired
    if (!amount.trim()) {
      errs.amount = m.amountRequired
    } else {
      const n = parseFloat(amount)
      if (isNaN(n) || n <= 0) errs.amount = m.amountInvalid
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (mode: 'close' | 'continue') => {
    if (!validate()) return
    setSaving(true)
    setSaveMode(mode)
    try {
      const res = await paymentRequestApi.createTransferRequest({
        RefId1: refId.trim() || undefined,
        RefId2: refId1.trim() || undefined,
        RefId3: refId2.trim() || undefined,
        Description: description.trim() || undefined,
        Currency: 'THB',
        QrProvider: 'PP',
        RequestedAmount: parseFloat(amount),
        MerchantId: payinMerchantId || undefined,
        PayinBankAccountId: payoutBankAccountId,
        PayoutBankAccountId: payinBankAccountId,
      })
      const resData = res.data as any
      if (resData?.paymentRequest === null && resData?.status && resData.status !== 'SUCCESS' && resData.status !== 'Ok') {
        toast.error(resData?.description ?? m.toastCreateFailed)
        return
      }
      setIsDirty(false)
      toast.success(m.toastCreateSuccess)
      if (mode === 'continue') {
        const id = resData?.paymentRequest?.id || resData?.id || resData?.Id || resData?.paymentRequest?.Id
        if (id) {
          router.push(`/business-setup/payment/transfer-request/${id}`)
        } else {
          router.push('/business-setup/payment/transfer-request')
        }
      } else {
        router.push('/business-setup/payment/transfer-request')
      }
    } catch (err: any) {
      const description = err?.response?.data?.description ?? err?.response?.data?.message
      toast.error(description ?? err?.message ?? m.toastCreateFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push('/business-setup/payment/transfer-request'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.createTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.createSubtitle}</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

          {/* Source bank (PayIn) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionSource}</SectionHeader>
            <div className="max-w-md">
              <FormField label={m.fieldSourceAccount} required error={errors.payinBankAccountId}>
                <div ref={destRef} className="relative">
                  <div className={clsx(
                    'flex items-center border rounded-lg bg-white overflow-hidden',
                    errors.payinBankAccountId ? 'border-red-400' : 'border-gray-200',
                  )}>
                    <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={destSearch}
                      onChange={e => { setDestSearch(e.target.value); setPayinBankAccountId(''); setDestOpen(true); mark(); clearErr('payinBankAccountId') }}
                      onFocus={() => setDestOpen(true)}
                      onBlur={() => setTimeout(() => setDestOpen(false), 150)}
                      placeholder={loadingDest ? t.admin.loading : m.placeholderSourceAccount}
                      disabled={loadingDest}
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                    />
                    {(destSearch || payinBankAccountId) && (
                      <button type="button" onMouseDown={e => e.preventDefault()}
                        onClick={() => { setDestSearch(''); selectPayinAccount(''); clearErr('payinBankAccountId') }}
                        className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {destOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto custom-scrollbar">
                      {destAccounts.filter(ba => {
                        const q = destSearch.toLowerCase()
                        return !q || ba.bankCode?.toLowerCase().includes(q) || ba.accountNumber?.toLowerCase().includes(q) || ba.accountName?.toLowerCase().includes(q)
                      }).length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400">{m.noSourceAccounts}</div>
                      ) : (
                        destAccounts.filter(ba => {
                          const q = destSearch.toLowerCase()
                          return !q || ba.bankCode?.toLowerCase().includes(q) || ba.accountNumber?.toLowerCase().includes(q) || ba.accountName?.toLowerCase().includes(q)
                        }).map(ba => {
                          const id = ba.accountId
                          return (
                            <button key={id} type="button" onMouseDown={e => e.preventDefault()}
                              onClick={() => { selectPayinAccount(id); setDestSearch(getBankLabel(ba)); setDestOpen(false); mark(); clearErr('payinBankAccountId') }}
                              className={clsx(
                                'w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0',
                                payinBankAccountId === id ? 'bg-primary-50' : 'hover:bg-gray-50'
                              )}
                            >
                              <span className="flex-1 min-w-0 flex items-center flex-wrap gap-1.5">
                                <span className={clsx('text-sm font-semibold', payinBankAccountId === id ? 'text-primary-700' : 'text-gray-900')}>
                                  {getBankLabel(ba)}
                                </span>
                                <AccountTypeBadge type={ba.accountType} />
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          </div>

          {/* Destination bank (Transit) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionDestination}</SectionHeader>
            <div className="max-w-md">
              <FormField label={m.fieldDestBankAccount} required error={errors.payoutBankAccountId}>
                <div ref={transitRef} className="relative">
                  <div className={clsx(
                    'flex items-center border rounded-lg bg-white overflow-hidden',
                    errors.payoutBankAccountId ? 'border-red-400' : 'border-gray-200',
                  )}>
                    <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={transitSearch}
                      onChange={e => { setTransitSearch(e.target.value); setPayoutBankAccountId(''); setTransitOpen(true); mark(); clearErr('payoutBankAccountId') }}
                      onFocus={() => setTransitOpen(true)}
                      onBlur={() => setTimeout(() => setTransitOpen(false), 150)}
                      placeholder={loadingTransit ? t.admin.loading : m.placeholderDestBankAccount}
                      disabled={loadingTransit}
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                    />
                    {(transitSearch || payoutBankAccountId) && (
                      <button type="button" onMouseDown={e => e.preventDefault()}
                        onClick={() => { setTransitSearch(''); setPayoutBankAccountId(''); clearErr('payoutBankAccountId') }}
                        className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {transitOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto custom-scrollbar">
                      {transitAccounts.filter(ba => {
                        const q = transitSearch.toLowerCase()
                        return !q || ba.bankCode?.toLowerCase().includes(q) || ba.accountNumber?.toLowerCase().includes(q) || ba.accountName?.toLowerCase().includes(q)
                      }).length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400">{m.noDestAccounts}</div>
                      ) : (
                        transitAccounts.filter(ba => {
                          const q = transitSearch.toLowerCase()
                          return !q || ba.bankCode?.toLowerCase().includes(q) || ba.accountNumber?.toLowerCase().includes(q) || ba.accountName?.toLowerCase().includes(q)
                        }).map(ba => {
                          const id = ba.accountId
                          return (
                            <button key={id} type="button" onMouseDown={e => e.preventDefault()}
                              onClick={() => { setPayoutBankAccountId(id); setTransitSearch(getBankLabel(ba)); setTransitOpen(false); mark(); clearErr('payoutBankAccountId') }}
                              className={clsx(
                                'w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0',
                                payoutBankAccountId === id ? 'bg-primary-50' : 'hover:bg-gray-50'
                              )}
                            >
                              <span className="flex-1 min-w-0 flex items-center flex-wrap gap-1.5">
                                <span className={clsx('text-sm font-semibold', payoutBankAccountId === id ? 'text-primary-700' : 'text-gray-900')}>
                                  {getBankLabel(ba)}
                                </span>
                                <AccountTypeBadge type={ba.accountType} color="purple" />
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionRequestInfo}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <FormField label={t.payOutRequest.fieldRefId}>
                <div className="flex gap-2">
                  <input
                    value={refId}
                    onChange={e => { setRefId(e.target.value); mark() }}
                    placeholder={m.placeholderRefId}
                    className={clsx(inputCls(false), 'flex-1 min-w-0')}
                  />
                  <button
                    type="button"
                    onClick={() => { setRefId(genRefId()); mark() }}
                    title="Re-generate"
                    className="flex-shrink-0 px-2.5 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">YYMMDDHHMMSS</p>
              </FormField>

              <FormField label={m.fieldRequestedAmount} required error={errors.amount}>
                <input
                  value={amount}
                  onChange={e => {
                    const v = e.target.value
                    if (/^\d*\.?\d{0,2}$/.test(v) || v === '') { setAmount(v); mark(); clearErr('amount') }
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

        {/* Footer with two save buttons */}
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push('/business-setup/payment/transfer-request'))}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.admin.cancel}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('continue')}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-60 transition-colors"
          >
            {saving && saveMode === 'continue' && <Spinner />}
            {m.btnSaveAndContinue}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('close')}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {saving && saveMode === 'close' && <Spinner />}
            {t.admin.save}
          </button>
        </div>
      </div>
    </div>
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

function AccountTypeBadge({ type, color = 'blue' }: { type?: string | null; color?: 'blue' | 'purple' }) {
  if (!type) return null
  const isPromptPay = type.toLowerCase() === 'promptpay'
  if (color === 'purple') return (
    <span className="inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-purple-300 text-purple-600 bg-purple-50">
      Transit · {isPromptPay ? 'PromptPay' : 'Native'}
    </span>
  )
  return (
    <span className="inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-blue-300 text-blue-600 bg-blue-50">
      {isPromptPay ? 'PromptPay' : 'Native'}
    </span>
  )
}
