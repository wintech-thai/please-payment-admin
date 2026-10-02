'use client'

import dynamic from 'next/dynamic'

// Pulls in react-virtual + recharts — never render on the server.
const LokiView = dynamic(() => import('@/components/loki/LokiView'), { ssr: false })

export default function LogsPage() {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>
      <LokiView />
    </div>
  )
}
