'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { X, QrCode, Loader2, RefreshCw } from 'lucide-react'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { merchantApi } from '@/lib/api/merchant.api'
import type { BankItem, PaymentRequestResponse } from '@/lib/api/types'
import { toast } from 'sonner'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

interface BankAccountOption {
  bankAccountId: string
  accountNumber?: string | null
  accountName?: string | null
  bankCode?: string | null
  accountType?: string | null
}

interface Props {
  merchantId: string
  merchantName?: string
  onClose: () => void
}

function generateRefId(): string {
  const now = new Date()
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  )
}

export default function QrPaymentModal({ merchantId, merchantName, onClose }: Props) {
  const { t, lang } = useLang()
  const m = t.merchant
  const a = t.admin

  const [mode, setMode] = useState<'manual' | 'auto'>('manual')

  // Bank / account data
  const [qrBanks, setQrBanks] = useState<BankItem[]>([])
  const [allAccounts, setAllAccounts] = useState<BankAccountOption[]>([])
  const [loadingInit, setLoadingInit] = useState(true)

  // Form state
  const [selectedBankCode, setSelectedBankCode] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [ref, setRef] = useState(() => generateRefId())
  const [ref1, setRef1] = useState('')
  const [ref2, setRef2] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // QR result
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PaymentRequestResponse | null>(null)

  // Load banks + accounts once
  useEffect(() => {
    Promise.allSettled([
      bankAccountApi.getAvailableSupportQrBanks(),
      merchantApi.getPayInBankAccountsForMerchant(merchantId),
    ]).then(([banksRes, accountsRes]) => {
      if (banksRes.status === 'fulfilled') {
        const raw = banksRes.value.data as any
        setQrBanks(Array.isArray(raw) ? raw : (raw?.banks ?? raw?.Banks ?? []))
      }
      if (accountsRes.status === 'fulfilled') {
        const raw = accountsRes.value.data as any
        const list: any[] = Array.isArray(raw) ? raw : (raw?.bankAccounts ?? raw?.BankAccounts ?? raw?.accounts ?? [])
        setAllAccounts(list.map(a => ({
          bankAccountId: a.id ?? a.bankAccountId ?? a.BankAccountId ?? a.accountId ?? '',
          accountNumber: a.accountNumber ?? a.AccountNumber,
          accountName: a.accountName ?? a.AccountName,
          bankCode: a.bankCode ?? a.BankCode,
          accountType: a.accountType ?? a.AccountType,
        })))
      }
    }).finally(() => setLoadingInit(false))
  }, [merchantId])

  const filteredAccounts = selectedBankCode
    ? allAccounts.filter(a =>
        selectedBankCode === 'PP'
          ? a.accountType?.toLowerCase() === 'promptpay'
          : a.bankCode === selectedBankCode
      )
    : []

  const bankLabel = (b: BankItem) =>
    lang === 'th'
      ? (b.bankNameTh || b.bankNameEng || b.bankShortName || b.bankCode)
      : (b.bankNameEng || b.bankNameTh || b.bankShortName || b.bankCode)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = m.qrErrAmount
    if (!ref.trim()) e.ref = m.qrErrRef
    if (mode === 'manual' && !selectedAccountId) e.account = m.qrErrAccount
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setResult(null)
    try {
      const payload: any = {
        RefId: generateRefId(),
        RefId1: ref1.trim() || undefined,
        RefId2: ref2.trim() || undefined,
        Description: ref.trim(),
        Currency: 'THB',
        RequestedAmount: Number(amount),
        QrProvider: 'PP',
      }
      if (mode === 'manual' && selectedAccountId) {
        payload.SelectedPayInBankAccountId = selectedAccountId
      }
      const res = await merchantApi.submitPaymentRequest(merchantId, payload)
      const raw = res.data as any
      const pr: PaymentRequestResponse = raw?.paymentResponse ?? raw?.PaymentResponse ?? raw
      setResult(pr)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.qrErrFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setAmount('')
    setRef(generateRefId())
    setRef1('')
    setRef2('')
    setErrors({})
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-base font-bold text-gray-900">QR Payment</h3>
              {merchantName && <p className="text-xs text-gray-500">{merchantName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">

          {loadingInit ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {a.loading}
            </div>
          ) : (
            <>
              {/* Mode selection */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{m.qrSelectAccount}</p>
                <div className="flex gap-4">
                  {(['manual', 'auto'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={mode === m}
                        onChange={() => { setMode(m); setSelectedBankCode(''); setSelectedAccountId(''); setErrors({}) }}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">
                        {m === 'manual' ? t.merchant.qrModeManual : t.merchant.qrModeAuto}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Manual: bank + account dropdowns */}
              {mode === 'manual' && (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {m.qrFieldBank} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedBankCode}
                      onChange={e => { setSelectedBankCode(e.target.value); setSelectedAccountId(''); setErrors(p => ({ ...p, account: '' })) }}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                    >
                      <option value="">{m.qrSelectBankPlaceholder}</option>
                      {qrBanks.map(b => (
                        <option key={b.bankCode} value={b.bankCode}>
                          {b.bankCode} — {bankLabel(b)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {m.qrFieldBankAccount} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={e => { setSelectedAccountId(e.target.value); setErrors(p => ({ ...p, account: '' })) }}
                      disabled={!selectedBankCode}
                      className={clsx(
                        'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white',
                        errors.account ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300',
                        !selectedBankCode && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <option value="">{m.qrSelectAccountPlaceholder}</option>
                      {filteredAccounts.map(a => (
                        <option key={a.bankAccountId} value={a.bankAccountId}>
                          {[a.bankCode, a.accountNumber, a.accountName ? `— ${a.accountName}` : ''].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>
                    {errors.account && <p className="text-red-500 text-xs mt-1">{errors.account}</p>}
                    {selectedBankCode && filteredAccounts.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">{m.qrNoAccountFound}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Amount + REF fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {m.qrFieldAmount} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })) }}
                    placeholder="0.00"
                    className={clsx(
                      'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2',
                      errors.amount ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300'
                    )}
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {m.qrFieldRef} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ref}
                    onChange={e => { setRef(e.target.value); setErrors(p => ({ ...p, ref: '' })) }}
                    placeholder="Reference"
                    className={clsx(
                      'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2',
                      errors.ref ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300'
                    )}
                  />
                  {errors.ref && <p className="text-red-500 text-xs mt-1">{errors.ref}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">REF1 <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                  <input type="text" value={ref1} onChange={e => setRef1(e.target.value)} placeholder="REF1" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">REF2 <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                  <input type="text" value={ref2} onChange={e => setRef2(e.target.value)} placeholder="REF2" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
              </div>

              {/* QR Result */}
              {result && result.qrCode && (
                <div className="border border-primary-100 bg-primary-50/40 rounded-xl p-5 flex flex-col items-center gap-3">
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <QRCode value={result.qrCode} size={200} />
                  </div>
                  {result.payInBankAccountName && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{m.qrPayTo}</p>
                      <p className="text-sm font-bold text-gray-800">{result.payInBankAccountName}</p>
                      {result.payInBankAccountNo && <p className="text-xs text-gray-500">{result.payInBankCode} · {result.payInBankAccountNo}</p>}
                    </div>
                  )}
                  {result.requestedAmount != null && (
                    <p className="text-lg font-bold text-primary-700">
                      ฿{result.requestedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {result ? (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {m.qrReset}
              </button>
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                {m.qrClose}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {a.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || loadingInit}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {m.qrGenerate}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
