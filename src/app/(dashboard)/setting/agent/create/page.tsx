'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, X, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

export default function RegisterAgentPage() {
  const { t } = useLang()
  const m = t.agent
  const router = useRouter()

  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<{ code?: string }>({})
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccountItem[]>([])
  const [selectedBankAccounts, setSelectedBankAccounts] = useState<BankAccountItem[]>([])

  // modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalBankCode, setModalBankCode] = useState('')
  const [modalAccountId, setModalAccountId] = useState('')

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    bankAccountApi.getPayInBankAccountsWithGlobalAll()
      .then(res => {
        const data = res.data as any
        const raw: any[] = data?.bankAccounts ?? data ?? []
        setAllBankAccounts(raw.map(item => ({
          ...item,
          accountId: item.id || item.bankAccountId || item.BankAccountId || item.accountId || item.AccountId || item.Id || '',
        })))
      })
      .catch(() => toast.error(m.loadBankAccountsFailed))
  }, [])

  const uniqueBankCodes = useMemo(
    () => Array.from(new Set(allBankAccounts.map(a => a.bankCode).filter(Boolean))) as string[],
    [allBankAccounts]
  )

  const filteredModalAccounts = useMemo(
    () => modalBankCode ? allBankAccounts.filter(a => a.bankCode === modalBankCode) : [],
    [allBankAccounts, modalBankCode]
  )

  const openAddModal = () => {
    setModalBankCode('')
    setModalAccountId('')
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
    setSelectedBankAccounts(prev => [...prev, account])
    setShowAddModal(false)
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
      const res = await agentApi.addAgent({
        Code: code.trim(),
        Description: description.trim() || undefined,
        Tags: tags.length > 0 ? tags.join(',') : undefined,
        BankAccountsSelectedObj: selectedBankAccounts.length > 0 ? selectedBankAccounts : undefined,
      })
      const data = res.data as any
      const agentId = data?.agent?.agentId ?? data?.agentId
      setIsDirty(false)
      toast.success(m.createSuccess)
      router.push(`/setting/agent${agentId ? `?highlight=${agentId}` : ''}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.createFailed)
    } finally {
      setSaving(false)
    }
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
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.fieldBankCode} <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalBankCode}
                  onChange={e => { setModalBankCode(e.target.value); setModalAccountId('') }}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">{m.selectBankCodePlaceholder}</option>
                  {uniqueBankCodes.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>

              {/* Bank Account */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  {m.sectionBankAccounts} <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalAccountId}
                  onChange={e => setModalAccountId(e.target.value)}
                  disabled={!modalBankCode}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{m.selectBankAccountPlaceholder}</option>
                  {filteredModalAccounts.map(acc => (
                    <option key={acc.accountId} value={acc.accountId}>
                      {acc.accountName} — {acc.accountNumber}{acc.accountLevel === 'Global' ? ' (Global)' : ''}
                    </option>
                  ))}
                </select>
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
          onClick={() => guardNavigation(() => router.push('/setting/agent'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.registerTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.registerSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{m.sectionInfo}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
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
                <div className="w-full min-h-[44px] px-3 py-2 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('tag-input')?.focus()}>
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-xs font-semibold">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="tag-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? m.fieldTagsPlaceholder : ''}
                    className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{m.fieldTagsHint}</p>
              </div>
            </div>
          </div>

          {/* Bank Accounts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center justify-between mb-1">
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
            <p className="text-xs text-gray-400 mb-4 ml-3.5">{m.bankAccountsHint}</p>

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
                          <button
                            type="button"
                            onClick={() => handleRemoveBankAccount(acc.accountId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            {m.removeBankAccount}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-none flex justify-end gap-3 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push('/setting/agent'))}
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
