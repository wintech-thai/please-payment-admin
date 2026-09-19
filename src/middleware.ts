import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_ONLY_PUBLIC_PATHS = ['/login']
const ALWAYS_PUBLIC_PATHS = ['/admin-signup-confirm', '/forgot-password', '/user-invite-confirm', '/documents', '/access-blocked']

// Always reachable even when the Web IP policy would otherwise block this visitor:
// /login so a mistakenly-blocked admin can still authenticate, and the IP & Blacklist
// settings page so they can then view/undo the policy that's blocking them. Mirrors
// onix-api's own exemption of GetIpPolicyStatus/GetOrganizationPolicy/
// SetOrganizationPolicy from BlacklistMiddleware — the check must never be able to
// lock out the only path that can undo it. Every other page stays gated as intended.
const WEB_BLOCK_EXEMPT_PATHS = ['/login', '/setting/miscellaneous']

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
const FORWARD_HEADERS = ['cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host']

// Admin's Web IP whitelist/blacklist must gate the whole site — including the login
// page itself — not just post-login dashboard content (that's handled separately by
// BlacklistContext/BlacklistBanner as defense-in-depth for an already-open session).
// Calls a dedicated [AllowAnonymous] onix-api endpoint since a visitor hitting this
// has no auth token yet. Fails open (returns false) on any error/timeout — an infra
// hiccup in this check must never lock every visitor out of the whole site.
async function isWebIpBlocked(request: NextRequest): Promise<boolean> {
  const headers: Record<string, string> = {}
  for (const h of FORWARD_HEADERS) {
    const v = request.headers.get(h)
    if (v) headers[h] = v
  }
  if (process.env.MUTUAL_KEY) {
    headers['X-Forward-Mutual-Key'] = process.env.MUTUAL_KEY
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(
      `${BACKEND_URL}/public-api/PublicOrganization/action/GetAdminWebIpPolicyStatus`,
      { headers, signal: controller.signal }
    )
    if (!res.ok) return false
    const data = (await res.json()) as Record<string, unknown>
    return Boolean(data.isBlacklisted ?? data.IsBlacklisted)
  } catch {
    return false
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('accessToken')?.value

  // Always allow API routes and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Always accessible regardless of auth state
  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const isWebBlockExempt = WEB_BLOCK_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!isWebBlockExempt && (await isWebIpBlocked(request))) {
    return NextResponse.redirect(new URL('/access-blocked', request.url))
  }

  const isAuthOnlyPublic = AUTH_ONLY_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  if (!token && !isAuthOnlyPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isAuthOnlyPublic) {
    return NextResponse.redirect(new URL('/overview', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
