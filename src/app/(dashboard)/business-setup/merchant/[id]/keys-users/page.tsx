'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { merchantApi } from '@/lib/api/merchant.api'
import type { MerchantItem, OrgUserItem, OrgApiKeyItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Copy, Check, Ban, CheckCircle, Key, Trash2, X, Pencil } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import RowActionsMenu from '@/components/RowActionsMenu'
import { getMerchantBase } from '@/lib/merchant-url'

// ── Domain helpers ────────────────────────────────────────────────────────────

function deriveApiDomain(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname.replace(/^admin/, 'api')
}

function processPaymentUrl(raw: string): string {
  const apiDomain = deriveApiDomain()
  return raw.replace('<PAYMENT-REQUEST-SERVICE>', apiDomain)
}

function processRegistrationUrl(raw: string): string {
  return raw.replace('https://<REGISTER_SERVICE_DOMAIN>', getMerchantBase())
}

function ResetLinkModal({ link, loading, m, onClose }: { link?: string; loading?: boolean; m: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{m.resetLinkTitle}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{m.resetLinkSubtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">{m.generatingLink}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
                <span className="flex-1 text-sm text-primary-800 break-all line-clamp-2 font-mono">{link}</span>
                <button
                  onClick={handleCopy}
                  className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', copied ? 'bg-green-100 text-green-700' : 'bg-white border border-primary-200 text-primary-600 hover:bg-primary-100')}
                >
                  {copied ? m.copied : m.copy}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">{m.resetLinkExpiry}</p>
            </>
          )}
        </div>
        <div className="flex justify-end px-6 pb-5">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">{m.close}</button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string | null }) {
  const lower = status?.toLowerCase()
  const cfg =
    lower === 'active'
      ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
      : lower === 'pending'
        ? { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' }
        : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {status ?? 'Unknown'}
    </span>
  )
}

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
        <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
        {children}
      </h2>
      {action}
    </div>
  )
}

function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex-shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  )
}

