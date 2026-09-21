'use client'

import { useRef, useCallback, useState, useEffect } from 'react'

export type TerminalStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface UseTerminalWebSocketOptions {
  onData: (data: string) => void
  onStatusChange?: (status: TerminalStatus) => void
}

// Browser (ws://host:port/ws) -> Next.js WS proxy -> onix-api (wss)
export function useTerminalWebSocket({ onData, onStatusChange }: UseTerminalWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<TerminalStatus>('disconnected')
  const onDataRef = useRef(onData)
  const onStatusChangeRef = useRef(onStatusChange)

  useEffect(() => { onDataRef.current = onData }, [onData])
  useEffect(() => { onStatusChangeRef.current = onStatusChange }, [onStatusChange])

  const updateStatus = useCallback((s: TerminalStatus) => {
    setStatus(s)
    onStatusChangeRef.current?.(s)
  }, [])

  const connect = useCallback(async () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      updateStatus('error')
      return
    }

    updateStatus('connecting')

    try {
      const initRes = await fetch('/api/terminal/ws')
      if (!initRes.ok) {
        updateStatus('error')
        return
      }
    } catch {
      updateStatus('error')
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }))
    }

    ws.onmessage = (event) => {
      const raw = event.data as string
      if (raw.charCodeAt(0) === 123 /* '{' */ && raw.startsWith('{"type"')) {
        try {
          const msg = JSON.parse(raw)
          if (msg.type === 'connected') { updateStatus('connected'); return }
          if (msg.type === 'disconnected') { updateStatus('disconnected'); return }
          if (msg.type === 'error') { updateStatus('error'); return }
        } catch {
          // not a control message — treat as terminal data
        }
      }
      onDataRef.current(raw)
    }

    ws.onerror = () => updateStatus('error')

    ws.onclose = () => {
      setStatus((prev) => {
        if (prev !== 'error') {
          onStatusChangeRef.current?.('disconnected')
          return 'disconnected'
        }
        return prev
      })
    }
  }, [updateStatus])

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    updateStatus('disconnected')
  }, [updateStatus])

  useEffect(() => {
    return () => { wsRef.current?.close() }
  }, [])

  return { status, connect, disconnect, send }
}
