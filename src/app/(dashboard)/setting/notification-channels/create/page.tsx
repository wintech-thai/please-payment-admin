'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notificationApi } from '@/lib/api/notification.api'
import { toast } from 'sonner'
import { ChevronLeft, X, Check } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

const EVENT_TYPE_META: Record<string, { label: string; checkedCls: string; dotCls: string }> = {
  'Payment.Success':                    { label: 'Payment In Success',      checkedCls: 'border-emerald-400 bg-emerald-50 text-emerald-700', dotCls: 'bg-emerald-400' },
  'PaymentOut.Success':                 { label: 'Payment Out Success',     checkedCls: 'border-emerald-400 bg-emerald-50 text-emerald-700', dotCls: 'bg-emerald-400' },
  'PaymentIn.Rejected':                 { label: 'Payment In Rejected',     checkedCls: 'border-rose-400 bg-rose-50 text-rose-700',         dotCls: 'bg-rose-400' },
  'PaymentOut.Rejected':                { label: 'Payment Out Rejected',    checkedCls: 'border-rose-400 bg-rose-50 text-rose-700',         dotCls: 'bg-rose-400' },
  'Payment.Unidentified':               { label: 'Payment Unidentified',    checkedCls: 'border-amber-400 bg-amber-50 text-amber-700',      dotCls: 'bg-amber-400' },
  'Payment.DailyTxAmountLimitExceeded': { label: 'Daily Tx Limit Exceeded', checkedCls: 'border-orange-400 bg-orange-50 text-orange-700',   dotCls: 'bg-orange-400' },
  'Backup.Done':                        { label: 'Backup Done',             checkedCls: 'border-sky-400 bg-sky-50 text-sky-700',            dotCls: 'bg-sky-400' },
  'Restore.Success':                    { label: 'Restore Success',         checkedCls: 'border-teal-400 bg-teal-50 text-teal-700',         dotCls: 'bg-teal-400' },
  'Restore.Failed':                     { label: 'Restore Failed',          checkedCls: 'border-rose-400 bg-rose-50 text-rose-700',         dotCls: 'bg-rose-400' },
}

