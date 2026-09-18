'use client'
// trigger rebuild

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { adminConfigApi, type ClientIpScope } from '@/lib/api/admin-config.api'
import { merchantApi } from '@/lib/api/merchant.api'
import type { OrganizationPolicyData } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { RefreshCw } from 'lucide-react'

type Tab = 'client-ip' | 'whitelist' | 'blacklist'

const SELF_ORG_ID = 'global'

// ── IP / CIDR validation (mirrors the merchant blacklist screen) ────────────

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(\/(3[0-2]|[1-2]?\d))?$/
const IPV6_REGEX = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))(\/(12[0-8]|1[01]\d|\d\d?))?$/

function isValidIpOrCidr(value: string): boolean {
  const v = value.trim()
  return IPV4_REGEX.test(v) || IPV6_REGEX.test(v)
}

function parseCsvList(value?: string | null): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

function IpTagInput({ label, hint, value, onChange, disabled, tone = 'whitelist' }: { label: string; hint?: string; value: string[]; onChange: (next: string[]) => void; disabled?: boolean; tone?: 'whitelist' | 'blacklist' }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const v = input.trim()
    if (!v) return
    if (!isValidIpOrCidr(v)) { setError('Invalid IP / CIDR format'); return }
    if (value.includes(v)) { setInput(''); return }
    onChange([...value, v])
    setInput('')
    setError('')
  }

  const tagClass = tone === 'blacklist'
    ? 'bg-red-50 text-red-700 ring-1 ring-red-300'
    : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300'

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{label}</label>
      <div className="w-full min-h-[42px] px-3 py-1.5 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
        {value.map(ip => (
          <span key={ip} className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold', tagClass)}>
            {ip}
            {!disabled && (
              <button type="button" onClick={() => onChange(value.filter(x => x !== ip))} className="hover:text-red-900">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder="1.2.3.4 or 1.2.3.0/24"
            className="flex-1 min-w-[140px] text-sm bg-transparent outline-none placeholder-gray-400 font-mono"
          />
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function SelfIpPolicySection({ mode }: { mode: 'whitelist' | 'blacklist' }) {
  const { t } = useLang()
  const m = t.misc
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orgPolicy, setOrgPolicy] = useState<OrganizationPolicyData | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await merchantApi.getOrganizationPolicy(SELF_ORG_ID)
      const data = res.data as any
      setOrgPolicy(data?.organizationPolicy ?? data?.OrganizationPolicy ?? null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = async (field: 'webWhitelistIps' | 'apiWhitelistIps' | 'webBlacklistIps' | 'apiBlacklistIps', next: string[]) => {
    setSaving(true)
    try {
      const payload = {
        WebWhitelistIps: parseCsvList(orgPolicy?.webWhitelistIps).join(','),
        ApiWhitelistIps: parseCsvList(orgPolicy?.apiWhitelistIps).join(','),
        WebBlacklistIps: parseCsvList(orgPolicy?.webBlacklistIps).join(','),
        ApiBlacklistIps: parseCsvList(orgPolicy?.apiBlacklistIps).join(','),
        [field.charAt(0).toUpperCase() + field.slice(1)]: next.join(','),
      }
      const res = await merchantApi.setOrganizationPolicy(SELF_ORG_ID, payload)
      const data = res.data as any
      setOrgPolicy(data?.organizationPolicy ?? data?.OrganizationPolicy ?? null)
      toast.success(m.saveSuccess)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  const isBlacklist = mode === 'blacklist'
  const webField = isBlacklist ? 'webBlacklistIps' : 'webWhitelistIps'
  const apiField = isBlacklist ? 'apiBlacklistIps' : 'apiWhitelistIps'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <p className="text-sm font-bold text-gray-900">{isBlacklist ? m.selfBlacklistTitle : m.selfWhitelistTitle}</p>
        <p className="text-xs text-gray-500 mt-0.5">{isBlacklist ? m.selfBlacklistDesc : m.selfWhitelistDesc}</p>
      </div>

      <div className="p-6 space-y-5">
        <IpTagInput
          label={m.fieldWebIps}
          value={parseCsvList(orgPolicy?.[webField])}
          onChange={next => handleUpdate(webField, next)}
          disabled={saving}
          tone={mode}
        />
        <IpTagInput
          label={m.fieldApiIps}
          value={parseCsvList(orgPolicy?.[apiField])}
          onChange={next => handleUpdate(apiField, next)}
          disabled={saving}
          tone={mode}
        />
        {isBlacklist && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-amber-700">{m.selfBlacklistWarning}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MiscellaneousPage() {
  const { t } = useLang()
  const m = t.misc
  const [tab, setTab] = useState<Tab>('client-ip')

  return (
    <div className="flex flex-col gap-5 h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none">
        <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
      </div>

      <div className="flex-none flex gap-1">
        <button
          onClick={() => setTab('client-ip')}
          className={clsx(
            'px-4 py-1.5 text-sm font-semibold rounded-full transition-colors',
            tab === 'client-ip' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
          )}
        >
          {m.tabClientIp}
        </button>
        <button
          onClick={() => setTab('whitelist')}
          className={clsx(
            'px-4 py-1.5 text-sm font-semibold rounded-full transition-colors',
            tab === 'whitelist' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
          )}
        >
          {m.tabWhitelist}
        </button>
        <button
          onClick={() => setTab('blacklist')}
          className={clsx(
            'px-4 py-1.5 text-sm font-semibold rounded-full transition-colors',
            tab === 'blacklist' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
          )}
        >
          {m.tabBlacklist}
        </button>
      </div>

      {tab === 'client-ip' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-2">
          <ClientIpSourceSection scope="Backend" title={m.scopeBackendTitle} desc={m.scopeBackendDesc} />
          <ClientIpSourceSection scope="Api" title={m.scopeApiTitle} desc={m.scopeApiDesc} />
        </div>
      )}

      {tab === 'whitelist' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-2">
          <SelfIpPolicySection mode="whitelist" />
        </div>
      )}

      {tab === 'blacklist' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-2">
          <SelfIpPolicySection mode="blacklist" />
        </div>
      )}
    </div>
  )
}

const SOURCE_TYPES = ['Native', 'Header'] as const

function ClientIpSourceSection({ scope, title, desc }: { scope: ClientIpScope; title: string; desc: string }) {
  const { t } = useLang()
  const m = t.misc

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const [sourceType, setSourceType] = useState<'Native' | 'Header'>('Native')
  const [headerName, setHeaderName] = useState('')
  const [headerIndex, setHeaderIndex] = useState<string>('0')
  const [errors, setErrors] = useState<{ headerName?: string }>({})

  const [resolvedIp, setResolvedIp] = useState<string | null | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [rawHeaderValue, setRawHeaderValue] = useState<string | null | undefined>(undefined)
  const [testing, setTesting] = useState(false)

  const refreshResolvedIp = async () => {
    if (scope === 'Backend') {
      const res = await adminConfigApi.getClientIpDebug()
      setResolvedIp(res.resolvedIp)
      setNote(res.note)
      setRawHeaderValue(res.rawHeaderValue)
      return null
    }
    const res = await adminConfigApi.getClientIpSource('Api')
    setResolvedIp(res.data?.resolvedIp)
    setNote(undefined)
    setRawHeaderValue(res.data?.rawHeaderValue)
    return res
  }

  const load = async () => {
    setLoading(true)
    try {
      const apiRes = await refreshResolvedIp()
      const cfgRes = apiRes ?? await adminConfigApi.getClientIpSource(scope)
      const cfg = cfgRes.data?.configuration?.clientIpSourceConfig
      setSourceType((cfg?.sourceType as 'Native' | 'Header') ?? 'Native')
      setHeaderName(cfg?.headerName ?? '')
      setHeaderIndex(cfg?.headerIndex != null ? String(cfg.headerIndex) : '0')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code !== 'NOT_FOUND') {
        toast.error(err instanceof Error ? err.message : m.loadFailed)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTest = async () => {
    setTesting(true)
    try {
      await refreshResolvedIp()
    } catch {
      /* keep last known value */
    } finally {
      setTesting(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setErrors({})
    load()
  }

  const handleSave = async () => {
    if (sourceType === 'Header' && !headerName.trim()) {
      setErrors({ headerName: m.validationHeaderNameRequired })
      return
    }
    setSaving(true)
    try {
      await adminConfigApi.setClientIpSource(scope, {
        SourceType: sourceType,
        HeaderName: sourceType === 'Header' ? headerName.trim() : undefined,
        HeaderIndex: sourceType === 'Header' ? parseInt(headerIndex || '0', 10) : undefined,
      } as any)
      toast.success(m.saveSuccess)
      setEditing(false)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {m.btnEdit}
          </button>
        )}
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{m.fieldSourceType}</label>
            {editing ? (
              <>
                <select
                  value={sourceType}
                  onChange={e => setSourceType(e.target.value as 'Native' | 'Header')}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                >
                  {SOURCE_TYPES.map(st => (
                    <option key={st} value={st}>{st === 'Native' ? m.sourceTypeNative : m.sourceTypeHeader}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">{m.sourceTypeHint}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                {sourceType === 'Native' ? m.sourceTypeNative : m.sourceTypeHeader}
              </p>
            )}
          </div>

          {sourceType === 'Header' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{m.fieldHeaderName}</label>
                {editing ? (
                  <>
                    <input
                      value={headerName}
                      onChange={e => { setHeaderName(e.target.value); setErrors({}) }}
                      placeholder={m.fieldHeaderNamePlaceholder}
                      className={clsx(
                        'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                        errors.headerName ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                      )}
                    />
                    {errors.headerName && <p className="text-red-500 text-xs mt-1">{errors.headerName}</p>}
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                    {headerName || m.notConfigured}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{m.fieldHeaderIndex}</label>
                {editing ? (
                  <input
                    type="number"
                    step={1}
                    value={headerIndex}
                    onChange={e => setHeaderIndex(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm font-semibold text-gray-900 bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                    {headerIndex}
                  </p>
                )}
                {editing && <p className="text-xs text-gray-400 mt-1">{m.fieldHeaderIndexHint}</p>}
              </div>
            </>
          )}
        </div>

        {sourceType === 'Native' && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-amber-700">
              {scope === 'Backend' ? m.sourceTypeNativeWarningBackend : m.sourceTypeNativeWarning}
            </p>
          </div>
        )}

        {!editing && (
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{m.currentIpTitle}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5 font-mono">{resolvedIp || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">{note || m.currentIpTestHint}</p>
                {rawHeaderValue && (
                  <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{m.rawHeaderValueLabel}</p>
                    <p className="text-xs font-mono font-semibold text-gray-900 break-all mt-0.5">{rawHeaderValue}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors disabled:opacity-60 flex-shrink-0"
              >
                <RefreshCw className={clsx('w-4 h-4', testing && 'animate-spin')} />
                {m.currentIpTestButton}
              </button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {m.btnCancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? m.btnSaving : m.btnSave}
          </button>
        </div>
      )}
    </div>
  )
}
