'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLang } from '@/context/LanguageContext'
import { clearAuthData } from '@/lib/axios'
import { Lang } from '@/lib/translations'
import clsx from 'clsx'

interface NavItem {
  href: string
  labelKey: 'overview' | 'administrator'
  icon: React.ReactNode
  comingSoon?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/overview',
    labelKey: 'overview',
    comingSoon: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/administrator',
    labelKey: 'administrator',
    comingSoon: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  username?: string
  collapsed?: boolean
  onToggle?: () => void
}

export default function Sidebar({ username = 'Admin', collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    clearAuthData()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-gradient-to-b from-primary-800 to-primary-700 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-white/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight truncate">PLEASE-PAYMENT</p>
            <p className="text-orange-300 text-xs truncate">Admin Portal</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-white/50 hover:text-white transition-colors hidden lg:block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-orange-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium">{t.nav[item.labelKey]}</span>
                  {item.comingSoon && (
                    <span className="ml-auto text-xs bg-white/20 text-orange-100 px-2 py-0.5 rounded-full">
                      {t.nav.comingSoon}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.comingSoon && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                  {t.nav[item.labelKey]} ({t.nav.comingSoon})
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Language switcher */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-orange-400 text-xs mb-2 uppercase tracking-wider">à¸ à¸²à¸©à¸² / Language</p>
          <div className="flex gap-1">
            {(['th', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx(
                  'flex-1 py-1 rounded-md text-xs font-medium transition-colors',
                  lang === l
                    ? 'bg-white/20 text-white'
                    : 'text-orange-300 hover:text-white hover:bg-white/10'
                )}
              >
                {l === 'th' ? 'à¹„à¸—à¸¢' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-white/10 px-2 py-3 space-y-1">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-orange-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {!collapsed && <span className="text-sm">{t.nav.profile}</span>}
        </Link>

        <Link
          href="/change-password"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-orange-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          {!collapsed && <span className="text-sm">{t.nav.changePassword}</span>}
        </Link>

        {/* User avatar + logout */}
        <div className="flex items-center gap-3 px-3 py-2 mt-1">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm uppercase">
            {username.charAt(0)}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{username}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title={t.nav.logout}
                className="text-orange-300 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
