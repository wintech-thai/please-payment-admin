'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import '@xterm/xterm/css/xterm.css'
import { TerminalSquare, RefreshCw, Power, PowerOff, Loader2, Palette, Type, Check } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useTerminalWebSocket, type TerminalStatus } from '@/hooks/useTerminalWebSocket'

// Preset text-colour themes — same set/ids as please-protect-console's shell terminal.
const TEXT_COLOR_PRESETS = [
  { id: 'default', label: 'Ghost Grey', fg: '#c9d1d9', bg: '#0d1117' },
  { id: 'matrix', label: 'Matrix Green', fg: '#00ff41', bg: '#0a0a0a' },
  { id: 'amber', label: 'Amber CRT', fg: '#ffb347', bg: '#0d0800' },
  { id: 'yellow', label: 'Solar Yellow', fg: '#ffd700', bg: '#0d1117' },
  { id: 'cyan', label: 'Cyber Cyan', fg: '#00e5ff', bg: '#00111a' },
  { id: 'magenta', label: 'Dracula Pink', fg: '#ff79c6', bg: '#0d0d17' },
  { id: 'lavender', label: 'Lavender', fg: '#d2a8ff', bg: '#0d0917' },
  { id: 'paper', label: 'Paper White', fg: '#f8f8f2', bg: '#111111' },
] as const
type TextColorPreset = (typeof TEXT_COLOR_PRESETS)[number]['id']
const COLOR_STORAGE_KEY = 'terminal-text-color'

function fontSizePresets(st: typeof import('@/lib/translations').translations.en.shellTerminal) {
  return [
    { id: 'small', label: st.fontSizeSmall, size: 12 },
    { id: 'medium', label: st.fontSizeMedium, size: 14 },
    { id: 'large', label: st.fontSizeLarge, size: 17 },
  ] as const
}
type FontSizePreset = 'small' | 'medium' | 'large'
const FONT_SIZE_STORAGE_KEY = 'terminal-font-size'

