'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, X, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'
import { iocApi } from '@/lib/api/ioc.api'

const LIST_PATH = '/risk-management/indicator-of-compromise'
const REPUTATIONS = ['Unknown', 'Neutral', 'Trusted', 'Suspicious', 'Malicious'] as const

function ScoreSlider({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const hue = Math.max(0, Math.min(120, 120 - (value / 100) * 120))
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</label>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold text-white tabular-nums"
          style={{ backgroundColor: `hsl(${hue}, 70%, 45%)` }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-60"
        style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)' }}
      />
    </div>
  )
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

export default function IocFormPage() {
  const { t } = useLang()
  const m = t.ioc
  const router = useRouter()
  const params = useParams()
  const iocId = params.iocId as string
  const isNew = iocId === 'add'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [iocType, setIocType] = useState('PayerName')
  const [iocValue, setIocValue] = useState('')
  const [source, setSource] = useState('')
  const [riskScore, setRiskScore] = useState(0)
  const [confidenceScore, setConfidenceScore] = useState(0)
  const [reputation, setReputation] = useState('Unknown')
  const [note, setNote] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<{ iocValue?: string }>({})

  const [seenCount, setSeenCount] = useState(0)
  const [firstSeenDate, setFirstSeenDate] = useState<string | null>(null)
  const [lastSeenDate, setLastSeenDate] = useState<string | null>(null)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    iocApi.getIocById(iocId)
      .then(res => {
        const ioc = res.data?.ioc
        if (!ioc) { toast.error(m.failedToLoadIoc); router.push(LIST_PATH); return }
        setIocType(ioc.iocType ?? 'PayerName')
        setIocValue(ioc.iocValue ?? '')
        setSource(ioc.source ?? '')
        setRiskScore(ioc.riskScore ?? 0)
        setConfidenceScore(ioc.confidenceScore ?? 0)
        setReputation(ioc.reputation ?? 'Unknown')
        setNote(ioc.noted ?? '')
        setTags(ioc.tags ? ioc.tags.split(',').map(tg => tg.trim()).filter(Boolean) : [])
        setSeenCount(ioc.seenCount ?? 0)
        setFirstSeenDate(ioc.firstSeenDate ?? null)
        setLastSeenDate(ioc.lastSeenDate ?? null)
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : m.failedToLoadIoc))
      .finally(() => setLoading(false))
  }, [iocId, isNew])

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
    const trimmedValue = iocValue.trim()
    if (!trimmedValue) { setErrors({ iocValue: m.validationIocValueRequired }); return }

    setSaving(true)
    try {
      if (isNew) {
        const res = await iocApi.addIoc({
          IocType: iocType,
          IocValue: trimmedValue,
          Source: source.trim() || undefined,
          RiskScore: riskScore,
          ConfidenceScore: confidenceScore,
          Reputation: reputation,
          Noted: note.trim() || undefined,
          Tags: tags.length > 0 ? tags.join(',') : undefined,
        })
        const newId = res.data?.ioc?.id
        setIsDirty(false)
        toast.success(m.createSuccess)
        router.push(newId ? `${LIST_PATH}?highlight=${newId}` : LIST_PATH)
      } else {
        await iocApi.updateIocById(iocId, {
          Source: source.trim() || undefined,
          RiskScore: riskScore,
          ConfidenceScore: confidenceScore,
          Reputation: reputation,
          Noted: note.trim() || undefined,
          Tags: tags.length > 0 ? tags.join(',') : undefined,
        })
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

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await iocApi.deleteIocById(iocId)
      toast.success(m.deleteSuccess)
      router.push(LIST_PATH)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToDelete)
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)}>
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{m.confirmDeleteTitle}</h3>
            <p className="text-sm text-white/60 mb-7">{m.confirmDeleteDesc}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
                {t.admin.cancel}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600/80 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors uppercase">
                {deleting ? t.admin.deleting : t.admin.delete}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {!isNew && (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {m.deleteIoc}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              {/* IocType */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{m.fieldIocType}</label>
                <select
                  value={iocType}
                  onChange={e => { setIocType(e.target.value); markDirty() }}
                  disabled={!isNew}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="PayerName">PayerName</option>
                </select>
              </div>

              {/* IocValue */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldIocValue} <span className="text-red-500">*</span>
                </label>
                <input
                  value={iocValue}
                  onChange={e => { setIocValue(e.target.value); setErrors(p => ({ ...p, iocValue: '' })); markDirty() }}
                  placeholder={m.fieldIocValuePlaceholder}
                  disabled={!isNew}
                  className={clsx(
                    'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500',
                    errors.iocValue ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                  )}
                />
                {errors.iocValue && <p className="text-red-500 text-xs mt-1">{errors.iocValue}</p>}
              </div>

              {/* Source */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{m.fieldSource}</label>
                <input
                  value={source}
                  onChange={e => { setSource(e.target.value); markDirty() }}
                  placeholder={m.fieldSourcePlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* RiskScore */}
              <ScoreSlider label={m.fieldRiskScore} value={riskScore} onChange={v => { setRiskScore(v); markDirty() }} />

              {/* ConfidenceScore */}
              <ScoreSlider label={m.fieldConfidenceScore} value={confidenceScore} onChange={v => { setConfidenceScore(v); markDirty() }} />

              {/* Reputation */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{m.fieldReputation}</label>
                <select
                  value={reputation}
                  onChange={e => { setReputation(e.target.value); markDirty() }}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {REPUTATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Tags */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{m.fieldTags}</label>
                <div
                  className="w-full min-h-[42px] px-3 py-1.5 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('ioc-tag-input')?.focus()}
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
                    id="ioc-tag-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? m.fieldTagsPlaceholder : ''}
                    className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{m.fieldNote}</label>
                <textarea
                  value={note}
                  onChange={e => { setNote(e.target.value); markDirty() }}
                  placeholder={m.fieldNotePlaceholder}
                  rows={6}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                />
              </div>
            </div>
          </div>

          {/* Readonly system info — edit mode only */}
          {!isNew && (
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-7 py-6">
              <p className="text-xs text-gray-400 mb-4">{m.readonlyFieldsNote}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{m.fieldSeenCount}</label>
                  <p className="text-sm text-gray-700 tabular-nums">{seenCount}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{m.fieldFirstSeenDate}</label>
                  <p className="text-sm text-gray-700">{formatDate(firstSeenDate)}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{m.fieldLastSeenDate}</label>
                  <p className="text-sm text-gray-700">{formatDate(lastSeenDate)}</p>
                </div>
              </div>
            </div>
          )}
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
