import ReportAnalyticSidebar from '@/components/ReportAnalyticSidebar'

export default function ReportAnalyticLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
      <ReportAnalyticSidebar />
      {children}
    </div>
  )
}
