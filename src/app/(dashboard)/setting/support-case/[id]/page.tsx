'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { supportCaseApi } from '@/lib/api/support-case.api'
import type { SupportCaseItem, SupportCaseCommentItem } from '@/lib/api/support-case.api'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import RichTextEditor, { type ReplyTarget } from '@/components/RichTextEditor'
import RichContent from '@/components/RichContent'

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Open': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'In Progress': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Waiting for Customer': 'bg-purple-50 text-purple-700 ring-purple-200',
  'Resolved': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Closed': 'bg-gray-100 text-gray-500 ring-gray-200',
  'Cancelled': 'bg-red-50 text-red-500 ring-red-200',
}

const PRIORITY_COLORS: Record<string, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-yellow-50 text-yellow-700',
  'High': 'bg-orange-50 text-orange-700',
  'Critical': 'bg-red-50 text-red-700',
}

const ALL_STATUSES = ['New', 'Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed', 'Cancelled']

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
      <span className="w-1 h-4 bg-primary-500 rounded-full flex-shrink-0" />
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

function formatDateTime(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return d }
}


function normalize(raw: any): SupportCaseItem {
  return {
    id: raw.id ?? raw.Id ?? '',
    orgId: raw.orgId ?? raw.OrgId ?? '',
    ref: raw.ref ?? raw.Ref ?? '',
    subject: raw.subject ?? raw.Subject ?? '',
    priority: raw.priority ?? raw.Priority ?? '',
    status: raw.status ?? raw.Status ?? '',
    description: raw.description ?? raw.Description ?? '',
    createdBy: raw.createdBy ?? raw.CreatedBy ?? '',
    createdDate: raw.createdDate ?? raw.CreatedDate ?? '',
    updatedBy: raw.updatedBy ?? raw.UpdatedBy ?? '',
    updatedDate: raw.updatedDate ?? raw.UpdatedDate ?? '',
    closedBy: raw.closedBy ?? raw.ClosedBy ?? '',
    closedDate: raw.closedDate ?? raw.ClosedDate ?? '',
  }
}

function normalizeComment(raw: any): SupportCaseCommentItem {
  return {
    id: raw.id ?? raw.Id ?? '',
    content: raw.content ?? raw.Content ?? '',
    authorType: raw.authorType ?? raw.AuthorType ?? '',
    createdBy: raw.createdBy ?? raw.CreatedBy ?? '',
    createdDate: raw.createdDate ?? raw.CreatedDate ?? '',
  }
}

