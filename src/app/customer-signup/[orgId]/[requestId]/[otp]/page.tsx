'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Upload, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import NavbarClean from '@/components/NavbarClean'
import { LanguageProvider, useLang } from '@/context/LanguageContext'

const BANKS: { code: string; nameTh: string; nameEn: string }[] = [
  { code: 'BBL', nameTh: 'ธนาคารกรุงเทพ', nameEn: 'Bank of Bangkok' },
  { code: 'KBANK', nameTh: 'ธนาคารกสิกรไทย', nameEn: 'Kasikorn Bank' },
  { code: 'KTB', nameTh: 'ธนาคารกรุงไทย', nameEn: 'Krung Thai Bank' },
  { code: 'TMB', nameTh: 'ธนาคารทหารไทย', nameEn: 'Bank of Thailand (TMB)' },
  { code: 'SCB', nameTh: 'ธนาคารไทยพาณิชย์', nameEn: 'Siam Commercial Bank' },
  { code: 'CITI', nameTh: 'ธนาคารซิตี้แบงก์', nameEn: 'Citibank' },
  { code: 'SCBT', nameTh: 'ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)', nameEn: 'Standard Chartered Bank (Thailand)' },
  { code: 'CIMBT', nameTh: 'ธนาคารซีไอเอ็มบี ไทย', nameEn: 'CIMB Thai Bank' },
  { code: 'UOB', nameTh: 'ธนาคารยูโอบี', nameEn: 'United Overseas Bank' },
  { code: 'BAY', nameTh: 'ธนาคารกรุงศรีอยุธยา', nameEn: 'Bank of Ayudhya' },
  { code: 'GSB', nameTh: 'ธนาคารออมสิน', nameEn: 'Government Savings Bank' },
  { code: 'EXIM', nameTh: 'ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย', nameEn: 'Export-Import Bank of Thailand' },
  { code: 'TISCO', nameTh: 'ธนาคารทิสโก้', nameEn: 'Tisco Bank' },
  { code: 'ICBC', nameTh: 'ธนาคารไอซีบีซี (ไทย)', nameEn: 'Industrial and Commercial Bank of China (Thailand)' },
  { code: 'LHFG', nameTh: 'ธนาคารแลนด์ แอนด์ เฮ้าส์', nameEn: 'Land and Houses Bank' },
]

const SHOP_CODE_REGEX = /^[a-z0-9_-]{3,20}$/
const USERNAME_REGEX = /^[a-zA-Z0-9._:-]{4,80}$/

const BASE = '/api/proxy/admin-api/AdminServiceRequest/org/global/action'

