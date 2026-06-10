'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import type { AgentItem, AgentEndpointItem, AgentApiKeyItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Copy, Check, Key, Ban, CheckCircle, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function deriveApiDomain(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hostname.replace(/^admin/, 'api')
}

function processEndpointUrl(raw: string): string {
  const apiDomain = deriveApiDomain()
  return raw.replace('<PAYMENT-REQUEST-SERVICE>', apiDomain)
}

function StatusBadge({ status }: { status?: string | null }) {
  const { t } = useLang()
  const lower = status?.toLowerCase()
  const isActive = lower === 'active' || !lower
  const cfg = isActive
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {isActive ? t.agent.statusActive : t.agent.statusInactive}
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
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
      >
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

export default function AgentEndpointKeysPage() {
  const { t } = useLang()
  const m = t.agent
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<AgentItem | null>(null)
  const [endpoints, setEndpoints] = useState<AgentEndpointItem | null>(null)
  const [apiKeys, setApiKeys] = useState<AgentApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; onConfirm: () => void } | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [agentRes, endpointRes, keysRes] = await Promise.allSettled([
        agentApi.getAgentById(agentId),
        agentApi.getAgentEndPoints(agentId),
        agentApi.getAgentApiKeys(agentId),
      ])

      if (agentRes.status === 'fulfilled') {
        const data = agentRes.value.data as any
        setAgent(data?.agent ?? data)
      }

      if (endpointRes.status === 'fulfilled') {
        const ep = endpointRes.value.data as AgentEndpointItem
        setEndpoints({
          agentHeartbeatUrl: ep?.agentHeartbeatUrl ? processEndpointUrl(ep.agentHeartbeatUrl) : ep?.agentHeartbeatUrl,
          paymentTxNotiUrl: ep?.paymentTxNotiUrl ? processEndpointUrl(ep.paymentTxNotiUrl) : ep?.paymentTxNotiUrl,
        })
      }

      if (keysRes.status === 'fulfilled') {
        const data = keysRes.value.data as any
        setApiKeys(Array.isArray(data) ? data : (data?.apiKeys ?? data?.ApiKeys ?? []))
      }
    } catch {
      toast.error(m.loadFailed)
      router.push('/setting/agent')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => { loadAll() }, [loadAll])

  const handleCreateApiKey = async () => {
    try {
      const res = await agentApi.createAgentApiKey(agentId)
      const data = res.data as any
      const created = data?.apiKey ?? data?.ApiKey
      const keysRes = await agentApi.getAgentApiKeys(agentId)
      const kdata = keysRes.data as any
      setApiKeys(Array.isArray(kdata) ? kdata : (kdata?.apiKeys ?? kdata?.ApiKeys ?? []))
      if (created?.apiKey) {
        setNewApiKey(created.apiKey)
      } else {
        toast.success(m.apiKeyCreatedTitle)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToCreateApiKey)
    }
  }

  const handleToggleApiKey = (key: AgentApiKeyItem) => {
    const isActive = key.keyStatus?.toLowerCase() === 'active' || key.keyStatus == null
    setConfirm({
      title: isActive ? m.confirmDisableApiKey : m.confirmEnableApiKey,
      onConfirm: async () => {
        setConfirm(null)
        try {
          if (isActive) {
            await agentApi.disableAgentApiKey(key.keyId)
            toast.success(m.disableApiKeySuccess)
          } else {
            await agentApi.enableAgentApiKey(key.keyId)
            toast.success(m.enableApiKeySuccess)
          }
          const res = await agentApi.getAgentApiKeys(agentId)
          const data = res.data as any
          setApiKeys(Array.isArray(data) ? data : (data?.apiKeys ?? data?.ApiKeys ?? []))
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : m.failedToToggleApiKey)
        }
      },
    })
  }

  const handleDeleteApiKey = (key: AgentApiKeyItem) => {
    setConfirm({
      title: m.confirmDeleteApiKey,
      onConfirm: async () => {
        setConfirm(null)
        try {
          await agentApi.deleteAgentApiKey(key.keyId)
          toast.success(m.deleteApiKeySuccess)
          const res = await agentApi.getAgentApiKeys(agentId)
          const data = res.data as any
          setApiKeys(Array.isArray(data) ? data : (data?.apiKeys ?? data?.ApiKeys ?? []))
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : m.failedToDeleteApiKey)
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

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
          t={{ cancel: t.admin.cancel, confirm: t.admin.yes }}
        />
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
          onClick={() => router.push(`/setting/agent?highlight=${agentId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.endpointKeysTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.endpointKeysSubtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Agent Info (read-only) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionAgentInfo}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: m.fieldCode, value: agent?.code },
              { label: m.fieldDescription, value: agent?.description },
              { label: m.fieldTags, value: agent?.tags },
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

        {/* Endpoints */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionEndpoints}</SectionHeader>
          <div className="flex flex-col gap-4">
            {[
              { label: m.endpointHeartbeat, value: endpoints?.agentHeartbeatUrl },
              { label: m.endpointPaymentTx, value: endpoints?.paymentTxNotiUrl },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                {value ? (
                  <div className="flex items-start gap-3">
                    <textarea
                      readOnly
                      value={value}
                      rows={2}
                      className="flex-1 px-3 py-2.5 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 resize-none focus:outline-none"
                    />
                    <CopyButton text={value} label={m.endpointCopy} copiedLabel={m.endpointCopied} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader
            action={
              <button
                onClick={handleCreateApiKey}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {m.createApiKey}
              </button>
            }
          >
            {m.sectionApiKeys}
          </SectionHeader>

          {apiKeys.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{m.noApiKeysFound}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50">
                    {[m.colKeyName, m.colKeyDesc, m.colKeyRoles, m.colKeyCreated, m.colKeyStatus, m.colKeyAction].map((col, i) => (
                      <th
                        key={col}
                        className={clsx(
                          'px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                          i === 0 && 'rounded-tl-xl'
                        )}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key, idx) => {
                    const isActive = key.keyStatus?.toLowerCase() === 'active' || key.keyStatus == null
                    return (
                      <tr
                        key={key.keyId}
                        className={clsx('transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}
                      >
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-900">{key.keyName ?? '—'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">{key.keyDescription ?? '—'}</td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          {key.rolesList ? (
                            <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-bold rounded-full uppercase">{key.rolesList}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(key.keyCreatedDate)}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          <StatusBadge status={key.keyStatus ?? 'Active'} />
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleApiKey(key)}
                              className={clsx(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ring-1 transition-colors',
                                isActive
                                  ? 'text-red-600 bg-red-50 ring-red-200 hover:bg-red-100'
                                  : 'text-emerald-600 bg-emerald-50 ring-emerald-200 hover:bg-emerald-100'
                              )}
                            >
                              {isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              {isActive ? m.disableApiKey : m.enableApiKey}
                            </button>
                            <button
                              onClick={() => handleDeleteApiKey(key)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ring-1 transition-colors text-red-600 bg-red-50 ring-red-200 hover:bg-red-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {m.deleteApiKey}
                            </button>
                          </div>
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
    </div>
  )
}
