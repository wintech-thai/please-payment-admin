'use client'

import { LanguageProvider } from '@/context/LanguageContext'
import Navbar from '@/components/Navbar'

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DashboardShell>{children}</DashboardShell>
    </LanguageProvider>
  )
}
