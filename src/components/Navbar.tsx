'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/context/LanguageContext'
import { clearAuthData } from '@/lib/axios'
import { Lang } from '@/lib/translations'
import clsx from 'clsx'
import { toast } from 'sonner'
import ProfileModal from '@/components/ProfileModal'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import { AppVersionDisplay } from '@/components/AppVersionDisplay'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const [loggingOut, setLoggingOut] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [businessSetupOpen, setBusinessSetupOpen] = useState(false)
  const [modal, setModal] = useState<'profile' | 'changePassword' | null>(null)
  const [username, setUsername] = useState('Admin')
  const businessSetupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUsername(localStorage.getItem('username') || 'Admin')
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (businessSetupRef.current && !businessSetupRef.current.contains(e.target as Node)) {
        setBusinessSetupOpen(false)
      }
    }
    if (businessSetupOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [businessSetupOpen])

  async function handleLogout() {
    setLoggingOut(true)
    clearAuthData()
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success(t.nav.logoutSuccess, { duration: 1500 })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push('/login')
  }

  const isAdministratorActive = pathname.startsWith('/administrator')
  const isBusinessSetupActive = pathname.startsWith('/business-setup')

  const businessSetupChildren = [
    { href: '/business-setup/merchant', label: t.nav.merchant, comingSoon: false },
    { href: '/business-setup/pay-in-bank-account', label: t.nav.bankAccounts, comingSoon: false },
  ]

  return (
    <header className="bg-gradient-to-r from-primary-700 to-primary-600 shadow-lg z-30 relative">
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Brand */}
        <Link href="/overview" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/img/please-payment.svg" alt="Please Payment" className="w-9 h-9" />
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm leading-tight">PLEASE-PAYMENT</p>
            <p className="text-orange-300 text-xs leading-tight">Admin</p>
          </div>
        </Link>

        {/* Divider */}
        <div className="hidden md:block w-px h-6 bg-white/20 flex-shrink-0" />

        {/* Nav items — desktop */}
        <nav className="hidden md:flex items-center gap-0.5 flex-nowrap">
          {/* Overview */}
          <Link
            href="/overview"
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              pathname === '/overview' || pathname.startsWith('/overview/')
                ? 'bg-white/20 text-white'
                : 'text-white hover:bg-white/15'
            )}
          >
            <span>{t.nav.overview}</span>
          </Link>

          {/* Business Setup dropdown */}
          <div className="relative" ref={businessSetupRef}>
            <button
              onClick={() => setBusinessSetupOpen(v => !v)}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                isBusinessSetupActive
                  ? 'bg-white/20 text-white'
                  : 'text-white hover:bg-white/15'
              )}
            >
              <span>{t.nav.businessSetup}</span>
              <svg
                className={clsx('w-3 h-3 flex-shrink-0 transition-transform', businessSetupOpen && 'rotate-180')}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {businessSetupOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                {businessSetupChildren.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setBusinessSetupOpen(false)}
                    className={clsx(
                      'flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                      pathname.startsWith(item.href)
                        ? 'text-primary-700 font-semibold bg-primary-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                ))}

                {/* Payment link */}
                <Link
                  href="/business-setup/payment"
                  onClick={() => setBusinessSetupOpen(false)}
                  className={clsx(
                    'flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                    pathname.startsWith('/business-setup/payment')
                      ? 'text-primary-700 font-semibold bg-primary-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span>{t.nav.payment}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Report & Analytic */}
          <Link
            href="/report-analytic"
            className={clsx(
              'flex items-center px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              pathname.startsWith('/report-analytic')
                ? 'bg-white/20 text-white'
                : 'text-white hover:bg-white/15'
            )}
          >
            {t.nav.reportAndAnalytic}
          </Link>

          {/* Administrator */}
          <Link
            href="/administrator/custom-roles"
            className={clsx(
              'flex items-center px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              isAdministratorActive
                ? 'bg-white/20 text-white'
                : 'text-white hover:bg-white/15'
            )}
          >
            {t.nav.administrator}
          </Link>

          {/* Setting */}
          <Link
            href="/setting"
            className={clsx(
              'flex items-center px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              pathname.startsWith('/setting')
                ? 'bg-white/20 text-white'
                : 'text-white hover:bg-white/15'
            )}
          >
            {t.nav.setting}
          </Link>
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Version display */}
          <div className="hidden lg:flex items-center mr-1 pr-3 border-r border-white/10 h-8">
            <AppVersionDisplay />
          </div>

          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            {(['th', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={clsx(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  lang === l
                    ? 'bg-white/30 text-white'
                    : 'text-white hover:text-white'
                )}
              >
                {l === 'th' ? 'TH' : 'EN'}
              </button>
            ))}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white hover:bg-white/15 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs uppercase">
                {username.charAt(0)}
              </div>
              <span className="hidden sm:block text-sm font-medium">{username}</span>
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <button
                    onClick={() => { setUserMenuOpen(false); setModal('profile') }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t.nav.profile}
                  </button>
                  <button
                    onClick={() => { setUserMenuOpen(false); setModal('changePassword') }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {t.nav.changePassword}
                  </button>

                  {/* Language switcher — mobile only */}
                  <div className="sm:hidden border-t border-gray-100 mt-1 pt-1">
                    <div className="flex items-center gap-1 px-4 py-2">
                      {(['th', 'en'] as Lang[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => { setLang(l); setUserMenuOpen(false) }}
                          className={clsx(
                            'flex-1 py-1 rounded-md text-xs font-medium transition-colors',
                            lang === l
                              ? 'bg-primary-100 text-primary-800'
                              : 'text-gray-500 hover:text-gray-700'
                          )}
                        >
                          {l === 'th' ? 'TH' : 'EN'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t.nav.logout}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-1.5 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal === 'profile' && <ProfileModal onClose={() => setModal(null)} />}
      {modal === 'changePassword' && <ChangePasswordModal onClose={() => setModal(null)} />}

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-white/10 px-3 pb-3 pt-2 flex flex-col gap-1">
          {/* Overview */}
          <Link
            href="/overview"
            onClick={() => setMobileMenuOpen(false)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/overview') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>{t.nav.overview}</span>
          </Link>

          {/* Business Setup group */}
          <div className="px-3 py-1.5">
            <p className="text-xs font-semibold text-orange-300/60 uppercase tracking-wider mb-1">{t.nav.businessSetup}</p>
            {businessSetupChildren.map(item => (
              <Link
                key={item.href}
                href={item.comingSoon ? '#' : item.href}
                onClick={e => {
                  if (item.comingSoon) e.preventDefault()
                  else setMobileMenuOpen(false)
                }}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                  item.comingSoon
                    ? 'text-white/35 cursor-default'
                    : pathname.startsWith(item.href)
                      ? 'bg-white/20 text-white'
                      : 'text-white hover:bg-white/15'
                )}
              >
                <span>{item.label}</span>
                {item.comingSoon && (
                  <span className="text-xs bg-white/20 text-orange-100/60 px-1.5 py-0.5 rounded-full">{t.nav.comingSoon}</span>
                )}
              </Link>
            ))}

            {/* Payment link */}
            <Link
              href="/business-setup/payment"
              onClick={() => setMobileMenuOpen(false)}
              className={clsx(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                pathname.startsWith('/business-setup/payment')
                  ? 'bg-white/20 text-white'
                  : 'text-white hover:bg-white/15'
              )}
            >
              <span>{t.nav.payment}</span>
            </Link>
          </div>

          {/* Report & Analytic */}
          <Link
            href="/report-analytic"
            onClick={() => setMobileMenuOpen(false)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/report-analytic') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{t.nav.reportAndAnalytic}</span>
          </Link>

          {/* Administrator */}
          <Link
            href="/administrator/custom-roles"
            onClick={() => setMobileMenuOpen(false)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isAdministratorActive ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t.nav.administrator}</span>
          </Link>

          {/* Setting */}
          <Link
            href="/setting"
            onClick={() => setMobileMenuOpen(false)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/setting') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t.nav.setting}</span>
          </Link>
        </nav>
      )}
    </header>
  )
}
