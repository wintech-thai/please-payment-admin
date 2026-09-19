'use client'

import { usePathname } from 'next/navigation'
import { LanguageProvider } from '@/context/LanguageContext'
import { BlacklistProvider, useBlacklist } from '@/context/BlacklistContext'
import { BlacklistBanner } from '@/components/BlacklistBanner'
import Navbar from '@/components/Navbar'

// Never let the banner replace the IP & Blacklist settings page itself — otherwise a
// blocked admin could reach this page (middleware/auth let it through) but still never
// see the actual form needed to view/undo the policy that's blocking them.
const BLACKLIST_BANNER_EXEMPT_PATHS = ['/setting/miscellaneous']

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isBlacklisted, clientIp, whitelistIps, blacklistIps } = useBlacklist()
  const pathname = usePathname()
  const isExempt = BLACKLIST_BANNER_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {isBlacklisted && !isExempt
          ? <BlacklistBanner clientIp={clientIp} whitelistIps={whitelistIps} blacklistIps={blacklistIps} />
          : children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <BlacklistProvider>
        <DashboardShell>{children}</DashboardShell>
      </BlacklistProvider>
    </LanguageProvider>
  )
}
