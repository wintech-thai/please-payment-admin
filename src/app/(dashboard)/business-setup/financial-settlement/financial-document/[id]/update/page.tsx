'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, X, Plus, Trash2, Calculator } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'
import { financialDocApi, type FinancialDocLineItem } from '@/lib/api/financial-doc.api'
import { masterRefApi, type MasterRefItem } from '@/lib/api/master-ref.api'

const PIE_COLORS = ['#f06b1e', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16']

function pad(n: number) { return String(n).padStart(2, '0') }
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function fromDatetimeLocal(val: string): string {
  return new Date(val).toISOString()
}
function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function UpdateFinancialDocPage() {
  const { t } = useLang()
  const m = t.financialDoc
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string

  const [documentNo, setDocumentNo] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [payInFee, setPayInFee] = useState(0)
  const [payOutFee, setPayOutFee] = useState(0)
  const [calculating, setCalculating] = useState(false)

  const [expenseItems, setExpenseItems] = useState<FinancialDocLineItem[]>([
    { code: '', label: '', amount: 0 },
  ])

  const [expenseTypeOptions, setExpenseTypeOptions] = useState<MasterRefItem[]>([])
  const [shareholderTemplates, setShareholderTemplates] = useState<MasterRefItem[]>([])
  const [shareholderTemplateCode, setShareholderTemplateCode] = useState('')
  // ใช้แสดง sharing items เดิมที่บันทึกไว้ ตอนยังไม่เลือก template ใหม่
  // (backend ไม่ได้เก็บว่าตอนสร้างเอกสารเลือก template ไหน เก็บแค่ผลลัพธ์ที่คำนวณแล้ว)
  const [savedSharingItems, setSavedSharingItems] = useState<FinancialDocLineItem[]>([])

  const [errors, setErrors] = useState<{ description?: string; dateRange?: string; expense?: string; shareholder?: string }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)
  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  useEffect(() => {
    setMounted(true)
    const load = async () => {
      try {
        const [docRes, expenseRes, shareholderRes] = await Promise.all([
          financialDocApi.getFinancialDocById(itemId),
          masterRefApi.getMasterRefs({ RefType: 'ExpenseType', Limit: 200 }),
          masterRefApi.getMasterRefs({ RefType: 'ShareHolderRatio', Limit: 200 }),
        ])
        const data = docRes.data as any
        const item = data?.financialDoc
        if (!item) throw new Error(m.loadFailed)

        setExpenseTypeOptions(Array.isArray(expenseRes.data) ? expenseRes.data : [])
        setShareholderTemplates(Array.isArray(shareholderRes.data) ? shareholderRes.data : [])

        setDocumentNo(item.documentNo ?? '')
        setDescription(item.description ?? '')
        setTags(item.tags ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [])
        setFromDate(item.fromDate ? toDatetimeLocal(item.fromDate) : '')
        setToDate(item.toDate ? toDatetimeLocal(item.toDate) : '')

        const revenueItems: FinancialDocLineItem[] = item.revenueItemsArr ?? []
        setPayInFee(revenueItems.find(r => r.code === 'PayInFee')?.amount ?? 0)
        setPayOutFee(revenueItems.find(r => r.code === 'PayOutFee')?.amount ?? 0)

        const docFromDate = item.fromDate ? item.fromDate.split('T')[0] : ''
        setExpenseItems(item.expenseItemsArr?.length
          ? item.expenseItemsArr.map((e: FinancialDocLineItem) => ({
              ...e,
              expenseDate: e.expenseDate ? e.expenseDate.split('T')[0] : docFromDate,
            }))
          : [{ code: '', label: '', amount: 0, expenseDate: docFromDate }])
        setSavedSharingItems(item.sharingItemsArr ?? [])

        setLoading(false)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : m.loadFailed)
        router.push('/business-setup/financial-settlement/financial-document')
      }
    }
    load()
  }, [itemId])

  // พยายามจับคู่ template ที่ตรงกับรายชื่อผู้ถือหุ้นที่บันทึกไว้ เพื่อให้แก้ไข/คำนวณใหม่ได้
  useEffect(() => {
    if (shareholderTemplateCode || shareholderTemplates.length === 0 || savedSharingItems.length === 0) return
    const savedNames = new Set(savedSharingItems.map(s => s.code))
    const match = shareholderTemplates.find(tpl => {
      const names = (tpl.definitionObj ?? []).map(s => s.name)
      return names.length === savedNames.size && names.every(n => savedNames.has(n))
    })
    if (match?.code) setShareholderTemplateCode(match.code)
  }, [shareholderTemplates, savedSharingItems, shareholderTemplateCode])

  const totalRevenue = payInFee + payOutFee
  const totalExpense = expenseItems.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const profitLoss = totalRevenue - totalExpense

  const sharingItems: FinancialDocLineItem[] = useMemo(() => {
    if (!shareholderTemplateCode) return savedSharingItems
    const template = shareholderTemplates.find(s => s.code === shareholderTemplateCode)
    const shareholders = template?.definitionObj ?? []
    return shareholders.map(s => ({
      code: s.name,
      label: s.name,
      percent: s.percent,
      amount: Math.round(profitLoss * (s.percent / 100) * 100) / 100,
    }))
  }, [shareholderTemplateCode, shareholderTemplates, profitLoss, savedSharingItems])

  const chartData = useMemo(
    () => sharingItems.filter(s => (s.amount ?? 0) !== 0).map(s => ({ name: s.label ?? '', value: Math.abs(s.amount ?? 0) })),
    [sharingItems]
  )

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && !tags.includes(val)) { setTags(prev => [...prev, val]); markDirty() }
      setTagInput('')
    }
  }
  const removeTag = (tag: string) => { setTags(prev => prev.filter(t => t !== tag)); markDirty() }

  const handleCalculateRevenue = async () => {
    setCalculating(true)
    try {
      const res = await financialDocApi.calculateRevenue({
        FromDate: fromDatetimeLocal(fromDate),
        ToDate: fromDatetimeLocal(toDate),
      })
      setPayInFee(res.data.totalPayInFee ?? 0)
      setPayOutFee(res.data.totalPayOutFee ?? 0)
      markDirty()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
    } finally {
      setCalculating(false)
    }
  }

  const updateExpenseRow = (idx: number, field: 'code' | 'amount' | 'expenseDate', value: string) => {
    setExpenseItems(prev => prev.map((e, i) => {
      if (i !== idx) return e
      if (field === 'amount') return { ...e, amount: Number(value) || 0 }
      if (field === 'expenseDate') return { ...e, expenseDate: value }
      const opt = expenseTypeOptions.find(o => o.code === value)
      return { ...e, code: value, label: opt?.description || opt?.code || '' }
    }))
    markDirty()
  }
  const addExpenseRow = () => { setExpenseItems(prev => [...prev, { code: '', label: '', amount: 0, expenseDate: fromDate.split('T')[0] }]); markDirty() }
  const removeExpenseRow = (idx: number) => { setExpenseItems(prev => prev.filter((_, i) => i !== idx)); markDirty() }

  const validate = () => {
    const errs: typeof errors = {}
    if (!description.trim()) errs.description = m.validationDescriptionRequired
    if (new Date(fromDate) >= new Date(toDate)) errs.dateRange = m.validationDateRange
    const filledRows = expenseItems.filter(e => (e.amount ?? 0) > 0 || e.code)
    if (filledRows.some(e => !e.code)) errs.expense = m.validationExpenseTypeRequired
    if (!shareholderTemplateCode && savedSharingItems.length === 0) errs.shareholder = m.validationShareholderRequired
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const cleanedExpenseItems = expenseItems.filter(e => e.code)
      const revenueItems: FinancialDocLineItem[] = [
        { code: 'PayInFee', label: m.revenuePayInFee, amount: payInFee },
        { code: 'PayOutFee', label: m.revenuePayOutFee, amount: payOutFee },
      ]
      await financialDocApi.updateFinancialDocById(itemId, {
        DocumentNo: documentNo,
        Description: description.trim(),
        Tags: tags.length > 0 ? tags.join(',') : undefined,
        FromDate: fromDatetimeLocal(fromDate),
        ToDate: fromDatetimeLocal(toDate),
        ExpenseItemsArr: cleanedExpenseItems,
        RevenueItemsArr: revenueItems,
        SharingItemsArr: sharingItems,
      })
      setIsDirty(false)
      toast.success(m.saveSuccess)
      router.push(`/business-setup/financial-settlement/financial-document?highlight=${itemId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadFailed)
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

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push('/business-setup/financial-settlement/financial-document'))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{m.editTitle}</h1>
            {documentNo && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{documentNo}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{m.editSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-2 flex flex-col gap-4">

          {/* Info section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 max-w-3xl">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldDocumentNo}
                </label>
                <input
                  value={documentNo}
                  readOnly
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldDescription} <span className="text-red-500">*</span>
                </label>
                <input
                  value={description}
                  onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); markDirty() }}
                  placeholder={m.fieldDescriptionPlaceholder}
                  className={clsx(
                    'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent',
                    errors.description ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                  )}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldFromDate} <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  step={1}
                  value={fromDate}
                  onChange={e => { setFromDate(e.target.value); setErrors(p => ({ ...p, dateRange: '' })); markDirty() }}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldToDate} <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  step={1}
                  value={toDate}
                  onChange={e => { setToDate(e.target.value); setErrors(p => ({ ...p, dateRange: '' })); markDirty() }}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.dateRange && <p className="text-red-500 text-xs mt-1">{errors.dateRange}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.fieldTags}
                </label>
                <div
                  className="w-full min-h-[40px] px-3 py-1.5 flex flex-wrap gap-1.5 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent cursor-text"
                  onClick={() => document.getElementById('fd-update-tag-input')?.focus()}
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
                    id="fd-update-tag-input"
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

          {/* Revenue section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-5 bg-emerald-500 rounded-full flex-shrink-0" />
                <h2 className="text-sm font-bold text-gray-900">{m.sectionRevenue}</h2>
              </div>
              <button
                type="button"
                onClick={handleCalculateRevenue}
                disabled={calculating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-60"
              >
                <Calculator className="w-3.5 h-3.5" />
                {calculating ? t.admin.loading : m.calculateRevenue}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.revenuePayInFee}
                </label>
                <input
                  type="number"
                  value={payInFee}
                  onChange={e => { setPayInFee(Number(e.target.value) || 0); markDirty() }}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.revenuePayOutFee}
                </label>
                <input
                  type="number"
                  value={payOutFee}
                  onChange={e => { setPayOutFee(Number(e.target.value) || 0); markDirty() }}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                  {m.revenueTotal}
                </label>
                <div className="w-full px-3.5 py-2.5 text-sm border border-emerald-200 bg-emerald-50 rounded-lg font-bold text-emerald-700">
                  {formatMoney(totalRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Expense section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-1 h-5 bg-red-500 rounded-full flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{m.sectionExpense}</h2>
            </div>
            <div className="flex flex-col gap-2 max-w-3xl">
              {expenseItems.map((e, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={e.code ?? ''}
                    onChange={ev => updateExpenseRow(idx, 'code', ev.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">{m.expenseTypePlaceholder}</option>
                    {expenseTypeOptions.map(o => (
                      <option key={o.id} value={o.code ?? ''}>{o.code} — {o.description}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={e.expenseDate ?? fromDate.split('T')[0]}
                    min={fromDate.split('T')[0]}
                    max={toDate.split('T')[0]}
                    onChange={ev => updateExpenseRow(idx, 'expenseDate', ev.target.value)}
                    className="w-36 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={e.amount ?? 0}
                    onChange={ev => updateExpenseRow(idx, 'amount', ev.target.value)}
                    placeholder={m.expenseAmountPlaceholder}
                    className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeExpenseRow(idx)}
                    disabled={expenseItems.length === 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {errors.expense && <p className="text-red-500 text-xs">{errors.expense}</p>}
              <button
                type="button"
                onClick={addExpenseRow}
                className="flex items-center gap-1.5 mt-1 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                {m.addExpenseRow}
              </button>

              <div className="flex justify-end pt-2 border-t border-gray-100 mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{m.expenseTotal}</span>
                  <span className="text-sm font-bold text-red-600">{formatMoney(totalExpense)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profit/Loss */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-5">
            <div className="flex items-center justify-between max-w-3xl">
              <div className="flex items-center gap-2.5">
                <span className={clsx('w-1 h-5 rounded-full flex-shrink-0', profitLoss >= 0 ? 'bg-emerald-500' : 'bg-red-500')} />
                <h2 className="text-sm font-bold text-gray-900">{m.sectionProfit}</h2>
              </div>
              <span className={clsx(
                'text-lg font-bold',
                profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {profitLoss >= 0 ? m.profitLabel : m.lossLabel}: {formatMoney(Math.abs(profitLoss))}
              </span>
            </div>
          </div>

          {/* Shareholder section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-1 h-5 bg-violet-500 rounded-full flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{m.sectionShareholder}</h2>
            </div>
            <div className="max-w-3xl">
              <select
                value={shareholderTemplateCode}
                onChange={e => { setShareholderTemplateCode(e.target.value); setErrors(p => ({ ...p, shareholder: '' })); markDirty() }}
                className="w-full sm:w-80 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{m.selectShareholderTemplate}</option>
                {shareholderTemplates.map(s => (
                  <option key={s.id} value={s.code ?? ''}>{s.code} — {s.description}</option>
                ))}
              </select>
              {errors.shareholder && <p className="text-red-500 text-xs mt-1">{errors.shareholder}</p>}

              {sharingItems.length > 0 && (
                <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{m.colShareholderName}</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{m.colShareholderPercent}</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{m.colShareholderCommission}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharingItems.map((s, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2.5 text-gray-800 font-medium">{s.label}</td>
                          <td className="px-4 py-2.5 text-gray-600">{s.percent}%</td>
                          <td className="px-4 py-2.5 font-bold text-violet-700">{formatMoney(s.amount ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-1 h-5 bg-orange-500 rounded-full flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{m.sectionChart}</h2>
            </div>
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3} stroke="none">
                    {chartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                {m.noChartData}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-none flex justify-end gap-3 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push('/business-setup/financial-settlement/financial-document'))}
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
