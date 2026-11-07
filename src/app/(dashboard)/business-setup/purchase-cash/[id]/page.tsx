'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { purchaseCashApi } from '@/lib/api/purchase-cash.api'
import type { PurchaseCashItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useFormatDate } from '@/hooks/useFormatDate'

function StatusBadge({ status, m }: { status?: string | null; m: any }) {
  const effective = status || 'Pending'
  const cfg: Record<string, { bg: string; dot: string; label: string }> = {
    Pending: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400', label: m.statusPending },
    Approved: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: m.statusApproved },
    Rejected: { bg: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', label: m.statusRejected },
    Cancelled: { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400', label: m.statusCancelled },
  }
  const c = cfg[effective] ?? cfg.Pending
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', c.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
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

function RejectReasonModal({ onConfirm, onCancel, loading, m, cancelLabel }: {
  onConfirm: (reason: string) => void; onCancel: () => void; loading: boolean; m: any; cancelLabel: string
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const trimmed = reason.trim()
    if (!trimmed) { setError(m.rejectReasonRequired); return }
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl bg-white px-6 py-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{m.rejectModalTitle}</h3>
        <p className="text-sm text-gray-500 mb-4">{m.rejectModalDesc}</p>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.rejectReasonLabel}</label>
        <textarea
          value={reason}
          onChange={e => { setReason(e.target.value); setError('') }}
          placeholder={m.rejectReasonPlaceholder}
          rows={4}
          className={clsx(
            'w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none',
            error ? 'border-red-300' : 'border-gray-200'
          )}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60">
            {cancelLabel}
          </button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
            {loading ? '...' : m.rejectConfirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function highlightJson(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span style="color:#6366f1;font-weight:600">${match}</span>`
        return `<span style="color:#059669">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span style="color:#d97706">${match}</span>`
      if (/null/.test(match)) return `<span style="color:#9ca3af">${match}</span>`
      return `<span style="color:#0284c7">${match}</span>`
    }
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-4">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function fmtNum(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PurchaseCashDetailPage() {
  const { t } = useLang()
  const m = t.purchaseCashAdmin
  const { fmtDateTime } = useFormatDate()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<PurchaseCashItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await purchaseCashApi.getPurchaseCashById(id)
      const data = res.data as any
      setItem(data?.accountDoc ?? null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDetail() }, [id])

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      const res = await purchaseCashApi.approvePurchaseCashById(id)
      const data = res.data as any
      if (data?.status === 'OK') { toast.success(m.approveSuccess); fetchDetail() }
      else toast.error(data?.description ?? m.approveFailed)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.approveFailed)
    } finally {
      setActionLoading(false)
      setConfirmOpen(false)
    }
  }

  const handleReject = async (reason: string) => {
    setActionLoading(true)
    try {
      const res = await purchaseCashApi.rejectPurchaseCashById(id, reason)
      const data = res.data as any
      if (data?.status === 'OK') { toast.success(m.rejectSuccess); fetchDetail() }
      else toast.error(data?.description ?? m.rejectFailed)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.rejectFailed)
    } finally {
      setActionLoading(false)
      setRejectOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-gray-500">{m.notFound}</p>
        <button onClick={() => router.push('/business-setup/purchase-cash')} className="text-sm text-primary-600 hover:underline">{m.detailBack}</button>
      </div>
    )
  }

  const canModify = item.status === 'Pending'

  // ปรับแก้ ข้อ 4c : ดึง Payment ID (externalPaymentRequestId) จาก documentParams มาแสดง เหมือนฝั่ง merchant
  let externalPaymentRequestId: string | null = null
  if (item.documentParams) {
    try { externalPaymentRequestId = JSON.parse(item.documentParams)?.externalPaymentRequestId ?? null } catch { externalPaymentRequestId = null }
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {confirmOpen && (
        <ConfirmModal
          title={m.approveConfirmTitle}
          desc={m.approveConfirmDesc}
          onConfirm={handleApprove}
          onCancel={() => setConfirmOpen(false)}
          loading={actionLoading}
          confirmLabel={t.admin.confirm}
          cancelLabel={t.admin.cancel}
        />
      )}

      {rejectOpen && (
        <RejectReasonModal
          onConfirm={handleReject}
          onCancel={() => setRejectOpen(false)}
          loading={actionLoading}
          m={m}
          cancelLabel={t.admin.cancel}
        />
      )}

      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/business-setup/purchase-cash?highlight=${id}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{item.documentNo}</p>
        </div>
        {canModify && (
          <div className="flex items-center gap-2">
            <button onClick={() => setRejectOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-4 h-4" />
              {m.actionReject}
            </button>
            <button onClick={() => setConfirmOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
              <Check className="w-4 h-4" />
              {m.actionApprove}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionBasicInfo}</SectionHeader>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldDocNo}</dt>
              <dd className="mt-0.5 font-semibold text-gray-800">{item.documentNo ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldMerchant}</dt>
              <dd className="mt-0.5 text-gray-700">{item.orgId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldSubType}</dt>
              <dd className="mt-0.5 text-gray-700">{item.documentSubType ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.colStatus}</dt>
              <dd className="mt-0.5"><StatusBadge status={item.status} m={m} /></dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldDescription}</dt>
              <dd className="mt-0.5 text-gray-700">{item.description ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldAmount}</dt>
              <dd className="mt-0.5 text-gray-800 font-semibold tabular-nums">{fmtNum(item.grandTotal ?? item.totalPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldCreatedDate}</dt>
              <dd className="mt-0.5 text-gray-700">{item.createdDate ? fmtDateTime(item.createdDate, true) : '—'}</dd>
            </div>
            {externalPaymentRequestId && (
              <div>
                <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldPaymentId}</dt>
                <dd className="mt-0.5 text-gray-700 text-xs break-all">{externalPaymentRequestId}</dd>
              </div>
            )}
            {item.status === 'Rejected' && (
              <div>
                <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldRejectReason}</dt>
                <dd className="mt-0.5 text-red-600">{item.rejectReason ?? '—'}</dd>
              </div>
            )}
          </dl>
        </div>

        {item.items && item.items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.sectionItems}</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-bold text-gray-500 uppercase">{m.colItemDesc}</th>
                    <th className="text-right py-2 text-xs font-bold text-gray-500 uppercase">{m.colItemQty}</th>
                    <th className="text-right py-2 text-xs font-bold text-gray-500 uppercase">{m.colItemUnitPrice}</th>
                    <th className="text-right py-2 text-xs font-bold text-gray-500 uppercase">{m.colItemTotal}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.items.map((it, idx) => (
                    <tr key={it.id ?? idx} className="border-b border-gray-50">
                      <td className="py-2.5 text-gray-700">{it.productDesc ?? '—'}</td>
                      <td className="py-2.5 text-right text-gray-700 tabular-nums">{fmtNum(it.quantity)}</td>
                      <td className="py-2.5 text-right text-gray-700 tabular-nums">{fmtNum(it.unitPrice)}</td>
                      <td className="py-2.5 text-right text-gray-800 font-semibold tabular-nums">{fmtNum(it.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionRawData}</SectionHeader>
          <pre
            className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightJson(JSON.stringify(item, null, 2)) }}
          />
        </div>
      </div>
    </div>
  )
}
