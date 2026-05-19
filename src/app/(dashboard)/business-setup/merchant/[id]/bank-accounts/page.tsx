'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { merchantApi } from '@/lib/api/merchant.api'
import type { MerchantItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Clock } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

interface PayInAccount {
  bankAccountId: string
  bankCode?: string | null
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  promptPayId?: string | null
  accountType?: string | null
  accountLevel?: string | null
  status?: string | null
  createdDate?: string | null
}

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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return d }
}

export default function MerchantBankAccountsPage() {
  const { t, lang } = useLang()
  const m = t.merchant
  const b = t.bankAccount
  const router = useRouter()
  const params = useParams()
  const merchantId = params.id as string

  const [merchant, setMerchant] = useState<MerchantItem | null>(null)
  const [payInAccounts, setPayInAccounts] = useState<PayInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const merchantRes = await merchantApi.getMerchantById(merchantId)
        const raw = (merchantRes.data as any)?.merchant ?? merchantRes.data
        setMerchant(raw)

        const accountsRes = await merchantApi.getPayInBankAccountsForMerchant(merchantId)
        const aRaw = accountsRes.data as any
        const list: any[] = Array.isArray(aRaw) ? aRaw : (aRaw?.bankAccounts ?? aRaw?.BankAccounts ?? aRaw?.accounts ?? [])
        setPayInAccounts(list.map(a => ({
          bankAccountId: a.bankAccountId ?? a.BankAccountId ?? a.accountId ?? a.id ?? '',
          bankCode: a.bankCode ?? a.BankCode,
          bankName: a.bankName ?? a.BankName,
          accountNumber: a.accountNumber ?? a.AccountNumber,
          accountName: a.accountName ?? a.AccountName,
          promptPayId: a.promptPayId ?? a.PromptPayId,
          accountType: a.accountType ?? a.AccountType,
          accountLevel: a.accountLevel ?? a.AccountLevel,
          status: a.status ?? a.Status ?? a.bankAccountStatus ?? a.BankAccountStatus,
          createdDate: a.createdDate ?? a.CreatedDate,
        })))
      } catch {
        toast.error(m.failedToLoadBankAccounts)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [merchantId])

  const bankLabel = (a: PayInAccount) =>
    a.bankCode ? (a.bankName ? `${a.bankCode} - ${a.bankName}` : a.bankCode) : '—'

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

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/business-setup/merchant?highlight=${merchantId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.bankAccountsTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {merchant?.name ?? merchant?.code ?? merchantId}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Pay-In Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.payInSection}</SectionHeader>

          {payInAccounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{m.noBankAccountsFound}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50">
                    {[b.colBank, b.colAccountNumber, b.colAccountName, b.colPromptPayId, b.colAccountType, b.colAccountLevel, b.colStatus].map((col, i) => (
                      <th key={col} className={clsx('px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap', i === 0 && 'rounded-tl-xl')}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payInAccounts.map((a, idx) => (
                    <tr
                      key={a.bankAccountId}
                      onClick={() => setSelectedId(prev => prev === a.bankAccountId ? null : a.bankAccountId)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        selectedId === a.bankAccountId
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-800">{bankLabel(a)}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{a.accountNumber ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-600">
                        {a.accountName ?? '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        {a.promptPayId ? (
                          <span className="text-sm text-gray-600">{a.promptPayId}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        {a.accountType ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">{a.accountType}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        {a.accountLevel ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">{a.accountLevel}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pay-Out Section — Coming Soon */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.payOutSection}</SectionHeader>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
            <Clock className="w-8 h-8 text-gray-300" />
            <p className="text-sm font-semibold">{m.payOutComingSoon}</p>
            <p className="text-xs">{m.payOutComingSoonDesc}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
