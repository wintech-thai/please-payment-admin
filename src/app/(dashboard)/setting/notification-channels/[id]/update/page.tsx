'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { notificationApi } from '@/lib/api/notification.api'
import { toast } from 'sonner'
import { ChevronLeft, X } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

export default function UpdateNotiChannelPage() {
  const { t } = useLang()
  const m = t.notiChannel
  const router = useRouter()
  const params = useParams()
  const channelId = params.id as string

  const [channelType, setChannelType] = useState('')
  const [channelStatus, setChannelStatus] = useState('')
  const [channelName, setChannelName] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('')
  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  const isDiscord = channelType.toLowerCase() === 'discord'
  const isTelegram = channelType.toLowerCase() === 'telegram'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [channelRes, eventTypesRes] = await Promise.allSettled([
          notificationApi.getChannelById(channelId),
          notificationApi.getEventTypes(),
        ])
        if (channelRes.status === 'fulfilled') {
          const data = channelRes.value.data as any
          const ch = data?.channel ?? data?.notiChannel ?? data
          setChannelType(ch?.type ?? ch?.Type ?? '')
          setChannelStatus(ch?.status ?? ch?.Status ?? '')
          setChannelName(ch?.channelName ?? ch?.name ?? ch?.ChannelName ?? '')
          setDescription(ch?.description ?? ch?.Description ?? '')
          const rawTags: string = ch?.tags ?? ch?.Tags ?? ''
          setTags(rawTags ? rawTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [])
          setDiscordWebhookUrl(ch?.discordWebhookUrl ?? ch?.DiscordWebhookUrl ?? '')
          setTelegramToken(ch?.telegramWebhookUrl ?? ch?.TelegramWebhookUrl ?? '')
          setTelegramChatId(ch?.telegramChatId ?? ch?.TelegramChatId ?? '')
          const rawEventTypes: string[] = ch?.eventTypes ?? ch?.EventTypes ?? []
          setSelectedEventTypes(Array.isArray(rawEventTypes) ? rawEventTypes : [])
        } else {
          toast.error(m.loadFailed)
          router.push('/setting/notification-channels')
        }
        if (eventTypesRes.status === 'fulfilled') {
          const data = eventTypesRes.value.data as any
          const types: any[] = Array.isArray(data) ? data : (data?.eventTypes ?? data?.types ?? [])
          setAvailableEventTypes(types.map((t: any) => (typeof t === 'string' ? t : t?.name ?? t?.type ?? String(t))))
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.loadFailed)
        router.push('/setting/notification-channels')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [channelId])

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
    if (!isDirty) {
      router.push(`/setting/notification-channels?highlight=${channelId}`)
      return
    }
    if (!validate()) return
    setSaving(true)
    try {
      const payload: any = {
        ChannelName: channelName.trim(),
        EventTypes: selectedEventTypes,
      }
      if (description.trim()) payload.Description = description.trim()
      if (tags.length > 0) payload.Tags = tags.join(',')
      if (isDiscord) payload.DiscordWebhookUrl = discordWebhookUrl.trim()
      if (isTelegram) {
        payload.TelegramWebhookUrl = telegramToken.trim()
        payload.TelegramChatId = telegramChatId.trim()
      }
      await notificationApi.updateChannelById(channelId, payload)
      setIsDirty(false)
      toast.success(m.saveSuccess)
      router.push(`/setting/notification-channels?highlight=${channelId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.saveFailed)
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
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(`/setting/notification-channels?highlight=${channelId}`))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{m.editTitle}</h1>
            {channelName && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{channelName}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{m.editSubtitle}</p>
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

              {/* Status (readonly) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Status
                </label>
                <input
                  value={channelStatus}
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

              {/* Description */}
              <div>
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

              {/* Tags */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldTags}
                </label>
                <div
                  className="w-full min-h-[44px] px-3 py-2 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('ncu-tag-input')?.focus()}
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
                    id="ncu-tag-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? m.fieldTagsPlaceholder : ''}
                    className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{m.fieldTagsHint}</p>
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
                  'w-full min-h-[80px] p-3 border rounded-lg',
                  errors.eventTypes ? 'border-red-400 bg-red-50/30' : 'border-gray-200 bg-gray-50/40'
                )}>
                  {availableEventTypes.length === 0 ? (
                    <span className="text-sm text-gray-400">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {availableEventTypes.map(et => (
                        <label key={et} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedEventTypes.includes(et)}
                            onChange={() => toggleEventType(et)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">{et}</span>
                        </label>
                      ))}
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
            onClick={() => guardNavigation(() => router.push(`/setting/notification-channels?highlight=${channelId}`))}
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
