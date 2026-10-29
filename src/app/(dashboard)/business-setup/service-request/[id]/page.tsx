'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { serviceRequestApi } from '@/lib/api/service-request.api'
import type { ServiceRequestItem, PaymentTxJob } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Link2, Mail, RefreshCw, Trash2, X, Copy, Check, ScrollText } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useFormatDate } from '@/hooks/useFormatDate'

function StatusBadge({ status, expiredDate, m }: { status?: string | null; expiredDate?: string | null; m: any }) {
  const isExpired = (status === 'Pending' || status === 'Confirmed') && !!expiredDate && new Date(expiredDate) < new Date()
  const effective = isExpired ? 'Expired' : (status || 'Pending')
  const cfg: Record<string, { bg: string; dot: string; label: string }> = {
    Pending: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400', label: m.statusPending },
    Confirmed: { bg: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', label: m.statusConfirmed },
    Approved: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: m.statusApproved },
    Rejected: { bg: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', label: m.statusRejected },
    Expired: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', label: m.statusExpired },
  }
  const c = cfg[effective] ?? cfg.Pending
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', c.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

// status ที่ Ruby dispatcher เซ็ตตอนจบงานคือ "Done" เสมอไม่ว่าจะสำเร็จหรือพัง — ผลจริงต้องดูจาก succeedCount/failedCount
function JobStatusBadge({ job, m }: { job: Pick<PaymentTxJob, 'status' | 'succeedCount' | 'failedCount'>; m: any }) {
  const lower = (job.status || '').toLowerCase()
  const isDone = lower === 'done' || lower === 'success' || lower === 'completed'
  const failed = lower === 'failed' || lower === 'error' || (isDone && (job.failedCount ?? 0) > 0)
  const succeeded = isDone && !failed

  const cfg = succeeded
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: m.jobStatusSuccess }
    : failed
    ? { bg: 'bg-red-50 text-red-700 ring-red-200', label: m.jobStatusFailed }
    : { bg: 'bg-amber-50 text-amber-700 ring-amber-200', label: m.jobStatusPending }
  return <span className={clsx('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1', cfg.bg)}>{cfg.label}</span>
}

// x089 ปรับแก้ 7 : tags are "customer-registration-link" (initial), "...-regenerate", "...-resend"
function JobTagIcon({ tags }: { tags?: string | null }) {
  if (tags?.endsWith('-regenerate')) return <RefreshCw className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" />
  if (tags?.endsWith('-resend')) return <Mail className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" />
  return <Link2 className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
}

function jobLink(job: PaymentTxJob): string | null {
  return job.parameters?.find(p => p.name === 'REGISTRATION_LINK')?.value ?? null
}

function JobLinkCopyButton({ link, m }: { link: string; m: any }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      title={link}
      className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? m.createModalCopied : m.createModalCopy}
    </button>
  )
}

