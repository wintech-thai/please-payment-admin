'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { serviceRequestApi } from '@/lib/api/service-request.api'
import type { ServiceRequestItem, PaymentTxJob } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Link2, Mail, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useFormatDate } from '@/hooks/useFormatDate'

function StatusBadge({ status, expiredDate, m }: { status?: string | null; expiredDate?: string | null; m: any }) {
  const isExpired = (status === 'Pending' || status === 'Confirmed') && !!expiredDate && new Date(expiredDate) < new Date()
  const effective = isExpired ? 'Expired' : (status || 'Pending')
  const cfg: Record<string, { bg: string; dot: string; label: string }> = {
    Pending: { bg: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400', label: m.statusPending },
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

function JobStatusBadge({ status, m }: { status?: string | null; m: any }) {
  const lower = (status || '').toLowerCase()
  const cfg = lower === 'success' || lower === 'completed'
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: m.jobStatusSuccess }
    : lower === 'failed' || lower === 'error'
    ? { bg: 'bg-red-50 text-red-700 ring-red-200', label: m.jobStatusFailed }
    : { bg: 'bg-gray-100 text-gray-600 ring-gray-200', label: m.jobStatusPending }
  return <span className={clsx('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1', cfg.bg)}>{cfg.label}</span>
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
        const res = await serviceRequestApi.regenerateLink(id)
        const data = res.data as any
        if (data?.status === 'OK' || data?.Status === 'OK') { toast.success(m.regenerateSuccess); fetchDetail() }
        else toast.error(data?.description ?? m.regenerateFailed)
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

        {canModify && (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setConfirmModal({ open: true, type: 'regenerate' })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Link2 className="w-4 h-4" />
              {m.actionRegenerateLink}
            </button>
            <button onClick={() => setConfirmModal({ open: true, type: 'resend' })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Mail className="w-4 h-4" />
              {m.actionResendEmail}
            </button>
            <button onClick={() => setConfirmModal({ open: true, type: 'delete' })} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
              {m.actionDelete}
            </button>
          </div>
        )}
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
                <img src={bookBankImage} alt="book bank" className="mt-2 w-full max-h-60 object-contain rounded-lg border border-gray-100" />
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
            {jobs.map((job, i) => (
              <div key={job.id ?? i} className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{job.tags ?? job.type ?? '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{job.createdDate ? fmtDateTime(job.createdDate) : '—'}</p>
                </div>
                <JobStatusBadge status={job.status} m={m} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
