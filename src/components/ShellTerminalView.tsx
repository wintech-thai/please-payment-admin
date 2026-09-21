'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import '@xterm/xterm/css/xterm.css'
import { TerminalSquare, RefreshCw, Power, PowerOff, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useTerminalWebSocket, type TerminalStatus } from '@/hooks/useTerminalWebSocket'

// xterm.js -> Next.js WS proxy (/ws) -> onix-api pod exec
export default function ShellTerminalView() {
  const { t } = useLang()
  const st = t.shellTerminal

  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [status, setStatus] = useState<TerminalStatus>('disconnected')

  const handleData = useCallback((data: string) => { xtermRef.current?.write(data) }, [])
  const { connect, disconnect, send } = useTerminalWebSocket({ onData: handleData, onStatusChange: setStatus })

  // Warn before leaving the page while a session is live
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === 'connected' || status === 'connecting') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
      theme: { background: '#0d1117', foreground: '#c9d1d9', cursor: '#58a6ff' },
      scrollback: 10000,
      allowProposedApi: true,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())
    const unicode11 = new Unicode11Addon()
    term.loadAddon(unicode11)
    term.unicode.activeVersion = '11'

    term.open(containerRef.current)
    requestAnimationFrame(() => fitAddon.fit())

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    const disposeData = term.onData((data) => send(data))
    const disposeBinary = term.onBinary((data) => send(data))

    const handleResize = () => requestAnimationFrame(() => fitAddon.fit())
    window.addEventListener('resize', handleResize)

    // Connect only after the user's explicit confirmation gate has mounted this component
    connect()

    return () => {
      window.removeEventListener('resize', handleResize)
      disposeData.dispose()
      disposeBinary.dispose()
      term.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status === 'connected') {
      requestAnimationFrame(() => fitAddonRef.current?.fit())
      xtermRef.current?.writeln(`\r\n\x1b[1;32m${st.statusConnected}\x1b[0m\r\n`)
      xtermRef.current?.focus()
    } else if (status === 'error') {
      xtermRef.current?.writeln(`\r\n\x1b[1;31m${st.statusError}\x1b[0m\r\n`)
    }
  }, [status, st.statusConnected, st.statusError])

  const handleReconnect = () => {
    disconnect()
    xtermRef.current?.clear()
    setTimeout(() => connect(), 300)
  }

  const statusConfig: Record<TerminalStatus, { label: string; color: string }> = {
    disconnected: { label: st.statusDisconnected, color: 'bg-gray-500' },
    connecting: { label: st.statusConnecting, color: 'bg-yellow-500 animate-pulse' },
    connected: { label: st.statusConnected, color: 'bg-emerald-500' },
    error: { label: st.statusError, color: 'bg-red-500' },
  }
  const { label: statusLabel, color: statusColor } = statusConfig[status]

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl overflow-hidden border border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <TerminalSquare className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">{st.title}</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={clsx('inline-block w-2 h-2 rounded-full', statusColor)} />
            <span className="text-xs text-slate-400">{statusLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'disconnected' || status === 'error' ? (
            <button
              onClick={connect}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <Power className="w-3.5 h-3.5" />
              {st.connect}
            </button>
          ) : status === 'connecting' ? (
            <button disabled className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {st.connecting}
            </button>
          ) : (
            <>
              <button
                onClick={handleReconnect}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {st.reconnect}
              </button>
              <button
                onClick={disconnect}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600/80 hover:bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                <PowerOff className="w-3.5 h-3.5" />
                {st.disconnect}
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 p-1 min-h-0" />
    </div>
  )
}
