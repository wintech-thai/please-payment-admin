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
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (links.length > 0) {
    links.forEach(l => {
      l.type = 'image/svg+xml'
      l.href = `/img/please-payment.svg?_t=${Date.now()}`
    })
  }
}

function applyBrandToDOM(config: AdminConfig | null) {
  if (!config || !isConfigActive(config) || !config.brandConfig) {
    applyTheme(DEFAULT_THEME)
    document.title = 'PLEASE-PAYMENT'
    resetFavicon()
    return
  }

  const { brandName, logoImageUrl, themeName } = config.brandConfig

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

function BrandApplier({ config, loading }: { config: AdminConfig | null; loading: boolean }) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    // Skip during initial load to preserve localStorage theme (prevents flash)
    if (loading && config === null) return

    applyBrandToDOM(config)

    const s = config?.status?.toLowerCase() ?? ''
    const isActive = s === 'active' || s.startsWith('enable')
    if (isActive && config?.brandConfig?.logoImageUrl) {
      applyFaviconDataUrl()
    }
  }, [pathname, config, loading])

  return null
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AdminConfig | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    cachedFaviconDataUrl = null
    setLoading(true)
    const data = await fetchBrandConfig()
    setConfig(data)
    applyBrandToDOM(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const active = isConfigActive(config)
  const logoUrl = active && config?.brandConfig?.logoImageUrl
    ? resolveStorageUrl(config.brandConfig.logoImageUrl)
    : ''
  const brandName = active && config?.brandConfig?.brandName
    ? config.brandConfig.brandName
    : ''

  return (
    <BrandContext.Provider value={{ config, loading, logoUrl, brandName, refresh: load }}>
      <BrandApplier config={config} loading={loading} />
      {children}
    </BrandContext.Provider>
  )
}
