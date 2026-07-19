'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { merchantApi } from '@/lib/api/merchant.api'
import { toast } from 'sonner'
import { ChevronLeft, Mail, Phone, X } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

export default function CreateMerchantPage() {
  const { t } = useLang()
  const m = t.merchant
  const router = useRouter()

  const [orgId, setOrgId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [payInFee, setPayInFee] = useState<string>('0')
  const [payOutFee, setPayOutFee] = useState<string>('0')
  const [payInMin, setPayInMin] = useState<string>('1')
  const [payInMax, setPayInMax] = useState<string>('50000')
  const [payinDailyAmountLimit, setPayinDailyAmountLimit] = useState<string>('0')
  const [payinDailyCountLimit, setPayinDailyCountLimit] = useState<string>('0')
  const [payOutMin, setPayOutMin] = useState<string>('1')
  const [payOutMax, setPayOutMax] = useState<string>('50000')
  const [discardCent, setDiscardCent] = useState(false)
  const [includeGlobalBankAccount, setIncludeGlobalBankAccount] = useState(true)
  const [whitelistNames, setWhitelistNames] = useState<string[]>([])
  const [whitelistInput, setWhitelistInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  const mark = () => { if (!isDirty) setIsDirty(true) }
  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!orgId.trim()) errs.orgId = m.orgIdRequired
    if (!name.trim()) errs.name = m.nameRequired
    if (!email.trim()) errs.email = m.emailRequired
    if (!phone.trim()) errs.phone = m.phoneRequired
    if (payInFee === '' || isNaN(parseFloat(payInFee))) errs.payInFee = m.payInFeeRequired
    if (payOutFee === '' || isNaN(parseFloat(payOutFee))) errs.payOutFee = m.payOutFeeRequired
    if (payInMin === '' || isNaN(parseFloat(payInMin))) errs.payInMin = m.payInMinRequired
    if (payInMax === '' || isNaN(parseFloat(payInMax))) errs.payInMax = m.payInMaxRequired
    if (payOutMin === '' || isNaN(parseFloat(payOutMin))) errs.payOutMin = m.payOutMinRequired
    if (payOutMax === '' || isNaN(parseFloat(payOutMax))) errs.payOutMax = m.payOutMaxRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const toNum = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n }

  const addWhitelistName = () => {
    const v = whitelistInput.trim()
    if (!v) return
    if (whitelistNames.includes(v)) {
      setErrors(p => ({ ...p, whitelist: m.whitelistBankNameDuplicate }))
      return
    }
    setWhitelistNames(p => [...p, v])
    setWhitelistInput('')
    clearErr('whitelist')
    mark()
  }
  const removeWhitelistName = (name: string) => {
    setWhitelistNames(p => p.filter(n => n !== name))
    mark()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await merchantApi.addMerchant({
        OrgCustomId: orgId.trim() || undefined,
        OrgName: name.trim() || undefined,
        OrgType: 'PLEASE-PAYMENT',
        Status: 'Active',
        Merchant: {
          Code: orgId.trim() || undefined,
          Name: name.trim() || undefined,
          ContactEmail: email.trim() || undefined,
          ContactPhone: phone.trim() || undefined,
          PayinFeePct: toNum(payInFee),
          PayoutFeePct: toNum(payOutFee),
          PayinMinAmount: toNum(payInMin),
          PayinMaxAmount: toNum(payInMax),
          PayinDailyTxAmountLimit: toNum(payinDailyAmountLimit),
          PayinDailyTxCountLimit: toNum(payinDailyCountLimit),
          PayoutMinAmount: toNum(payOutMin),
          PayoutMaxAmount: toNum(payOutMax),
          DiscardCent: discardCent,
          IncludeGlobalBankAccount: includeGlobalBankAccount,
          WhitelistBankAccountNamesArr: whitelistNames,
        },
      })
      setIsDirty(false)
      toast.success(m.createdSuccess)
      router.push('/business-setup/merchant')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToCreate)
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
          onClick={() => guardNavigation(() => router.push('/business-setup/merchant'))}
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

          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.merchantInfoSection}</SectionHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Organization ID */}
              <FormField label={m.fieldOrgId} required error={errors.orgId}>
                <input
                  value={orgId}
                  onChange={e => { setOrgId(e.target.value); mark(); clearErr('orgId') }}
                  placeholder={m.fieldOrgIdPlaceholder}
                  className={inputCls(!!errors.orgId)}
                />
              </FormField>

              {/* Merchant Name */}
              <FormField label={m.fieldName} required error={errors.name}>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); mark(); clearErr('name') }}
                  placeholder={m.fieldNamePlaceholder}
                  className={inputCls(!!errors.name)}
                />
              </FormField>

              {/* Contact Email */}
              <FormField label={m.fieldEmail} required error={errors.email}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); mark(); clearErr('email') }}
                    placeholder={m.fieldEmailPlaceholder}
                    className={clsx(inputCls(!!errors.email), 'pl-9')}
                  />
                </div>
              </FormField>

              {/* Contact Phone */}
              <FormField label={m.fieldPhone} required error={errors.phone}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    value={phone}
                    onChange={e => { setPhone(e.target.value); mark(); clearErr('phone') }}
                    placeholder={m.fieldPhonePlaceholder}
                    className={clsx(inputCls(!!errors.phone), 'pl-9')}
                  />
                </div>
              </FormField>

            </div>
          </div>

          {/* Fee Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={m.fieldPayInFee} required error={errors.payInFee}>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={payInFee}
                    onChange={e => { setPayInFee(e.target.value); mark(); clearErr('payInFee') }}
                    className={clsx(inputCls(!!errors.payInFee), 'pr-8')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                </div>
              </FormField>

              <FormField label={m.fieldPayOutFee} required error={errors.payOutFee}>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={payOutFee}
                    onChange={e => { setPayOutFee(e.target.value); mark(); clearErr('payOutFee') }}
                    className={clsx(inputCls(!!errors.payOutFee), 'pr-8')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                </div>
              </FormField>
            </div>

            {/* Discard Cent / Include Global Bank Account */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={discardCent}
                  onChange={e => { setDiscardCent(e.target.checked); mark() }}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-700">{m.fieldDiscardCent}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{m.fieldDiscardCentHint}</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeGlobalBankAccount}
                  onChange={e => { setIncludeGlobalBankAccount(e.target.checked); mark() }}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-700">{m.fieldIncludeGlobalBankAccount}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{m.fieldIncludeGlobalBankAccountHint}</p>
                </div>
              </label>
            </div>

            <div className="border-t border-gray-100 mt-5 pt-5">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">{m.sectionTransactionLimits}</p>

              {/* Pay-in limits */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-3">{m.fieldPayIn}</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={m.fieldMinAmount} required error={errors.payInMin}>
                    <input
                      type="number"
                      min={0}
                      value={payInMin}
                      onChange={e => { setPayInMin(e.target.value); mark(); clearErr('payInMin') }}
                      className={inputCls(!!errors.payInMin)}
                    />
                  </FormField>
                  <FormField label={m.fieldMaxAmount} required error={errors.payInMax}>
                    <input
                      type="number"
                      min={0}
                      value={payInMax}
                      onChange={e => { setPayInMax(e.target.value); mark(); clearErr('payInMax') }}
                      className={inputCls(!!errors.payInMax)}
                    />
                  </FormField>
                  <FormField label={m.fieldPayinDailyTxAmountLimit}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={payinDailyAmountLimit}
                      onChange={e => { setPayinDailyAmountLimit(e.target.value); mark() }}
                      className={inputCls(false)}
                    />
                    <p className="text-xs text-gray-400 mt-1">{m.hintZeroNoLimit}</p>
                  </FormField>
                  <FormField label={m.fieldPayinDailyTxCountLimit}>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={payinDailyCountLimit}
                      onChange={e => { setPayinDailyCountLimit(e.target.value); mark() }}
                      className={inputCls(false)}
                    />
                    <p className="text-xs text-gray-400 mt-1">{m.hintZeroNoLimit}</p>
                  </FormField>
                </div>
              </div>

              {/* Pay-out limits */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">{m.fieldPayOut}</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label={m.fieldMinAmount} required error={errors.payOutMin}>
                    <input
                      type="number"
                      min={0}
                      value={payOutMin}
                      onChange={e => { setPayOutMin(e.target.value); mark(); clearErr('payOutMin') }}
                      className={inputCls(!!errors.payOutMin)}
                    />
                  </FormField>
                  <FormField label={m.fieldMaxAmount} required error={errors.payOutMax}>
                    <input
                      type="number"
                      min={0}
                      value={payOutMax}
                      onChange={e => { setPayOutMax(e.target.value); mark(); clearErr('payOutMax') }}
                      className={inputCls(!!errors.payOutMax)}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Whitelist Bank Account Names */}
            <div className="border-t border-gray-100 mt-5 pt-5">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{m.sectionWhitelistBankNames}</p>
                <span className="text-[11px] text-gray-400 normal-case tracking-normal">{m.sectionWhitelistBankNamesHint}</span>
              </div>

              {whitelistNames.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {whitelistNames.map(n => (
                    <div key={n} className="flex items-center justify-between gap-2 px-3.5 py-2.5 border border-gray-200 rounded-lg bg-white">
                      <span className="text-sm text-gray-700">{n}</span>
                      <button
                        type="button"
                        onClick={() => removeWhitelistName(n)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={whitelistInput}
                  onChange={e => { setWhitelistInput(e.target.value); clearErr('whitelist') }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWhitelistName() } }}
                  placeholder={m.whitelistBankNamePlaceholder}
                  className={inputCls(!!errors.whitelist)}
                />
                <button
                  type="button"
                  onClick={addWhitelistName}
                  className="px-4 py-2.5 text-sm font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors flex-shrink-0"
                >
                  {m.whitelistBankNameAdd}
                </button>
              </div>
              {errors.whitelist && <p className="text-red-500 text-xs mt-1">{errors.whitelist}</p>}
            </div>
          </div>

        </div>

        {/* Sticky footer */}
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push('/business-setup/merchant'))}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.admin.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? t.admin.saving : m.createMerchantBtn}
          </button>
        </div>
      </form>
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

const inputCls = (hasError: boolean) =>
  clsx(
    'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
  )
