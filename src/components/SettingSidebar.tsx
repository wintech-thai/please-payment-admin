'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

type FlatItem = {
  type: 'flat'
  href: string
  labelKey: keyof ReturnType<typeof useLang>['t']['brandTheme']
  icon: React.ReactNode
}

type ParentItem = {
  type: 'parent'
  basePath: string
  labelKey: keyof ReturnType<typeof useLang>['t']['brandTheme']
  icon: React.ReactNode
  children: { href: string; labelKey: keyof ReturnType<typeof useLang>['t']['brandTheme'] }[]
}

type MenuItem = FlatItem | ParentItem

const menuItems: MenuItem[] = [
  {
    type: 'flat',
    href: '/setting/brand-theme',
    labelKey: 'sidebarBrandTheme',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
  {
    type: 'flat',
    href: '/setting/support-case',
    labelKey: 'sidebarSupportCase',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    type: 'flat',
    href: '/setting/agent',
    labelKey: 'sidebarAgents',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2.5M9.5 4.5a2.5 2.5 0 105 0" />
        <rect x="4" y="8" width="16" height="11" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14a1 1 0 100-2 1 1 0 000 2zM15 14a1 1 0 100-2 1 1 0 000 2zM9.5 17h5" />
        <path strokeLinecap="round" d="M2 13h2M20 13h2" />
      </svg>
    ),
  },
  {
    type: 'parent',
    basePath: '/setting/notification',
    labelKey: 'sidebarNotifications',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    children: [
      { href: '/setting/notification-channels', labelKey: 'sidebarNotiChannels' },
      { href: '/setting/notification-events', labelKey: 'sidebarNotiEvents' },
    ],
  },
  {
    type: 'flat',
    href: '/setting/backup',
    labelKey: 'sidebarBackup',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v.01M8 12v.01M16 12v.01" />
      </svg>
    ),
  },
  {
    type: 'flat',
    href: '/setting/miscellaneous',
    labelKey: 'sidebarMiscellaneous',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function SettingSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { t } = useLang()

  // Track which parent menus are open
  const [openParents, setOpenParents] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuItems.forEach(item => {
      if (item.type === 'parent' && pathname.startsWith(item.basePath)) {
        initial[item.basePath] = true
      }
    })
    return initial
  })

  // Auto-expand parent when navigating to a child route
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.type === 'parent' && pathname.startsWith(item.basePath)) {
        setOpenParents(prev => ({ ...prev, [item.basePath]: true }))
      }
    })
  }, [pathname])

  const toggleParent = (basePath: string) => {
    setOpenParents(prev => ({ ...prev, [basePath]: !prev[basePath] }))
  }

  return (
    <aside
      className={clsx(
        'relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
        'border-r border-white/10',
        collapsed ? 'w-14' : 'w-56'
      )}
      style={{ background: 'linear-gradient(180deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-primary-700 hover:bg-primary-600 flex items-center justify-center text-white shadow-lg transition-colors"
      >
        <svg
          className={clsx('w-3.5 h-3.5 transition-transform duration-300', collapsed ? 'rotate-180' : '')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{t.nav.setting}</p>
        </div>
      )}
      {collapsed && <div className="pt-5 pb-3" />}

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2">
        {menuItems.map(item => {
          if (item.type === 'flat') {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? t.brandTheme[item.labelKey] : undefined}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/75 hover:bg-white/15 hover:text-white'
                )}
              >
                {item.icon}
                {!collapsed && <span className="truncate">{t.brandTheme[item.labelKey]}</span>}
              </Link>
            )
          }

          // Parent item
          const isAnyChildActive = item.children.some(c => pathname.startsWith(c.href))
          const isOpen = !collapsed && (openParents[item.basePath] ?? false)

          return (
            <div key={item.basePath}>
              <button
                onClick={() => collapsed ? undefined : toggleParent(item.basePath)}
                title={collapsed ? t.brandTheme[item.labelKey] : undefined}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isAnyChildActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/75 hover:bg-white/15 hover:text-white'
                )}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{t.brandTheme[item.labelKey]}</span>
                    <svg
                      className={clsx('w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>

              {/* Sub-menu */}
              {isOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-white/20 flex flex-col gap-0.5">
                  {item.children.map(child => {
                    const isChildActive = pathname.startsWith(child.href)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          'flex items-center px-3 py-2 rounded-lg text-sm transition-colors',
                          isChildActive
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-white/65 hover:bg-white/10 hover:text-white font-medium'
                        )}
                      >
                        <span className="truncate">{t.brandTheme[child.labelKey]}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
