'use client'

import { usePathname } from 'next/navigation'
import SettingSidebar from '@/components/SettingSidebar'

// x089 ปรับแก้ 9 : Payment Gateway moved out to the System Management nav — it no longer
// belongs under this section, so skip the Support & Setting sidebar for it specifically.
export default function SettingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideSidebar = pathname.startsWith('/setting/payment-gateway')

  if (hideSidebar) {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-6 custom-scrollbar">
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <SettingSidebar />
      <div className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-6 custom-scrollbar">
        {children}
      </div>
    </div>
  )
}
