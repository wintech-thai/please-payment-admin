import type { Metadata, Viewport } from 'next'
import { cache } from 'react'
import { headers } from 'next/headers'
import { Toaster } from 'sonner'
import { BrandProvider } from '@/context/BrandContext'
import type { AdminConfig } from '@/lib/api/admin-config.api'
import { prompt } from './fonts'
import './globals.css'

// Same header-forwarding contract as src/app/api/proxy/[...path]/route.ts —
// this SSR fetch talks to the backend directly (bypassing that proxy), so it
// has to forward the visitor IP/mutual-key headers itself or the backend
// only sees this pod's own IP (breaks audit logging for GetBrandConfig).
const FORWARD_HEADERS = ['cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host']

const fetchInitialBrandConfig = cache(async (): Promise<AdminConfig | null> => {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
    const incomingHeaders = await headers()

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Onix-Application-Type': 'PLEASE-PAYMENT-ADMIN',
    }
    for (const h of FORWARD_HEADERS) {
      const v = incomingHeaders.get(h)
      if (v) forwardHeaders[h] = v
    }
    if (process.env.MUTUAL_KEY) {
      forwardHeaders['X-Forward-Mutual-Key'] = process.env.MUTUAL_KEY
    }

    const res = await fetch(
      `${backendUrl}/admin-api/AdminConfiguration/org/global/action/GetBrandConfig`,
      {
        method: 'GET',
        headers: forwardHeaders,
        cache: 'no-store',
      }
    )
    if (!res.ok) return null
    const raw = await res.json()
    return (raw?.configuration ?? raw?.data ?? raw) as AdminConfig
  } catch {
    return null
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchInitialBrandConfig()
  const s = config?.status?.toLowerCase() ?? ''
  const active = s === 'active' || s.startsWith('enable')
  const title = active && config?.brandConfig?.brandName
    ? config.brandConfig.brandName
    : 'PLEASE-PAYMENT Admin'
  return {
    title,
    description: 'Please Payment Administration Dashboard',
    icons: {
      icon: '/img/please-payment.svg',
      shortcut: '/img/please-payment.svg',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialConfig = await fetchInitialBrandConfig()
  return (
    <html lang="th" className={prompt.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var root = document.documentElement;
            var tn = localStorage.getItem('brandThemeName');
            if (tn) root.setAttribute('data-theme', tn);
            var v = localStorage.getItem('brandThemeVars');
            if (v) {
              var vars = JSON.parse(v);
              Object.keys(vars).forEach(function(k){ root.style.setProperty(k, vars[k]); });
            }
          } catch(e) {}
        `}} />
      </head>
      <body>
        <BrandProvider initialConfig={initialConfig}>
          {children}
        </BrandProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-prompt), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            },
          }}
        />
      </body>
    </html>
  )
}
