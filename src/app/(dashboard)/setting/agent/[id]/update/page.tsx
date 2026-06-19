'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, X, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

export default function UpdateAgentPage() {
  const { t } = useLang()
  const m = t.agent
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<{ code?: string }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccountItem[]>([])
  const [selectedBankAccounts, setSelectedBankAccounts] = useState<BankAccountItem[]>([])

  // modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalBankCode, setModalBankCode] = useState('')
  const [modalAccountId, setModalAccountId] = useState('')
  const [modalAccountSearch, setModalAccountSearch] = useState('')
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [modalChannel, setModalChannel] = useState<'LINE' | 'SMS'>('LINE')

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [agentRes, bankRes] = await Promise.all([
          agentApi.getAgentById(agentId),
          bankAccountApi.getPayInBankAccountsWithGlobalAll(),
        ])
        const data = agentRes.data as any
        const agent = data?.agent ?? data
        setCode(agent?.code ?? '')
        setDescription(agent?.description ?? '')
        const rawTags: string = agent?.tags ?? ''
        setTags(rawTags ? rawTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [])

        const bankData = bankRes.data as any
        const rawAccounts: any[] = bankData?.bankAccounts ?? bankData ?? []
        setAllBankAccounts(rawAccounts.map(item => ({
          ...item,
          accountId: item.id || item.bankAccountId || item.BankAccountId || item.accountId || item.AccountId || item.Id || '',
        })))

        const existing: any[] = agent?.bankAccountsSelectedObj ?? []
        setSelectedBankAccounts(existing.map((item: any) => ({
          ...item,
          accountId: item.id || item.bankAccountId || item.BankAccountId || item.accountId || item.AccountId || item.Id || '',
          selectedChannel: item.selectedChannel || item.SelectedChannel || 'LINE',
        })))
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.loadAgentFailed)
        router.push('/setting/agent')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [agentId])

  const uniqueBankCodes = useMemo(
    () => Array.from(new Set(allBankAccounts.map(a => a.bankCode).filter(Boolean))) as string[],
    [allBankAccounts]
  )

  const filteredModalAccounts = useMemo(
    () => modalBankCode ? allBankAccounts.filter(a => a.bankCode === modalBankCode) : [],
    [allBankAccounts, modalBankCode]
  )

  const searchedAccounts = useMemo(() => {
    const q = modalAccountSearch.toLowerCase()
    if (!q) return filteredModalAccounts
    return filteredModalAccounts.filter(a =>
      (a.accountName ?? '').toLowerCase().includes(q) ||
      (a.accountNumber ?? '').toLowerCase().includes(q) ||
      (a.promptPayId ?? '').toLowerCase().includes(q)
    )
  }, [filteredModalAccounts, modalAccountSearch])

  const openAddModal = () => {
    setModalBankCode('')
    setModalAccountId('')
    setModalAccountSearch('')
    setShowAccountDropdown(false)
    setModalChannel('LINE')
    setShowAddModal(true)
  }

  const handleConfirmAdd = () => {
    if (!modalAccountId) return
    const account = allBankAccounts.find(a => a.accountId === modalAccountId)
    if (!account) return
    if (selectedBankAccounts.some(a => a.accountId === account.accountId)) {
      toast.error(m.bankAccountDuplicate)
      return
    }
    if (selectedBankAccounts.some(a => a.bankCode === account.bankCode)) {
      toast.error(m.bankCodeDuplicate)
      return
    }
    setSelectedBankAccounts(prev => [...prev, { ...account, selectedChannel: modalChannel }])
    setShowAddModal(false)
    markDirty()
  }

  const handleChannelChange = (accountId: string, channel: 'LINE' | 'SMS') => {
    setSelectedBankAccounts(prev => prev.map(a => a.accountId === accountId ? { ...a, selectedChannel: channel } : a))
    markDirty()
  }

  const handleRemoveBankAccount = (accountId: string) => {
    setSelectedBankAccounts(prev => prev.filter(a => a.accountId !== accountId))
    markDirty()
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && !tags.includes(val)) { setTags(prev => [...prev, val]); markDirty() }
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => { setTags(prev => prev.filter(t => t !== tag)); markDirty() }

  const validate = () => {
    const errs: { code?: string } = {}
    if (!code.trim()) errs.code = m.validationCodeRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await agentApi.updateAgentById(agentId, {
        Code: code.trim(),
        Description: description.trim() || undefined,
        Tags: tags.length > 0 ? tags.join(',') : undefined,
        BankAccountsSelectedObj: selectedBankAccounts.length > 0 ? selectedBankAccounts : undefined,
      })
      setIsDirty(false)
      toast.success(m.saveSuccess)
      router.push(`/setting/agent?highlight=${agentId}`)
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

      {/* Add Bank Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900">{m.modalAddBankAccountTitle}</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Bank Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldBankCode} <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalBankCode}
                  onChange={e => { setModalBankCode(e.target.value); setModalAccountId(''); setModalAccountSearch(''); setShowAccountDropdown(false) }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{m.selectBankCodePlaceholder}</option>
                  {uniqueBankCodes.map(bc => (
                    <option key={bc} value={bc}>{bc}</option>
                  ))}
                </select>
              </div>

              {/* Bank Account - Searchable */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.sectionBankAccounts} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    value={modalAccountSearch}
                    onChange={e => { setModalAccountSearch(e.target.value); setModalAccountId(''); setShowAccountDropdown(true) }}
                    onFocus={() => { if (modalBankCode) setShowAccountDropdown(true) }}
                    onBlur={() => setTimeout(() => setShowAccountDropdown(false), 150)}
                    disabled={!modalBankCode}
                    placeholder={!modalBankCode ? 'Select bank code first...' : m.selectBankAccountPlaceholder}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  {modalAccountSearch && (
                    <button
                      type="button"
                      onClick={() => { setModalAccountSearch(''); setModalAccountId('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showAccountDropdown && searchedAccounts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {searchedAccounts.map(acc => (
                        <button
                          key={acc.accountId}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setModalAccountId(acc.accountId)
                            setModalAccountSearch(`${acc.accountName} — ${acc.accountNumber}`)
                            setShowAccountDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex flex-col gap-0.5 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            {acc.accountType && (
                              <span className={clsx(
                                'inline-flex px-1.5 py-0.5 rounded text-xs font-bold',
                                acc.accountType.toLowerCase().includes('prompt')
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'bg-blue-100 text-blue-700'
                              )}>
                                {acc.accountType}
                              </span>
                            )}
                            {acc.accountLevel === 'Global' && (
                              <span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-600 ring-1 ring-blue-200 rounded text-xs font-semibold">Global</span>
                            )}
                            <span className="text-sm font-semibold text-gray-800">{acc.accountName}</span>
                          </div>
                          <span className="text-xs text-gray-500">{acc.accountNumber}</span>
                          {acc.promptPayId && (
                            <span className="text-xs text-violet-500">PromptPay: {acc.promptPayId}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Channel selector */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Channel <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['LINE', 'SMS'] as const).map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setModalChannel(ch)}
                    className={clsx(
                      'flex-1 py-2.5 text-sm font-semibold transition-colors',
                      modalChannel === ch
                        ? ch === 'LINE' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t.admin.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={!modalAccountId}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 rounded-lg transition-colors"
              >
                {m.addBankAccount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(`/setting/agent?highlight=${agentId}`))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{m.editTitle}</h1>
            {code && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{code}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{m.editSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col gap-2 pb-2">
          <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-2">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{m.sectionInfo}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-3xl">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldCode} <span className="text-red-500">*</span>
                </label>
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value); setErrors(p => ({ ...p, code: '' })); markDirty() }}
                  placeholder={m.fieldCodePlaceholder}
                  className={clsx(
                    'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                    errors.code ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                  )}
                />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
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
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldTags}
                </label>
                <div
                  className="w-full min-h-[36px] px-3 py-1.5 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('tag-input-edit')?.focus()}
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
                    id="tag-input-edit"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? m.fieldTagsPlaceholder : ''}
                    className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex-none flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
                <h2 className="text-sm font-bold text-gray-900">{m.sectionBankAccounts}</h2>
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {m.addBankAccount}
              </button>
            </div>
            <p className="flex-none text-xs text-gray-400 mb-4 ml-3.5">{m.bankAccountsHint}</p>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {selectedBankAccounts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">{m.noBankAccountsSelected}</p>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {selectedBankAccounts.map((acc, i) => (
                        <tr key={acc.accountId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-3 w-28">
                            <span className="inline-flex px-2.5 py-0.5 bg-gray-800 text-white rounded text-xs font-bold">{acc.bankCode}</span>
                            {acc.bankName && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{acc.bankName}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-800 font-semibold">{acc.accountName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{acc.accountNumber}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {acc.accountType && (
                                <span className="inline-flex px-2 py-0.5 bg-violet-50 text-violet-700 ring-1 ring-violet-200 rounded-full text-xs font-semibold">{acc.accountType}</span>
                              )}
                              {acc.accountLevel === 'Global' && (
                                <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-xs font-semibold">Global</span>
                              )}
                            </div>
                            {acc.promptPayId && <p className="text-xs text-gray-400 mt-1">PromptPay: {acc.promptPayId}</p>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <div className="flex rounded-lg border border-gray-200 overflow-hidden w-[100px]">
                                {(['LINE', 'SMS'] as const).map(ch => (
                                  <button
                                    key={ch}
                                    type="button"
                                    onClick={() => handleChannelChange(acc.accountId, ch)}
                                    className={clsx(
                                      'flex-1 py-1 text-xs font-bold transition-colors',
                                      (acc.selectedChannel ?? 'LINE') === ch
                                        ? ch === 'LINE' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                                        : 'bg-white text-gray-400 hover:bg-gray-50'
                                    )}
                                  >
                                    {ch}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveBankAccount(acc.accountId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                {m.removeBankAccount}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-none flex justify-end gap-3 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push(`/setting/agent?highlight=${agentId}`))}
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
