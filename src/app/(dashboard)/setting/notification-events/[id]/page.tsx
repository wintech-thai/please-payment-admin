'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { notificationApi } from '@/lib/api/notification.api'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'payment.success': { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  'paymentout.success': { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  'payment.failed': { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  'payment.unidentified': { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  'agent.notready': { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  'agent.ready': { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
}
const DEFAULT_EVENT_COLOR = { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200' }
function getEventTypeColor(type: string) {
  return EVENT_TYPE_COLORS[type.toLowerCase()] ?? DEFAULT_EVENT_COLOR
}
const EVENT_TYPE_LABELS: Record<string, string> = {
  'Payment.Success': 'Payment In Success',
  'PaymentOut.Success': 'Payment Out Success',
  'Agent.NotReady': 'LINE Agent Not Ready',
  'Agent.Ready': 'LINE Agent Ready',
}
function getEventTypeLabel(type: string) {
  return EVENT_TYPE_LABELS[type] ?? type
}

function MessageList({ lines }: { lines: string[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {lines.map((msg, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="text-sm text-gray-700 leading-relaxed break-all">{msg.trim()}</span>
        </li>
      ))}
    </ol>
  )
}

function MessageTabs({ messages, messages2, label }: { messages: string[]; messages2: string[]; label: string }) {
  const [activeTab, setActiveTab] = useState<'msg1' | 'msg2'>('msg2')
  const hasBoth = messages.length > 0 && messages2.length > 0
  const activeList = activeTab === 'msg1' ? messages : messages2

  if (!hasBoth) {
    const list = messages2.length > 0 ? messages2 : messages
    return (
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{label}</p>
        <MessageList lines={list} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-3">{label}</p>
        <button
          onClick={() => setActiveTab('msg1')}
          className={clsx('px-3 py-1 text-xs font-semibold rounded-full transition-colors', activeTab === 'msg1' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
        >
          Message 1
        </button>
        <button
          onClick={() => setActiveTab('msg2')}
          className={clsx('px-3 py-1 text-xs font-semibold rounded-full transition-colors', activeTab === 'msg2' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
        >
          Message 2
        </button>
      </div>
      <MessageList lines={activeList} />
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

function JobStatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'done' || s === 'success' || s === 'completed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'failed' || s === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <AlertCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-3.5 h-3.5" />{status ?? '—'}
    </span>
  )
}

export default function NotiEventDetailPage() {
  const { t } = useLang()
  const m = t.notiEvent
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await notificationApi.getEventById(eventId)
        const raw = res.data as any
        setData(raw?.event ?? raw?.notiEvent ?? raw?.job ?? raw)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.loadDetailFailed)
        router.push('/setting/notification-events')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId])

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch { return d }
  }

  const getJobMessages = (): string[] => {
    if (!data) return []
    const raw = data.jobMessage ?? data.JobMessage ?? []
    if (Array.isArray(raw)) return raw.map(String)
    if (typeof raw === 'string') return raw.split('\n').filter(Boolean)
    return []
  }

  const getJobMessages2 = (): string[] => {
    if (!data) return []
    const raw = data.jobMessage2 ?? data.JobMessage2 ?? []
    if (Array.isArray(raw)) return raw.map(String)
    if (typeof raw === 'string') return raw.split('\n').filter(Boolean)
    return []
  }

  const getParameters = (): { name: string; value: string }[] => {
    if (!data) return []
    const raw = data.parameters ?? data.Parameters ?? data.params ?? null
    if (Array.isArray(raw)) {
      return raw.map((p: any) => ({
        name: p?.name ?? p?.Name ?? p?.key ?? p?.Key ?? '',
        value: String(p?.value ?? p?.Value ?? p?.val ?? ''),
      }))
    }
    if (raw && typeof raw === 'object') {
      return Object.entries(raw).map(([k, v]) => ({ name: k, value: String(v) }))
    }
    return []
  }

  const tags: string = data?.tags ?? data?.Tags ?? ''
  const eventTypes: string[] = Array.isArray(data?.eventTypes)
    ? data.eventTypes
    : data?.type ? [data.type] : (data?.Type ? [data.Type] : [])

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

  if (!data) return null

  const jobMessages = getJobMessages()
  const jobMessages2 = getJobMessages2()
  const hasMessages = jobMessages.length > 0 || jobMessages2.length > 0
  const parameters = getParameters()

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/setting/notification-events?highlight=${eventId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{eventId}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 custom-scrollbar">

        {/* Event metadata */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.detailTitle}</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <InfoRow label={m.eventDate}>
              <span className="font-semibold text-gray-900">{formatDate(data?.createdDate ?? data?.CreatedDate ?? data?.eventDate)}</span>
            </InfoRow>
            <InfoRow label={m.eventName}>
              <span className="text-gray-500">{data?.name ?? data?.Name ?? data?.eventName ?? '—'}</span>
            </InfoRow>
            <InfoRow label={m.eventType}>
              <div className="flex flex-wrap gap-1">
                {eventTypes.length > 0
                  ? eventTypes.map(et => {
                    const c = getEventTypeColor(et)
                    return (
                      <span key={et} className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ring-1', c.bg, c.text, c.ring)}>
                        {getEventTypeLabel(et)}
                      </span>
                    )
                  })
                  : <span className="text-gray-400">—</span>
                }
              </div>
            </InfoRow>
            <InfoRow label={m.eventTags}>
              <div className="flex flex-wrap gap-1">
                {tags
                  ? String(tags).split(',').map(tag => (
                    <span key={tag} className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-xs font-semibold">{tag.trim()}</span>
                  ))
                  : <span className="text-gray-400">—</span>
                }
              </div>
            </InfoRow>
          </div>
        </div>

        {/* Job detail */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>Job</SectionHeader>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label={m.jobId}>
                {data?.jobId ?? data?.id ?? data?.Id ?? eventId}
              </InfoRow>
              <InfoRow label={m.jobStatus}>
                <JobStatusBadge status={data?.jobStatus ?? data?.status ?? data?.Status} />
              </InfoRow>
              <InfoRow label={m.jobName}>
                {data?.name ?? data?.Name ?? '—'}
              </InfoRow>
              <InfoRow label={m.jobDescription}>
                {data?.description ?? data?.Description ?? '—'}
              </InfoRow>
              {(data?.result ?? data?.Result) && (
                <InfoRow label={m.jobResult}>
                  {data.result ?? data.Result}
                </InfoRow>
              )}
            </div>

            {hasMessages && (
              <MessageTabs messages={jobMessages} messages2={jobMessages2} label={m.jobMessage} />
            )}

            {/* Parameters */}
            {parameters.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{m.jobParameters}</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">{m.paramName}</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{m.paramValue}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.map((param, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2 text-xs text-gray-600 font-medium">{param.name || '—'}</td>
                          <td className="px-4 py-2 text-xs text-gray-700 break-all">{param.value || <span className="text-gray-300">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