// xterm.js -> Next.js WS proxy (/ws) -> onix-api pod exec
export default function ShellTerminalView() {
  const { t } = useLang()
  const st = t.shellTerminal
  const FONT_SIZE_PRESETS = fontSizePresets(st)

  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [status, setStatus] = useState<TerminalStatus>('disconnected')

  const [textColorId, setTextColorId] = useState<TextColorPreset>(() => {
    try {
      const saved = localStorage.getItem(COLOR_STORAGE_KEY) as TextColorPreset | null
      return TEXT_COLOR_PRESETS.some((p) => p.id === saved) ? (saved as TextColorPreset) : 'default'
    } catch { return 'default' }
  })
  const [fontSizeId, setFontSizeId] = useState<FontSizePreset>(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY) as FontSizePreset | null
      return saved === 'small' || saved === 'medium' || saved === 'large' ? saved : 'medium'
    } catch { return 'medium' }
  })
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const sizePickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!colorMenuOpen && !sizeMenuOpen) return
    const handleOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setColorMenuOpen(false)
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) setSizeMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [colorMenuOpen, sizeMenuOpen])

  // Live-update theme/font size without reinitializing the terminal.
  const applyTheme = useCallback((presetId: TextColorPreset) => {
    const preset = TEXT_COLOR_PRESETS.find((p) => p.id === presetId) ?? TEXT_COLOR_PRESETS[0]
    const term = xtermRef.current
    const el = containerRef.current
    if (!term || !el) return
    el.style.transition = 'opacity 120ms ease-in-out'
    el.style.opacity = '0'
    setTimeout(() => {
      term.options.theme = { ...term.options.theme, background: preset.bg, foreground: preset.fg }
      el.style.backgroundColor = preset.bg
      el.style.opacity = '1'
    }, 120)
  }, [])

  const applyFontSize = useCallback((presetId: FontSizePreset) => {
    const preset = FONT_SIZE_PRESETS.find((p) => p.id === presetId) ?? FONT_SIZE_PRESETS[1]
    const term = xtermRef.current
    if (!term) return
    term.options.fontSize = preset.size
    requestAnimationFrame(() => fitAddonRef.current?.fit())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    const colorPreset = TEXT_COLOR_PRESETS.find((p) => p.id === textColorId) ?? TEXT_COLOR_PRESETS[0]
    const sizePreset = FONT_SIZE_PRESETS.find((p) => p.id === fontSizeId) ?? FONT_SIZE_PRESETS[1]
    containerRef.current.style.backgroundColor = colorPreset.bg

    const term = new Terminal({
      cursorBlink: true,
      fontSize: sizePreset.size,
      fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
      theme: { background: colorPreset.bg, foreground: colorPreset.fg, cursor: '#58a6ff' },
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

    // Copy-on-select, like Git Bash: selecting text (e.g. double-click a word,
    // or drag) copies it to the clipboard immediately, no Ctrl+C needed.
    const disposeSelection = term.onSelectionChange(() => {
      const selection = term.getSelection()
      if (selection) navigator.clipboard?.writeText(selection).catch(() => {})
    })

    // xterm's own native-paste handling (Shift+Insert / Ctrl+V) doesn't always force the
    // cursor to redraw at its new position right away — the text itself is correct, but the
    // blinking cursor block visually lags behind at its pre-paste spot until something else
    // repaints. Nudge a redraw right after any paste to keep it in sync.
    const handleNativePaste = () => { requestAnimationFrame(() => term.refresh(0, term.rows - 1)) }
    containerRef.current.addEventListener('paste', handleNativePaste)

    const handleResize = () => requestAnimationFrame(() => fitAddon.fit())
    window.addEventListener('resize', handleResize)

    // Connect only after the user's explicit confirmation gate has mounted this component
    connect()

    return () => {
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeEventListener('paste', handleNativePaste)
      disposeData.dispose()
      disposeBinary.dispose()
      disposeSelection.dispose()
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
  const activeColorPreset = TEXT_COLOR_PRESETS.find((p) => p.id === textColorId) ?? TEXT_COLOR_PRESETS[0]
  const activeSizePreset = FONT_SIZE_PRESETS.find((p) => p.id === fontSizeId) ?? FONT_SIZE_PRESETS[1]

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
          {/* Font size picker */}
          <div ref={sizePickerRef} className="relative">
            <button
              onClick={() => setSizeMenuOpen((v) => !v)}
              title={st.fontSizeLabel}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{activeSizePreset.label}</span>
            </button>
            {sizeMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[130px] rounded-lg border border-[#30363d] bg-[#161b22] shadow-xl py-1">
                {FONT_SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setFontSizeId(preset.id)
                      try { localStorage.setItem(FONT_SIZE_STORAGE_KEY, preset.id) } catch {}
                      applyFontSize(preset.id)
                      setSizeMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <span className="flex-1 text-left">{preset.label}</span>
                    {fontSizeId === preset.id && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text color picker */}
          <div ref={colorPickerRef} className="relative">
            <button
              onClick={() => setColorMenuOpen((v) => !v)}
              title={st.textColorLabel}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline w-3 h-3 rounded-sm border border-white/20" style={{ background: activeColorPreset.fg }} />
            </button>
            {colorMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-[#30363d] bg-[#161b22] shadow-xl py-1">
                {TEXT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setTextColorId(preset.id)
                      try { localStorage.setItem(COLOR_STORAGE_KEY, preset.id) } catch {}
                      applyTheme(preset.id)
                      setColorMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <span className="flex shrink-0 rounded-sm overflow-hidden border border-white/20">
                      <span className="inline-block w-3 h-3" style={{ background: preset.bg }} />
                      <span className="inline-block w-3 h-3" style={{ background: preset.fg }} />
                    </span>
                    <span className="flex-1 text-left">{preset.label}</span>
                    {textColorId === preset.id && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

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
