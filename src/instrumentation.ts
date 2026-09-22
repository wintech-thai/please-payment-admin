/**
 * Next.js Instrumentation — runs once when the server starts.
 *
 * Hooks a WebSocket server onto the same HTTP server that Next.js uses
 * (path `/ws`). Works in both dev and standalone production (this app
 * already builds with output: 'standalone').
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startTerminalWsServer } = await import('@/lib/terminal-ws-server')
    startTerminalWsServer()
  }
}
