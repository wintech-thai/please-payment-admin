'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { paymentDocumentApi } from '@/lib/api/payment-document.api'
import { merchantApi } from '@/lib/api/merchant.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { MerchantItem, BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, Upload, ImageIcon, CheckCircle, AlertCircle, Info } from 'lucide-react'
import clsx from 'clsx'

function buildStorageUrl(presignedUrl: string): string {
  // Replace <STORAGE-API-BASE> with the correct storage API base.
  // Strategy: derive from the current web origin by swapping the subdomain to "storage-api".
  //   prod:  https://admin.please-payment.com  → https://storage-api.please-payment.com
  //   dev:   https://admin-dev.please-payment.com → https://storage-api.please-payment.com
  // On localhost the origin has no subdomain, so we fall back to NEXT_PUBLIC_API_URL
  // (e.g. https://api-dev.please-payment.com) and apply the same subdomain swap.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const isLocalhost = /localhost|127\.0\.0\.1/.test(origin)
  const base = isLocalhost ? (process.env.NEXT_PUBLIC_API_URL ?? '') : origin
  const storageBase = base.replace(/^(https?:\/\/)[^.]+\./, '$1storage-api.')
  return presignedUrl.replace('<STORAGE-API-BASE>', storageBase)
}

async function decodeQrFromImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) { URL.revokeObjectURL(url); resolve(null); return }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        import('jsqr').then(({ default: jsQR }) => {
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          URL.revokeObjectURL(url)
          resolve(code?.data ?? null)
        }).catch(() => { URL.revokeObjectURL(url); resolve(null) })
      } catch { URL.revokeObjectURL(url); resolve(null) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

/**
 * OCR the image with Tesseract.js (Thai + English).
 * Returns the transfer amount (if found) and whether the image looks like a bank slip.
 */
async function analyzeSlipImage(file: File): Promise<{ amount: string | null; isSlip: boolean }> {
  try {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker(['tha', 'eng'])
    const url = URL.createObjectURL(file)
    try {
      const { data: { text } } = await worker.recognize(url)

      // ── Slip detection keywords ────────────────────────────────────────────
      const slipKeywords = [
        /โอนเงิน/,
        /จำนวนเงิน/,
        /สำเร็จ/,
        /รหัสอ้างอิง/,
        /ไทยพาณิชย์|กสิกร|กรุงไทย|กรุงเทพ|ทหารไทย|ออมสิน|ธนชาต/,
        /\bSCB\b|\bKBANK\b|\bBBL\b|\bKTB\b|\bTMB\b|\bTTB\b|\bBAY\b|\bGSB\b/i,
        /transfer.*success|payment.*success/i,
        /บาท/,
      ]
      const isSlip = slipKeywords.some(p => p.test(text))

      // ── Amount extraction ──────────────────────────────────────────────────
      const amountPatterns = [
        /(?:จำนวนเงิน|จำนวน)\s*[\r\n]*\s*([\d,]+\.?\d*)/,
        /([\d,]+\.\d{2})\s*(?:บาท|THB|฿)/i,
        /(?:amount|amt)\s*:?\s*([\d,]+\.?\d*)/i,
        /\b([\d]{1,3}(?:,\d{3})+\.\d{2})\b/,
      ]
      let amount: string | null = null
      for (const pattern of amountPatterns) {
        const match = text.match(pattern)
        if (match) {
          const num = parseFloat(match[1].replace(/,/g, ''))
          if (!isNaN(num) && num > 0) { amount = match[1].replace(/,/g, ''); break }
        }
      }

      return { amount, isSlip }
    } finally {
      await worker.terminate()
      URL.revokeObjectURL(url)
    }
  } catch {
    return { amount: null, isSlip: false }
  }
}

/**
 * Parse a Thai bank slip QR code using multiple strategies.
 * Thai bank QR codes for slip verification vary by bank:
 *  - PromptPay payment QR: EMVCo TLV (ISO 20022) — tags 54=amount, 62/05=refId
 *  - Bank slip verification QR: may be a URL, JSON, pipe-delimited, or proprietary TLV
 */
function parseSlipQr(rawData: string): { amount?: string; refId?: string; strategy?: string } {
  // ── Strategy 1: EMVCo TLV ─────────────────────────────────────────────────
  // Handles two Thai QR variants:
  //   A) PromptPay payment QR  — tag 54 = amount, tag 62/sub-tag 05 = refId
  //   B) Bank slip-verify QR   — tag 00 (nested) / sub-tag 02 = txRef, no amount tag
  try {
    const parseTlv = (data: string): Record<string, string> => {
      const tags: Record<string, string> = {}
      let i = 0
      while (i + 4 <= data.length) {
        const id = data.substring(i, i + 2)
        const len = parseInt(data.substring(i + 2, i + 4), 10)
        if (isNaN(len) || i + 4 + len > data.length) break
        tags[id] = data.substring(i + 4, i + 4 + len)
        i += 4 + len
      }
      return tags
    }

    const tags = parseTlv(rawData)
    const result: { amount?: string; refId?: string } = {}

    // A) Standard PromptPay payment QR
    if (tags['54']) result.amount = tags['54']                              // Tag 54 = Amount
    if (tags['62']) {
      const sub62 = parseTlv(tags['62'])
      if (sub62['05']) result.refId = sub62['05']                           // Tag 62/05 = Ref Label
    }

    // B) Thai slip verification QR — tag 00 contains nested TLV
    //    Sub-tag 02 = Transaction Reference (e.g. "016145154554DPM16238")
    if (!result.refId && tags['00']) {
      const sub00 = parseTlv(tags['00'])
      if (sub00['02']) result.refId = sub00['02']                           // Sub-tag 02 = Tx Ref
    }

    if (result.amount || result.refId) return { ...result, strategy: 'EMVCo TLV' }
  } catch {}

  // ── Strategy 2: URL (bank slip verification links) ─────────────────────────
  try {
    const url = new URL(rawData)
    const p = url.searchParams
    const result: { amount?: string; refId?: string } = {}

    const amountKeys = ['amount', 'amt', 'txAmount', 'transactionAmount', 'value', 'txAmountDecimal']
    const refKeys = ['ref', 'refId', 'transactionRef', 'tranRef', 'txnRef', 'txRef',
                     'referenceNo', 'slipId', 'txId', 'paymentRef', 'billPaymentRef']
    for (const k of amountKeys) {
      const v = p.get(k)
      if (v) { result.amount = v.replace(/,/g, ''); break }
    }
    for (const k of refKeys) {
      const v = p.get(k)
      if (v) { result.refId = v; break }
    }

    // Some banks encode data in path segments (e.g. /slip/REF123/1200)
    if (!result.refId) {
      const segs = url.pathname.split('/').filter(Boolean)
      for (const seg of segs) {
        if (/^[A-Z0-9]{10,}$/i.test(seg) && !/^https?$/i.test(seg)) {
          result.refId = seg; break
        }
      }
    }
    if (result.amount || result.refId) return { ...result, strategy: 'URL params' }
  } catch {}

  // ── Strategy 3: JSON ───────────────────────────────────────────────────────
  try {
    const json = JSON.parse(rawData)
    const pick = (obj: Record<string, unknown>, keys: string[]) => {
      for (const k of keys) {
        const v = obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()]
        if (v !== undefined && v !== null) return String(v)
      }
      return undefined
    }
    const amt = pick(json, ['amount', 'txAmount', 'transactionAmount', 'amountDecimal', 'value'])
    const ref = pick(json, ['refId', 'ref', 'transactionRef', 'tranRef', 'txnRef', 'referenceNo', 'slipId'])
    if (amt || ref) {
      return {
        amount: amt ? String(parseFloat(amt.replace(/,/g, ''))) : undefined,
        refId: ref,
        strategy: 'JSON',
      }
    }
  } catch {}

  // ── Strategy 4: Pipe / semicolon delimited ─────────────────────────────────
  if (rawData.includes('|') || (rawData.includes(';') && !rawData.startsWith('http'))) {
    const sep = rawData.includes('|') ? '|' : ';'
    const parts = rawData.split(sep).map(s => s.trim()).filter(Boolean)
    const result: { amount?: string; refId?: string } = {}
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i].toLowerCase()
      const val = parts[i + 1]
      if (/amount|amt|value|ยอด/.test(key)) result.amount = val.replace(/,/g, '')
      if (/ref|txn|slip|transaction/.test(key)) result.refId = val
    }
    // Also try positional (some formats: refId|amount|date...)
    if (!result.refId && parts.length >= 1 && /^[A-Z0-9]{8,}$/i.test(parts[0])) result.refId = parts[0]
    if (!result.amount && parts.length >= 2) {
      const maybe = parts[1].replace(/,/g, '')
      if (/^\d+(\.\d{1,2})?$/.test(maybe)) result.amount = maybe
    }
    if (result.amount || result.refId) return { ...result, strategy: 'Delimited' }
  }

  // ── Strategy 5: Regex heuristics ──────────────────────────────────────────
  {
    const result: { amount?: string; refId?: string } = {}

    // Amount: digits with optional commas and decimal, followed by currency or label
    const amountPatterns = [
      /(?:amount|amt|จำนวน|ยอด)[=:\s]*(\d[\d,]*\.?\d*)/i,
      /(\d{1,3}(?:,\d{3})*\.\d{2})\s*(?:THB|บาท|baht)/i,
      /(\d+\.\d{2})\s*(?:THB|฿)/i,
    ]
    for (const pat of amountPatterns) {
      const m = rawData.match(pat)
      if (m) { result.amount = m[1].replace(/,/g, ''); break }
    }

    // RefId: reference label followed by alphanumeric string, or standalone long alphanumeric
    const refPatterns = [
      /(?:ref(?:id)?|tranref|txnref|slipid|referenceno|txref)[=:\s]*([A-Z0-9]{6,})/i,
      /\b([A-Z0-9]{15,})\b/,  // standalone long alphanumeric — typically a transaction ref
    ]
    for (const pat of refPatterns) {
      const m = rawData.match(pat)
      // exclude common URL components
      if (m && !/^https?|www|com|th|net$/i.test(m[1])) {
        result.refId = m[1]; break
      }
    }

    if (result.amount || result.refId) return { ...result, strategy: 'Regex' }
  }

  return {}
}