function ConfirmDialog({ title, onConfirm, onCancel, t }: {
  title: string; onConfirm: () => void; onCancel: () => void
  t: { cancel: string; confirm: string }
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}>
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-7">{title}</h3>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {t.cancel}
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors uppercase">
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApiKeysTable({ keys, selectedKeyId, setSelectedKeyId, formatDate, m, onToggle, onDelete, onEditRoles }: {
  keys: OrgApiKeyItem[]
  selectedKeyId: string | null
  setSelectedKeyId: React.Dispatch<React.SetStateAction<string | null>>
  formatDate: (d?: string | null) => string
  m: any
  onToggle: (key: OrgApiKeyItem) => void
  onDelete: (key: OrgApiKeyItem) => void
  onEditRoles: (key: OrgApiKeyItem) => void
}) {
  if (keys.length === 0) return <p className="text-sm text-gray-400 text-center py-8">{m.noApiKeysFound}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0 min-w-[600px]">
        <thead>
          <tr className="bg-gray-50">
            {[m.colKeyName, m.colDescription, m.colRoles, m.colCreated, m.colStatus, m.colAction].map((col: string, i: number) => (
              <th key={i} className={clsx('px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap', i === 0 && 'rounded-tl-xl')}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((key, idx) => {
            const isActive = key.keyStatus?.toLowerCase() === 'active' || key.keyStatus == null
            const isHighlighted = selectedKeyId === key.keyId
            return (
              <tr
                key={key.keyId}
                onClick={() => setSelectedKeyId(prev => prev === key.keyId ? null : key.keyId)}
                className={clsx(
                  'cursor-pointer transition-colors',
                  isHighlighted ? 'bg-primary-100' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                )}
              >
                <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-900">{key.keyName ?? '—'}</span>
                  </span>
                </td>
                <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">{key.keyDescription ?? '—'}</td>
                <td className="px-4 py-3 border-b border-gray-100 text-left">
                  {key.rolesList ? (
                    <div className="flex flex-wrap gap-1">
                      {key.rolesList.split(',').map(r => r.trim()).filter(Boolean).map(r => (
                        <span key={r} className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-bold rounded-full uppercase">{r}</span>
                      ))}
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(key.keyCreatedDate)}
                </td>
                <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                  <StatusBadge status={key.keyStatus ?? 'Active'} />
                </td>
                <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                  <RowActionsMenu items={[
                    {
                      label: m.editApiKeyRoles,
                      icon: <Pencil className="w-4 h-4" />,
                      onClick: () => onEditRoles(key),
                    },
                    {
                      label: isActive ? m.disableApiKey : m.enableApiKey,
                      icon: isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />,
                      danger: isActive,
                      onClick: () => onToggle(key),
                    },
                    {
                      label: m.deleteApiKey,
                      icon: <Trash2 className="w-4 h-4" />,
                      danger: true,
                      onClick: () => onDelete(key),
                    },
                  ]} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MerchantKeysUsersPage() {
  const { t } = useLang()
  const m = t.merchant
  const router = useRouter()
  const params = useParams()
  const merchantId = params.id as string

  const [merchant, setMerchant] = useState<MerchantItem | null>(null)
  const [paymentEndpoints, setPaymentEndpoints] = useState<Array<{ name: string; value: string }>>([])
  const [users, setUsers] = useState<OrgUserItem[]>([])
  const [apiKeys, setApiKeys] = useState<OrgApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [editRolesTarget, setEditRolesTarget] = useState<OrgApiKeyItem | null>(null)
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [savingRoles, setSavingRoles] = useState(false)

  // Reset password link modal
  const [resetLinkModal, setResetLinkModal] = useState<{ open: boolean; link?: string; loading?: boolean }>({ open: false })

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteErrors, setInviteErrors] = useState<{ username?: string; email?: string }>({})
  const [inviting, setInviting] = useState(false)
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null)

  // Row highlight
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [selectedEndpointIdx, setSelectedEndpointIdx] = useState<number | null>(null)

  // New API key modal
  const [newApiKey, setNewApiKey] = useState<string | null>(null)

  // Confirm dialog
  const [confirm, setConfirm] = useState<{
    title: string; onConfirm: () => void
  } | null>(null)

  // orgCustomId: the short org ID (e.g. "ppm-shop001") used for most APIs
  const orgCustomId = merchant?.code ?? ''

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const merchantRes = await merchantApi.getMerchantById(merchantId)
      const raw = (merchantRes.data as any)?.merchant ?? merchantRes.data
      setMerchant(raw)

      const customId: string = raw?.code ?? ''

      const [endpointsRes, usersRes, keysRes] = await Promise.allSettled([
        merchantApi.getMerchantPaymentEndpoints(merchantId),
        merchantApi.getOrgUsers(customId),
        merchantApi.getPaymentApiKeys(customId),
      ])

      if (endpointsRes.status === 'fulfilled') {
        const data = endpointsRes.value.data as any
        const list: Array<{ name: string; value: string }> = Array.isArray(data) ? data : (Array.isArray(data?.endpoints) ? data.endpoints : [])
        setPaymentEndpoints(list.map(ep => ({ name: ep.name, value: processPaymentUrl(ep.value) })))
      }

      if (usersRes.status === 'fulfilled') {
        const data = usersRes.value.data as any
        setUsers(Array.isArray(data) ? data : (data?.users ?? data?.Users ?? []))
      }

      if (keysRes.status === 'fulfilled') {
        const data = keysRes.value.data as any
        setApiKeys(Array.isArray(data) ? data : (data?.apiKeys ?? data?.ApiKeys ?? []))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToLoadMerchant)
      router.push(`/business-setup/merchant?highlight=${merchantId}`)
    } finally {
      setLoading(false)
    }
  }, [merchantId])

  useEffect(() => { loadAll() }, [loadAll])

  // ── User actions ────────────────────────────────────────────────────────────
  const handleToggleUser = (user: OrgUserItem) => {
    const isActive = user.userStatus?.toLowerCase() === 'active'
    setConfirm({
      title: isActive ? m.confirmDisableUser : m.confirmEnableUser,
      onConfirm: async () => {
        setConfirm(null)
        try {
          if (isActive) {
            await merchantApi.disableOrgUser(orgCustomId, user.orgUserId)
            toast.success(m.disableUserSuccess)
          } else {
            await merchantApi.enableOrgUser(orgCustomId, user.orgUserId)
            toast.success(m.enableUserSuccess)
          }
          const res = await merchantApi.getOrgUsers(orgCustomId)
          const data = res.data as any
          setUsers(Array.isArray(data) ? data : (data?.users ?? data?.Users ?? []))
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : m.failedToToggleUser)
        }
      },
    })
  }

  const handleGetResetLink = async (user: OrgUserItem) => {
    setResetLinkModal({ open: true, loading: true })
    try {
      const res = await merchantApi.getOrgUserForgotPasswordLink(orgCustomId, user.orgUserId)
      const raw = (res.data as any)?.forgotPasswordUrl ?? (res.data as any)?.ForgotPasswordUrl ?? ''
      setResetLinkModal({ open: true, link: raw ? processRegistrationUrl(raw) : '' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToGetResetLink)
      setResetLinkModal({ open: false })
    }
  }

  // ── Invite user ─────────────────────────────────────────────────────────────
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: { username?: string; email?: string } = {}
    if (!inviteUsername.trim()) errs.username = m.inviteUsernameRequired
    if (!inviteEmail.trim()) errs.email = m.inviteEmailRequired
    setInviteErrors(errs)
    if (Object.keys(errs).length) return

    setInviting(true)
    try {
      const res = await merchantApi.inviteOrgUser(orgCustomId, {
        UserName: inviteUsername.trim(),
        UserEmail: inviteEmail.trim(),
      })
      const data = res.data as any
      const rawRegUrl: string = data?.registrationUrl ?? data?.RegistrationUrl ?? ''
      setRegistrationUrl(rawRegUrl ? processRegistrationUrl(rawRegUrl) : rawRegUrl)
      toast.success(m.inviteSuccess)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToInviteUser)
    } finally {
      setInviting(false)
    }
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    setInviteUsername('')
    setInviteEmail('')
    setInviteErrors({})
    setRegistrationUrl(null)
    merchantApi.getOrgUsers(orgCustomId).then(res => {
      const data = res.data as any
      setUsers(Array.isArray(data) ? data : (data?.users ?? data?.Users ?? []))
    }).catch(() => {})
  }

  // ── API Key actions ─────────────────────────────────────────────────────────
  const refreshApiKeys = async () => {
    const res = await merchantApi.getPaymentApiKeys(orgCustomId)
    const data = res.data as any
    setApiKeys(Array.isArray(data) ? data : (data?.apiKeys ?? data?.ApiKeys ?? []))
  }

  const handleCreatePaymentKey = async () => {
    if (selectedRoles.length === 0) return
    try {
      const createRes = await merchantApi.createPaymentEndpointsApiKey(orgCustomId, selectedRoles.join(','))
      const cdata = createRes.data as any
      const createdKey = cdata?.apiKey ?? cdata?.ApiKey
      await refreshApiKeys()
      setShowCreateKeyModal(false)
      setSelectedRoles([])
      if (createdKey?.apiKey) {
        setNewApiKey(createdKey.apiKey)
      } else {
        toast.success(m.apiKeyCreatedTitle)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToCreateApiKey)
    }
  }

  const handleOpenEditRoles = (key: OrgApiKeyItem) => {
    setEditRolesTarget(key)
    setEditRoles(key.rolesList ? key.rolesList.split(',').map(r => r.trim()).filter(Boolean) : [])
  }

  const handleSaveEditRoles = async () => {
    if (!editRolesTarget) return
    setSavingRoles(true)
    try {
      await merchantApi.updateApiKeyRoles(orgCustomId, editRolesTarget.keyId, editRoles, editRolesTarget.keyDescription)
      toast.success(m.editApiKeyRolesSuccess)
      setEditRolesTarget(null)
      await refreshApiKeys()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToEditApiKeyRoles)
    } finally {
      setSavingRoles(false)
    }
  }

  const handleDeleteUser = (user: OrgUserItem) => {
    setConfirm({
      title: m.confirmDeleteUser,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await merchantApi.deleteOrgUser(orgCustomId, user.orgUserId)
          toast.success(m.deleteUserSuccess)
          const res = await merchantApi.getOrgUsers(orgCustomId)
          const data = res.data as any
          setUsers(Array.isArray(data) ? data : (data?.users ?? data?.Users ?? []))
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : m.failedToDeleteUser)
        }
      },
    })
  }

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return d }
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

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
          t={{ cancel: t.admin.cancel, confirm: t.admin.yes }}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{m.inviteModalTitle}</h3>
            </div>

            {registrationUrl ? (
              <div className="px-6 py-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">{m.inviteLinkLabel}</p>
                <p className="text-xs text-gray-500 mb-3">{m.inviteLinkDesc}</p>
                <textarea
                  readOnly
                  value={registrationUrl}
                  rows={6}
                  className="w-full px-3 py-2.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 resize-none focus:outline-none"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <CopyButton text={registrationUrl} label={m.inviteLinkCopy} copiedLabel={m.inviteLinkCopied} />
                  <button onClick={closeInviteModal} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                    {m.inviteDone}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="px-6 py-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      {m.inviteFieldUsername} <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={inviteUsername}
                      onChange={e => { setInviteUsername(e.target.value); setInviteErrors(p => ({ ...p, username: '' })) }}
                      placeholder={m.inviteUsernamePlaceholder}
                      className={clsx('w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                        inviteErrors.username ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500')}
                    />
                    {inviteErrors.username && <p className="text-red-500 text-xs mt-1">{inviteErrors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                      {m.inviteFieldEmail} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => { setInviteEmail(e.target.value); setInviteErrors(p => ({ ...p, email: '' })) }}
                      placeholder={m.inviteEmailPlaceholder}
                      className={clsx('w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                        inviteErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500')}
                    />
                    {inviteErrors.email && <p className="text-red-500 text-xs mt-1">{inviteErrors.email}</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                  <button type="button" onClick={closeInviteModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    {t.admin.cancel}
                  </button>
                  <button type="submit" disabled={inviting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors">
                    {inviting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                    {m.inviteModalTitle}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Create Payment API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{m.addApiKey}</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Select Roles</p>
              <div className="flex flex-col gap-2">
                {(['PAYIN_REQUEST', 'PAYIN_REQUEST_P2P', 'PAYOUT_REQUEST'] as const).map(role => (
                  <label key={role} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={e => {
                        if (e.target.checked) setSelectedRoles(prev => [...prev, role])
                        else setSelectedRoles(prev => prev.filter(r => r !== role))
                      }}
                      className="w-4 h-4 rounded accent-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
              {selectedRoles.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">Please select at least one role</p>
              )}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => { setShowCreateKeyModal(false); setSelectedRoles([]) }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t.admin.cancel}
                </button>
                <button
                  type="button"
                  disabled={selectedRoles.length === 0}
                  onClick={handleCreatePaymentKey}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {m.addApiKey}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit API Key Roles Modal */}
      {editRolesTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditRolesTarget(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{m.editApiKeyRoles}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{editRolesTarget.keyName}</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{m.colRoles}</p>
              <div className="flex flex-col gap-2">
                {(['PAYIN_REQUEST', 'PAYIN_REQUEST_P2P', 'PAYOUT_REQUEST'] as const).map(role => (
                  <label key={role} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editRoles.includes(role)}
                      onChange={e => {
                        if (e.target.checked) setEditRoles(prev => [...prev, role])
                        else setEditRoles(prev => prev.filter(r => r !== role))
                      }}
                      className="w-4 h-4 rounded accent-primary-600"
                    />
                    <span className="text-sm font-medium text-gray-700">{role}</span>
                  </label>
                ))}
              </div>
              {editRoles.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">{m.apiKeyRolesRequired}</p>
              )}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setEditRolesTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t.admin.cancel}
                </button>
                <button
                  type="button"
                  disabled={editRoles.length === 0 || savingRoles}
                  onClick={handleSaveEditRoles}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {savingRoles ? t.admin.saving : t.admin.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New API Key Modal */}
      {newApiKey && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Key className="w-4 h-4 text-primary-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{m.apiKeyCreatedTitle}</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs text-gray-500 mb-3">{m.apiKeyCreatedNote}</p>
              <div className="flex items-center gap-3">
                <input
                  readOnly
                  value={newApiKey}
                  className="flex-1 px-3 py-2.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
                />
                <CopyButton text={newApiKey} label={m.apiKeyCopy} copiedLabel={m.apiKeyCopied} />
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setNewApiKey(null)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  {m.apiKeyDone}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/business-setup/merchant?highlight=${merchantId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.keysUsersTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.keysUsersSubtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Merchant Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.merchantInfoSection}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: m.fieldCode, value: merchant?.code },
              { label: m.fieldName, value: merchant?.name },
              { label: m.fieldEmail, value: merchant?.contactEmail },
              { label: m.fieldPhone, value: merchant?.contactPhone },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                <input
                  readOnly
                  value={value ?? ''}
                  placeholder="—"
                  className="w-full px-3.5 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Payment Request Endpoints — table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionEndpoint}</SectionHeader>
          {paymentEndpoints.length === 0 ? (
            <p className="text-sm text-gray-400">{m.endpointNotFound}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 rounded-tl-xl w-48">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-24">Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentEndpoints.map((ep, idx) => (
                    <tr key={idx} onClick={() => setSelectedEndpointIdx(prev => prev === idx ? null : idx)} className={clsx('cursor-pointer transition-colors', selectedEndpointIdx === idx ? 'bg-primary-50' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')}>
                      <td className={clsx('px-4 py-3 border-b border-gray-100 text-xs font-semibold whitespace-nowrap', selectedEndpointIdx === idx ? 'text-primary-700' : 'text-gray-700')}>{ep.name}</td>
                      <td className={clsx('px-4 py-3 border-b border-gray-100 text-xs font-mono break-all', selectedEndpointIdx === idx ? 'text-primary-600' : 'text-gray-500')}>{ep.value}</td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <CopyButton text={ep.value} label={m.endpointCopy} copiedLabel={m.endpointCopied} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* API Keys — global */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader
            action={
              <button
                onClick={() => { setSelectedRoles([]); setShowCreateKeyModal(true) }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {m.addApiKey}
              </button>
            }
          >
            {m.sectionApiKeys}
          </SectionHeader>

          <ApiKeysTable
            keys={apiKeys}
            selectedKeyId={selectedKeyId}
            setSelectedKeyId={setSelectedKeyId}
            formatDate={formatDate}
            m={m}
            onToggle={(key) => {
              const isActive = key.keyStatus?.toLowerCase() === 'active' || key.keyStatus == null
              setConfirm({
                title: isActive ? m.confirmDisableApiKey : m.confirmEnableApiKey,
                onConfirm: async () => {
                  setConfirm(null)
                  try {
                    if (isActive) { await merchantApi.disableOrgApiKey(orgCustomId, key.keyId); toast.success(m.disableApiKeySuccess) }
                    else { await merchantApi.enableOrgApiKey(orgCustomId, key.keyId); toast.success(m.enableApiKeySuccess) }
                    await refreshApiKeys()
                  } catch (err: unknown) { toast.error(err instanceof Error ? err.message : m.failedToToggleApiKey) }
                },
              })
            }}
            onDelete={(key) => {
              setConfirm({
                title: m.confirmDeleteApiKey,
                onConfirm: async () => {
                  setConfirm(null)
                  try {
                    await merchantApi.deleteOrgApiKey(orgCustomId, key.keyId)
                    toast.success(m.deleteApiKeySuccess)
                    await refreshApiKeys()
                  } catch (err: unknown) { toast.error(err instanceof Error ? err.message : m.failedToDeleteApiKey) }
                },
              })
            }}
            onEditRoles={handleOpenEditRoles}
          />
        </div>

        {/* Users Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader
            action={
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {m.inviteUser}
              </button>
            }
          >
            {m.sectionUsers}
          </SectionHeader>

          {users.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{m.noUsersFound}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50">
                    {[m.colUsername, m.colEmail, m.colTags, m.colRole, m.colInitialUser, m.colCreated, m.colStatus, m.colAction].map((col: string, i: number) => (
                      <th key={col} className={clsx('px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap', i === 0 && 'rounded-tl-xl')}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => {
                    const isActive = user.userStatus?.toLowerCase() === 'active'
                    const displayEmail = user.userEmail ?? user.tmpUserEmail
                    const isHighlighted = selectedUserId === user.orgUserId
                    return (
                      <tr
                        key={user.orgUserId}
                        onClick={() => setSelectedUserId(prev => prev === user.orgUserId ? null : user.orgUserId)}
                        className={clsx(
                          'cursor-pointer transition-colors',
                          isHighlighted
                            ? 'bg-primary-100'
                            : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                        )}
                      >
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm font-semibold text-gray-900">{user.userName ?? '—'}</td>
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">{displayEmail ?? '—'}</td>
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
                          {user.tags ? user.tags.split(',').map(tag => (
                            <span key={tag} className="inline-flex mr-1 mb-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">{tag.trim()}</span>
                          )) : '—'}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100">
                          {user.rolesList ? (
                            <div className="flex flex-wrap gap-1">
                              {user.rolesList.split(',').map(r => r.trim()).filter(Boolean).map(r => (
                                <span key={r} className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-bold rounded-full uppercase">{r}</span>
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                          {user.isOrgInitialUser === 'YES' ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">YES</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.createdDate)}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          <StatusBadge status={user.userStatus} />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                          <RowActionsMenu items={[
                            {
                              label: m.resetPasswordLink,
                              icon: <Key className="w-4 h-4" />,
                              disabled: !isActive,
                              onClick: () => handleGetResetLink(user),
                            },
                            {
                              label: isActive ? m.disableUser : m.enableUser,
                              icon: isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />,
                              danger: isActive,
                              hidden: user.userStatus?.toLowerCase() === 'pending',
                              onClick: () => handleToggleUser(user),
                            },
                            {
                              label: m.deleteUser,
                              icon: <Trash2 className="w-4 h-4" />,
                              danger: true,
                              hidden: user.userStatus?.toLowerCase() !== 'pending',
                              onClick: () => handleDeleteUser(user),
                            },
                          ]} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {resetLinkModal.open && (
        <ResetLinkModal
          link={resetLinkModal.link}
          loading={resetLinkModal.loading}
          m={m}
          onClose={() => setResetLinkModal({ open: false })}
        />
      )}
    </div>
  )
}