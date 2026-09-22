/**
 * WebSocket server for the Shell Terminal proxy.
 *
 * Uses `noServer` mode with a monkey-patch on `http.Server.prototype.emit`
 * to intercept WebSocket upgrade requests for path `/ws`. Works regardless
 * of whether `register()` runs before or after the HTTP server starts
 * listening.
 *
 * Flow:  Browser (ws://host:port/ws) ──► This server ──► onix-api (wss)
 *
 * Security: the access token is NOT passed in the URL query string.
 * Instead the client sends a JSON auth frame as the FIRST message:
 *   { type: "auth", token: "<jwt>" }
 * Only after that does this server open the backend WebSocket.
 */
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Socket } from 'net'

let started = false

export function startTerminalWsServer() {
  if (started) return
  started = true

  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    ;(ws as unknown as { _socket?: Socket })._socket?.setNoDelay(true)
    console.log('Terminal WS client connected')

    const authTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.warn('Terminal WS: auth timeout — closing connection')
        ws.close(1008, 'Auth timeout')
      }
    }, 10_000)

    ws.once('message', (rawMsg) => {
      clearTimeout(authTimeout)

      let token: string | undefined
      try {
        const msg = JSON.parse(rawMsg.toString()) as Record<string, unknown>
        if (msg.type !== 'auth' || typeof msg.token !== 'string') {
          throw new Error('Invalid auth frame')
        }
        token = msg.token
      } catch {
        console.warn('Terminal WS: invalid auth frame — closing connection')
        ws.close(1008, 'Invalid auth frame')
        return
      }

      handleTerminalProxy(ws, token, req)
    })
  })

  const origEmit = http.Server.prototype.emit

  http.Server.prototype.emit = function patchedEmit(
    this: http.Server,
    event: string,
    ...args: unknown[]
  ): boolean {
    if (event === 'upgrade') {
      const [req, socket, head] = args as [http.IncomingMessage, Socket, Buffer]
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname

      if (pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (clientWs) => {
          wss.emit('connection', clientWs, req)
        })
        return true
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return (origEmit as Function).apply(this, [event, ...args])
  }

  console.log('Terminal WebSocket proxy registered (path: /ws)')
}

function handleTerminalProxy(clientWs: WebSocket, token: string, req: IncomingMessage) {
  const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

  if (!BACKEND_URL) {
    console.error('BACKEND_URL is not set')
    clientWs.send(JSON.stringify({ type: 'error', message: 'BACKEND_URL is not configured on the server' }))
    clientWs.close()
    return
  }

  const backendWsBase = BACKEND_URL.replace(/^http/, 'ws')
  const terminalUrl = `${backendWsBase}/admin-api/AdminTerminal/org/global/action/TerminalConnect`
  const encodedToken = Buffer.from(token).toString('base64')

  // Same header-forwarding contract as the rest of this app's server-side
  // fetches — without it onix-api only sees this pod's own internal IP.
  const forwardHeaders: Record<string, string> = {
    Authorization: `Bearer ${encodedToken}`,
  }
  for (const h of ['cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host']) {
    const v = req.headers[h]
    if (typeof v === 'string') forwardHeaders[h] = v
  }
  if (process.env.MUTUAL_KEY) {
    forwardHeaders['X-Forward-Mutual-Key'] = process.env.MUTUAL_KEY
  }

  console.log(`Terminal WS proxy -> ${terminalUrl}`)

  let backendWs: WebSocket
  let connected = false

  try {
    backendWs = new WebSocket(terminalUrl, {
      headers: forwardHeaders,
      rejectUnauthorized: false,
      handshakeTimeout: 15000,
      perMessageDeflate: false,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Failed to create backend WebSocket:', msg)
    clientWs.send(JSON.stringify({ type: 'error', message: `Failed to connect: ${msg}` }))
    clientWs.close()
    return
  }

  const connectTimeout = setTimeout(() => {
    if (!connected) {
      console.error('Backend WS connection timed out (15s)')
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: 'Connection to backend timed out (15s)' }))
        clientWs.close()
      }
      try { backendWs.terminate() } catch { /* noop */ }
    }
  }, 15000)

  backendWs.on('open', () => {
    connected = true
    clearTimeout(connectTimeout)
    ;(backendWs as unknown as { _socket?: Socket })._socket?.setNoDelay(true)
    console.log('Connected to backend terminal')
    clientWs.send(JSON.stringify({ type: 'connected' }))
  })

  backendWs.on('unexpected-response', (_req, res) => {
    connected = true
    clearTimeout(connectTimeout)
    let body = ''
    res.on('data', (chunk: Buffer) => { body += chunk.toString() })
    res.on('end', () => {
      console.error(`Backend rejected WS upgrade: HTTP ${res.statusCode} - ${body}`)
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: `Backend returned HTTP ${res.statusCode}: ${body || res.statusMessage}`,
        }))
        clientWs.close()
      }
    })
  })

  backendWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary })
    }
  })

  backendWs.on('error', (err) => {
    connected = true
    clearTimeout(connectTimeout)
    console.error('Backend WS error:', err.message)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', message: err.message }))
    }
  })

  backendWs.on('close', (code) => {
    console.log(`Backend connection closed (code=${code})`)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'disconnected' }))
      clientWs.close()
    }
  })

  clientWs.on('message', (data, isBinary) => {
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.send(data, { binary: isBinary })
    }
  })

  clientWs.on('close', () => {
    console.log('Client disconnected, closing backend connection')
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.close()
    }
  })

  clientWs.on('error', (err) => {
    console.error('Client WS error:', err.message)
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.close()
    }
  })
}