function ConfirmModal({ title, desc, onConfirm, onCancel, loading, confirmLabel, cancelLabel }: {
  title: string; desc: string; onConfirm: () => void; onCancel: () => void; loading: boolean; confirmLabel: string; cancelLabel: string
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl bg-white text-center px-8 py-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors">
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function LinkResultModal({ title, link, onClose, m, doneLabel }: { title: string; link: string; onClose: () => void; m: any; doneLabel: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.createModalLinkLabel}</label>
            <div className="flex items-start gap-2">
              <div className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 break-all select-all">{link}</div>
              <button onClick={handleCopy} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors flex items-center gap-1">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? m.createModalCopied : m.createModalCopy}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">
            {doneLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      <img src={src} alt="book bank" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  )
}

function JobLogLine({ line }: { line: string }) {
  const match = line.match(/^(INFO|ERROR|WARN)(\s*:\s*)([\s\S]*)$/)
  if (!match) return <div className="whitespace-pre-wrap break-all text-gray-600">{line}</div>

  const [, level, sep, rest] = match
  const levelColor = level === 'ERROR' ? 'text-red-600' : level === 'WARN' ? 'text-amber-600' : 'text-emerald-700'
  return (
    <div className="whitespace-pre-wrap break-all text-gray-600">
      <span className={clsx('font-semibold', levelColor)}>{level}</span>
      {sep}{rest}
    </div>
  )
}

function JobLogModal({ job, onClose, m }: { job: PaymentTxJob; onClose: () => void; m: any }) {
  const [copied, setCopied] = useState(false)
  const log = job.jobMessage?.trim()
  const lines = log ? log.split('\n') : []

  const handleCopy = () => {
    if (!log) return
    navigator.clipboard.writeText(log)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[80vh] rounded-2xl shadow-2xl bg-white flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <ScrollText className="w-4.5 h-4.5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900">{m.jobLogModalTitle}</h3>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{job.tags ?? job.type ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <JobStatusBadge job={job} m={m} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50">
          {log ? (
            <div className="relative rounded-xl bg-white border border-gray-200 shadow-sm">
              <button
                onClick={handleCopy}
                title={m.createModalCopy}
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? m.createModalCopied : m.createModalCopy}
              </button>
              <div className="px-4 py-3.5 pr-20 font-mono text-xs leading-relaxed space-y-0.5">
                {lines.map((line, i) => <JobLogLine key={i} line={line} />)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">{m.jobLogEmpty}</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            {m.jobLogClose}
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right">{value ?? '—'}</span>
    </div>
  )
}

export default function ServiceRequestDetailPage() {
  const { t } = useLang()
  const m = t.serviceRequestAdmin
  const { fmtDateTime } = useFormatDate()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [item, setItem] = useState<ServiceRequestItem | null>(null)
  const [bookBankImage, setBookBankImage] = useState<string | null>(null)
  const [jobs, setJobs] = useState<PaymentTxJob[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type?: 'regenerate' | 'resend' | 'delete' }>({ open: false })
  const [linkModal, setLinkModal] = useState<{ open: boolean; title?: string; link?: string }>({ open: false })
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [logModalJob, setLogModalJob] = useState<PaymentTxJob | null>(null)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const [detailRes, jobsRes] = await Promise.allSettled([
        serviceRequestApi.getServiceRequestById(id),
        serviceRequestApi.getServiceRequestJobs(id),
      ])
      if (detailRes.status === 'fulfilled') {
        const data = detailRes.value.data as any
        setItem(data?.serviceRequest ?? data?.ServiceRequest ?? null)
        const base64 = data?.bookBankImageBase64 ?? data?.BookBankImageBase64
        const mime = data?.bookBankMimeType ?? data?.BookBankMimeType ?? 'image/jpeg'
        setBookBankImage(base64 ? `data:${mime};base64,${base64}` : null)
      }
      if (jobsRes.status === 'fulfilled') {
        const data = jobsRes.value.data as any
        const list: PaymentTxJob[] = Array.isArray(data) ? data : []
        list.sort((a, b) => new Date(b.createdDate ?? 0).getTime() - new Date(a.createdDate ?? 0).getTime())
        setJobs(list)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (id) fetchDetail() }, [id])

  const canModify = item?.status !== 'Approved' && item?.status !== 'Rejected'

  const handleConfirmAction = async () => {
    const { type } = confirmModal
    if (!type || !id) return
    setActionLoading(true)
    try {
      if (type === 'regenerate') {
        const res = await serviceRequestApi.regenerateLink(id, typeof window !== 'undefined' ? window.location.origin : undefined)
        const data = res.data as any
        if (data?.status === 'OK' || data?.Status === 'OK') {
          const link = data.registrationLink ?? data.RegistrationLink
          toast.success(m.regenerateSuccess)
          fetchDetail()
          setConfirmModal({ open: false })
          if (link) setLinkModal({ open: true, title: m.regenerateLinkModalTitle, link })
          setActionLoading(false)
          return
        }
        toast.error(data?.description ?? m.regenerateFailed)
      } else if (type === 'resend') {
        const res = await serviceRequestApi.resendLinkEmail(id)
        const data = res.data as any
        if (data?.status === 'OK' || data?.Status === 'OK') { toast.success(m.resendSuccess); fetchDetail() }
        else toast.error(data?.description ?? m.resendFailed)
      } else if (type === 'delete') {
        const res = await serviceRequestApi.deleteServiceRequestById(id)
        const data = res.data as any
        if (data?.status === 'OK' || data?.Status === 'OK') {
          toast.success(m.deleteSuccess)
          router.push('/business-setup/service-request')
          return
        } else {
          toast.error(data?.status === 'APPROVED_CANNOT_DELETE' ? m.cannotDeleteApproved : (data?.description ?? m.deleteFailed))
        }
      }
      setConfirmModal({ open: false })
    } catch (err: unknown) {
      const failMsg = type === 'regenerate' ? m.regenerateFailed : type === 'resend' ? m.resendFailed : m.deleteFailed
      toast.error(err instanceof Error ? err.message : failMsg)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-5rem)]">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-5rem)] gap-3">
        <p className="text-sm text-gray-400">{m.noDataFound}</p>
        <button onClick={() => router.push('/business-setup/service-request')} className="text-sm text-primary-600 hover:underline">{m.detailBack}</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)] overflow-auto custom-scrollbar">
      {confirmModal.open && (
        <ConfirmModal
          title={confirmModal.type === 'regenerate' ? m.regenerateConfirmTitle : confirmModal.type === 'resend' ? m.resendConfirmTitle : m.deleteConfirmTitle}
          desc={confirmModal.type === 'regenerate' ? m.regenerateConfirmDesc : confirmModal.type === 'resend' ? m.resendConfirmDesc : m.deleteConfirmDesc}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal({ open: false })}
          loading={actionLoading}
          confirmLabel={t.admin.confirm}
          cancelLabel={t.admin.cancel}
        />
      )}

      {linkModal.open && linkModal.link && (
        <LinkResultModal
          title={linkModal.title ?? m.viewLinkModalTitle}
          link={linkModal.link}
          onClose={() => setLinkModal({ open: false })}
          m={m}
          doneLabel={m.createModalDone}
        />
      )}

      {showImagePreview && bookBankImage && (
        <ImagePreviewModal src={bookBankImage} onClose={() => setShowImagePreview(false)} />
      )}

      {logModalJob && (
        <JobLogModal job={logModalJob} onClose={() => setLogModalJob(null)} m={m} />
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/business-setup/service-request')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{item.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={item.status} expiredDate={item.expiredDate} m={m} />
        </div>
      </div>

      {/* Approve/Reject — coming soon stubs */}
      <div className="flex items-center gap-3 mb-6">
        <button disabled title={m.comingSoon} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-400 rounded-lg opacity-50 cursor-not-allowed">
          {m.actionApprove}
        </button>
        <button disabled title={m.comingSoon} className="px-4 py-2 text-sm font-semibold text-white bg-red-400 rounded-lg opacity-50 cursor-not-allowed">
          {m.actionReject}
        </button>
        <span className="text-xs text-gray-400">({m.comingSoon})</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setLinkModal({ open: true, title: m.viewLinkModalTitle, link: `${item.adminDomain}/customer-signup/global/${item.id}/${item.otp}` })}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {m.actionViewLink}
          </button>
          {canModify && (
            <>
              <button onClick={() => setConfirmModal({ open: true, type: 'regenerate' })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
                <RefreshCw className="w-4 h-4" />
                {m.actionRegenerateLink}
              </button>
              <button onClick={() => setConfirmModal({ open: true, type: 'resend' })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                <Mail className="w-4 h-4" />
                {m.actionResendEmail}
              </button>
              <button onClick={() => setConfirmModal({ open: true, type: 'delete' })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4" />
                {m.actionDelete}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{m.sectionBasicInfo}</h3>
          <InfoRow label={m.fieldEmail} value={item.email} />
          <InfoRow label={m.fieldFirstName} value={item.firstName} />
          <InfoRow label={m.fieldLastName} value={item.lastName} />
          <InfoRow label={m.fieldPhone} value={item.phone} />
          <InfoRow label={m.fieldServiceType} value={m.serviceTypeCustomerRegistration} />
          <InfoRow label={m.fieldLang} value={item.lang?.toUpperCase()} />
          <InfoRow label={m.fieldAdminDomain} value={item.adminDomain} />
          <InfoRow label={m.fieldCreatedDate} value={item.createdDate ? fmtDateTime(item.createdDate) : null} />
          <InfoRow label={m.fieldExpiredDate} value={item.expiredDate ? fmtDateTime(item.expiredDate) : null} />
          <InfoRow label={m.fieldApprovedDate} value={item.approvedDate ? fmtDateTime(item.approvedDate) : null} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{m.sectionBankInfo}</h3>
            <InfoRow label={m.fieldBankCode} value={item.bankCode} />
            <InfoRow label={m.fieldBankAccountNumber} value={item.bankAccountNumber} />
            <InfoRow label={m.fieldBankAccountName} value={item.bankAccountName} />
            <InfoRow label={m.fieldPromptPayId} value={item.promptPayId} />
            {bookBankImage && (
              <div className="pt-2">
                <span className="text-sm text-gray-400">{m.fieldBookBank}</span>
                <button type="button" onClick={() => setShowImagePreview(true)} className="block mt-2 w-full">
                  <img src={bookBankImage} alt="book bank" className="w-full max-h-60 object-contain rounded-lg border border-gray-100 hover:opacity-90 transition-opacity cursor-zoom-in" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{m.sectionShopInfo}</h3>
            <InfoRow label={m.fieldShopCode} value={item.shopCode} />
            <InfoRow label={m.fieldUsername} value={item.username} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{m.sectionJobLog}</h3>
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-400">{m.noJobs}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map((job, i) => {
              const link = jobLink(job)
              return (
                <div key={job.id ?? i} className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <JobTagIcon tags={job.tags} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{job.tags ?? job.type ?? '—'}</p>
                          <button
                            type="button"
                            onClick={() => setLogModalJob(job)}
                            title={m.jobViewLog}
                            className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                          >
                            <ScrollText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{job.createdDate ? fmtDateTime(job.createdDate) : '—'}</p>
                      </div>
                    </div>
                    <JobStatusBadge job={job} m={m} />
                  </div>
                  {link && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                      <input readOnly value={link} className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 truncate" />
                      <JobLinkCopyButton link={link} m={m} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