// x089 ปรับแก้ 3 : book bank photos need to stay legible when admin opens the full-size preview,
// so this keeps more resolution/quality than the slip-upload copy of this function
async function compressImageToBase64(file: File, maxWidth = 1800, quality = 0.9): Promise<string> {
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

function pick<T>(d: any, camel: string, pascal: string): T | undefined {
  return d?.[camel] ?? d?.[pascal]
}

type PageState = 'loading' | 'invalid' | 'expired' | 'form' | 'approved' | 'rejected' | 'submitting' | 'success'

function CustomerSignupContent() {
  const params = useParams()
  const requestId = params?.requestId as string
  const otp = params?.otp as string
  const { t, lang } = useLang()
  const m = t.customerSignup

  const [pageState, setPageState] = useState<PageState>('loading')
  const [email, setEmail] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [promptPayId, setPromptPayId] = useState('')
  const [shopCode, setShopCode] = useState('')
  const [username, setUsername] = useState('')
  const [bookBankFile, setBookBankFile] = useState<File | null>(null)
  const [bookBankPreview, setBookBankPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!requestId || !otp) { setPageState('invalid'); return }
    fetch(`${BASE}/GetPleasePaymentServiceRequestByRequestIdOtp/${requestId}/${otp}`)
      .then(r => r.json())
      .then(data => {
        const status = pick<string>(data, 'status', 'Status')
        const sr = pick<any>(data, 'serviceRequest', 'ServiceRequest')
        if (status === 'EXPIRED') { setPageState('expired'); return }
        if (status !== 'OK' || !sr) { setPageState('invalid'); return }

        const srStatus = pick<string>(sr, 'status', 'Status') || ''
        setEmail(pick(sr, 'email', 'Email') || '')
        setFirstName(pick(sr, 'firstName', 'FirstName') || '')
        setLastName(pick(sr, 'lastName', 'LastName') || '')
        setPhone(pick(sr, 'phone', 'Phone') || '')
        setBankCode(pick(sr, 'bankCode', 'BankCode') || '')
        setBankAccountNumber(pick(sr, 'bankAccountNumber', 'BankAccountNumber') || '')
        setBankAccountName(pick(sr, 'bankAccountName', 'BankAccountName') || '')
        setPromptPayId(pick(sr, 'promptPayId', 'PromptPayId') || '')
        setShopCode(pick(sr, 'shopCode', 'ShopCode') || '')
        setUsername(pick(sr, 'username', 'Username') || '')

        if (srStatus === 'Approved') setPageState('approved')
        else if (srStatus === 'Rejected') setPageState('rejected')
        else setPageState('form')
      })
      .catch(() => setPageState('invalid'))
  }, [requestId, otp])

  const clearErr = (k: string) => setErrors(p => ({ ...p, [k]: '' }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (bookBankPreview) URL.revokeObjectURL(bookBankPreview)
    setBookBankFile(file)
    setBookBankPreview(URL.createObjectURL(file))
  }

  const handleRemoveFile = () => {
    setBookBankFile(null)
    if (bookBankPreview) URL.revokeObjectURL(bookBankPreview)
    setBookBankPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.firstName = m.errRequired
    if (!lastName.trim()) errs.lastName = m.errRequired
    if (!bankCode) errs.bankCode = m.errRequired
    if (!bankAccountNumber.trim()) errs.bankAccountNumber = m.errRequired
    if (!shopCode.trim() || !SHOP_CODE_REGEX.test(shopCode.trim())) errs.shopCode = m.errShopCode
    if (!username.trim() || !USERNAME_REGEX.test(username.trim())) errs.username = m.errUsername
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (bookBankFile) {
        const base64 = await compressImageToBase64(bookBankFile)
        const upRes = await fetch(`${BASE}/UploadPleasePaymentServiceRequestBookBank/${requestId}/${otp}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ FileContent: base64, MimeType: bookBankFile.type, Description: 'BookBank' }),
        })
        const upData = await upRes.json()
        if (pick<string>(upData, 'status', 'Status') !== 'OK') {
          toast.error(pick(upData, 'description', 'Description') || m.errorDefault)
          setSubmitting(false)
          return
        }
      }

      const res = await fetch(`${BASE}/SavePleasePaymentServiceRequest/${requestId}/${otp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          FirstName: firstName.trim(),
          LastName: lastName.trim(),
          Phone: phone.trim(),
          BankCode: bankCode,
          BankAccountNumber: bankAccountNumber.trim(),
          BankAccountName: bankAccountName.trim(),
          PromptPayId: promptPayId.trim() || null,
          ShopCode: shopCode.trim(),
          Username: username.trim(),
        }),
      })
      const data = await res.json()
      if (pick<string>(data, 'status', 'Status') === 'OK') {
        setPageState('success')
      } else {
        toast.error(pick(data, 'description', 'Description') || m.errorDefault)
      }
    } catch {
      toast.error(m.errorDefault)
    } finally {
      setSubmitting(false)
    }
  }

  const gradientStyle = { background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)' }
  const showForm = pageState === 'form' || pageState === 'submitting'

  return (
    <>
      <NavbarClean />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10 mt-16">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 pt-8 pb-6 text-white" style={gradientStyle}>
              <h1 className="text-xl font-bold mb-1">{m.title}</h1>
              <p className="text-sm text-orange-200">{m.subtitle}</p>
            </div>

            <div className="px-8 py-7">
              {pageState === 'loading' && (
                <div className="flex flex-col items-center py-10 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">{m.loading}</p>
                </div>
              )}

              {pageState === 'invalid' && <StateMessage variant="error" title={m.invalidTitle} desc={m.invalidDesc} />}
              {pageState === 'expired' && <StateMessage variant="error" title={m.expiredTitle} desc={m.expiredDesc} />}
              {pageState === 'approved' && <StateMessage variant="success" title={m.approvedTitle} desc={m.approvedDesc} />}
              {pageState === 'rejected' && <StateMessage variant="error" title={m.rejectedTitle} desc={m.rejectedDesc} />}
              {pageState === 'success' && <StateMessage variant="success" title={m.successTitle} desc={m.successDesc} />}

              {showForm && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Field label={m.email}>
                    <input type="text" value={email} readOnly className={clsx(inputCls, 'bg-gray-50 text-gray-500')} />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label={m.firstName} required error={errors.firstName}>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => { setFirstName(e.target.value); clearErr('firstName') }}
                        disabled={submitting}
                        className={clsx(inputCls, errors.firstName && 'border-red-400 focus:ring-red-400')}
                      />
                    </Field>
                    <Field label={m.lastName} required error={errors.lastName}>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => { setLastName(e.target.value); clearErr('lastName') }}
                        disabled={submitting}
                        className={clsx(inputCls, errors.lastName && 'border-red-400 focus:ring-red-400')}
                      />
                    </Field>
                  </div>

                  <Field label={m.phone}>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} disabled={submitting} className={inputCls} />
                  </Field>

                  <div className="border-t border-gray-100" />

                  <Field label={m.bankCode} required error={errors.bankCode}>
                    <select
                      value={bankCode}
                      onChange={e => { setBankCode(e.target.value); clearErr('bankCode') }}
                      disabled={submitting}
                      className={clsx(inputCls, errors.bankCode && 'border-red-400 focus:ring-red-400')}
                    >
                      <option value="">{m.bankCodePlaceholder}</option>
                      {BANKS.map(b => (
                        <option key={b.code} value={b.code}>{b.code} — {lang === 'th' ? b.nameTh : b.nameEn}</option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label={m.bankAccountNumber} required error={errors.bankAccountNumber}>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={e => { setBankAccountNumber(e.target.value); clearErr('bankAccountNumber') }}
                        disabled={submitting}
                        className={clsx(inputCls, errors.bankAccountNumber && 'border-red-400 focus:ring-red-400')}
                      />
                    </Field>
                    <Field label={m.bankAccountName}>
                      <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} disabled={submitting} className={inputCls} />
                    </Field>
                  </div>

                  <Field label={m.promptPayId}>
                    <input type="text" value={promptPayId} onChange={e => setPromptPayId(e.target.value)} disabled={submitting} className={inputCls} />
                  </Field>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">{m.bookBank}</label>
                    {!bookBankFile ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting}
                        className="w-full border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-xl py-8 flex flex-col items-center gap-2 transition-colors bg-gray-50 hover:bg-orange-50"
                      >
                        <Upload className="w-6 h-6 text-primary-600" />
                        <p className="text-sm text-gray-600">{m.bookBankSelect}</p>
                      </button>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        <img src={bookBankPreview!} alt="book bank" className="w-full object-contain max-h-60" />
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                          aria-label="Remove image"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>

                  <div className="border-t border-gray-100" />

                  <Field label={m.shopCode} required error={errors.shopCode}>
                    <input
                      type="text"
                      value={shopCode}
                      onChange={e => { setShopCode(e.target.value.toLowerCase()); clearErr('shopCode') }}
                      disabled={submitting}
                      placeholder={m.shopCodePlaceholder}
                      className={clsx(inputCls, errors.shopCode && 'border-red-400 focus:ring-red-400')}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{m.shopCodeHint}</p>
                  </Field>

                  <Field label={m.username} required error={errors.username}>
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); clearErr('username') }}
                      disabled={submitting}
                      placeholder={m.usernamePlaceholder}
                      className={clsx(inputCls, errors.username && 'border-red-400 focus:ring-red-400')}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{m.usernameHint}</p>
                  </Field>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {m.submitting}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        {m.submit}
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center pt-1">{m.footer}</p>
                </form>
              )}
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">Secure &bull; Reliable &bull; Fast</p>
        </div>
      </div>
    </>
  )
}

export default function CustomerSignupPage() {
  return (
    <LanguageProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading...</p>
          </div>
        </div>
      }>
        <CustomerSignupContent />
      </Suspense>
    </LanguageProvider>
  )
}

function StateMessage({ variant, title, desc }: { variant: 'success' | 'error'; title: string; desc: string }) {
  const isSuccess = variant === 'success'
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className={clsx('w-14 h-14 rounded-full flex items-center justify-center mb-4', isSuccess ? 'bg-green-50' : 'bg-red-50')}>
        {isSuccess ? <CheckCircle2 className="w-7 h-7 text-green-500" /> : <AlertCircle className="w-7 h-7 text-red-400" />}
      </div>
      <p className="text-gray-800 font-semibold text-base mb-1">{title}</p>
      <p className="text-xs text-gray-400 mt-3">{desc}</p>
    </div>
  )
}

function Field({ label, required, error, children }: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
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

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors'
