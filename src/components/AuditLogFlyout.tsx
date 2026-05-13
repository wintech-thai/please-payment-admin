'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X, FileJson, Table as TableIcon, Search,
  ChevronLeft, ChevronRight, Copy, Check,
  Hash, ToggleLeft, Type,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import type { AuditLogDocument } from '@/lib/api/audit-log.api'

const flattenObject = (obj: unknown, prefix = ''): Record<string, unknown> => {
  const items: Record<string, unknown> = {}
  if (!obj || typeof obj !== 'object') return items
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (key === 'id') continue
    const newKey = prefix ? `${prefix}.${key}` : key
    const val = (obj as Record<string, unknown>)[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(items, flattenObject(val, newKey))
    } else {
      items[newKey] = val
    }
  }
  return items
}

const getTypeIcon = (val: unknown) => {
  if (typeof val === 'number') return <Hash size={12} />
  if (typeof val === 'boolean') return <ToggleLeft size={12} />
  return <Type size={12} />
}

const getValueColor = (val: unknown) => {
  if (typeof val === 'number') return 'text-emerald-300'
  if (typeof val === 'boolean') return 'text-blue-400 font-bold'
  if (val === null || val === undefined) return 'text-slate-500 italic'
  return 'text-orange-300'
}

const highlightJson = (json: unknown) =>
  JSON.stringify(json, null, 2).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-orange-300'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-blue-400 font-semibold'
      } else if (/true|false/.test(match)) cls = 'text-blue-400 font-bold'
      else if (/null/.test(match)) cls = 'text-slate-500 italic'
      else if (!isNaN(Number(match))) cls = 'text-emerald-300'
      return `<span class="${cls}">${match}</span>`
    }
  )

interface Props {
  event: AuditLogDocument | null
  events?: AuditLogDocument[]
  currentIndex?: number
  onNavigate?: (index: number) => void
  onClose: () => void
}

export default function AuditLogFlyout({
  event,
  events = [],
  currentIndex = -1,
  onNavigate,
  onClose,
}: Props) {
  const { t } = useLang()
  const tAL = t.auditLog

  const [tab, setTab] = useState<'table' | 'json'>('table')
  const [search, setSearch] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const flatData = useMemo(() => (event ? flattenObject(event) : {}), [event])
  const sortedKeys = useMemo(() => Object.keys(flatData).sort(), [flatData])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!event) return
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') onNavigate?.(currentIndex - 1)
      if (e.key === 'ArrowRight') onNavigate?.(currentIndex + 1)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [event, currentIndex, onNavigate, onClose])

  if (!event) return null

  const handleCopyValue = (text: unknown, id: string) => {
    const str = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text)
    navigator.clipboard.writeText(str)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2))
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const isMatch = (k: string, v: unknown, term: string) => {
    if (!term) return true
    const lo = term.toLowerCase()
    return k.toLowerCase().includes(lo) || String(v).toLowerCase().includes(lo)
  }

  const filteredKeys = sortedKeys.filter(k => isMatch(k, flatData[k], search))

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[99] bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-[640px] bg-slate-950 border-l border-slate-800 shadow-[-20px_0_60px_rgba(0,0,0,0.7)] z-[100] flex flex-col">

        {/* Header */}
        <div className="flex-none px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest opacity-80">
              {tAL.flyoutTitle}
            </h3>
            {events.length > 0 && (
              <div className="flex items-center text-slate-400 text-[10px] font-medium gap-0.5 bg-slate-900 rounded-md border border-slate-800 p-0.5 select-none">
                <button
                  disabled={currentIndex <= 0}
                  onClick={() => onNavigate?.(currentIndex - 1)}
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 min-w-[64px] text-center tabular-nums">
                  {currentIndex >= 0
                    ? `${currentIndex + 1} ${tAL.flyoutOf} ${events.length}`
                    : `0 ${tAL.flyoutOf} 0`}
                </span>
                <button
                  disabled={currentIndex >= events.length - 1}
                  onClick={() => onNavigate?.(currentIndex + 1)}
                  className="p-1 hover:text-white disabled:opacity-20 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-none flex px-5 border-b border-slate-800">
          <button
            onClick={() => setTab('table')}
            className={clsx(
              'flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 mr-6 transition-all',
              tab === 'table' ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
            )}
          >
            <TableIcon size={14} /> {tAL.flyoutTable}
          </button>
          <button
            onClick={() => setTab('json')}
            className={clsx(
              'flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
              tab === 'json' ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'
            )}
          >
            <FileJson size={14} /> {tAL.flyoutJson}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {tab === 'table' ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Search */}
              <div className="flex-none p-4 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                    placeholder={tAL.flyoutSearchPlaceholder}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Column headers */}
              <div className="flex-none flex border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
                <div className="w-[38%] px-4 py-2 border-r border-slate-800">{tAL.flyoutField}</div>
                <div className="w-[62%] px-4 py-2">{tAL.flyoutValue}</div>
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-auto pb-8">
                {filteredKeys.map(k => {
                  const v = flatData[k]
                  const valStr = String(v)
                  return (
                    <div key={k} className="flex border-b border-slate-900 hover:bg-slate-900/30 transition-colors">
                      <div className="w-[38%] px-4 py-2.5 border-r border-slate-900 flex items-center gap-2 min-w-0">
                        <span className="text-slate-600 hidden sm:inline-block flex-shrink-0">
                          {getTypeIcon(v)}
                        </span>
                        <span
                          className="font-semibold text-blue-400/90 truncate text-xs select-text cursor-text"
                          title={k}
                        >
                          {k}
                        </span>
                      </div>
                      <div className="w-[62%] px-4 py-2.5 min-w-0">
                        <div className="relative group/val pr-8 flex items-start min-h-[20px]">
                          <span className={clsx('font-mono text-xs select-text cursor-text break-all', getValueColor(v))}>
                            {valStr}
                          </span>
                          <button
                            onClick={() => handleCopyValue(v, k)}
                            className={clsx(
                              'absolute right-0 top-0 p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 opacity-0 group-hover/val:opacity-100 transition-all flex-shrink-0',
                              copiedId === k && 'opacity-100 text-green-500 border-green-500/50'
                            )}
                          >
                            {copiedId === k ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-none p-4 border-b border-slate-800 bg-slate-900/30">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-800 transition-all"
                >
                  {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {isCopied ? tAL.flyoutCopied : tAL.flyoutCopyJson}
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-[#090b10]">
                <pre
                  className="text-xs font-mono leading-relaxed whitespace-pre-wrap select-text"
                  dangerouslySetInnerHTML={{ __html: highlightJson(event) }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
