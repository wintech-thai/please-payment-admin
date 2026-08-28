import RiskManagementSidebar from '@/components/RiskManagementSidebar'

export default function RiskManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <RiskManagementSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
