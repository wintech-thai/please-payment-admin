'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'
import { riskPolicyApi } from '@/lib/api/risk-policy.api'

const LIST_PATH = '/risk-management/policies'

function RuleToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 py-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 flex-shrink-0"
      />
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </label>
  )
}

export default function RiskPolicyFormPage() {
  const { t } = useLang()
  const m = t.riskPolicy
  const router = useRouter()
  const params = useParams()
  const policyId = params.policyId as string
  const isNew = policyId === 'add'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<{ name?: string }>({})

  const [allowBlankPayerName, setAllowBlankPayerName] = useState(false)
  const [allowUnknownPayerName, setAllowUnknownPayerName] = useState(false)
  const [allowSuspiciousPayerName, setAllowSuspiciousPayerName] = useState(false)
  const [allowMaliciousPayerName, setAllowMaliciousPayerName] = useState(false)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    riskPolicyApi.getRiskPolicyById(policyId)
      .then(res => {
        const p = res.data?.riskPolicy
        if (!p) { toast.error(m.failedToLoadPolicy); router.push(LIST_PATH); return }
        setName(p.name ?? '')
        setDescription(p.description ?? '')
        setTags(p.tags ? p.tags.split(',').map(tg => tg.trim()).filter(Boolean) : [])
        setAllowBlankPayerName(p.allowBlankPayerName)
        setAllowUnknownPayerName(p.allowUnknownPayerName)
        setAllowSuspiciousPayerName(p.allowSuspiciousPayerName)
        setAllowMaliciousPayerName(p.allowMaliciousPayerName)
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : m.failedToLoadPolicy))
      .finally(() => setLoading(false))
  }, [policyId, isNew])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && !tags.includes(val)) { setTags(prev => [...prev, val]); markDirty() }
      setTagInput('')
    }
  }
  const removeTag = (tag: string) => { setTags(prev => prev.filter(tg => tg !== tag)); markDirty() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) { setErrors({ name: m.validationNameRequired }); return }

    setSaving(true)
    try {
      const payload = {
        Name: trimmedName,
        Description: description.trim() || undefined,
        Tags: tags.length > 0 ? tags.join(',') : undefined,
        AllowBlankPayerName: allowBlankPayerName,
        AllowUnknownPayerName: allowUnknownPayerName,
        AllowSuspiciousPayerName: allowSuspiciousPayerName,
        AllowMaliciousPayerName: allowMaliciousPayerName,
      }
      if (isNew) {
        const res = await riskPolicyApi.addRiskPolicy(payload)
        const newId = res.data?.riskPolicy?.id
        setIsDirty(false)
        toast.success(m.createSuccess)
        router.push(newId ? `${LIST_PATH}?highlight=${newId}` : LIST_PATH)
      } else {
        await riskPolicyApi.updateRiskPolicyById(policyId, payload)
        setIsDirty(false)
        toast.success(m.updateSuccess)
        router.push(LIST_PATH)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToSave)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
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
      <div className="flex-none flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => guardNavigation(() => router.push(LIST_PATH))} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isNew ? m.createTitle : m.editTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{isNew ? m.createSubtitle : m.editSubtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              {/* Name */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldName} <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); markDirty() }}
                  placeholder={m.fieldNamePlaceholder}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${errors.name ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'}`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{m.fieldTags}</label>
                <div
                  className="w-full min-h-[42px] px-3 py-1.5 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('policy-tag-input')?.focus()}
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
                    id="policy-tag-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? m.fieldTagsPlaceholder : ''}
                    className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{m.fieldDescription}</label>
                <textarea
                  value={description}
                  onChange={e => { setDescription(e.target.value); markDirty() }}
                  placeholder={m.fieldDescriptionPlaceholder}
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                />
              </div>
            </div>
          </div>

          {/* Pay-In Request Rules */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-1">
              <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
              {m.sectionPayInRules}
            </h2>
            <div className="divide-y divide-gray-100">
              <RuleToggle
                label={m.ruleAllowBlankPayerName}
                desc={m.ruleAllowBlankPayerNameDesc}
                checked={allowBlankPayerName}
                onChange={v => { setAllowBlankPayerName(v); markDirty() }}
              />
              <RuleToggle
                label={m.ruleAllowUnknownPayerName}
                desc={m.ruleAllowUnknownPayerNameDesc}
                checked={allowUnknownPayerName}
                onChange={v => { setAllowUnknownPayerName(v); markDirty() }}
              />
              <RuleToggle
                label={m.ruleAllowSuspiciousPayerName}
                desc={m.ruleAllowSuspiciousPayerNameDesc}
                checked={allowSuspiciousPayerName}
                onChange={v => { setAllowSuspiciousPayerName(v); markDirty() }}
              />
              <RuleToggle
                label={m.ruleAllowMaliciousPayerName}
                desc={m.ruleAllowMaliciousPayerNameDesc}
                checked={allowMaliciousPayerName}
                onChange={v => { setAllowMaliciousPayerName(v); markDirty() }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push(LIST_PATH))}
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
            {saving ? t.admin.saving : t.admin.save}
          </button>
        </div>
      </form>
    </div>
  )
}