function CreateNotiChannelContent() {
  const { t } = useLang()
  const m = t.notiChannel
  const router = useRouter()
  const searchParams = useSearchParams()
  const channelType = searchParams.get('type') ?? ''

  const [channelName, setChannelName] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('')
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([])
  const [loadingEventTypes, setLoadingEventTypes] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  const isDiscord = channelType.toLowerCase() === 'discord'
  const isTelegram = channelType.toLowerCase() === 'telegram'

  useEffect(() => {
    const load = async () => {
      setLoadingEventTypes(true)
      try {
        const res = await notificationApi.getEventTypes()
        const data = res.data as any
        const types: any[] = Array.isArray(data) ? data : (data?.eventTypes ?? data?.types ?? [])
        setAvailableEventTypes(types.map((t: any) => (typeof t === 'string' ? t : t?.name ?? t?.type ?? String(t))))
      } catch {
        // silently ignore
      } finally {
        setLoadingEventTypes(false)
      }
    }
    load()
  }, [])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && !tags.includes(val)) { setTags(prev => [...prev, val]); markDirty() }
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => { setTags(prev => prev.filter(t => t !== tag)); markDirty() }

  const toggleEventType = (et: string) => {
    setSelectedEventTypes(prev =>
      prev.includes(et) ? prev.filter(x => x !== et) : [...prev, et]
    )
    setErrors(p => ({ ...p, eventTypes: '' }))
    markDirty()
  }

  const DISCORD_WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/
  const TELEGRAM_TOKEN_RE = /^\d+:[\w-]+$/
  const TELEGRAM_CHAT_ID_RE = /^-?\d+$/

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!channelName.trim()) errs.channelName = m.validationChannelNameRequired
    if (isDiscord) {
      const url = discordWebhookUrl.trim()
      if (!url) errs.discordWebhookUrl = m.validationWebhookRequired
      else if (!DISCORD_WEBHOOK_RE.test(url)) errs.discordWebhookUrl = m.validationWebhookFormat
    }
    if (isTelegram) {
      const token = telegramToken.trim()
      if (!token) errs.telegramToken = m.validationTokenRequired
      else if (!TELEGRAM_TOKEN_RE.test(token)) errs.telegramToken = m.validationTokenFormat
      const chatId = telegramChatId.trim()
      if (!chatId) errs.telegramChatId = m.validationChatIdRequired
      else if (!TELEGRAM_CHAT_ID_RE.test(chatId)) errs.telegramChatId = m.validationChatIdFormat
    }
    if (selectedEventTypes.length === 0) errs.eventTypes = m.validationEventTypesRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: any = {
        ChannelName: channelName.trim(),
        Type: channelType,
        Status: 'Enabled',
        EventTypes: selectedEventTypes,
      }
      if (description.trim()) payload.Description = description.trim()
      if (tags.length > 0) payload.Tags = tags.join(',')
      if (isDiscord) payload.DiscordWebhookUrl = discordWebhookUrl.trim()
      if (isTelegram) {
        payload.TelegramWebhookUrl = telegramToken.trim()
        payload.TelegramChatId = telegramChatId.trim()
      }
      const res = await notificationApi.addChannel(payload)
      const data = res.data as any
      const newId = data?.channelId ?? data?.id ?? data?.notiChannelId ?? data?.channel?.channelId
      setIsDirty(false)
      toast.success(m.createSuccess)
      router.push(`/setting/notification-channels${newId ? `?highlight=${newId}` : ''}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.createFailed)
    } finally {
      setSaving(false)
    }
  }

  if (!channelType) {
    router.push('/setting/notification-channels')
    return null
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push('/setting/notification-channels'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.createTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.createSubtitle}</p>
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
              {/* Type (readonly) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldType}
                </label>
                <input
                  value={channelType}
                  readOnly
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Channel Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldChannelName} <span className="text-red-500">*</span>
                </label>
                <input
                  value={channelName}
                  onChange={e => { setChannelName(e.target.value); setErrors(p => ({ ...p, channelName: '' })); markDirty() }}
                  placeholder={m.fieldChannelNamePlaceholder}
                  className={clsx(
                    'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                    errors.channelName ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                  )}
                />
                {errors.channelName && <p className="text-red-500 text-xs mt-1">{errors.channelName}</p>}
              </div>

              {/* Tags */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldTags}
                </label>
                <div
                  className="w-full min-h-[44px] px-3 py-2 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('nc-tag-input')?.focus()}
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
                    id="nc-tag-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? m.fieldTagsPlaceholder : ''}
                    className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{m.fieldTagsHint}</p>
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

              {/* Discord fields */}
              {isDiscord && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                    {m.fieldDiscordWebhookUrl} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={discordWebhookUrl}
                    onChange={e => { setDiscordWebhookUrl(e.target.value); setErrors(p => ({ ...p, discordWebhookUrl: '' })); markDirty() }}
                    placeholder={m.fieldDiscordWebhookUrlPlaceholder}
                    className={clsx(
                      'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                      errors.discordWebhookUrl ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                    )}
                  />
                  {errors.discordWebhookUrl && <p className="text-red-500 text-xs mt-1">{errors.discordWebhookUrl}</p>}
                </div>
              )}

              {/* Telegram fields */}
              {isTelegram && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      {m.fieldTelegramToken} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={telegramToken}
                      onChange={e => { setTelegramToken(e.target.value); setErrors(p => ({ ...p, telegramToken: '' })); markDirty() }}
                      placeholder={m.fieldTelegramTokenPlaceholder}
                      className={clsx(
                        'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                        errors.telegramToken ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                      )}
                    />
                    {errors.telegramToken
                      ? <p className="text-red-500 text-xs mt-1">{errors.telegramToken}</p>
                      : <p className="text-xs text-gray-400 mt-1">{m.fieldTelegramTokenHint}</p>
                    }
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      {m.fieldTelegramChatId} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={telegramChatId}
                      onChange={e => { setTelegramChatId(e.target.value); setErrors(p => ({ ...p, telegramChatId: '' })); markDirty() }}
                      placeholder={m.fieldTelegramChatIdPlaceholder}
                      className={clsx(
                        'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                        errors.telegramChatId ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                      )}
                    />
                    {errors.telegramChatId && <p className="text-red-500 text-xs mt-1">{errors.telegramChatId}</p>}
                  </div>
                </>
              )}

              {/* Event Types */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldEventTypes} <span className="text-red-500">*</span>
                </label>
                <div className={clsx(
                  'w-full p-3 border rounded-lg',
                  errors.eventTypes ? 'border-red-400 bg-red-50/30' : 'border-gray-200 bg-gray-50/40'
                )}>
                  {loadingEventTypes ? (
                    <span className="text-sm text-gray-400">Loading...</span>
                  ) : availableEventTypes.length === 0 ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableEventTypes.map(et => {
                        const meta = EVENT_TYPE_META[et]
                        const checked = selectedEventTypes.includes(et)
                        return (
                          <button
                            key={et}
                            type="button"
                            onClick={() => toggleEventType(et)}
                            className={clsx(
                              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all text-left',
                              checked
                                ? (meta?.checkedCls ?? 'border-primary-400 bg-primary-50 text-primary-700')
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            <span className={clsx('w-2 h-2 rounded-full flex-shrink-0 transition-colors', checked ? (meta?.dotCls ?? 'bg-primary-400') : 'bg-gray-300')} />
                            <span className="flex-1">{meta?.label ?? et}</span>
                            {checked && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                {errors.eventTypes && <p className="text-red-500 text-xs mt-1">{errors.eventTypes}</p>}
                <p className="text-xs text-gray-400 mt-1">{m.fieldEventTypesHint}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-none flex justify-end gap-3 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push('/setting/notification-channels'))}
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

export default function CreateNotiChannelPage() {
  return (
    <Suspense>
      <CreateNotiChannelContent />
    </Suspense>
  )
}
