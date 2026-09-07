'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cryptoAccountApi } from '@/lib/api/crypto-account.api'
import type { CryptoCurrencyItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Search, Coins, X } from 'lucide-react'
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

function CurrencyPickerModal({ currencies, loading, onPick, onClose }: {
  currencies: CryptoCurrencyItem[]; loading: boolean; onPick: (item: CryptoCurrencyItem) => void; onClose: () => void
}) {
  const { t } = useLang()
  const m = t.cryptoAccount
  const [search, setSearch] = useState('')

  const filtered = currencies.filter(c =>
    c.code.toLowerCase().includes(search.trim().toLowerCase()) ||
    (c.name || '').toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex-none px-6 pt-6 pb-4 border-b border-gray-100 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-bold text-gray-900 pr-8">{m.pickCurrencyTitle}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{m.pickCurrencySubtitle}</p>
          <div className="flex items-center gap-2 mt-4 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={m.pickCurrencySearchPlaceholder}
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">{t.admin.loading}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{m.pickCurrencyNoResults}</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.code}
                onClick={() => onPick(c)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{c.code}</p>
                  <p className="text-xs text-gray-400">{c.name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function CryptoAccountCreateForm({ accountType }: { accountType: AccountType }) {
  const { t } = useLang()
  const m = t.cryptoAccount
  const router = useRouter()
  const listPath = LIST_PATH[accountType]
  const createTitle = accountType === 'PayIn' ? m.createTitlePayIn : accountType === 'Transit' ? m.createTitleTransit : m.createTitlePayOut

  const [currency, setCurrency] = useState<{ code: string; name: string } | null>(null)
  const [currencies, setCurrencies] = useState<CryptoCurrencyItem[]>([])
  const [loadingCurrencies, setLoadingCurrencies] = useState(true)

  useEffect(() => {
    cryptoAccountApi.getAvailableCryptoCurrencies()
      .then(res => {
        const raw = res.data as any
        setCurrencies(Array.isArray(raw) ? raw : (raw?.cryptoCurrencies ?? raw?.CryptoCurrencies ?? []))
      })
      .catch(() => toast.error(m.failedToLoadCurrencies))
      .finally(() => setLoadingCurrencies(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [accountLevel, setAccountLevel] = useState<'Global' | 'Selected' | ''>('')
  const [walletNetwork, setWalletNetwork] = useState('')
  const [extendedPublicKey, setExtendedPublicKey] = useState('')
  const [walletType, setWalletType] = useState('HD')
  const [derivationPath, setDerivationPath] = useState('')
  const [qrScheme, setQrScheme] = useState('')
  const [addressPrefix, setAddressPrefix] = useState('')
  const [tokenContract, setTokenContract] = useState('')
  const [cryptoDecimal, setCryptoDecimal] = useState('6')
  const [addressBranch, setAddressBranch] = useState('0')
  const [txMin, setTxMin] = useState('')
  const [txMax, setTxMax] = useState('')
  const [dailyTotalAmountLimit, setDailyTotalAmountLimit] = useState('')
  const [dailyTotalCountLimit, setDailyTotalCountLimit] = useState('')
  const [isRandomCent, setIsRandomCent] = useState(false)
  const [centRoundingMode, setCentRoundingMode] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [kycName, setKycName] = useState('')
  const [kycId, setKycId] = useState('')
  const [kycEmail, setKycEmail] = useState('')
  const [kycPhone, setKycPhone] = useState('')

  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

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
    if (!walletNetwork.trim()) errs.walletNetwork = m.walletNetworkRequired
    if (!extendedPublicKey.trim()) errs.extendedPublicKey = m.extendedPublicKeyRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const toNum = (v: string) => { const n = Number(v); return v === '' || isNaN(n) ? undefined : n }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await cryptoAccountApi.addCurrencyAccount({
        Currency: currency!.code,
        CurrencyName: currency!.name,
        AccountType: accountType,
        AccountLevel: accountLevel,
        Tags: tags.length ? tags.join(',') : undefined,

        CryptoWalletNetwork: walletNetwork.trim(),
        CryptoWalletType: walletType.trim() || undefined,
        CryptoDerivationPath: derivationPath.trim() || undefined,
        CryptoQrScheme: qrScheme.trim() || undefined,
        CryptoAddressPrefix: addressPrefix.trim() || undefined,
        CryptoTokenContract: tokenContract.trim() || undefined,
        CryptoDecimal: toNum(cryptoDecimal),
        CryptoExtendedPublicKey: extendedPublicKey.trim(),
        CryptoAddressBranch: toNum(addressBranch),

        TxMinAmount: toNum(txMin),
        TxMaxAmount: toNum(txMax),
        DailyTotalAmountLimit: toNum(dailyTotalAmountLimit),
        DailyTotalCountLimit: toNum(dailyTotalCountLimit),
        IsRandomCent: isRandomCent,
        DecimalAction: isRandomCent ? undefined : (centRoundingMode || undefined),

        AccountKycName: kycName.trim() || undefined,
        AccountKycId: kycId.trim() || undefined,
        AccountKycEmail: kycEmail.trim() || undefined,
        AccountKycPhone: kycPhone.trim() || undefined,
      })
      setIsDirty(false)
      toast.success(m.createdSuccess)
      router.push(listPath)
    } catch (err: any) {
      const msg = err?.response?.data?.description
        || err?.response?.data?.message
        || err?.response?.data?.Description
        || err?.response?.data?.Message
        || err?.message
        || m.failedToCreate
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!currency) {
    return (
      <CurrencyPickerModal
        currencies={currencies}
        loading={loadingCurrencies}
        onPick={(item) => {
          setCurrency({ code: item.code, name: item.name || item.code })
          if (item.defaultNetwork) setWalletNetwork(item.defaultNetwork)
          if (item.defaultDecimal != null) setCryptoDecimal(String(item.defaultDecimal))
        }}
        onClose={() => router.push(listPath)}
      />
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(listPath))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{createTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.createSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg">
          <Coins className="w-4 h-4 text-primary-600" />
          <div>
            <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wide">{m.selectedCurrencyLabel}</p>
            <p className="text-sm font-bold text-primary-700 leading-tight">{currency.code} <span className="font-normal text-primary-500">{currency.name}</span></p>
          </div>
        </div>
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
              <FormField label={m.fieldWalletNetwork} required error={errors.walletNetwork}>
                <input
                  value={walletNetwork}
                  onChange={e => { setWalletNetwork(e.target.value); mark(); clearErr('walletNetwork') }}
                  placeholder={m.fieldWalletNetworkPlaceholder}
                  className={inputCls(!!errors.walletNetwork)}
                />
              </FormField>
              <FormField label={m.fieldWalletType}>
                <input
                  value={walletType}
                  onChange={e => { setWalletType(e.target.value); mark() }}
                  placeholder={m.fieldWalletTypePlaceholder}
                  className={inputCls(false)}
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
              <FormField label={m.fieldExtendedPublicKey} required error={errors.extendedPublicKey}>
                <input
                  value={extendedPublicKey}
                  onChange={e => { setExtendedPublicKey(e.target.value); mark(); clearErr('extendedPublicKey') }}
                  placeholder={m.fieldExtendedPublicKeyPlaceholder}
                  className={inputCls(!!errors.extendedPublicKey)}
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

          {/* KYC */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.kycSection}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={m.fieldKycName}>
                <input value={kycName} onChange={e => { setKycName(e.target.value); mark() }} className={inputCls(false)} />
              </FormField>
              <FormField label={m.fieldKycId}>
                <input value={kycId} onChange={e => { setKycId(e.target.value); mark() }} className={inputCls(false)} />
              </FormField>
              <FormField label={m.fieldKycEmail}>
                <input type="email" value={kycEmail} onChange={e => { setKycEmail(e.target.value); mark() }} className={inputCls(false)} />
              </FormField>
              <FormField label={m.fieldKycPhone}>
                <input value={kycPhone} onChange={e => { setKycPhone(e.target.value); mark() }} className={inputCls(false)} />
              </FormField>
            </div>
          </div>

        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push(listPath))}
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