export default function SupportCaseDetailPage() {
  const { lang } = useLang()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [caseData, setCaseData] = useState<SupportCaseItem | null>(null)
  const [comments, setComments] = useState<SupportCaseCommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const isClosed = caseData?.status === 'Closed' || caseData?.status === 'Resolved'

  const load = async () => {
    setLoading(true)
    try {
      const [caseRes, commentsRes] = await Promise.allSettled([
        supportCaseApi.getCaseById(id),
        supportCaseApi.getComments(id),
      ])
      if (caseRes.status === 'fulfilled') {
        const data = caseRes.value.data as any
        const raw = data?.caseManagement ?? data?.CaseManagement ?? data
        const normalized = normalize(raw)
        setCaseData(normalized)
        setNewStatus(normalized.status ?? '')
      }
      if (commentsRes.status === 'fulfilled') {
        const data = commentsRes.value.data as any
        const list: any[] = Array.isArray(data?.comments) ? data.comments
          : Array.isArray(data?.Comments) ? data.Comments
          : Array.isArray(data) ? data : []
        setComments(list.map(normalizeComment))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load case')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (!loading) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments, loading])

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === caseData?.status) return
    setUpdatingStatus(true)
    try {
      await supportCaseApi.updateCaseStatus(id, newStatus)
      toast.success(lang === 'th' ? 'อัปเดตสถานะสำเร็จ' : 'Status updated')
      setCaseData(prev => prev ? { ...prev, status: newStatus } : prev)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async (jsonContent: string) => {
    if (!jsonContent || submittingComment) return
    setSubmittingComment(true)
    try {
      await supportCaseApi.addComment(id, jsonContent)
      const res = await supportCaseApi.getComments(id)
      const data = res.data as any
      const list: any[] = Array.isArray(data?.comments) ? data.comments
        : Array.isArray(data?.Comments) ? data.Comments
        : Array.isArray(data) ? data : []
      setComments(list.map(normalizeComment))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex flex-col h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)] items-center justify-center gap-3 p-6">
        <p className="text-gray-500">{lang === 'th' ? 'ไม่พบข้อมูล Case' : 'Case not found'}</p>
        <button onClick={() => router.back()} className="text-sm text-primary-600 hover:underline">
          {lang === 'th' ? 'กลับ' : 'Go back'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)] gap-4">

      {/* Header */}
      <div className="flex-none flex items-start gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors mt-0.5">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{caseData.subject}</h1>
            {caseData.status && (
              <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 flex-shrink-0', STATUS_COLORS[caseData.status] ?? 'bg-gray-100 text-gray-500 ring-gray-200')}>
                {caseData.status}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{caseData.ref}</p>
        </div>
        {/* Status update — admin only */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          >
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={handleUpdateStatus}
            disabled={updatingStatus || newStatus === caseData.status}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {updatingStatus
              ? (lang === 'th' ? 'บันทึก...' : 'Saving...')
              : (lang === 'th' ? 'บันทึก' : 'Save')}
          </button>
        </div>
      </div>

      {/* Body — 2-column grid */}
      <div className={clsx('flex-1 min-h-0 grid grid-cols-1 gap-4 overflow-hidden', leftCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-2')}>

        {/* Left — Case Info + Description */}
        <div className={clsx('min-h-0 overflow-y-auto flex flex-col gap-4 pb-1', leftCollapsed && 'lg:hidden')}>

          {/* Details card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <SectionHeader>{lang === 'th' ? 'ข้อมูล Case' : 'Case Info'}</SectionHeader>
              <button
                onClick={() => setLeftCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title={lang === 'th' ? 'ซ่อนแผงซ้าย' : 'Collapse panel'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoRow label="Ref">{caseData.ref ?? '—'}</InfoRow>
              <InfoRow label="Org">
                <span className="text-xs text-gray-600 break-all">{caseData.orgId ?? '—'}</span>
              </InfoRow>
              <InfoRow label={lang === 'th' ? 'ความสำคัญ' : 'Priority'}>
                {caseData.priority ? (
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[caseData.priority] ?? 'bg-gray-100 text-gray-600')}>
                    {caseData.priority}
                  </span>
                ) : '—'}
              </InfoRow>
              <InfoRow label={lang === 'th' ? 'ผู้สร้าง' : 'Created By'}>
                {caseData.createdBy ?? '—'}
              </InfoRow>
              <InfoRow label={lang === 'th' ? 'วันที่สร้าง' : 'Created'}>
                {formatDateTime(caseData.createdDate)}
              </InfoRow>
              <InfoRow label={lang === 'th' ? 'อัปเดตล่าสุด' : 'Last Updated'}>
                {formatDateTime(caseData.updatedDate)}
              </InfoRow>
              {isClosed && caseData.closedDate && (
                <>
                  <InfoRow label={lang === 'th' ? 'ปิดโดย' : 'Closed By'}>{caseData.closedBy ?? '—'}</InfoRow>
                  <InfoRow label={lang === 'th' ? 'วันที่ปิด' : 'Closed Date'}>{formatDateTime(caseData.closedDate)}</InfoRow>
                </>
              )}
            </div>
          </div>

          {/* Description card */}
          {caseData.description && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <SectionHeader>{lang === 'th' ? 'รายละเอียดปัญหา' : 'Description'}</SectionHeader>
              <RichContent content={caseData.description} />
            </div>
          )}

        </div>

        {/* Right — Comments Thread */}
        <div className="min-h-[300px] lg:min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">

          {/* Thread header */}
          <div className="flex-none flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <SectionHeader>
              {lang === 'th' ? 'การสนทนา' : 'Thread'}
              {comments.length > 0 && (
                <span className="text-gray-400 font-normal text-xs ml-1">({comments.length})</span>
              )}
            </SectionHeader>
            {leftCollapsed && (
              <button
                onClick={() => setLeftCollapsed(false)}
                className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                title={lang === 'th' ? 'แสดง Case Info' : 'Show case info'}
              >
                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                <span>Case Info</span>
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{lang === 'th' ? 'ยังไม่มีข้อความ' : 'No messages yet'}</p>
            ) : (
              comments.map(c => {
                const isAdmin = c.authorType === 'Admin'
                const authorLabel = c.createdBy ?? (isAdmin ? 'Admin' : 'Merchant')
                return (
                  <div key={c.id} className={clsx('group flex gap-3', isAdmin ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1', isAdmin ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>
                      {isAdmin ? 'A' : 'M'}
                    </div>
                    <div className={clsx('max-w-[75%] flex flex-col gap-1', isAdmin ? 'items-end' : 'items-start')}>
                      <div className={clsx('flex items-center gap-2 text-xs text-gray-400', isAdmin && 'flex-row-reverse')}>
                        <span className="font-semibold text-gray-600">{authorLabel}</span>
                        <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', isAdmin ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500')}>
                          {c.authorType}
                        </span>
                        <span>{formatDateTime(c.createdDate)}</span>
                        {!isClosed && (
                          <button
                            onClick={() => setReplyTo({ id: c.id, author: authorLabel, content: c.content })}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-primary-500 transition-all"
                            title={lang === 'th' ? 'ตอบกลับ' : 'Reply'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className={clsx('px-4 py-2.5 rounded-2xl', isAdmin ? 'bg-primary-50 text-gray-800 rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm')}>
                        <RichContent content={c.content} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Input */}
          {isClosed ? (
            <div className="flex-none px-5 py-3 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
              {lang === 'th' ? 'Case นี้ปิดแล้ว ไม่สามารถเพิ่ม Comment ได้' : 'This case is closed. Comments are disabled.'}
            </div>
          ) : (
            <div className="flex-none px-5 py-4 border-t border-gray-100">
              <RichTextEditor
                onSubmit={handleAddComment}
                sending={submittingComment}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
              />
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
