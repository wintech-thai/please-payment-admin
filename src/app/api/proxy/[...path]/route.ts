import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const accessToken = request.cookies.get('accessToken')?.value

  const url = new URL(request.url)
  const targetUrl = `${BACKEND_URL}/${path}${url.search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Onix-Application-Type': 'PLEASE-PAYMENT-ADMIN',
  }

  // Prefer the Authorization header from the incoming request (axios already base64-encoded it).
  // Fall back to cookie value with base64 encoding for SSR or direct calls.
  const incomingAuth = request.headers.get('Authorization')
  if (incomingAuth) {
    headers['Authorization'] = incomingAuth
  } else if (accessToken) {
    headers['Authorization'] = `Bearer ${Buffer.from(accessToken).toString('base64')}`
  }

  let body: string | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = JSON.stringify(await request.json())
    } catch {
      body = undefined
    }
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  })

  // 204 / 205 have no body — NextResponse.json() throws on these status codes
  if (response.status === 204 || response.status === 205) {
    return new NextResponse(null, { status: response.status })
  }

  const data = await response.json().catch(() => null)

  return NextResponse.json(data, { status: response.status })
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
