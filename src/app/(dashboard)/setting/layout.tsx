import SettingSidebar from '@/components/SettingSidebar'

export default function SettingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <SettingSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
        {children}
      </div>
    </div>
  )
}
