'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { merchantApi } from '@/lib/api/merchant.api'
import { webhookApi, type WebhookConfigItem, type WebhookPayload } from '@/lib/api/webhook.api'
import type { MerchantItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Globe, CheckCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function webhookId(w: WebhookConfigItem): string {
  return w.webhookId ?? w.id ?? w.webhookConfigId ?? ''
}

function isActive(w: WebhookConfigItem): boolean {
  return w.isActive === true
}

function isValidWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' && u.hostname.includes('.')
  } catch {
    return false
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
        <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
        {children}
      </h2>
      {action}
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">{value || '—'}</div>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useLang()
  const m = t.webhook
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{m.statusActive}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 ring-1 ring-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{m.statusDisabled}
    </span>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, desc, confirmLabel, cancelLabel, onConfirm, onCancel, loading, danger }: {
  title: string; desc: string; confirmLabel: string; cancelLabel: string
  onConfirm: () => void; onCancel: () => void; loading: boolean; danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          {danger ? <Trash2 className="w-7 h-7 text-white" /> : <Globe className="w-7 h-7 text-white" />}
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/60 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={clsx('flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 transition-colors uppercase',
              danger ? 'bg-red-600/80 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
            )}>
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Header Entry ─────────────────────────────────────────────────────────────

interface HeaderEntry { key: string; value: string }

// ── Webhook Form Modal ────────────────────────────────────────────────────────

function WebhookFormModal({ orgId, merchantId, editing, onClose, onSaved, m }: {
  orgId: string; merchantId: string
  editing: WebhookConfigItem | null
  onClose: () => void
  onSaved: () => void
  m: Record<string, string>
}) {
  const [eventName, setEventName] = useState(editing?.eventName ?? 'Payment.Success')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [endpointUrl, setEndpointUrl] = useState(editing?.endpointUrl ?? '')
  const [httpMethod, setHttpMethod] = useState(editing?.httpMethod ?? 'POST')
  const isActive = editing?.isActive ?? true
  const [secretKey, setSecretKey] = useState(editing?.secretKey ?? '')
  const [signatureAlgorithm, setSignatureAlgorithm] = useState(editing?.signatureAlgorithm ?? 'HMAC-SHA256')
  const [headers, setHeaders] = useState<HeaderEntry[]>(() => {
    try {
      const src = editing?.headersDefinition
        ? JSON.parse(editing.headersDefinition)
        : editing?.headers
      if (!src || typeof src !== 'object') return []
      return Object.entries(src as Record<string, string>).map(([key, value]) => ({ key, value }))
    } catch {
      return []
    }
  })
  const [headerKey, setHeaderKey] = useState('')
  const [headerValue, setHeaderValue] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!endpointUrl.trim()) errs.endpointUrl = m.endpointRequired
    else if (!isValidWebhookUrl(endpointUrl.trim())) errs.endpointUrl = m.endpointInvalid
    if (!eventName) errs.eventName = m.eventNameRequired
    if (!httpMethod) errs.httpMethod = m.httpMethodRequired
    if (!signatureAlgorithm) errs.signatureAlgorithm = m.signatureAlgorithmRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addHeader = () => {
    const k = headerKey.trim()
    const v = headerValue.trim()
    if (!k) return
    if (headers.some(h => h.key === k)) {
      setErrors(p => ({ ...p, headerKey: m.duplicateHeaderKey }))
      return
    }
    setHeaders(prev => [...prev, { key: k, value: v }])
    setHeaderKey('')
    setHeaderValue('')
    setErrors(p => ({ ...p, headerKey: '' }))
  }

  const removeHeader = (key: string) => setHeaders(prev => prev.filter(h => h.key !== key))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError('')
    const payload: WebhookPayload = {
      EventName: eventName,
      Description: description.trim() || undefined,
      EndpointUrl: endpointUrl.trim(),
      HttpMethod: httpMethod,
      IsActive: isActive,
      SecretKey: secretKey.trim() || undefined,
      SignatureAlgorithm: signatureAlgorithm,
      Headers: headers.length ? Object.fromEntries(headers.map(h => [h.key, h.value])) : undefined,
    }
    try {
      let res: any
      if (editing) {
        res = await webhookApi.updateWebhookConfigById(orgId, webhookId(editing), payload)
      } else {
        res = await webhookApi.addMerchantWebhookConfig(orgId, merchantId, payload)
      }
      const data = res?.data as any
      const apiStatus = (data?.Stats ?? data?.stats ?? data?.status ?? '').toString().toUpperCase()
      if (apiStatus && apiStatus !== 'OK') {
        setApiError(data?.message ?? data?.description ?? apiStatus)
        return
      }
      toast.success(editing ? m.updatedSuccess : m.addedSuccess)
      onSaved()
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : (editing ? m.failedToUpdate : m.failedToAdd))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = (hasErr: boolean) => clsx(
    'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
    hasErr ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
  )

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{editing ? m.editTitle : m.addTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault() }} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{apiError}</div>
            )}

            {/* Row 1: EventName + HttpMethod */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={m.fieldEventName} required error={errors.eventName}>
                <select value={eventName} onChange={e => setEventName(e.target.value)} className={inputCls(!!errors.eventName)}>
                  <option value="Payment.Success">Payment.Success</option>
                  <option value="PaymentOut.Success">PaymentOut.Success</option>
                </select>
              </FormField>
              <FormField label={m.fieldHttpMethod} required error={errors.httpMethod}>
                <select value={httpMethod} onChange={e => setHttpMethod(e.target.value)} className={inputCls(!!errors.httpMethod)}>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </FormField>
            </div>

            {/* EndpointUrl */}
            <FormField label={m.fieldEndpointUrl} required error={errors.endpointUrl}>
              <input value={endpointUrl} onChange={e => { setEndpointUrl(e.target.value); setErrors(p => ({ ...p, endpointUrl: '' })) }}
                placeholder="https://your-server.com/webhook" className={inputCls(!!errors.endpointUrl)} />
            </FormField>

            {/* Description */}
            <FormField label={m.fieldDescription}>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder={m.descriptionPlaceholder} className={inputCls(false)} />
            </FormField>

            {/* Row 2: SecretKey + SignatureAlgorithm */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label={m.fieldSecretKey}>
                <input value={secretKey} onChange={e => setSecretKey(e.target.value)}
                  placeholder="secret" className={inputCls(false)} />
              </FormField>
              <FormField label={m.fieldSignatureAlgorithm} required error={errors.signatureAlgorithm}>
                <select value={signatureAlgorithm} onChange={e => setSignatureAlgorithm(e.target.value)} className={inputCls(!!errors.signatureAlgorithm)}>
                  <option value="HMAC-SHA256">HMAC-SHA256</option>
                </select>
              </FormField>
            </div>

            {/* Headers */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{m.fieldHeaders}</label>
              {headers.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {headers.map(h => (
                    <div key={h.key} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <span className="font-mono font-semibold text-gray-700 min-w-0 truncate">{h.key}</span>
                      <span className="text-gray-400">:</span>
                      <span className="text-gray-600 flex-1 min-w-0 truncate">{h.value}</span>
                      <button type="button" onClick={() => removeHeader(h.key)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <input value={headerKey} onChange={e => { setHeaderKey(e.target.value); setErrors(p => ({ ...p, headerKey: '' })) }}
                    placeholder={m.fieldHeaderKey}
                    className={clsx(inputCls(!!errors.headerKey), 'font-mono')} />
                  {errors.headerKey && <p className="text-red-500 text-xs mt-1">{errors.headerKey}</p>}
                </div>
                <input value={headerValue} onChange={e => setHeaderValue(e.target.value)}
                  placeholder={m.fieldHeaderValue} className={clsx(inputCls(false), 'flex-1')} />
                <button type="button" onClick={addHeader}
                  className="px-3 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap">
                  {m.addHeader}
                </button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex-none flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              {m.btnCancel}
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors">
              {saving && <Spinner />}
              {saving ? m.btnSaving : m.btnSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WebhookPage() {
  const { t } = useLang()
  const m = t.webhook
  const router = useRouter()
  const params = useParams()
  const merchantId = params.id as string

  const [merchant, setMerchant] = useState<MerchantItem | null>(null)
  const [orgId, setOrgId] = useState('')
  const [webhooks, setWebhooks] = useState<WebhookConfigItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(true)

  const [selectedRowId, setSelectedRowId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('webhook_highlight') ?? null : null
  )

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<WebhookConfigItem | null>(null)

  const [confirmModal, setConfirmModal] = useState<{
    type: 'enable' | 'disable' | 'delete'
    webhook: WebhookConfigItem
  } | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Load merchant info
  useEffect(() => {
    merchantApi.getMerchantById(merchantId)
      .then(res => {
        const raw = res.data as any
        const mer: MerchantItem = raw?.merchant ?? raw?.Merchant ?? raw
        setMerchant(mer)
        setOrgId(mer.orgId ?? mer.code ?? '')
      })
      .catch(() => toast.error(m.failedToLoad))
  }, [merchantId])

  const fetchWebhooks = async (currentPage: number, oid = orgId) => {
    if (!oid) return
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.allSettled([
        webhookApi.getWebhookConfigsByMerchantId(oid, merchantId, { page: currentPage, limit: itemsPerPage }),
        webhookApi.getWebhookConfigsCountByMerchantId(oid, merchantId),
      ])
      if (listRes.status === 'fulfilled') {
        const raw = listRes.value.data as any
        setWebhooks(Array.isArray(raw) ? raw : (raw?.webhookConfigs ?? raw?.WebhookConfigs ?? []))
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : (raw?.count ?? raw?.Count ?? 0))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) fetchWebhooks(page, orgId)
  }, [orgId, page, itemsPerPage])

  const handleConfirm = async () => {
    if (!confirmModal) return
    setConfirming(true)
    const wid = webhookId(confirmModal.webhook)
    try {
      if (confirmModal.type === 'delete') {
        await webhookApi.deleteWebhookById(orgId, wid)
        toast.success(m.deletedSuccess)
      } else if (confirmModal.type === 'enable') {
        await webhookApi.enableWebhookConfigById(orgId, wid)
        toast.success(m.enabledSuccess)
      } else {
        await webhookApi.disableWebhookConfigById(orgId, wid)
        toast.success(m.disabledSuccess)
      }
      setConfirmModal(null)
      fetchWebhooks(page, orgId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoad)
    } finally {
      setConfirming(false)
    }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = [m.colEventName, m.colDescription, m.colEndpoint, m.colStatus, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Confirm modals */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.type === 'delete' ? m.confirmDeleteTitle : confirmModal.type === 'enable' ? m.confirmEnableTitle : m.confirmDisableTitle}
          desc={confirmModal.type === 'delete' ? m.confirmDeleteDesc : confirmModal.type === 'enable' ? m.confirmEnableDesc : m.confirmDisableDesc}
          confirmLabel={confirmModal.type === 'delete' ? m.btnDelete : confirmModal.type === 'enable' ? m.btnEnable : m.btnDisable}
          cancelLabel={m.btnCancel}
          danger={confirmModal.type === 'delete'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
          loading={confirming}
        />
      )}

      {/* Form modal */}
      {showForm && orgId && (
        <WebhookFormModal
          orgId={orgId}
          merchantId={merchantId}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); fetchWebhooks(page, orgId) }}
          m={m as unknown as Record<string, string>}
        />
      )}

      {/* Page header */}
      <div className="flex-none flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/business-setup/merchant')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">

        {/* Merchant info (readonly) */}
        <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5">
          <SectionHeader>{m.merchantInfoSection}</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ReadonlyField label={m.labelMerchantCode} value={merchant?.code} />
            <ReadonlyField label={m.labelMerchantName} value={merchant?.name} />
            <ReadonlyField label={m.labelEmail} value={merchant?.contactEmail} />
            <ReadonlyField label={m.labelMerchantStatus} value={merchant?.status} />
          </div>
        </div>

        {/* Webhook list */}
        <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <SectionHeader>{m.webhookListSection}</SectionHeader>
            <button
              onClick={() => { setEditing(null); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {m.addWebhook}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Spinner />
              <span className="ml-2 text-sm">{m.loading}</span>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm font-semibold text-gray-500">{m.noWebhooks}</p>
              <p className="text-xs text-gray-400 mt-1">{m.noWebhooksSubtitle}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[15%]" /><col className="w-[18%]" /><col className="w-[37%]" /><col className="w-[12%]" /><col className="w-[18%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50/80">
                      {cols.map((col, i) => (
                        <th key={i} className={clsx(
                          'px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap text-left',
                          i === 0 && 'rounded-tl-xl',
                          i === cols.length - 1 && 'rounded-tr-xl text-center',
                        )}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map((w, idx) => {
                      const wid = webhookId(w)
                      const highlighted = !!wid && selectedRowId === wid
                      return (
                      <tr key={wid}
                        onClick={() => {
                          const next = selectedRowId === wid ? null : wid
                          setSelectedRowId(next)
                          if (next) sessionStorage.setItem('webhook_highlight', next)
                          else sessionStorage.removeItem('webhook_highlight')
                        }}
                        className={clsx(
                          'cursor-pointer transition-colors',
                          highlighted
                            ? 'bg-primary-100'
                            : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                        )}
                      >
                        {/* Event Name */}
                        <td className="px-5 py-3.5 border-b border-gray-100">
                          <button
                            onClick={e => { e.stopPropagation(); setEditing(w); setShowForm(true) }}
                            className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                          >
                            <Pencil className="w-3.5 h-3.5 flex-shrink-0" />
                            {w.eventName || '—'}
                          </button>
                        </td>

                        {/* Description */}
                        <td className="px-5 py-3.5 border-b border-gray-100">
                          <span className="text-sm text-gray-600 truncate block">{w.description || '—'}</span>
                        </td>

                        {/* Endpoint / Method */}
                        <td className="px-5 py-3.5 border-b border-gray-100">
                          <p className="text-sm text-gray-700 font-mono truncate">{w.endpointUrl || '—'}</p>
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[11px] font-bold bg-primary-50 text-primary-700 rounded">
                            {w.httpMethod || '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 border-b border-gray-100">
                          <StatusBadge active={isActive(w)} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 border-b border-gray-100 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isActive(w) ? (
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmModal({ type: 'disable', webhook: w }) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                {m.btnDisable}
                              </button>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmModal({ type: 'enable', webhook: w }) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                {m.btnEnable}
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmModal({ type: 'delete', webhook: w }) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {m.btnDelete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{m.rowsPerPage}</span>
                  <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
                    className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
                    {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {m.of} {total}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0 || loading}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}