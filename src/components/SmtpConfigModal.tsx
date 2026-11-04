'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { adminConfigApi } from '@/lib/api/admin-config.api'
import { useLang } from '@/context/LanguageContext'

function deriveDefaultFromDomain(): string {
  if (typeof window === 'undefined') return ''
  const host = window.location.hostname
  const parts = host.split('.')
  if (parts.length > 2 && parts[0].startsWith('admin')) {
    return parts.slice(1).join('.')
  }
  return host
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type TestState = 'idle' | 'pending' | 'success' | 'failed' | 'timeout'

export default function SmtpConfigModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const sc = t.smtpConfig

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [smtpUser, setSmtpUser] = useState('')
  const [maskedPassword, setMaskedPassword] = useState('')
  const [hasExistingPassword, setHasExistingPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [fromDomain, setFromDomain] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [testEmail, setTestEmail] = useState('')
  const [testState, setTestState] = useState<TestState>('idle')
  const [testLog, setTestLog] = useState('')
  const [testErrors, setTestErrors] = useState<Record<string, string>>({})
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    adminConfigApi.getSmtpConfig()
      .then(res => {
        const raw = res.data as any
        if (raw?.status === 'NOT_FOUND') {
          setSmtpUser('')
          setMaskedPassword('')
          setHasExistingPassword(false)
          setFromDomain(deriveDefaultFromDomain())
          return
        }
        const cfg = raw?.configuration?.smtpConfig ?? {}
        setSmtpUser(cfg.smtpUser ?? '')
        setMaskedPassword(cfg.smtpPassword ?? '')
        setHasExistingPassword(!!cfg.smtpPassword)
        setFromDomain(cfg.smtpFromDomain || deriveDefaultFromDomain())
      })
      .catch(() => {
        toast.error(sc.toastLoadFailed)
        setFromDomain(deriveDefaultFromDomain())
      })
      .finally(() => setLoading(false))

    return () => { cancelledRef.current = true }
  }, [])

  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  async function handleSave() {
    if (!smtpUser.trim()) {
      setErrors({ smtpUser: sc.smtpUserRequired })
      return
    }
    setSaving(true)
    try {
      await adminConfigApi.setSmtpConfig({
        smtpUser: smtpUser.trim(),
        smtpFromDomain: fromDomain.trim() || undefined,
        ...(changingPassword && newPassword ? { smtpPassword: newPassword } : {}),
      })
      toast.success(sc.toastSaved)
      setChangingPassword(false)
      setNewPassword('')
      onClose()
    } catch (err: any) {
      toast.error(err?.message || sc.toastSaveFailed)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim()) {
      setTestErrors({ testEmail: sc.testEmailRequired })
      return
    }
    setTestErrors({})
    setTestState('pending')
    setTestLog('')
    try {
      const res = await adminConfigApi.submitTestEmailJob(testEmail.trim())
      const jobId = (res.data as any)?.jobId
      if (!jobId) {
        setTestState('failed')
        return
      }

      for (let i = 0; i < 20; i++) {
        await sleep(1000)
        if (cancelledRef.current) return

        const jobRes = await adminConfigApi.getTestEmailJobById(jobId)
        const job = jobRes.data as any
        if ((job?.succeedCount ?? 0) > 0) {
          setTestState('success')
          setTestLog(job?.jobMessage ?? '')
          return
        }
        if ((job?.failedCount ?? 0) > 0) {
          setTestState('failed')
          setTestLog(job?.jobMessage ?? '')
          return
        }
      }
      setTestState('timeout')
    } catch (err: any) {
      setTestState('failed')
      toast.error(err?.message || sc.testFailed)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">{sc.modalTitle}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{sc.modalSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                {sc.fieldSmtpUser} <span className="text-red-500">*</span>
              </label>
              <input
                value={smtpUser}
                onChange={e => { setSmtpUser(e.target.value); clearErr('smtpUser') }}
                placeholder={sc.fieldSmtpUserPlaceholder}
                className={clsx(
                  'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
                  errors.smtpUser ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                )}
              />
              {errors.smtpUser && <p className="text-red-500 text-xs mt-1">{errors.smtpUser}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                {sc.fieldSmtpPassword}
              </label>
              {changingPassword ? (
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={sc.fieldSmtpPasswordPlaceholder}
                    autoFocus
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { setChangingPassword(false); setNewPassword('') }}
                    className="px-3 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    {sc.btnCancelChangePassword}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={hasExistingPassword ? maskedPassword : ''}
                    readOnly
                    placeholder={hasExistingPassword ? undefined : '—'}
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setChangingPassword(true)}
                    className="px-3 py-2 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap"
                  >
                    {sc.btnChangePassword}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                {sc.fieldFromDomain}
              </label>
              <input
                value={fromDomain}
                onChange={e => setFromDomain(e.target.value)}
                placeholder={sc.fieldFromDomainPlaceholder}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors"
              />
              <p className="text-[11px] text-gray-400 mt-1">{sc.fieldFromDomainHint}</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {sc.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
              >
                {saving ? sc.btnSaving : sc.btnSave}
              </button>
            </div>

            {/* Test Email */}
            <div className="pt-4 mt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{sc.sectionTestEmail}</p>
              <div className="flex gap-2">
                <input
                  value={testEmail}
                  onChange={e => { setTestEmail(e.target.value); setTestErrors({}) }}
                  placeholder={sc.fieldTestEmailPlaceholder}
                  className={clsx(
                    'flex-1 px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
                    testErrors.testEmail ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                  )}
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={testState === 'pending'}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-900 disabled:opacity-60 transition-colors"
                >
                  {testState === 'pending' && (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {testState === 'pending' ? sc.btnSending : sc.btnSendTest}
                </button>
              </div>
              {testErrors.testEmail && <p className="text-red-500 text-xs mt-1">{testErrors.testEmail}</p>}

              {testState !== 'idle' && (
                <div className={clsx(
                  'mt-3 px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2',
                  testState === 'pending' && 'bg-gray-50 text-gray-500',
                  testState === 'success' && 'bg-emerald-50 text-emerald-700',
                  (testState === 'failed' || testState === 'timeout') && 'bg-red-50 text-red-600',
                )}>
                  {testState === 'pending' && sc.testPending}
                  {testState === 'success' && sc.testSuccess}
                  {testState === 'failed' && sc.testFailed}
                  {testState === 'timeout' && sc.testTimeout}
                </div>
              )}

              {testLog && (
                <div className="mt-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{sc.testLogTitle}</p>
                  <pre className="font-sans text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                    {testLog}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
