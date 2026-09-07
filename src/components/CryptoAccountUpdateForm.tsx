'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { cryptoAccountApi } from '@/lib/api/crypto-account.api'
import type { CurrencyAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, X, Copy, Check, Coins } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

type AccountType = 'PayIn' | 'Transit' | 'PayOut'

const LIST_PATH: Record<AccountType, string> = {
  PayIn: '/business-setup/pay-in-crypto-account',
  Transit: '/business-setup/transit-crypto-account',
  PayOut: '/business-setup/pay-out-crypto-account',
}

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

export function CryptoAccountUpdateForm({ accountType }: { accountType: AccountType }) {
  const { t } = useLang()
  const m = t.cryptoAccount
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const listPath = LIST_PATH[accountType]
  const editTitle = accountType === 'PayIn' ? m.editTitlePayIn : accountType === 'Transit' ? m.editTitleTransit : m.editTitlePayOut

  const [account, setAccount] = useState<CurrencyAccountItem | null>(null)

  const [accountLevel, setAccountLevel] = useState<'Global' | 'Selected' | ''>('')
  const [derivationPath, setDerivationPath] = useState('')
  const [qrScheme, setQrScheme] = useState('')
  const [addressPrefix, setAddressPrefix] = useState('')
  const [tokenContract, setTokenContract] = useState('')
  const [cryptoDecimal, setCryptoDecimal] = useState('')
  const [addressBranch, setAddressBranch] = useState('')
  const [txMin, setTxMin] = useState('')
  const [txMax, setTxMax] = useState('')
  const [dailyTotalAmountLimit, setDailyTotalAmountLimit] = useState('')
  const [dailyTotalCountLimit, setDailyTotalCountLimit] = useState('')
  const [isRandomCent, setIsRandomCent] = useState(false)
  const [centRoundingMode, setCentRoundingMode] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showRawJson, setShowRawJson] = useState(false)
  const [rawJsonCopied, setRawJsonCopied] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  useEffect(() => {
    cryptoAccountApi.getCurrencyAccountById(id)
      .then(res => {
        const raw = res.data as any
        const a: CurrencyAccountItem = raw?.currencyAccount ?? raw?.CurrencyAccount ?? raw
        setAccount(a)
        setAccountLevel((a.accountLevel as 'Global' | 'Selected') ?? '')
        setDerivationPath(a.cryptoDerivationPath ?? '')
        setQrScheme(a.cryptoQrScheme ?? '')
        setAddressPrefix(a.cryptoAddressPrefix ?? '')
        setTokenContract(a.cryptoTokenContract ?? '')
        setCryptoDecimal(a.cryptoDecimal != null ? String(a.cryptoDecimal) : '')
        setAddressBranch(a.cryptoAddressBranch != null ? String(a.cryptoAddressBranch) : '')
        setTxMin(a.txMinAmount != null ? String(a.txMinAmount) : '')
        setTxMax(a.txMaxAmount != null ? String(a.txMaxAmount) : '')
        setDailyTotalAmountLimit(a.dailyTotalAmountLimit != null ? String(a.dailyTotalAmountLimit) : '')
        setDailyTotalCountLimit(a.dailyTotalCountLimit != null ? String(a.dailyTotalCountLimit) : '')
        setIsRandomCent(a.isRandomCent ?? false)
        setCentRoundingMode(a.decimalAction ?? '')
        setTags(a.tags ? a.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      })
      .catch(() => {
        toast.error(m.failedToLoadAccount)
        router.push(`${listPath}?highlight=${id}`)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const mark = () => { if (!isDirty) setIsDirty(true) }
  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const v = tagInput.trim()
      if (v && !tags.includes(v)) { setTags(prev => [...prev, v]); mark() }
      setTagInput('')
    }
  }
  const removeTag = (tag: string) => { setTags(prev => prev.filter(tg => tg !== tag)); mark() }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!accountLevel) errs.accountLevel = m.accountLevelRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const toNum = (v: string) => { const n = Number(v); return v === '' || isNaN(n) ? undefined : n }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!isDirty) { router.push(`${listPath}?highlight=${id}`); return }
    setSaving(true)
    try {
      await cryptoAccountApi.updateCurrencyAccountById(id, {
        AccountLevel: accountLevel,
        Tags: tags.length ? tags.join(',') : undefined,
        CryptoDerivationPath: derivationPath.trim() || undefined,
        CryptoQrScheme: qrScheme.trim() || undefined,
        CryptoAddressPrefix: addressPrefix.trim() || undefined,
        CryptoTokenContract: tokenContract.trim() || undefined,
        CryptoDecimal: toNum(cryptoDecimal),
        CryptoAddressBranch: toNum(addressBranch),
        TxMinAmount: toNum(txMin),
        TxMaxAmount: toNum(txMax),
        DailyTotalAmountLimit: toNum(dailyTotalAmountLimit),
        DailyTotalCountLimit: toNum(dailyTotalCountLimit),
        IsRandomCent: isRandomCent,
        DecimalAction: isRandomCent ? undefined : (centRoundingMode || undefined),
      })
      setIsDirty(false)
      toast.success(m.updatedSuccess)
      router.push(`${listPath}?highlight=${id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.description
        || err?.response?.data?.message
        || err?.response?.data?.Description
        || err?.response?.data?.Message
        || err?.message
        || m.failedToUpdate
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {showRawJson && account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowRawJson(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-none">
              <span className="text-sm font-semibold text-gray-700 font-mono">Raw JSON — Crypto Account</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(account, null, 2)); setRawJsonCopied(true); setTimeout(() => setRawJsonCopied(false), 2000) }} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                  {rawJsonCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {rawJsonCopied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => setShowRawJson(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <pre className="overflow-auto p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-gray-50" dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(account, null, 2)) }} />
          </div>
        </div>
      )}

      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(`${listPath}?highlight=${id}`))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{editTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.editSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
          <Coins className="w-4 h-4 text-primary-600" />
          <div>
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wide">{m.selectedCurrencyLabel}</p>
            <p className="text-sm font-bold text-primary-700 leading-tight">{account?.currency} <span className="font-normal text-primary-500">{account?.currencyName}</span></p>
          </div>
        </div>
        {account && (
          <button onClick={() => setShowRawJson(true)} className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
            {'{ }'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.accountInfoSection}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={m.fieldAccountLevel} required error={errors.accountLevel}>
                <select
                  value={accountLevel}
                  onChange={e => { setAccountLevel(e.target.value as 'Global' | 'Selected'); mark(); clearErr('accountLevel') }}
                  className={inputCls(!!errors.accountLevel)}
                >
                  <option value="">—</option>
                  <option value="Global">{m.accountLevelGlobal}</option>
                  <option value="Selected">{m.accountLevelSelected}</option>
                </select>
              </FormField>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{m.fieldTags}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-primary-400 hover:text-primary-700">&times;</button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={t.admin.typeAndPressEnterToAddTags}
                className={inputCls(false)}
              />
            </div>
          </div>

          {/* Wallet Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.walletInfoSection}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={m.fieldWalletNetwork}>
                <input
                  value={account?.cryptoWalletNetwork ?? ''}
                  readOnly
                  className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed')}
                />
              </FormField>
              <FormField label={m.fieldWalletType}>
                <input
                  value={account?.cryptoWalletType ?? ''}
                  readOnly
                  className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed')}
                />
              </FormField>
              <FormField label={m.fieldQrScheme}>
                <input
                  value={qrScheme}
                  onChange={e => { setQrScheme(e.target.value); mark() }}
                  placeholder={m.fieldQrSchemePlaceholder}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label={m.fieldAddressPrefix}>
                <input
                  value={addressPrefix}
                  onChange={e => { setAddressPrefix(e.target.value); mark() }}
                  placeholder={m.fieldAddressPrefixPlaceholder}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label={m.fieldCryptoDecimal}>
                <input
                  type="number" min={0} step={1}
                  value={cryptoDecimal}
                  onChange={e => { setCryptoDecimal(e.target.value); mark() }}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label={m.fieldAddressBranch}>
                <input
                  type="number" min={0} step={1}
                  value={addressBranch}
                  onChange={e => { setAddressBranch(e.target.value); mark() }}
                  className={inputCls(false)}
                />
              </FormField>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <FormField label={m.fieldExtendedPublicKey}>
                <input
                  value={account?.cryptoExtendedPublicKey ?? ''}
                  readOnly
                  className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed')}
                />
              </FormField>
              <FormField label={m.fieldDerivationPath}>
                <input
                  value={derivationPath}
                  onChange={e => { setDerivationPath(e.target.value); mark() }}
                  placeholder={m.fieldDerivationPathPlaceholder}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label={m.fieldTokenContract}>
                <input
                  value={tokenContract}
                  onChange={e => { setTokenContract(e.target.value); mark() }}
                  placeholder={m.fieldTokenContractPlaceholder}
                  className={inputCls(false)}
                />
              </FormField>
            </div>
          </div>

          {/* Limits */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.limitsSection}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={m.fieldTxMin}>
                <input
                  type="number" min={0} step="any"
                  value={txMin}
                  onChange={e => { setTxMin(e.target.value); mark() }}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label={m.fieldTxMax}>
                <input
                  type="number" min={0} step="any"
                  value={txMax}
                  onChange={e => { setTxMax(e.target.value); mark() }}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label={m.fieldDailyTotalAmountLimit}>
                <input
                  type="number" min={0} step="any"
                  value={dailyTotalAmountLimit}
                  onChange={e => { setDailyTotalAmountLimit(e.target.value); mark() }}
                  className={inputCls(false)}
                />
              </FormField>
              <FormField label={m.fieldDailyTotalCountLimit}>
                <input
                  type="number" min={0} step={1}
                  value={dailyTotalCountLimit}
                  onChange={e => { setDailyTotalCountLimit(e.target.value); mark() }}
                  className={inputCls(false)}
                />
              </FormField>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer w-fit select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isRandomCent}
                    onChange={e => { setIsRandomCent(e.target.checked); mark() }}
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-primary-500 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{m.fieldRandomCent}</p>
                  <p className="text-xs text-gray-400">{m.fieldRandomCentHint}</p>
                </div>
              </label>
              {!isRandomCent && (
                <div className="mt-3 ml-12">
                  <p className="text-xs font-semibold text-gray-500 mb-1">{m.fieldCentRoundingMode}</p>
                  <select
                    value={centRoundingMode}
                    onChange={e => { setCentRoundingMode(e.target.value); mark() }}
                    className="w-52 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  >
                    <option value="">{m.centRoundingNone}</option>
                    <option value="Round">{m.centRoundingRound}</option>
                    <option value="Round Up">{m.centRoundingRoundUp}</option>
                    <option value="Truncate">{m.centRoundingTruncate}</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* KYC (read-only for now — backend update doesn't persist changes to these yet) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.kycSection}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={m.fieldKycName}>
                <input value={account?.accountKycName ?? ''} readOnly className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed')} />
              </FormField>
              <FormField label={m.fieldKycId}>
                <input value={account?.accountKycId ?? ''} readOnly className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed')} />
              </FormField>
              <FormField label={m.fieldKycEmail}>
                <input value={account?.accountKycEmail ?? ''} readOnly className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed')} />
              </FormField>
              <FormField label={m.fieldKycPhone}>
                <input value={account?.accountKycPhone ?? ''} readOnly className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed')} />
              </FormField>
            </div>
          </div>

        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push(`${listPath}?highlight=${id}`))}
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
            {saving ? t.admin.saving : t.admin.saveChanges}
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
