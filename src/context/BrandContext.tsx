'use client'

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { applyTheme, DEFAULT_THEME } from '@/lib/brand-themes'
import { resolveStorageUrl } from '@/lib/storage'
import type { AdminConfig } from '@/lib/api/admin-config.api'
import type { ThemeName } from '@/lib/brand-themes'

interface BrandContextValue {
  config: AdminConfig | null
  loading: boolean
  logoUrl: string
  brandName: string
  refresh: () => void
}

const BrandContext = createContext<BrandContextValue>({
  config: null, loading: true, logoUrl: '', brandName: '', refresh: () => {},
})

export function useBrand() {
  return useContext(BrandContext)
}

async function fetchBrandConfig(): Promise<AdminConfig | null> {
  try {
    const res = await fetch('/api/proxy/admin-api/AdminConfiguration/org/global/action/GetBrandConfig', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const raw = await res.json()
    return (raw?.configuration ?? raw?.data ?? raw) as AdminConfig
  } catch {
    return null
  }
}

export function isConfigActive(config: AdminConfig | null): boolean {
  const s = config?.status?.toLowerCase() ?? ''
  return s === 'active' || s.startsWith('enable')
}

function resetFavicon() {
  cachedFaviconDataUrl = null
  const href = `/img/please-payment.svg?_t=${Date.now()}`
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (links.length > 0) {
    links.forEach(l => { l.type = 'image/svg+xml'; l.href = href })
  } else {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = href
    document.head.appendChild(link)
  }
}

function applyBrandToDOM(config: AdminConfig | null) {
  if (!config || !isConfigActive(config) || !config.brandConfig) {
    applyTheme(DEFAULT_THEME)
    document.title = 'PLEASE-PAYMENT'
    resetFavicon()
    return
  }

  const { brandName, themeName } = config.brandConfig

  if (themeName) applyTheme(themeName as ThemeName)
  if (brandName) document.title = brandName

  // favicon handled by applyFaviconDataUrl
}

let cachedFaviconDataUrl: string | null = null

function setFaviconHref(dataUrl: string) {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (links.length > 0) {
    links.forEach(l => { l.href = dataUrl })
  } else {
    const link = document.createElement('link')
    link.id = 'brand-favicon'
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = dataUrl
    document.head.appendChild(link)
  }
}

function applyFaviconDataUrl() {
  // Apply cached value immediately to avoid flash on navigation
  if (cachedFaviconDataUrl) {
    setFaviconHref(cachedFaviconDataUrl)
    return
  }
  // First load: fetch, cache, then apply
  fetch(`/api/brand-logo?_t=${Date.now()}`)
    .then(r => r.ok ? r.blob() : null)
    .then(blob => {
      if (!blob) return
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        if (!dataUrl) return
        cachedFaviconDataUrl = dataUrl
        setFaviconHref(dataUrl)
      }
      reader.readAsDataURL(blob)
    })
    .catch(() => {})
}

function BrandApplier({ config, loading, brandName }: { config: AdminConfig | null; loading: boolean; brandName: string }) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    // Always restore title on navigation — Next.js metadata overwrites document.title on each route change
    if (brandName) document.title = brandName

    // Skip DOM theme changes when config is null (initial load or failed fetch e.g. after logout)
    if (config === null) return

    applyBrandToDOM(config)

    const s = config?.status?.toLowerCase() ?? ''
    const isActive = s === 'active' || s.startsWith('enable')
    if (isActive && config?.brandConfig?.logoImageUrl) {
      applyFaviconDataUrl()
    } else {
      resetFavicon()
    }
  }, [pathname, config, loading, brandName])

  return null
}

const BRAND_DISPLAY_CACHE_KEY = 'brandDisplayCache'

interface BrandProviderProps {
  children: React.ReactNode
  initialConfig?: AdminConfig | null
}

export function BrandProvider({ children, initialConfig = null }: BrandProviderProps) {
  const initActive = isConfigActive(initialConfig)
  const initName = initActive && initialConfig?.brandConfig?.brandName ? initialConfig.brandConfig.brandName : ''
  const initLogoUrl = initActive && initialConfig?.brandConfig?.logoImageUrl
    ? resolveStorageUrl(initialConfig.brandConfig.logoImageUrl) : ''

  const [config, setConfig] = useState<AdminConfig | null>(initialConfig)
  const [loading, setLoading] = useState(false)
  // Initialize from server-fetched config — same value on server and client, no hydration mismatch
  const [cachedName, setCachedName] = useState(initName)
  const [cachedLogo, setCachedLogo] = useState(initLogoUrl)

  useLayoutEffect(() => {
    if (initialConfig !== null) {
      // Update localStorage cache from server-fetched config
      if (initActive && initialConfig.brandConfig) {
        try { localStorage.setItem(BRAND_DISPLAY_CACHE_KEY, JSON.stringify({ n: initName, l: initLogoUrl })) } catch {}
      } else {
        try { localStorage.removeItem(BRAND_DISPLAY_CACHE_KEY) } catch {}
      }
    } else {
      // No server config: fallback to localStorage display cache
      try {
        const raw = localStorage.getItem(BRAND_DISPLAY_CACHE_KEY)
        if (raw) {
          const { n = '', l = '' } = JSON.parse(raw)
          if (n) { setCachedName(n); document.title = n }
          if (l) setCachedLogo(l)
        }
      } catch {}
    }
  }, [])

  async function load() {
    cachedFaviconDataUrl = null
    setLoading(true)
    const data = await fetchBrandConfig()
    setConfig(data)
    if (data !== null) {
      applyBrandToDOM(data)
      const active = isConfigActive(data) && !!data.brandConfig
      if (active) {
        const n = data.brandConfig!.brandName || ''
        const l = data.brandConfig!.logoImageUrl ? resolveStorageUrl(data.brandConfig!.logoImageUrl) : ''
        setCachedName(n)
        setCachedLogo(l)
        try { localStorage.setItem(BRAND_DISPLAY_CACHE_KEY, JSON.stringify({ n, l })) } catch {}
      } else {
        setCachedName('')
        setCachedLogo('')
        try { localStorage.removeItem(BRAND_DISPLAY_CACHE_KEY) } catch {}
      }
    }
    setLoading(false)
  }

  // Skip initial client-side fetch when server already provided config
  useEffect(() => { if (!initialConfig) load() }, [])

  const active = isConfigActive(config)
  const resolvedLogoUrl = active && config?.brandConfig?.logoImageUrl
    ? resolveStorageUrl(config.brandConfig.logoImageUrl)
    : ''
  const resolvedBrandName = active && config?.brandConfig?.brandName
    ? config.brandConfig.brandName
    : ''

  // Show cached values when loading or when config is null (failed fetch e.g. after logout)
  const logoUrl = (loading || config === null) ? cachedLogo : resolvedLogoUrl
  const brandName = (loading || config === null) ? cachedName : resolvedBrandName

  return (
    <BrandContext.Provider value={{ config, loading, logoUrl, brandName, refresh: load }}>
      <BrandApplier config={config} loading={loading} brandName={brandName} />
      {children}
    </BrandContext.Provider>
  )
}
