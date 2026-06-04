import type { Metadata, Viewport } from 'next'
import { cache } from 'react'
import { Toaster } from 'sonner'
import { BrandProvider } from '@/context/BrandContext'
import type { AdminConfig } from '@/lib/api/admin-config.api'
import './globals.css'

const fetchInitialBrandConfig = cache(async (): Promise<AdminConfig | null> => {
  try {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
    const res = await fetch(
      `${backendUrl}/admin-api/AdminConfiguration/org/global/action/GetBrandConfig`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Onix-Application-Type': 'PLEASE-PAYMENT-ADMIN',
        },
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
    <html lang="th" suppressHydrationWarning>
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
              fontFamily: "'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            },
          }}
        />
      </body>
    </html>
  )
}
