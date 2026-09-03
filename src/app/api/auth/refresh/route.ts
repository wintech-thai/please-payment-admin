import { NextRequest, NextResponse } from 'next/server'
// trigger rebuild

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

// Same header-forwarding contract as src/app/api/proxy/[...path]/route.ts —
// this fetch talks to the backend directly (bypassing that proxy), so it has
// to forward the visitor IP/mutual-key headers itself or the backend only
// sees this pod's own IP (breaks audit logging for Refresh).
const FORWARD_HEADERS = ['cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host']

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value
    if (!refreshToken) {
      return NextResponse.json({ message: 'No refresh token' }, { status: 401 })
    }

    const forwardHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    for (const h of FORWARD_HEADERS) {
      const v = request.headers.get(h)
      if (v) forwardHeaders[h] = v
    }
    if (process.env.MUTUAL_KEY) {
      forwardHeaders['X-Forward-Mutual-Key'] = process.env.MUTUAL_KEY
    }

    const response = await fetch(
      `${BACKEND_URL}/admin-api/AuthAdmin/org/global/action/Refresh`,
      {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ RefreshToken: refreshToken }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const res = NextResponse.json({ message: 'Refresh failed' }, { status: 401 })
      res.cookies.delete('accessToken')
      res.cookies.delete('refreshToken')
      return res
    }

    const newAccessToken: string = data.token?.access_token || ''
    const newRefreshToken: string = data.token?.refresh_token || refreshToken

    const res = NextResponse.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken })

    res.cookies.set('accessToken', newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    res.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return res
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
