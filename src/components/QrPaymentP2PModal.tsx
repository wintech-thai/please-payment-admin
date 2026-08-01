'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { X, QrCode, Loader2, RefreshCw } from 'lucide-react'
import { merchantApi } from '@/lib/api/merchant.api'
import type { PaymentRequestResponse } from '@/lib/api/types'
import { toast } from 'sonner'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

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

export default function QrPaymentP2PModal({ merchantId, merchantName, onClose }: Props) {
  const { t } = useLang()
  const m = t.merchant
  const a = t.admin

  const [amount, setAmount] = useState('')
  const [ref1, setRef1] = useState(() => generateRefId())
  const [ref2, setRef2] = useState('')
  const [ref3, setRef3] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PaymentRequestResponse | null>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = m.qrErrAmount
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await merchantApi.submitPaymentRequestP2P(merchantId, {
        RefId1: ref1.trim() || undefined,
        RefId2: ref2.trim() || undefined,
        RefId3: ref3.trim() || undefined,
        Currency: 'THB',
        RequestedAmount: Number(amount),
        QrProvider: 'PP',
      })
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
    setRef1(generateRefId())
    setRef2('')
    setRef3('')
    setErrors({})
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={clsx('w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] transition-all duration-300', result && result.qrCode ? 'max-w-3xl' : 'max-w-md')}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-base font-bold text-gray-900">QR Payment (P2P)</h3>
              {merchantName && <p className="text-xs text-gray-500">{merchantName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Form column */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">

            {/* Amount */}
            <div>
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
                disabled={!!result}
                className={clsx(
                  'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50',
                  errors.amount ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300'
                )}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>

            {/* Ref fields */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  REF1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ref1}
                  onChange={e => setRef1(e.target.value)}
                  disabled={!!result}
                  placeholder="Reference ID"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    REF2 <span className="text-gray-400 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ref2}
                    onChange={e => setRef2(e.target.value)}
                    disabled={!!result}
                    placeholder="REF2"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    REF3 <span className="text-gray-400 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={ref3}
                    onChange={e => setRef3(e.target.value)}
                    disabled={!!result}
                    placeholder="REF3"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* QR Result — right column */}
          {result && result.qrCode && (
            <div className="w-72 flex-shrink-0 border-l border-gray-100 flex flex-col items-center justify-center gap-4 px-6 py-5 bg-primary-50/30">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <QRCode value={result.qrCode} size={180} />
              </div>
              {result?.payInBankAccountName && (
                <div className="text-center">
                  <p className="text-xs text-gray-500">{m.qrPayTo}</p>
                  <p className="text-sm font-bold text-gray-800">{result.payInBankAccountName}</p>
                  {result.payInBankAccountNo && (
                    <p className="text-xs text-gray-500">{result.payInBankCode} · {result.payInBankAccountNo}</p>
                  )}
                </div>
              )}
              {result?.generatedAmount != null && (
                <p className="text-lg font-bold text-primary-700">
                  ฿{result.generatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              )}
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-primary-100 text-primary-700 ring-1 ring-primary-200">
                P2P
              </span>
            </div>
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
                disabled={submitting}
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
