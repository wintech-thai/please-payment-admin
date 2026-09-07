import CryptoAccountSidebar from '@/components/CryptoAccountSidebar'

export default function PayOutCryptoAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <CryptoAccountSidebar />
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {children}
      </div>
    </div>
  )
}
