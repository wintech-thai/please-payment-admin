'use client'

import { useState, useMemo } from 'react'
import { X, FileJson, Table as TableIcon, Search, Copy, Check, Calendar, Globe, Hash, Type, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import type { LokiLogEntry } from '@/lib/api/loki.api'

export interface FlyoutDict {
  title: string
  tabTable: string
  tabJson: string
  searchPlaceholder: string
  field: string
  value: string
  copyJson: string
  copied: string
}

interface LokiLogFlyoutProps {
  log: LokiLogEntry | null
  onClose: () => void
  dict: FlyoutDict
  /** 1-based position of `log` within the currently displayed list, and the
   *  list's total count — powers the "N of total" + prev/next controls so
   *  you can step through logs without closing the panel each time. */
  currentIndex?: number
  totalCount?: number
  onPrev?: () => void
  onNext?: () => void
}

function getFieldIcon(field: string) {
  const f = field.toLowerCase()
  if (f.includes('@timestamp')) return <Calendar className="w-3 h-3" />
  if (f.includes('ip') || f.includes('geo') || f.includes('zone')) return <Globe className="w-3 h-3" />
  if (f.includes('port') || f.includes('id')) return <Hash className="w-3 h-3" />
  return <Type className="w-3 h-3" />
}

function getValueColorClass(value: unknown) {
  if (typeof value === 'number' || !isNaN(Number(value))) return 'text-emerald-300'
  if (typeof value === 'boolean' || value === 'true' || value === 'false') return 'text-blue-500 font-bold'
  if (value === null || value === undefined || value === 'null') return 'text-slate-500 italic'
  return 'text-orange-300'
}

function tryParseJson(line: string): object | null {
  try {
    const parsed = JSON.parse(line)
    if (typeof parsed === 'object' && parsed !== null) return parsed
    return null
  } catch {
    return null
  }
}

export function LokiLogFlyout({ log, onClose, dict, currentIndex, totalCount, onPrev, onNext }: LokiLogFlyoutProps) {
  const [drawerTab, setDrawerTab] = useState<'table' | 'json'>('table')
  const [searchInput, setSearchInput] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const flattenedData = useMemo(() => {
    const data: Record<string, string> = {}
    if (!log) return data

    Object.entries(log.labels).forEach(([k, v]) => {
      if (k !== 'filename') data[`@label.${k}`] = v
    })

    if (log.detectedFields) {
      Object.entries(log.detectedFields).forEach(([k, v]) => {
        data[`@field.${k}`] = v
      })
    }

    data['@timestamp'] = log.timestamp
    data['message'] = log.line?.trim()
    return data
  }, [log])

  const sortedKeys = useMemo(() => Object.keys(flattenedData).sort(), [flattenedData])

  if (!log) return null

  const parsedJson = tryParseJson(JSON.stringify(flattenedData))

  const handleCopyValue = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(parsedJson || { line: log.line }, null, 2))
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const isDeepMatch = (key: string, value: string, term: string): boolean => {
    if (!term) return true
    const lowerTerm = term.toLowerCase()
    const actualKey = key.replace(/^@(label|field)\./, '')
    return actualKey.toLowerCase().includes(lowerTerm) || value.toLowerCase().includes(lowerTerm)
  }

  const highlightJson = (json: object) => {
    return JSON.stringify(json, null, 2).replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-orange-300'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) cls = 'text-blue-400 font-semibold'
        } else if (/true|false/.test(match)) cls = 'text-blue-500 font-bold'
        else if (/null/.test(match)) cls = 'text-slate-500 italic'
        else if (!isNaN(Number(match))) cls = 'text-emerald-300'
        return `<span class="${cls}">${match}</span>`
      },
    )
  }

  return (
    <>
      {/* Fixed to the viewport (not the scrolling page) so the panel stays put
          and doesn't need the whole page scrolled up to see its top — same
          pattern as AuditTrailDrawer. */}
      <div className="fixed inset-0 z-[99] bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[650px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col font-sans">
      <div className="flex-none px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-80">{dict.title}</h3>
          {currentIndex !== undefined && totalCount !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <button
                onClick={onPrev}
                disabled={currentIndex <= 0}
                className="p-1 rounded hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span>{currentIndex + 1} of {totalCount}</span>
              <button
                onClick={onNext}
                disabled={currentIndex >= totalCount - 1}
                className="p-1 rounded hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-none flex px-6 border-b border-slate-800 bg-slate-950">
        <button
          onClick={() => setDrawerTab('table')}
          className={clsx(
            'flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 mr-8 transition-all',
            drawerTab === 'table' ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300',
          )}
        >
          <TableIcon size={14} /> {dict.tabTable}
        </button>
        {parsedJson && (
          <button
            onClick={() => setDrawerTab('json')}
            className={clsx(
              'flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
              drawerTab === 'json' ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300',
            )}
          >
            <FileJson size={14} /> {dict.tabJson}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-950">
        {drawerTab === 'table' ? (
          <div className="flex flex-col h-full">
            <div className="flex-none p-4 border-b border-slate-800 bg-slate-950">
              <div className="relative group">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                  placeholder={dict.searchPlaceholder}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-none flex border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
              <div className="w-[40%] px-4 py-2 border-r border-slate-800">{dict.field}</div>
              <div className="w-[60%] px-4 py-2">{dict.value}</div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar pb-10">
              {sortedKeys
                .filter((k) => isDeepMatch(k, flattenedData[k], searchInput))
                .map((k) => {
                  const v = flattenedData[k]
                  const isLabel = k.startsWith('@label.')
                  const isTimestamp = k === '@timestamp'
                  const displayKey = isTimestamp ? k : k.replace(/^@(label|field)\./, isLabel ? 'label.' : 'field.')
                  const icon = isLabel ? <Hash className="w-3 h-3" /> : getFieldIcon(displayKey)

                  return (
                    <div key={k} className="group flex border-b border-slate-900 hover:bg-slate-900/30 transition-colors text-sm relative">
                      <div className="w-[40%] px-4 py-2.5 border-r border-slate-900 flex items-center justify-between min-w-0 group/field">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-600 opacity-70">{icon}</span>
                          <span className="font-semibold text-blue-400/90 truncate select-text cursor-text" title={displayKey}>
                            {displayKey}
                          </span>
                        </div>
                      </div>
                      <div className="w-[60%] px-4 py-2.5 min-w-0 break-all">
                        <div className="relative group/val pr-8 flex items-center justify-between min-h-6">
                          <span className={clsx('font-mono text-xs select-text cursor-text break-all', getValueColorClass(v))}>
                            {v}
                          </span>
                          <button
                            onClick={() => handleCopyValue(v, k)}
                            className={clsx(
                              'absolute right-0 top-0.5 p-1.5 rounded bg-slate-800 border border-slate-700 text-slate-400 opacity-0 group-hover/val:opacity-100 transition-all',
                              copiedId === k && 'opacity-100 text-green-500 border-green-500/50',
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
          <div className="p-0 h-full bg-slate-950 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center bg-slate-900/30">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-white bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-800 transition-all"
              >
                {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {isCopied ? dict.copied : dict.copyJson}
              </button>
            </div>
            <div className="p-6 overflow-auto h-full custom-scrollbar bg-[#090b10]">
              {parsedJson ? (
                <pre
                  className="text-xs font-mono leading-relaxed whitespace-pre-wrap select-text"
                  dangerouslySetInnerHTML={{ __html: highlightJson(parsedJson) }}
                />
              ) : (
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap select-text text-slate-300">
                  {log.line}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  )
}
