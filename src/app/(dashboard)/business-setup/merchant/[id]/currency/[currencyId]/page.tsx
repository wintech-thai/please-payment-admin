'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { currencyApi } from '@/lib/api/currency.api'
import type { AvailableCurrencyItem, MerchantCurrencyItem, CurrencyCategory, AddMerchantCurrencyPayload, UpdateMerchantCurrencyPayload } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'
import CurrencyLogo from '@/components/CurrencyLogo'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">{label}</label>
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

const readOnlyCls = 'w-full px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed focus:outline-none'

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <span
        className={clsx(
          'mt-0.5 inline-flex flex-shrink-0 items-center w-10 h-6 rounded-full p-1 transition-colors',
          checked ? 'bg-primary-600 justify-end' : 'bg-gray-300 justify-start'
        )}
      >
        <span className="block w-4 h-4 bg-white rounded-full shadow-sm" />
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
      </span>
    </div>
  )
}

type Section = 'PAYIN' | 'PAYOUT' | 'INFO'

export default function CurrencyFormPage() {
  const { t } = useLang()
  const c = t.currency
  const m = t.merchant
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const merchantId = params.id as string
  const currencyId = params.currencyId as string
  const isNew = currencyId === 'new'
  const initialCategory = (searchParams.get('category')?.toUpperCase() === 'CRYPTO' ? 'CRYPTO' : 'FIAT') as CurrencyCategory

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<Section>('PAYIN')
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  // Step 1 (new mode only): currency selection
  const [available, setAvailable] = useState<AvailableCurrencyItem[]>([])
  const [existingCodes, setExistingCodes] = useState<string[]>([])
  const [selected, setSelected] = useState<AvailableCurrencyItem | null>(null)

  // Existing record (edit mode)
  const [record, setRecord] = useState<MerchantCurrencyItem | null>(null)

  // Form fields
  const [payinFeePct, setPayinFeePct] = useState('0')
  const [payinMin, setPayinMin] = useState('0')
  const [payinMax, setPayinMax] = useState('0')
  const [payinDiscardCent, setPayinDiscardCent] = useState(false)
  const [payinIncludeGlobalBankAccount, setPayinIncludeGlobalBankAccount] = useState(true)
  const [payinRandomDecimal, setPayinRandomDecimal] = useState(false)
  const [payinDailyAmountLimit, setPayinDailyAmountLimit] = useState('0')
  const [payinDailyCountLimit, setPayinDailyCountLimit] = useState('0')
  const [payinExpireMinute, setPayinExpireMinute] = useState('15')
  const [whitelistNames, setWhitelistNames] = useState<string[]>([])
  const [whitelistInput, setWhitelistInput] = useState('')
  const [payoutFeePct, setPayoutFeePct] = useState('0')
  const [payoutMin, setPayoutMin] = useState('0')
  const [payoutMax, setPayoutMax] = useState('0')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const applyRecordToForm = (r: MerchantCurrencyItem) => {
    setPayinFeePct(r.payinFeePct != null ? String(r.payinFeePct) : '0')
    setPayinMin(r.payinMinAmount != null ? String(r.payinMinAmount) : '0')
    setPayinMax(r.payinMaxAmount != null ? String(r.payinMaxAmount) : '0')
    setPayinDiscardCent(!!r.payinDiscardCent)
    setPayinIncludeGlobalBankAccount(r.payinIncludeGlobalBankAccount ?? true)
    setPayinRandomDecimal(!!r.payinRandomDecimal)
    setPayinDailyAmountLimit(r.payinDailyTxAmountLimit != null ? String(r.payinDailyTxAmountLimit) : '0')
    setPayinDailyCountLimit(r.payinDailyTxCountLimit != null ? String(r.payinDailyTxCountLimit) : '0')
    setPayinExpireMinute(r.payinExpireMinute != null ? String(r.payinExpireMinute) : '15')
    try {
      const parsed = r.payinWhitelistBankAccountNames ? JSON.parse(r.payinWhitelistBankAccountNames) : []
      setWhitelistNames(Array.isArray(parsed) ? parsed : [])
    } catch {
      setWhitelistNames([])
    }
    setPayoutFeePct(r.payoutFeePct != null ? String(r.payoutFeePct) : '0')
    setPayoutMin(r.payoutMinAmount != null ? String(r.payoutMinAmount) : '0')
    setPayoutMax(r.payoutMaxAmount != null ? String(r.payoutMaxAmount) : '0')
  }

  const loadEdit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await currencyApi.getCurrencyById(currencyId)
      const data = res.data as any
      const status = data?.Status ?? data?.status
      const mc: MerchantCurrencyItem | null = data?.MerchantCurrency ?? data?.merchantCurrency ?? null
      if (status !== 'OK' || !mc) {
        toast.error(c.toastFailedToLoadCurrency)
        router.push(`/business-setup/merchant/${merchantId}/currency`)
        return
      }
      setRecord(mc)
      applyRecordToForm(mc)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : c.toastFailedToLoadCurrency)
      router.push(`/business-setup/merchant/${merchantId}/currency`)
    } finally {
      setLoading(false)
    }
  }, [currencyId, merchantId])

  const loadAvailable = useCallback(async () => {
    setLoading(true)
    try {
      const [availRes, existingRes] = await Promise.all([
        initialCategory === 'CRYPTO' ? currencyApi.getAvailableCryptoCurrencies() : currencyApi.getAvailableFiatCurrencies(),
        currencyApi.getCurrenciesByMerchantId(merchantId),
      ])
      setAvailable(Array.isArray(availRes.data) ? availRes.data : [])
      const existing = Array.isArray(existingRes.data) ? existingRes.data : []
      setExistingCodes(existing.map(e => (e.currency ?? '').toUpperCase()))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : c.failedToLoadAvailable)
    } finally {
      setLoading(false)
    }
  }, [initialCategory, merchantId])

  useEffect(() => {
    if (isNew) loadAvailable()
    else loadEdit()
  }, [isNew, loadAvailable, loadEdit])

  const selectableCurrencies = useMemo(
    () => available.filter(a => !existingCodes.includes((a.currencyCoode ?? '').toUpperCase())),
    [available, existingCodes]
  )

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
    markDirty()
  }
  const removeWhitelistName = (name: string) => {
    setWhitelistNames(p => p.filter(n => n !== name))
    markDirty()
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    const expireVal = parseInt(payinExpireMinute)
    if (isNaN(expireVal) || expireVal < 5 || expireVal > 60) errs.payinExpireMinute = m.payinExpireMinuteInvalid
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const buildPayload = (): UpdateMerchantCurrencyPayload => ({
    PayinFeePct: parseFloat(payinFeePct) || 0,
    PayinMinAmount: parseFloat(payinMin) || 0,
    PayinMaxAmount: parseFloat(payinMax) || 0,
    PayinDiscardCent: payinDiscardCent,
    PayinIncludeGlobalBankAccount: payinIncludeGlobalBankAccount,
    PayinWhitelistBankAccountNames: JSON.stringify(whitelistNames),
    PayinRandomDecimal: payinRandomDecimal,
    PayinDailyTxAmountLimit: parseFloat(payinDailyAmountLimit) || 0,
    PayinDailyTxCountLimit: parseFloat(payinDailyCountLimit) || 0,
    PayinExpireMinute: parseInt(payinExpireMinute) || 15,
    PayoutFeePct: parseFloat(payoutFeePct) || 0,
    PayoutMinAmount: parseFloat(payoutMin) || 0,
    PayoutMaxAmount: parseFloat(payoutMax) || 0,
  })

  const goBackToList = () => router.push(`/business-setup/merchant/${merchantId}/currency`)

  const handleSave = async () => {
    if (!validate()) return

    if (isNew) {
      if (!selected) return
      setSaving(true)
      try {
        const payload: AddMerchantCurrencyPayload = {
          MerchantId: merchantId,
          Currency: selected.currencyCoode ?? '',
          ...buildPayload(),
        }
        const res = await currencyApi.addCurrency(payload)
        const data = res.data as any
        const status = data?.Status ?? data?.status
        if (status !== 'OK') {
          toast.error(data?.Description ?? data?.description ?? c.toastFailedToAdd)
          return
        }
        toast.success(c.toastAdded)
        goBackToList()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : c.toastFailedToAdd)
      } finally {
        setSaving(false)
      }
      return
    }

    if (!isDirty) {
      goBackToList()
      return
    }

    setSaving(true)
    try {
      const res = await currencyApi.updateCurrencyById(currencyId, buildPayload())
      const data = res.data as any
      const status = data?.Status ?? data?.status
      if (status !== 'OK') {
        toast.error(data?.Description ?? data?.description ?? c.toastFailedToUpdate)
        return
      }
      toast.success(c.toastUpdated)
      goBackToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : c.toastFailedToUpdate)
    } finally {
      setSaving(false)
    }
  }

  const previewCode = isNew ? selected?.currencyCoode : record?.currency
  const previewName = isNew ? selected?.currencyName : record?.currencyName
  const hasPreview = isNew ? !!selected : !!record

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(goBackToList)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? c.addCurrencyTitle : c.editCurrencyTitle}</h1>
          {hasPreview && (
            <div className="flex items-center gap-2 mt-1">
              <CurrencyLogo code={previewCode} category={isNew ? initialCategory : record?.currencyCategory} size={18} />
              <p className="text-sm text-gray-500">
                {previewCode} · {previewName}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : isNew && !selected ? (
          /* Step 1: pick a currency */
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{c.selectCurrencyTitle}</SectionHeader>
            <p className="text-sm text-gray-500 -mt-3 mb-5">{c.selectCurrencySubtitle}</p>
            {selectableCurrencies.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{c.noAvailableCurrencies}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectableCurrencies.map(item => (
                  <button
                    key={item.currencyCoode}
                    onClick={() => setSelected(item)}
                    className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors text-left"
                  >
                    <CurrencyLogo code={item.currencyCoode} category={item.category} size={28} />
                    <span>
                      <span className="block text-sm font-bold text-gray-800">{item.currencyCoode}</span>
                      <span className="block text-xs text-gray-500">{item.currencyName}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {isNew && (
              <div className="flex-none rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
                {c.currencyLockedHint}
              </div>
            )}

            {/* Section tabs */}
            <div className="flex-none flex gap-1">
              {(['PAYIN', 'PAYOUT', ...(isNew ? [] : ['INFO'])] as Section[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={clsx('px-4 py-1.5 text-sm font-semibold rounded-full transition-colors', section === s ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 border border-gray-200 hover:bg-gray-50')}
                >
                  {s === 'PAYIN' ? c.sectionPayIn : s === 'PAYOUT' ? c.sectionPayOut : c.sectionInfo}
                </button>
              ))}
            </div>

            {section === 'PAYIN' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label={c.fieldPayInFee}>
                    <input type="number" min={0} step={0.01} value={payinFeePct} onChange={e => { setPayinFeePct(e.target.value); markDirty() }} className={inputCls(false)} />
                  </FormField>
                  <FormField label={m.fieldPayinExpireMinute} error={errors.payinExpireMinute}>
                    <input type="number" min={5} max={60} value={payinExpireMinute} onChange={e => { setPayinExpireMinute(e.target.value); markDirty(); clearErr('payinExpireMinute') }} className={inputCls(!!errors.payinExpireMinute)} />
                  </FormField>
                  <FormField label={c.fieldPayInMin}>
                    <input type="number" min={0} value={payinMin} onChange={e => { setPayinMin(e.target.value); markDirty() }} className={inputCls(false)} />
                  </FormField>
                  <FormField label={c.fieldPayInMax}>
                    <input type="number" min={0} value={payinMax} onChange={e => { setPayinMax(e.target.value); markDirty() }} className={inputCls(false)} />
                  </FormField>
                  <FormField label={m.fieldPayinDailyTxAmountLimit}>
                    <input type="number" min={0} value={payinDailyAmountLimit} onChange={e => { setPayinDailyAmountLimit(e.target.value); markDirty() }} className={inputCls(false)} placeholder={m.hintZeroNoLimit} />
                  </FormField>
                  <FormField label={m.fieldPayinDailyTxCountLimit}>
                    <input type="number" min={0} value={payinDailyCountLimit} onChange={e => { setPayinDailyCountLimit(e.target.value); markDirty() }} className={inputCls(false)} placeholder={m.hintZeroNoLimit} />
                  </FormField>
                </div>

                <div className="flex flex-col gap-4">
                  <Toggle checked={payinDiscardCent} onChange={v => { setPayinDiscardCent(v); markDirty() }} label={c.fieldDiscardCent} hint={m.fieldDiscardCentHint} />
                  <Toggle checked={payinIncludeGlobalBankAccount} onChange={v => { setPayinIncludeGlobalBankAccount(v); markDirty() }} label={c.fieldIncludeGlobalBankAccount} hint={m.fieldIncludeGlobalBankAccountHint} />
                  <Toggle checked={payinRandomDecimal} onChange={v => { setPayinRandomDecimal(v); markDirty() }} label={c.fieldPayinRandomDecimal} />
                </div>

                <div>
                  <SectionHeader>{m.sectionWhitelistBankNames}</SectionHeader>
                  <p className="text-xs text-gray-400 -mt-3 mb-3">{m.sectionWhitelistBankNamesHint}</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={whitelistInput}
                      onChange={e => setWhitelistInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWhitelistName() } }}
                      placeholder={m.whitelistBankNamePlaceholder}
                      className={inputCls(!!errors.whitelist)}
                    />
                    <button type="button" onClick={addWhitelistName} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex-shrink-0">
                      {m.whitelistBankNameAdd}
                    </button>
                  </div>
                  {errors.whitelist && <p className="text-red-500 text-xs -mt-2 mb-3">{errors.whitelist}</p>}
                  {whitelistNames.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {whitelistNames.map(n => (
                        <span key={n} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {n}
                          <button type="button" onClick={() => removeWhitelistName(n)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === 'PAYOUT' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label={c.fieldPayOutFee}>
                    <input type="number" min={0} step={0.01} value={payoutFeePct} onChange={e => { setPayoutFeePct(e.target.value); markDirty() }} className={inputCls(false)} />
                  </FormField>
                  <div />
                  <FormField label={c.fieldPayOutMin}>
                    <input type="number" min={0} value={payoutMin} onChange={e => { setPayoutMin(e.target.value); markDirty() }} className={inputCls(false)} />
                  </FormField>
                  <FormField label={c.fieldPayOutMax}>
                    <input type="number" min={0} value={payoutMax} onChange={e => { setPayoutMax(e.target.value); markDirty() }} className={inputCls(false)} />
                  </FormField>
                </div>
              </div>
            )}

            {section === 'INFO' && record && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label={c.fieldCurrency}>
                    <input readOnly value={record.currency ?? ''} className={readOnlyCls} />
                  </FormField>
                  <FormField label={c.fieldCurrencyName}>
                    <input readOnly value={record.currencyName ?? ''} className={readOnlyCls} />
                  </FormField>
                  <FormField label={c.fieldCategory}>
                    <input readOnly value={record.currencyCategory ?? ''} className={readOnlyCls} />
                  </FormField>
                  <FormField label={c.fieldStatus}>
                    <input readOnly value={record.status ?? ''} className={readOnlyCls} />
                  </FormField>
                  <FormField label={c.fieldIsDefault}>
                    <input readOnly value={record.isDefaultCurrency ? 'Yes' : 'No'} className={readOnlyCls} />
                  </FormField>
                  <FormField label={c.fieldWalletId}>
                    <input readOnly value={record.walletId ?? ''} className={readOnlyCls} />
                  </FormField>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && (isNew ? !!selected : true) && (
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            onClick={() => guardNavigation(goBackToList)}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {c.btnCancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm disabled:opacity-60"
          >
            {saving ? c.btnSaving : c.btnSave}
          </button>
        </div>
      )}
    </div>
  )
}
