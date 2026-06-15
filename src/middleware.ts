import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_ONLY_PUBLIC_PATHS = ['/login']
const ALWAYS_PUBLIC_PATHS = ['/admin-signup-confirm', '/forgot-password', '/user-invite-confirm', '/documents']

export function middleware(request: NextRequest) {
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
