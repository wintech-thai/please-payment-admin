import FinancialSettlementSidebar from '@/components/FinancialSettlementSidebar'

export default function FinancialSettlementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <FinancialSettlementSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
