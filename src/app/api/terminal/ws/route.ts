import { NextResponse } from 'next/server'

// Readiness check — the actual WebSocket runs on the same port at path `/ws`,
// registered in instrumentation.ts.
export async function GET() {
  return NextResponse.json({ ready: true })
}
