'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { paymentDocumentApi } from '@/lib/api/payment-document.api'
import { merchantApi } from '@/lib/api/merchant.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { MerchantItem, BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, Upload, ImageIcon, CheckCircle, AlertCircle, Info } from 'lucide-react'
import clsx from 'clsx'

// ── Tesseract worker singleton ─────────────────────────────────────────────────
// Create once per page load; reuse across all uploads to avoid WASM re-init cost
// and reduce non-determinism from worker startup failures.
let _tesseractWorker: any = null
let _tesseractWorkerLoading: Promise<any> | null = null

async function getTesseractWorker() {
  if (_tesseractWorker) return _tesseractWorker
  if (_tesseractWorkerLoading) return _tesseractWorkerLoading
  _tesseractWorkerLoading = (async () => {
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(['tha', 'eng'])
      _tesseractWorker = worker
      return worker
    } catch {
      _tesseractWorkerLoading = null
      return null
    }
  })()
  return _tesseractWorkerLoading
}

async function compressImageToBase64(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function decodeQrFromImage(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    // Load image element
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })

    // Draw image to canvas — optional upscale and binarize (high-contrast B&W)
    const toCanvas = (scale: number, binarize = false): HTMLCanvasElement => {
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      if (binarize) {
        const id = ctx.getImageData(0, 0, w, h)
        const d = id.data
        for (let i = 0; i < d.length; i += 4) {
          // Weighted grayscale → hard threshold at 128
          const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
          const v = lum < 128 ? 0 : 255
          d[i] = d[i + 1] = d[i + 2] = v
        }
        ctx.putImageData(id, 0, 0)
      }
      return c
    }

    // ZXing decode — uses RGBLuminanceSource for better accuracy than jsQR
    const zxingDecode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
      try {
        const { QRCodeReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource } =
          await import('@zxing/library')
        const ctx = canvas.getContext('2d')!
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        // RGBA → RGB (ZXing expects 3-channel)
        const rgb = new Uint8ClampedArray(width * height * 3)
        for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
          rgb[j] = data[i]; rgb[j + 1] = data[i + 1]; rgb[j + 2] = data[i + 2]
        }
        const source = new RGBLuminanceSource(rgb, width, height)
        const bitmap = new BinaryBitmap(new HybridBinarizer(source))
        return new QRCodeReader().decode(bitmap).getText()
      } catch { return null }
    }

    // jsQR fallback decode
    const jsqrDecode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
      try {
        const ctx = canvas.getContext('2d')!
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { default: jsQR } = await import('jsqr')
        return jsQR(data, width, height)?.data ?? null
      } catch { return null }
    }

    // Try strategies in order — stop as soon as one succeeds
    // Each strategy trades more processing for better coverage of edge cases
    const strategies: Array<() => Promise<string | null>> = [
      () => zxingDecode(toCanvas(1)),          // 1. ZXing — original size
      () => zxingDecode(toCanvas(2)),          // 2. ZXing — 2× upscale (helps small/dense QR)
      () => zxingDecode(toCanvas(1, true)),    // 3. ZXing — binarized (helps low-contrast)
      () => zxingDecode(toCanvas(2, true)),    // 4. ZXing — 2× + binarized
      () => jsqrDecode(toCanvas(1)),           // 5. jsQR  — original (legacy fallback)
      () => jsqrDecode(toCanvas(2)),           // 6. jsQR  — 2× upscale fallback
    ]

    for (const strategy of strategies) {
      const result = await strategy()
      if (result) return result
    }
    return null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * OCR the image with Tesseract.js (Thai + English).
 * Returns the transfer amount (if found) and whether the image looks like a bank slip.
 */
