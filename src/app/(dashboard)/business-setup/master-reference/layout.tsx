import MasterReferenceSidebar from '@/components/MasterReferenceSidebar'

export default function MasterReferenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <MasterReferenceSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
