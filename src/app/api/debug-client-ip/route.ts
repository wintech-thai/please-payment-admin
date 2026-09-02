import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

interface ClientIpSourceConfig {
  sourceType?: string
  headerName?: string
  headerIndex?: number
}

function resolveFromHeaders(request: NextRequest, cfg: ClientIpSourceConfig | null): { resolvedIp: string | null; note?: string; rawHeaderValue?: string | null } {
  if (!cfg || !cfg.sourceType || cfg.sourceType === 'Native') {
    // There is no equivalent of Connection.RemoteIpAddress in a Next.js Route Handler —
    // NextRequest wraps the Fetch API Request, which has no socket/transport concept.
    return { resolvedIp: null, note: 'Native mode has no equivalent at this layer (no raw socket access in a Next.js Route Handler)' }
  }

  if (!cfg.headerName) {
    return { resolvedIp: null, note: 'No header name configured' }
  }

  const headerValue = request.headers.get(cfg.headerName)
  if (!headerValue) {
    return { resolvedIp: null, note: `Header "${cfg.headerName}" was not present on the request reaching this Admin app pod` }
  }

  const parts = headerValue.split(',').map(p => p.trim())
  const index = cfg.headerIndex ?? 0
  // A negative index means "take the last value in the comma-separated list".
  if (index >= parts.length) {
    return { resolvedIp: null, note: `Configured index ${index} is out of range for "${headerValue}"`, rawHeaderValue: headerValue }
  }

  const resolved = index < 0 ? parts[parts.length - 1] : parts[index]
  return { resolvedIp: resolved, rawHeaderValue: headerValue }
}

// Resolves the client IP the same way onix-api's blacklist logic does, but executed by
// THIS Admin app pod instead — lets you tell apart "ingress isn't forwarding the header
// to the Admin pod" from "the proxy relay isn't forwarding it on to onix-api".
export async function GET(request: NextRequest) {
  let cfg: ClientIpSourceConfig | null = null

  try {
    const res = await fetch(`${BACKEND_URL}/admin-api/AdminConfiguration/org/global/action/GetClientIpSource/Backend`, {
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    cfg = data?.configuration?.clientIpSourceConfig ?? data?.Configuration?.ClientIpSourceConfig ?? null
  } catch {
    return NextResponse.json({ resolvedIp: null, note: 'Failed to fetch Client IP Source config from onix-api' })
  }

  const result = resolveFromHeaders(request, cfg)

  return NextResponse.json({
    resolvedIp: result.resolvedIp,
    note: result.note,
    rawHeaderValue: result.rawHeaderValue ?? null,
    sourceType: cfg?.sourceType ?? null,
    headerName: cfg?.headerName ?? null,
  })
}
