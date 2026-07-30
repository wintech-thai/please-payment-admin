'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { backupApi } from '@/lib/api/backup.api'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const TYPE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'backup.done':     { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  'backup.failed':   { bg: 'bg-red-50',     text: 'text-red-700',     ring: 'ring-red-200' },
  'backup.adhoc':    { bg: 'bg-purple-50',  text: 'text-purple-700',  ring: 'ring-purple-200' },
  'backup.schedule': { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200' },
}
const DEFAULT_TYPE_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', ring: 'ring-gray-200' }
function getTypeColor(type: string) {
  return TYPE_COLORS[type.toLowerCase()] ?? DEFAULT_TYPE_COLOR
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
  if (s === 'done' || s === 'success') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'running') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
      <Clock className="w-3.5 h-3.5 animate-pulse" />{status}
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

export default function BackupJobDetailPage() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    backupApi.getJobById(jobId)
      .then(res => {
        const raw = res.data as any
        setData(raw?.job ?? raw?.Job ?? raw)
      })
      .catch(() => {
        toast.error('โหลดข้อมูล backup job ไม่สำเร็จ')
        router.push('/setting/backup')
      })
      .finally(() => setLoading(false))
  }, [jobId])

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch { return d }
  }

  const getLogs = (): string[] => {
    const raw = data?.jobMessage2 ?? data?.JobMessage2 ?? ''
    if (Array.isArray(raw)) return raw.map(String)
    if (typeof raw === 'string') return raw.split('\n').filter(Boolean)
    return []
  }

  const getParameters = (): { name: string; value: string }[] => {
    const raw = data?.parameters ?? data?.Parameters ?? null
    if (Array.isArray(raw)) return raw.map((p: any) => ({ name: p?.name ?? p?.Name ?? '', value: String(p?.value ?? p?.Value ?? '') }))
    if (raw && typeof raw === 'object') return Object.entries(raw).map(([k, v]) => ({ name: k, value: String(v) }))
    return []
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

  if (!data) return null

  const logs = getLogs()
  const parameters = getParameters()
  const type: string = data?.type ?? data?.Type ?? ''
  const tags: string = data?.tags ?? data?.Tags ?? ''
  const typeColor = getTypeColor(type)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/setting/backup?highlight=${jobId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup Job Detail</h1>
          <p className="text-sm text-gray-500 mt-0.5">{jobId}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4 custom-scrollbar">

        {/* Metadata */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>Job Info</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <InfoRow label="Date">
              <span className="font-semibold text-gray-900">{formatDate(data?.createdDate ?? data?.CreatedDate)}</span>
            </InfoRow>
            <InfoRow label="Name">
              <span className="text-gray-700">{data?.name ?? data?.Name ?? '—'}</span>
            </InfoRow>
            <InfoRow label="Type">
              {type
                ? <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ring-1', typeColor.bg, typeColor.text, typeColor.ring)}>{type}</span>
                : <span className="text-gray-400">—</span>}
            </InfoRow>
            <InfoRow label="Tags">
              <div className="flex flex-wrap gap-1">
                {tags
                  ? String(tags).split(',').map(tag => (
                    <span key={tag} className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-xs font-semibold">{tag.trim()}</span>
                  ))
                  : <span className="text-gray-400">—</span>}
              </div>
            </InfoRow>
          </div>
        </div>

        {/* Job detail */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>Detail</SectionHeader>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label="Job ID">{data?.jobId ?? data?.id ?? data?.Id ?? jobId}</InfoRow>
              <InfoRow label="Status"><JobStatusBadge status={data?.status ?? data?.Status} /></InfoRow>
              <InfoRow label="Description">{data?.description ?? data?.Description ?? '—'}</InfoRow>
              <InfoRow label="Message">{data?.jobMessage ?? data?.JobMessage ?? '—'}</InfoRow>
            </div>

            {/* Processing log */}
            {logs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Processing Log</p>
                <ol className="flex flex-col gap-2">
                  {logs.map((line, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 leading-relaxed break-all">{line.trim()}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Parameters */}
            {parameters.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Parameters</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parameters.map((p, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2 text-xs text-gray-600 font-medium">{p.name || '—'}</td>
                          <td className="px-4 py-2 text-xs text-gray-700 break-all">{p.value || <span className="text-gray-300">—</span>}</td>
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
