import BankAccountSidebar from '@/components/BankAccountSidebar'

export default function TransitBankAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <BankAccountSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
