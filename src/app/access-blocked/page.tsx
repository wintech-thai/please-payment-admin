'use client'

import { useEffect, useState } from 'react'
import { LanguageProvider } from '@/context/LanguageContext'
import { BlacklistBanner } from '@/components/BlacklistBanner'
import { client } from '@/lib/axios'

interface Details {
  clientIp?: string
  whitelistIps?: string
  blacklistIps?: string
}

function AccessBlockedContent() {
  const [details, setDetails] = useState<Details>({})

  useEffect(() => {
    client
      .get('/public-api/PublicOrganization/action/GetAdminWebIpPolicyStatus')
      .then((res) => {
        const d = (res.data ?? {}) as Record<string, unknown>
        setDetails({
          clientIp: (d.clientIp ?? d.ClientIp) as string | undefined,
          whitelistIps: (d.whitelistIps ?? d.WhitelistIps) as string | undefined,
          blacklistIps: (d.blacklistIps ?? d.BlacklistIps) as string | undefined,
        })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <BlacklistBanner
        clientIp={details.clientIp}
        whitelistIps={details.whitelistIps}
        blacklistIps={details.blacklistIps}
      />
    </div>
  )
}

export default function AccessBlockedPage() {
  return (
    <LanguageProvider>
      <AccessBlockedContent />
    </LanguageProvider>
  )
}
