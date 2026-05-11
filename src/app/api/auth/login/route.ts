import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(
      `${BACKEND_URL}/admin-api/AuthAdmin/org/global/action/Login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UserName: body.username, Password: body.password }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || data?.error || 'Login failed' },
        { status: response.status }
      )
    }

    const accessToken: string = data.token?.access_token || ''
    const refreshToken: string = data.token?.refresh_token || ''
    const username: string = data.userName || body.username || ''
    const orgId = 'global'

    const res = NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      username,
      orgId,
    })

    // Non-HTTP-only so client can update on refresh
    res.cookies.set('accessToken', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })

    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    res.cookies.set('user_name', username, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    res.cookies.set('orgId', orgId, {
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
