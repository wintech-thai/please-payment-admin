'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentGatewayApi } from '@/lib/api/payment-gateway.api'
import type { PaymentGatewayItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

export default function UpdatePaymentGatewayPage() {
  const { t } = useLang()
  const m = t.paymentGateway
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<PaymentGatewayItem | null>(null)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [endpointBaseUrl, setEndpointBaseUrl] = useState('')
  const [endpointOrgId, setEndpointOrgId] = useState('')
  const [endpointMerchantId, setEndpointMerchantId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    paymentGatewayApi.getPaymentGatewayById(id)
      .then(res => {
        const raw = (res.data as any)?.paymentGateway ?? res.data
        const pg: PaymentGatewayItem = raw
        setItem(pg)
        setCode(pg.code ?? '')
        setDescription(pg.description ?? '')
        setEndpointBaseUrl(pg.endpointBaseUrl ?? '')
        setEndpointOrgId(pg.endpointOrgId ?? '')
        setEndpointMerchantId(pg.endpointMerchantId ?? '')
        setApiKey(pg.apiKey ?? '')
        setTags(pg.tags ? pg.tags.split(',').map(s => s.trim()).filter(Boolean) : [])
      })
      .catch(() => {
        toast.error(m.failedToLoad)
        router.push(`/setting/payment-gateway?highlight=${id}`)
      })
      .finally(() => setLoading(false))
  }, [id])

  const schemeLabel = item?.scheme === 'PleasePayment' ? m.schemePleasePayment : item?.scheme

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && !tags.includes(val)) { setTags(prev => [...prev, val]); markDirty() }
      setTagInput('')
    }
  }
  const removeTag = (tag: string) => { setTags(prev => prev.filter(tg => tg !== tag)); markDirty() }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!code.trim()) errs.code = m.validationCodeRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!isDirty) { router.push(`/setting/payment-gateway?highlight=${id}`); return }
    setSaving(true)
    try {
      await paymentGatewayApi.updatePaymentGatewayById(id, {
        Code: code.trim(),
        Description: description.trim() || undefined,
        EndpointBaseUrl: endpointBaseUrl.trim() || undefined,
        EndpointOrgId: endpointOrgId.trim() || undefined,
        EndpointMerchantId: endpointMerchantId.trim() || undefined,
        ApiKey: apiKey.trim() || undefined,
        Tags: tags.length > 0 ? tags.join(',') : undefined,
      })
      setIsDirty(false)
      toast.success(m.updateSuccess)
      router.push(`/setting/payment-gateway?highlight=${id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.updateFailed)
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

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(`/setting/payment-gateway?highlight=${id}`))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.updateTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.updateSubtitle} &quot;{item?.code}&quot;</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{m.sectionInfo}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
              {/* Scheme (readonly, locked) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldScheme}
                </label>
                <input
                  value={schemeLabel ?? ''}
                  readOnly
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldCode} <span className="text-red-500">*</span>
                </label>
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value); setErrors(p => ({ ...p, code: '' })); markDirty() }}
                  placeholder={m.fieldCodePlaceholder}
                  className={clsx(
                    'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                    errors.code ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                  )}
                />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldDescription}
                </label>
                <input
                  value={description}
                  onChange={e => { setDescription(e.target.value); markDirty() }}
                  placeholder={m.fieldDescriptionPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Endpoint Base URL */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldEndpointBaseUrl}
                </label>
                <input
                  value={endpointBaseUrl}
                  onChange={e => { setEndpointBaseUrl(e.target.value); markDirty() }}
                  placeholder={m.fieldEndpointBaseUrlPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                />
              </div>

              {/* Endpoint Org ID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldEndpointOrgId}
                </label>
                <input
                  value={endpointOrgId}
                  onChange={e => { setEndpointOrgId(e.target.value); markDirty() }}
                  placeholder={m.fieldEndpointOrgIdPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Endpoint Merchant ID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldEndpointMerchantId}
                </label>
                <input
                  value={endpointMerchantId}
                  onChange={e => { setEndpointMerchantId(e.target.value); markDirty() }}
                  placeholder={m.fieldEndpointMerchantIdPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* API Key */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldApiKey}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); markDirty() }}
                  placeholder={m.fieldApiKeyPlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                />
              </div>

              {/* Tags */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldTags}
                </label>
                <div
                  className="w-full min-h-[44px] px-3 py-2 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('pg-tag-input-edit')?.focus()}
                >
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-xs font-semibold">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="pg-tag-input-edit"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? m.fieldTagsPlaceholder : ''}
                    className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-none flex justify-end gap-3 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push(`/setting/payment-gateway?highlight=${id}`))}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.admin.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? t.admin.saving : t.admin.saveChanges}
          </button>
        </div>
      </form>
    </div>
  )
}
