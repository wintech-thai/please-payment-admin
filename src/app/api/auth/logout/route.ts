import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value || ''

  try {
    await fetch(`${BACKEND_URL}/admin-api/OnlyAdmin/org/global/action/Logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    })
  } catch {
    // proceed with local logout even if backend call fails
  }

  const res = NextResponse.json({ success: true })
  res.cookies.delete('accessToken')
  res.cookies.delete('refreshToken')
  res.cookies.delete('user_name')
  res.cookies.delete('orgId')
  return res
}