export default function UploadPayInSlipPage() {
  const router = useRouter()
  const { t } = useLang()
  const m = t.payInSlip
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [qrStatus, setQrStatus] = useState<'idle' | 'analyzing' | 'full' | 'partial' | 'no-data' | 'not-found'>('idle')
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'scanning' | 'found' | 'not-found'>('idle')
  const [isSlipDetected, setIsSlipDetected] = useState<boolean | null>(null)

  const [merchants, setMerchants] = useState<MerchantItem[]>([])
  const [merchantId, setMerchantId] = useState('')
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [bankAccountId, setBankAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [refId, setRefId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingMerchants, setLoadingMerchants] = useState(true)
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Load merchants
  useEffect(() => {
    const load = async () => {
      try {
        const res = await merchantApi.getMerchants({ Status: 'Active' })
        const d = res.data as any
        setMerchants(Array.isArray(d) ? d : (d?.merchants ?? d?.Merchants ?? []))
      } catch { toast.error(m.toastFailedToLoadMerchants) }
      finally { setLoadingMerchants(false) }
    }
    load()
  }, [m.toastFailedToLoadMerchants])

  // Load bank accounts when merchant changes
  useEffect(() => {
    if (!merchantId) { setBankAccounts([]); setBankAccountId(''); return }
    const load = async () => {
      setLoadingBanks(true)
      try {
        const res = await bankAccountApi.getPayInBankAccountsForMerchant(merchantId)
        const d = res.data as any
        setBankAccounts(Array.isArray(d) ? d : (d?.bankAccounts ?? d?.BankAccounts ?? []))
        setBankAccountId('')
      } catch { toast.error(m.toastFailedToLoadBanks) }
      finally { setLoadingBanks(false) }
    }
    load()
  }, [merchantId, m.toastFailedToLoadBanks])

  const processFile = useCallback(async (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error(m.validImageRequired); return }
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    setQrStatus('analyzing')
    setOcrStatus('idle')
    setIsSlipDetected(null)

    // ── Reset values from previous image ──────────────────────────────────────
    setAmount('')
    setRefId('')

    // ── Step 1: QR decode + parse ──────────────────────────────────────────────
    const qrData = await decodeQrFromImage(f)
    let amountFilled = false
    let refIdFilled = false

    if (!qrData) {
      setQrStatus('not-found')
    } else {
      // QR found → definitely a bank slip
      setIsSlipDetected(true)
      const parsed = parseSlipQr(qrData)
      if (parsed.amount) { setAmount(parsed.amount); amountFilled = true }
      if (parsed.refId) { setRefId(parsed.refId); refIdFilled = true }

      if (amountFilled && refIdFilled) setQrStatus('full')
      else if (amountFilled || refIdFilled) setQrStatus('partial')
      else setQrStatus('no-data')
    }

    // ── Step 2: OCR — run if amount missing OR need slip detection (no QR) ────
    if (!amountFilled || !qrData) {
      setOcrStatus('scanning')
      const { amount: ocrAmount, isSlip: ocrIsSlip } = await analyzeSlipImage(f)

      if (ocrAmount && !amountFilled) {
        setAmount(ocrAmount)
        setOcrStatus('found')
      } else {
        setOcrStatus(ocrAmount ? 'found' : 'not-found')
      }

      // Only update slip detection from OCR when QR wasn't found
      if (!qrData) setIsSlipDetected(ocrIsSlip)
    }
  }, [m.validImageRequired])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error(m.validImageRequired); return }
    if (!merchantId) { toast.error(m.validMerchantRequired); return }
    if (!bankAccountId) { toast.error(m.validBankRequired); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error(m.validAmountRequired); return }
    if (!refId.trim()) { toast.error(m.validRefIdRequired); return }

    setSaving(true)
    try {
      // 1. Get presigned URL (merchantId is required in the URL path)
      const mimeType = file.type || 'image/jpeg'
      const presignedRes = await paymentDocumentApi.getPresignedUrl(merchantId, { MimeType: mimeType })
      const presignedData = presignedRes.data as any
      const rawPresignedUrl: string = presignedData?.presignedUrl ?? presignedData?.PresignedUrl ?? ''
      const objectName: string = presignedData?.objectName ?? presignedData?.ObjectName ?? ''

      if (!rawPresignedUrl || !objectName) throw new Error('Invalid presigned URL response')

      // 2. Upload file directly from browser to presigned URL
      const uploadUrl = buildStorageUrl(rawPresignedUrl)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      // 3. Register document
      await paymentDocumentApi.addPayInDocument(merchantId, {
        UploadedFilePath: objectName,
        MimeType: mimeType,
        TxAmountDecimal: parseFloat(amount),
        PayInBankAccountId: bankAccountId,
        MerchantId: merchantId,
        RefId: refId.trim(),
      })

      toast.success(m.toastUploadSuccess)
      router.push('/business-setup/payment/pay-in-slip')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? m.toastUploadFailed
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/business-setup/payment/pay-in-slip')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{m.uploadTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{m.uploadSubtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">

          {/* Left — Image Upload & Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 space-y-4">

              {/* Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  isDragOver
                    ? 'border-primary-400 bg-primary-50'
                    : file
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {!file ? (
                  <div className="space-y-2 py-4">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500">
                      {m.dropzoneText}{' '}
                      <span className="text-primary-600 font-semibold">{m.dropzoneBrowse}</span>
                    </p>
                    <p className="text-xs text-gray-400">{m.dropzoneHint}</p>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-700 font-medium py-1">{file.name}</p>
                )}
              </div>

              {/* QR Analysis Status */}
              {qrStatus === 'analyzing' && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {m.analyzingQr}
                </div>
              )}

              {/* Full match — both amount & refId extracted */}
              {qrStatus === 'full' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {m.qrDetected}
                </div>
              )}

              {/* Partial match — only amount or refId extracted */}
              {qrStatus === 'partial' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {m.qrPartial}
                  </div>
                  <p className="text-xs text-amber-600">{m.qrPartialHint}</p>
                </div>
              )}

              {/* QR found but no data could be extracted */}
              {qrStatus === 'no-data' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    {m.qrFoundNoData}
                  </div>
                  <p className="text-xs text-blue-600">{m.qrFoundNoDataHint}</p>
                </div>
              )}

              {/* No QR code in image */}
              {qrStatus === 'not-found' && (
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {m.qrNotDetected}
                </div>
              )}

              {/* OCR scanning for amount */}
              {ocrStatus === 'scanning' && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {m.ocrScanning}
                </div>
              )}
              {ocrStatus === 'found' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {m.ocrFound}
                </div>
              )}
              {ocrStatus === 'not-found' && isSlipDetected !== false && (
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {m.ocrNotFound}
                </div>
              )}

              {/* Not a slip warning */}
              {isSlipDetected === false && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {m.notSlipWarning}
                  </div>
                  <p className="text-xs text-orange-600">{m.notSlipHint}</p>
                </div>
              )}

              {/* Preview */}
              {previewUrl ? (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <img src={previewUrl} alt={m.previewAlt} className="w-full object-contain max-h-[560px]" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200 gap-2">
                  <ImageIcon className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-gray-300">{m.previewAlt}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right — Form fields + Actions */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 space-y-4">
                {/* Merchant */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelMerchant} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={merchantId}
                    onChange={e => setMerchantId(e.target.value)}
                    disabled={loadingMerchants}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">{loadingMerchants ? 'Loading...' : m.placeholderMerchant}</option>
                    {merchants.map(merchant => (
                      <option key={merchant.id} value={merchant.id}>
                        {merchant.code} — {merchant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bank Account */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelBankAccount} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankAccountId}
                    onChange={e => setBankAccountId(e.target.value)}
                    disabled={!merchantId || loadingBanks}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {!merchantId ? m.placeholderMerchant : loadingBanks ? 'Loading...' : m.placeholderBankAccount}
                    </option>
                    {bankAccounts.map(ba => {
                      const baId = ba.bankAccountId ?? (ba as any).id ?? ba.accountId ?? ''
                      return (
                        <option key={baId} value={baId}>
                          {ba.bankCode} — {ba.accountNumber} ({ba.accountName})
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelAmount} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={m.placeholderAmount}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                {/* RefId */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelRefId} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={refId}
                    onChange={e => setRefId(e.target.value)}
                    placeholder={m.placeholderRefId}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/business-setup/payment/pay-in-slip')}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
              >
                {m.btnBack}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {m.btnSaving}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {m.btnSave}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}