async function analyzeSlipImage(file: File): Promise<{ amount: string | null; isSlip: boolean }> {
  try {
    const worker = await getTesseractWorker()
    if (!worker) return { amount: null, isSlip: false }
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
        // Pattern 1: after จำนวน/จำนวนเงิน label — now handles optional colon ":"
        /(?:จำนวนเงิน|จำนวน):?\s*[\r\n]*\s*([\d,]+[.,]\d{1,2})/,
        // Pattern 2: amount then บาท/THB — handle period-or-comma decimal, บาท may be on next line
        /([\d,]+[.,]\d{2})\s*[\r\n]?\s*(?:บาท|THB|฿)/i,
        /(?:amount|amt)\s*:?\s*([\d,]+[.,]?\d*)/i,
        /\b([\d]{1,3}(?:,\d{3})+[.,]\d{2})\b/,
        // Fallback: any plausible decimal number followed by บาท (catches OCR spacing issues)
        /([\d]+[.,]\d{1,2})\s*(?:บาท)/,
      ]
      // Normalise: handle OCR reading "." as "," (e.g. "118,00" → 118.00)
      const normalizeAmount = (raw: string): number => {
        // If ends with ,XX treat comma as decimal separator
        const fixed = /,\d{1,2}$/.test(raw)
          ? raw.replace(/\./g, '').replace(',', '.')
          : raw.replace(/,/g, '')
        return parseFloat(fixed)
      }
      let amount: string | null = null
      for (const pattern of amountPatterns) {
        const match = text.match(pattern)
        if (match) {
          const num = normalizeAmount(match[1])
          if (!isNaN(num) && num > 0 && num < 10_000_000) { amount = num.toFixed(2); break }
        }
      }

      return { amount, isSlip }
    } finally {
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
  const [merchantQuery, setMerchantQuery] = useState('')
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false)
  const merchantDropdownRef = useRef<HTMLDivElement>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [bankAccountId, setBankAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [refId, setRefId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingMerchants, setLoadingMerchants] = useState(true)
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Close merchant dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (merchantDropdownRef.current && !merchantDropdownRef.current.contains(e.target as Node)) {
        setMerchantDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filtered merchants for searchable dropdown
  const filteredMerchants = useMemo(() => {
    if (!merchantQuery) return merchants
    const q = merchantQuery.toLowerCase()
    return merchants.filter(
      mc => mc.code?.toLowerCase().includes(q) || mc.name?.toLowerCase().includes(q)
    )
  }, [merchants, merchantQuery])

  // Pre-warm Tesseract worker on mount so it's ready before the user picks a file
  useEffect(() => { getTesseractWorker() }, [])

  // Load merchants
  useEffect(() => {
    const load = async () => {
      try {
        const res = await merchantApi.getMerchants({ Status: 'Active' })
        const d = res.data as any
        setMerchants(Array.isArray(d) ? d : (d?.merchants ?? d?.Merchants ?? []))
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : m.toastFailedToLoadMerchants) }
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
      } catch (err: unknown) { toast.error(err instanceof Error ? err.message : m.toastFailedToLoadBanks) }
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
      const mimeType = file.type || 'image/jpeg'
      const imageBase64 = await compressImageToBase64(file)
      await paymentDocumentApi.addPayInDocument(merchantId, {
        ImageBase64: imageBase64,
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
                {/* Merchant — searchable combobox */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {m.labelMerchant} <span className="text-red-500">*</span>
                  </label>
                  <div ref={merchantDropdownRef} className="relative">
                    <input
                      type="text"
                      value={
                        merchantId
                          ? (merchants.find(mc => mc.id === merchantId)
                              ? `${merchants.find(mc => mc.id === merchantId)!.code} — ${merchants.find(mc => mc.id === merchantId)!.name}`
                              : merchantQuery)
                          : merchantQuery
                      }
                      onChange={e => {
                        setMerchantQuery(e.target.value)
                        setMerchantId('')
                        setMerchantDropdownOpen(true)
                      }}
                      onFocus={() => setMerchantDropdownOpen(true)}
                      placeholder={loadingMerchants ? 'Loading...' : m.placeholderMerchant}
                      disabled={loadingMerchants}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    {merchantDropdownOpen && !loadingMerchants && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                        {filteredMerchants.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-400">ไม่พบร้านค้า</div>
                        ) : (
                          filteredMerchants.map(mc => (
                            <div
                              key={mc.id}
                              onMouseDown={e => {
                                e.preventDefault()
                                setMerchantId(mc.id)
                                setMerchantQuery('')
                                setMerchantDropdownOpen(false)
                              }}
                              className={clsx(
                                'px-4 py-2.5 text-sm cursor-pointer hover:bg-primary-50 transition-colors',
                                merchantId === mc.id && 'bg-primary-50 text-primary-700 font-medium'
                              )}
                            >
                              <span className="font-semibold">{mc.code}</span>
                              {mc.name && <span className="text-gray-500"> — {mc.name}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
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

