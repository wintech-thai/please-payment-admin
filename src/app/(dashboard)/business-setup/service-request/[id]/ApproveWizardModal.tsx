'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Mail, Phone, X, ChevronRight, ChevronLeft as ChevronLeftIcon, Check } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import type { ServiceRequestItem, PaymentGatewayItem } from '@/lib/api/types'
import { serviceRequestApi } from '@/lib/api/service-request.api'
import { paymentGatewayApi } from '@/lib/api/payment-gateway.api'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function FormField({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-gray-400 normal-case tracking-normal">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

const inputCls = (hasError: boolean, locked?: boolean) =>
  clsx(
    'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors',
    locked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
  )

const toNum = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n }

export default function ApproveWizardModal({ item, onClose, onSuccess, m, tMerchant, tBankAccount, cancelLabel }: {
  item: ServiceRequestItem
  onClose: () => void
  onSuccess: (signupLink: string) => void
  m: any
  tMerchant: any
  tBankAccount: any
  cancelLabel: string
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1 — Merchant
  const [name, setName] = useState(item.shopCode ?? '')
  const [email, setEmail] = useState(item.email ?? '')
  const [phone, setPhone] = useState(item.phone ?? '')
  // หน้านี้ใช้สำหรับ merchant ที่เป็น MerchantOwn เท่านั้น ไม่ต้องให้เลือก custody type แล้ว
  const payInBankCustodyType = 'MerchantOwn'
  const [payInFee, setPayInFee] = useState('0')
  const [payOutFee, setPayOutFee] = useState('0')
  const [payInMin, setPayInMin] = useState('1')
  const [payInMax, setPayInMax] = useState('50000')
  const [payOutMin, setPayOutMin] = useState('1')
  const [payOutMax, setPayOutMax] = useState('50000')
  const [payinExpireMinute, setPayinExpireMinute] = useState('15')

  // Payment Gateway เลือกได้จากหน้านี้ (ไม่บังคับ)
  const [paymentGateways, setPaymentGateways] = useState<PaymentGatewayItem[]>([])
  const [paymentGatewayId, setPaymentGatewayId] = useState('')
  const [paymentGatewayQuery, setPaymentGatewayQuery] = useState('')
  const [paymentGatewayDropdownOpen, setPaymentGatewayDropdownOpen] = useState(false)
  const paymentGatewayDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    paymentGatewayApi.getPaymentGateways({ Limit: 200 })
      .then(res => {
        const raw = res.data as any
        setPaymentGateways(Array.isArray(raw) ? raw : (raw?.paymentGateways ?? raw?.items ?? []))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (paymentGatewayDropdownRef.current && !paymentGatewayDropdownRef.current.contains(e.target as Node)) setPaymentGatewayDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedPaymentGateway = paymentGateways.find(p => p.id === paymentGatewayId)
  const filteredPaymentGateways = useMemo(() => {
    if (!paymentGatewayQuery) return paymentGateways
    const q = paymentGatewayQuery.toLowerCase()
    return paymentGateways.filter(p => p.code?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  }, [paymentGateways, paymentGatewayQuery])

  // Step 2 — Bank Account (locked fields prefilled from the service request)
  const isPromptPay = !!item.promptPayId?.trim()
  const [baPayInMin, setBaPayInMin] = useState('10')
  const [baPayInMax, setBaPayInMax] = useState('1000')
  const [baPayOutMin, setBaPayOutMin] = useState('10')
  const [baPayOutMax, setBaPayOutMax] = useState('1000')

  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const validateStep1 = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = tMerchant.nameRequired
    if (!email.trim()) errs.email = tMerchant.emailRequired
    if (!phone.trim()) errs.phone = tMerchant.phoneRequired
    if (payInFee === '' || isNaN(parseFloat(payInFee))) errs.payInFee = tMerchant.payInFeeRequired
    if (payOutFee === '' || isNaN(parseFloat(payOutFee))) errs.payOutFee = tMerchant.payOutFeeRequired
    if (payInMin === '' || isNaN(parseFloat(payInMin))) errs.payInMin = tMerchant.payInMinRequired
    if (payInMax === '' || isNaN(parseFloat(payInMax))) errs.payInMax = tMerchant.payInMaxRequired
    if (payOutMin === '' || isNaN(parseFloat(payOutMin))) errs.payOutMin = tMerchant.payOutMinRequired
    if (payOutMax === '' || isNaN(parseFloat(payOutMax))) errs.payOutMax = tMerchant.payOutMaxRequired
    const expireVal = parseInt(payinExpireMinute)
    if (isNaN(expireVal) || expireVal < 5 || expireVal > 60) errs.payinExpireMinute = tMerchant.payinExpireMinuteInvalid
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    const errs: Record<string, string> = {}
    if (baPayInMin === '' || isNaN(parseInt(baPayInMin, 10))) errs.baPayInMin = tBankAccount.payInMinRequired
    if (baPayInMax === '' || isNaN(parseInt(baPayInMax, 10))) errs.baPayInMax = tBankAccount.payInMaxRequired
    if (baPayOutMin === '' || isNaN(parseInt(baPayOutMin, 10))) errs.baPayOutMin = tBankAccount.payOutMinRequired
    if (baPayOutMax === '' || isNaN(parseInt(baPayOutMax, 10))) errs.baPayOutMax = tBankAccount.payOutMaxRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const goNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setErrors({})
    setStep(s => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))
  }
  const goPrev = () => { setErrors({}); setStep(s => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s)) }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) { setStep(!validateStep1() ? 1 : 2); return }
    setSubmitting(true)
    try {
      const res = await serviceRequestApi.approveServiceRequestById(
        item.id!,
        {
          OrgCustomId: item.shopCode ?? undefined,
          OrgName: name.trim(),
          OrgType: 'PLEASE-PAYMENT',
          Status: 'Active',
          Merchant: {
            Code: item.shopCode ?? undefined,
            Name: name.trim(),
            ContactEmail: email.trim(),
            ContactPhone: phone.trim(),
            PayinFeePct: toNum(payInFee),
            PayoutFeePct: toNum(payOutFee),
            PayinMinAmount: toNum(payInMin),
            PayinMaxAmount: toNum(payInMax),
            PayoutMinAmount: toNum(payOutMin),
            PayoutMaxAmount: toNum(payOutMax),
            PayinExpireMinute: parseInt(payinExpireMinute),
            PayInBankCustodyType: payInBankCustodyType,
            PaymentGatewayId: paymentGatewayId || undefined,
          },
        },
        {
          BankCode: item.bankCode ?? undefined,
          AccountNumber: item.bankAccountNumber ?? undefined,
          AccountName: item.bankAccountName ?? undefined,
          PromptPayId: isPromptPay ? (item.promptPayId ?? undefined) : undefined,
          AccountType: isPromptPay ? 'PromptPay' : 'Native',
          AccountCategory: 'PayIn',
          AccountLevel: 'Selected',
          CustodyType: 'MerchantOwn',
          PayinMinAmount: parseInt(baPayInMin, 10),
          PayinMaxAmount: parseInt(baPayInMax, 10),
          PayoutMinAmount: parseInt(baPayOutMin, 10),
          PayoutMaxAmount: parseInt(baPayOutMax, 10),
        }
      )
      const data = res.data as any
      if (data?.status === 'OK' || data?.Status === 'OK') {
        toast.success(m.approveSuccess)
        onSuccess(data.registrationLink ?? data.RegistrationLink ?? '')
      } else {
        toast.error(data?.description ?? data?.Description ?? m.approveFailed)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.approveFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const steps = [m.wizardStepMerchant, m.wizardStepBankAccount, m.wizardStepSummary]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl bg-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900">{m.wizardApproveTitle}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-50 flex-shrink-0">
          {steps.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3
            const active = step === n
            const done = step > n
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
                )}>
                  {done ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <span className={clsx('text-xs font-semibold', active ? 'text-gray-900' : 'text-gray-400')}>{label}</span>
                {n < 3 && <div className="flex-1 h-px bg-gray-100" />}
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-4">
              <SectionHeader>{m.wizardStepMerchant}</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={tMerchant.fieldOrgId} hint={m.wizardLockedFromRequest}>
                  <input value={item.shopCode ?? ''} disabled className={inputCls(false, true)} />
                </FormField>
                <FormField label={tMerchant.fieldName} required error={errors.name}>
                  <input value={name} onChange={e => { setName(e.target.value); clearErr('name') }} className={inputCls(!!errors.name)} />
                </FormField>
                <FormField label={tMerchant.fieldEmail} required error={errors.email}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type="email" value={email} onChange={e => { setEmail(e.target.value); clearErr('email') }} className={clsx(inputCls(!!errors.email), 'pl-9')} />
                  </div>
                </FormField>
                <FormField label={tMerchant.fieldPhone} required error={errors.phone}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input value={phone} onChange={e => { setPhone(e.target.value); clearErr('phone') }} className={clsx(inputCls(!!errors.phone), 'pl-9')} />
                  </div>
                </FormField>
                <FormField label={tMerchant.fieldPayInBankCustodyType} hint={m.wizardLockedFromRequest}>
                  <input value={tMerchant.custodyTypeMerchantOwn} disabled className={inputCls(false, true)} />
                </FormField>
                <FormField label={tMerchant.fieldPaymentGateway}>
                  <div ref={paymentGatewayDropdownRef} className="relative">
                    <div className={clsx(inputCls(false), 'flex items-center gap-2 cursor-text')} onClick={() => setPaymentGatewayDropdownOpen(true)}>
                      {paymentGatewayId && selectedPaymentGateway ? (
                        <>
                          <span className="flex-1 truncate">
                            {selectedPaymentGateway.code}
                            {selectedPaymentGateway.description && <span className="text-gray-400"> — {selectedPaymentGateway.description}</span>}
                          </span>
                          <button type="button" onClick={e => { e.stopPropagation(); setPaymentGatewayId(''); setPaymentGatewayQuery('') }} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={paymentGatewayQuery}
                          onChange={e => { setPaymentGatewayQuery(e.target.value); setPaymentGatewayDropdownOpen(true) }}
                          onFocus={() => setPaymentGatewayDropdownOpen(true)}
                          placeholder={tMerchant.fieldPaymentGatewayPlaceholder}
                          className="flex-1 outline-none bg-transparent"
                        />
                      )}
                    </div>
                    {paymentGatewayDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {filteredPaymentGateways.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-400">{tMerchant.noPaymentGatewayFound}</div>
                        ) : (
                          filteredPaymentGateways.map(p => (
                            <div
                              key={p.id}
                              onMouseDown={e => { e.preventDefault(); setPaymentGatewayId(p.id); setPaymentGatewayQuery(''); setPaymentGatewayDropdownOpen(false) }}
                              className={clsx('flex flex-col gap-0.5 px-4 py-2.5 text-sm cursor-pointer hover:bg-primary-50 transition-colors', paymentGatewayId === p.id && 'bg-primary-50 text-primary-700 font-medium')}
                            >
                              <span className="font-semibold truncate">{p.code}</span>
                              {p.description && <span className="text-xs text-gray-400 truncate">{p.description}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </FormField>
                <FormField label={tMerchant.fieldPayinExpireMinute} error={errors.payinExpireMinute}>
                  <input type="number" min={5} max={60} value={payinExpireMinute} onChange={e => { setPayinExpireMinute(e.target.value); clearErr('payinExpireMinute') }} className={inputCls(!!errors.payinExpireMinute)} />
                </FormField>
                <FormField label={tMerchant.fieldPayInFee} required error={errors.payInFee}>
                  <input type="number" min={0} step={0.01} value={payInFee} onChange={e => { setPayInFee(e.target.value); clearErr('payInFee') }} className={inputCls(!!errors.payInFee)} />
                </FormField>
                <FormField label={tMerchant.fieldPayOutFee} required error={errors.payOutFee}>
                  <input type="number" min={0} step={0.01} value={payOutFee} onChange={e => { setPayOutFee(e.target.value); clearErr('payOutFee') }} className={inputCls(!!errors.payOutFee)} />
                </FormField>
                <FormField label={`${tMerchant.fieldPayIn} ${tMerchant.fieldMinAmount}`} required error={errors.payInMin}>
                  <input type="number" min={0} value={payInMin} onChange={e => { setPayInMin(e.target.value); clearErr('payInMin') }} className={inputCls(!!errors.payInMin)} />
                </FormField>
                <FormField label={`${tMerchant.fieldPayIn} ${tMerchant.fieldMaxAmount}`} required error={errors.payInMax}>
                  <input type="number" min={0} value={payInMax} onChange={e => { setPayInMax(e.target.value); clearErr('payInMax') }} className={inputCls(!!errors.payInMax)} />
                </FormField>
                <FormField label={`${tMerchant.fieldPayOut} ${tMerchant.fieldMinAmount}`} required error={errors.payOutMin}>
                  <input type="number" min={0} value={payOutMin} onChange={e => { setPayOutMin(e.target.value); clearErr('payOutMin') }} className={inputCls(!!errors.payOutMin)} />
                </FormField>
                <FormField label={`${tMerchant.fieldPayOut} ${tMerchant.fieldMaxAmount}`} required error={errors.payOutMax}>
                  <input type="number" min={0} value={payOutMax} onChange={e => { setPayOutMax(e.target.value); clearErr('payOutMax') }} className={inputCls(!!errors.payOutMax)} />
                </FormField>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <SectionHeader>{m.wizardStepBankAccount}</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={tBankAccount.fieldBank} hint={m.wizardLockedFromRequest}>
                  <input value={item.bankCode ?? ''} disabled className={inputCls(false, true)} />
                </FormField>
                <FormField label={tBankAccount.fieldAccountNumber} hint={m.wizardLockedFromRequest}>
                  <input value={item.bankAccountNumber ?? ''} disabled className={inputCls(false, true)} />
                </FormField>
                <FormField label={tBankAccount.fieldAccountName} hint={m.wizardLockedFromRequest}>
                  <input value={item.bankAccountName ?? ''} disabled className={inputCls(false, true)} />
                </FormField>
                {isPromptPay && (
                  <FormField label={tBankAccount.fieldPromptPayId} hint={m.wizardLockedFromRequest}>
                    <input value={item.promptPayId ?? ''} disabled className={inputCls(false, true)} />
                  </FormField>
                )}
                <FormField label={tBankAccount.fieldAccountLevel} hint={m.wizardLockedFromRequest}>
                  <input value="Selected" disabled className={inputCls(false, true)} />
                </FormField>
                <FormField label={tBankAccount.fieldCustodyType} hint={m.wizardLockedFromRequest}>
                  <input value={tMerchant.custodyTypeMerchantOwn} disabled className={inputCls(false, true)} />
                </FormField>
                <FormField label={tBankAccount.fieldPayInMin} required error={errors.baPayInMin}>
                  <input type="number" min={0} value={baPayInMin} onChange={e => { setBaPayInMin(e.target.value); clearErr('baPayInMin') }} className={inputCls(!!errors.baPayInMin)} />
                </FormField>
                <FormField label={tBankAccount.fieldPayInMax} required error={errors.baPayInMax}>
                  <input type="number" min={0} value={baPayInMax} onChange={e => { setBaPayInMax(e.target.value); clearErr('baPayInMax') }} className={inputCls(!!errors.baPayInMax)} />
                </FormField>
                <FormField label={tBankAccount.fieldPayOutMin} required error={errors.baPayOutMin}>
                  <input type="number" min={0} value={baPayOutMin} onChange={e => { setBaPayOutMin(e.target.value); clearErr('baPayOutMin') }} className={inputCls(!!errors.baPayOutMin)} />
                </FormField>
                <FormField label={tBankAccount.fieldPayOutMax} required error={errors.baPayOutMax}>
                  <input type="number" min={0} value={baPayOutMax} onChange={e => { setBaPayOutMax(e.target.value); clearErr('baPayOutMax') }} className={inputCls(!!errors.baPayOutMax)} />
                </FormField>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <SectionHeader>{m.wizardStepSummary}</SectionHeader>
              <div className="rounded-xl border border-gray-100 p-4 space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{m.wizardStepMerchant}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-400">{tMerchant.fieldOrgId}</span><span className="text-gray-800 font-medium">{item.shopCode}</span>
                  <span className="text-gray-400">{tMerchant.fieldName}</span><span className="text-gray-800 font-medium">{name}</span>
                  <span className="text-gray-400">{tMerchant.fieldEmail}</span><span className="text-gray-800 font-medium">{email}</span>
                  <span className="text-gray-400">{tMerchant.fieldPhone}</span><span className="text-gray-800 font-medium">{phone}</span>
                  <span className="text-gray-400">{tMerchant.fieldPayInBankCustodyType}</span><span className="text-gray-800 font-medium">{tMerchant.custodyTypeMerchantOwn}</span>
                  {selectedPaymentGateway && (
                    <><span className="text-gray-400">{tMerchant.fieldPaymentGateway}</span><span className="text-gray-800 font-medium">{selectedPaymentGateway.code}</span></>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{m.wizardStepBankAccount}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-400">{tBankAccount.fieldBank}</span><span className="text-gray-800 font-medium">{item.bankCode} {item.bankAccountNumber}</span>
                  <span className="text-gray-400">{tBankAccount.fieldAccountName}</span><span className="text-gray-800 font-medium">{item.bankAccountName}</span>
                  <span className="text-gray-400">{tBankAccount.fieldAccountLevel}</span><span className="text-gray-800 font-medium">Selected</span>
                  <span className="text-gray-400">{tBankAccount.fieldCustodyType}</span><span className="text-gray-800 font-medium">{tMerchant.custodyTypeMerchantOwn}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {step > 1 ? (
            <button onClick={goPrev} disabled={submitting} className="flex items-center gap-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60">
              <ChevronLeftIcon className="w-4 h-4" />
              {m.wizardPrevious}
            </button>
          ) : (
            <button onClick={onClose} disabled={submitting} className="px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60">
              {cancelLabel}
            </button>
          )}
          <div className="ml-auto">
            {step < 3 ? (
              <button onClick={goNext} className="flex items-center gap-1 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors">
                {m.wizardNext}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                {submitting ? '...' : m.wizardSubmit}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
