'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Play, Tag, Hash, Filter } from 'lucide-react'
import clsx from 'clsx'
import { isValidLogQL, lokiService } from '@/lib/api/loki.api'

interface QueryBarTranslations {
  runQuery: string
  running: string
  syntaxError: string
  syntaxErrorDesc: string
}

interface LokiQueryBarProps {
  query: string
  onChange: (val: string) => void
  onSubmit: () => void
  isLoading?: boolean
  logoContent?: React.ReactNode
  timeRangeContent?: React.ReactNode
  t: QueryBarTranslations
}

interface SuggestionItem {
  value: string
  type: 'label' | 'label-value' | 'pipe-operator'
  label?: string
  description?: string
}

// --- LogQL syntax highlighter ---

function highlightLogQL(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < text.length) {
    if (text[i] === '{' || text[i] === '}') {
      nodes.push(<span key={i} className="text-yellow-300">{text[i]}</span>)
      i++
      continue
    }

    if (text[i] === '"') {
      let j = i + 1
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\') j++
        j++
      }
      if (j < text.length) j++
      nodes.push(<span key={i} className="text-emerald-400">{text.slice(i, j)}</span>)
      i = j
      continue
    }

    if (text[i] === '`') {
      let j = i + 1
      while (j < text.length && text[j] !== '`') j++
      if (j < text.length) j++
      nodes.push(<span key={i} className="text-emerald-400">{text.slice(i, j)}</span>)
      i = j
      continue
    }

    if (
      i < text.length - 1 &&
      (text.slice(i, i + 2) === '=~' || text.slice(i, i + 2) === '!=' ||
        text.slice(i, i + 2) === '!~' || text.slice(i, i + 2) === '|=' || text.slice(i, i + 2) === '|~')
    ) {
      nodes.push(<span key={i} className="text-sky-400 font-bold">{text.slice(i, i + 2)}</span>)
      i += 2
      continue
    }
    if (text[i] === '=' || text[i] === '|') {
      nodes.push(<span key={i} className="text-sky-400 font-bold">{text[i]}</span>)
      i++
      continue
    }

    if (text[i] === ',') {
      nodes.push(<span key={i} className="text-slate-500">{text[i]}</span>)
      i++
      continue
    }

    const wordMatch = text.slice(i).match(/^[\w.]+/)
    if (wordMatch) {
      const word = wordMatch[0]
      const afterWord = text.slice(i + word.length).trimStart()
      const isLabelKey = afterWord.startsWith('=') || afterWord.startsWith('!') || afterWord.startsWith('~')

      const PIPE_KEYWORDS = [
        'json', 'logfmt', 'regexp', 'pattern', 'unpack', 'line_format',
        'label_format', 'unwrap', 'decolorize', 'drop', 'keep',
      ]
      const isPipeKeyword = PIPE_KEYWORDS.includes(word.toLowerCase())

      if (isPipeKeyword) {
        nodes.push(<span key={i} className="text-purple-400 font-medium">{word}</span>)
      } else if (isLabelKey) {
        nodes.push(<span key={i} className="text-cyan-300">{word}</span>)
      } else {
        nodes.push(<span key={i} className="text-orange-300">{word}</span>)
      }
      i += word.length
      continue
    }

    nodes.push(<span key={i} className="text-slate-300">{text[i]}</span>)
    i++
  }

  return nodes
}

// --- Autocomplete helpers ---

type AutocompleteTarget =
  | { type: 'label-value'; labelName: string; partial: string; queryContext?: string; rawContext: string }
  | { type: 'label-name'; partial: string; queryContext?: string; rawContext: string; usedLabels: string[] }
  | { type: 'pipe-operator'; partial: string; replaceMatch: string }
  | null

function parseAutocompleteTarget(textToCursor: string): AutocompleteTarget {
  const labelValueMatch = textToCursor.match(/\{([^}]*?)(\w+)\s*=~?\s*"([^"]*)$/)
  if (labelValueMatch) {
    const rawContext = labelValueMatch[1].trim().replace(/,\s*$/, '')
    const queryContext = rawContext ? `{${rawContext}}` : undefined
    return { type: 'label-value', labelName: labelValueMatch[2], partial: labelValueMatch[3].toLowerCase(), queryContext, rawContext }
  }

  const labelNameMatch = textToCursor.match(/\{([^}]*)$/)
  if (labelNameMatch) {
    const inside = labelNameMatch[1]
    const partialMatch = inside.match(/(?:^|,\s*)(\w*)$/)
    if (partialMatch) {
      const partial = partialMatch[1].toLowerCase()
      const usedLabels = Array.from(inside.matchAll(/(\w+)\s*(?:=|!)/g)).map((m) => m[1])

      const contextMatch = textToCursor.match(/\{([^}]*?)(?:,\s*\w*$|\w*$)/)
      const rawContext = contextMatch ? contextMatch[1].trim().replace(/,\s*$/, '') : ''
      const queryContext = rawContext ? `{${rawContext}}` : undefined

      return { type: 'label-name', partial, queryContext, rawContext, usedLabels }
    }
  }

  const openBraces = (textToCursor.match(/\{/g) || []).length
  const closeBraces = (textToCursor.match(/\}/g) || []).length
  if (openBraces > 0 && openBraces === closeBraces) {
    const unescapedQuotes = textToCursor.replace(/\\"/g, '')
    if ((unescapedQuotes.match(/"/g) || []).length % 2 === 0) {
      const pipeMatch = textToCursor.match(/(\s+(?:[|!=~]*\s*)?[a-z_]*)$/i)
      if (pipeMatch) {
        return { type: 'pipe-operator', partial: pipeMatch[1], replaceMatch: pipeMatch[1] }
      }
    }
  }

  return null
}

export function LokiQueryBar({ query, onChange, onSubmit, isLoading = false, logoContent, timeRangeContent, t }: LokiQueryBarProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const [cachedLabels, setCachedLabels] = useState<string[]>([])
  const [labelValuesCache, setLabelValuesCache] = useState<Record<string, string[]>>({})
  const [cursorPos, setCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    lokiService.getLabels()
      .then((labels) => setCachedLabels(labels.filter((l) => l !== '__name__')))
      .catch(() => setCachedLabels(['namespace', 'app', 'container', 'pod', 'stream', 'node_name', 'job', 'filename']))
  }, [])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [query])

  useEffect(() => {
    const ta = textareaRef.current
    const hi = highlightRef.current
    if (!ta || !hi) return
    const handleScroll = () => {
      hi.scrollTop = ta.scrollTop
      hi.scrollLeft = ta.scrollLeft
    }
    ta.addEventListener('scroll', handleScroll)
    return () => ta.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const getTextToCursor = useCallback(() => query.slice(0, cursorPos), [query, cursorPos])

  const updateSuggestions = useCallback(
    async (textToCursor: string) => {
      const target = parseAutocompleteTarget(textToCursor)

      if (!target) {
        setShowSuggestions(false)
        return
      }

      if (target.type === 'label-value') {
        const cacheKey = `${target.labelName}::${target.queryContext || 'none'}`
        let values = labelValuesCache[cacheKey]

        if (!values) {
          try {
            values = await lokiService.getLabelValues(target.labelName, undefined, undefined, target.queryContext)
            setLabelValuesCache((prev) => ({ ...prev, [cacheKey]: values! }))
          } catch {
            values = []
          }
        }

        const filtered = values.filter((v) => v.toLowerCase().includes(target.partial)).slice(0, 20)
        setSuggestions(filtered.map((v) => ({ value: v, type: 'label-value', label: target.labelName })))
        setShowSuggestions(filtered.length > 0)
        setHighlightedIdx(-1)
        return
      }

      if (target.type === 'label-name') {
        const cacheKey = `labels::${target.queryContext || 'global'}`
        let availableLabels = cachedLabels

        if (target.queryContext) {
          try {
            if (!labelValuesCache[cacheKey]) {
              const labels = await lokiService.getLabels(undefined, undefined, target.queryContext)
              const filteredLabels = labels.filter((l) => l !== '__name__')
              setLabelValuesCache((prev) => ({ ...prev, [cacheKey]: filteredLabels }))
              availableLabels = filteredLabels
            } else {
              availableLabels = labelValuesCache[cacheKey]
            }
          } catch {
            availableLabels = cachedLabels
          }
        }

        const filtered = availableLabels
          .filter((l) => !target.usedLabels.includes(l))
          .filter((l) => l.toLowerCase().includes(target.partial))
          .slice(0, 20)

        setSuggestions(filtered.map((l) => ({ value: l, type: 'label' })))
        setShowSuggestions(filtered.length > 0)
        setHighlightedIdx(-1)
        return
      }

      if (target.type === 'pipe-operator') {
        const PIPE_OPS = [
          { value: '|= ""', desc: 'Contains string' },
          { value: '!= ""', desc: 'Does not contain string' },
          { value: '|~ ""', desc: 'Matches regex' },
          { value: '!~ ""', desc: 'Does not match regex' },
          { value: '| json', desc: 'Extract JSON fields' },
          { value: '| logfmt', desc: 'Extract Logfmt fields' },
          { value: '| pattern', desc: 'Extract using pattern' },
          { value: '| regexp', desc: 'Extract using regexp' },
          { value: '| line_format', desc: 'Format log line' },
          { value: '| label_format', desc: 'Format labels' },
          { value: '| unwrap', desc: 'Unwrap a metric' },
        ]

        const trimmedPartial = target.partial.replace(/\s+/g, '').toLowerCase()
        const filtered = PIPE_OPS.filter((op) => op.value.replace(/\s+/g, '').toLowerCase().includes(trimmedPartial))

        setSuggestions(filtered.map((op) => ({ value: op.value, type: 'pipe-operator', description: op.desc })))
        setShowSuggestions(filtered.length > 0)
        setHighlightedIdx(-1)
        return
      }
    },
    [cachedLabels, labelValuesCache],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const textToCursor = getTextToCursor()
      updateSuggestions(textToCursor)
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, cursorPos, getTextToCursor, updateSuggestions])

  const handleSelectSuggestion = (item: SuggestionItem) => {
    const textBefore = query.slice(0, cursorPos)
    const textAfter = query.slice(cursorPos)

    let newBefore: string
    let cursorOffset = 0

    if (item.type === 'label-value') {
      newBefore = textBefore.replace(/(\{[^}]*?\w+\s*=~?\s*")([^"]*)$/, `$1${item.value}"`)
    } else if (item.type === 'label') {
      newBefore = textBefore.replace(/(\{[^}]*?(?:,\s*)?)(\w*)$/, `$1${item.value}="`)
    } else if (item.type === 'pipe-operator') {
      newBefore = textBefore.replace(/(\s+(?:[|!=~]*\s*)?[a-z_]*)$/i, ` ${item.value}`)
      if (item.value.endsWith('""')) cursorOffset = -1
    } else {
      newBefore = textBefore
    }

    const newQuery = newBefore + textAfter
    onChange(newQuery)
    setShowSuggestions(false)

    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        const pos = newBefore.length + cursorOffset
        ta.selectionStart = ta.selectionEnd = pos
        setCursorPos(pos)
      }
    })
  }

  const validateAndSubmit = () => {
    if (!isValidLogQL(query)) {
      toast.error(t.syntaxError, { description: t.syntaxErrorDesc })
      return
    }
    onSubmit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIdx((prev) => (prev + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        return
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && highlightedIdx >= 0) {
        e.preventDefault()
        handleSelectSuggestion(suggestions[highlightedIdx])
        return
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      validateAndSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    setCursorPos(e.target.selectionStart ?? e.target.value.length)
  }

  const handleCursorChange = () => {
    const ta = textareaRef.current
    if (ta) setCursorPos(ta.selectionStart ?? 0)
  }

  const highlightedNodes = useMemo(() => highlightLogQL(query), [query])

  return (
    <div ref={containerRef} className="flex-none px-4 py-3 bg-slate-900/60 border-b border-slate-800 backdrop-blur-sm relative z-20">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {logoContent && <div className="flex-none w-full md:w-auto">{logoContent}</div>}

        <div className="relative w-full md:flex-1">
          <div className="relative rounded-lg border border-slate-700 bg-slate-950 focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all">
            <div
              ref={highlightRef}
              aria-hidden="true"
              className="absolute inset-0 py-2.5 px-3 text-sm font-mono leading-relaxed whitespace-pre-wrap wrap-break-word overflow-hidden pointer-events-none"
              style={{ minHeight: '40px' }}
            >
              {highlightedNodes}
            </div>

            <textarea
              ref={textareaRef}
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onKeyUp={handleCursorChange}
              onClick={handleCursorChange}
              placeholder={`{namespace="pp-development", app="pp-api"}`}
              rows={1}
              spellCheck={false}
              className="w-full bg-transparent resize-none px-3 pt-2 text-sm font-mono text-transparent caret-orange-400 placeholder:text-slate-600 focus:outline-none leading-relaxed relative z-10"
              style={{ minHeight: '34px', caretColor: '#fb923c' }}
            />
          </div>

          {showSuggestions && (
            <div className="absolute top-full left-0 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                {suggestions[0]?.type === 'label'
                  ? 'Label names'
                  : suggestions[0]?.type === 'pipe-operator'
                    ? 'Operations'
                    : `Values for ${suggestions[0]?.label}`}
              </div>
              {suggestions.map((item, i) => (
                <div
                  key={`${item.type}-${item.value}`}
                  className={clsx(
                    'px-3 py-2 text-xs font-mono cursor-pointer transition-colors flex items-center gap-2',
                    i === highlightedIdx ? 'bg-orange-500/20 text-orange-300' : 'text-slate-300 hover:bg-slate-800',
                  )}
                  onMouseEnter={() => setHighlightedIdx(i)}
                  onClick={() => handleSelectSuggestion(item)}
                >
                  {item.type === 'label' ? (
                    <Tag className="w-3.5 h-3.5 text-violet-400 flex-none" />
                  ) : item.type === 'pipe-operator' ? (
                    <Filter className="w-3.5 h-3.5 text-amber-500 flex-none" />
                  ) : (
                    <Hash className="w-3.5 h-3.5 text-cyan-400 flex-none" />
                  )}
                  <span className={item.type === 'label' ? 'text-cyan-300' : item.type === 'pipe-operator' ? 'text-amber-400' : 'text-emerald-400'}>
                    {item.value}
                  </span>
                  {item.description && (
                    <span className="text-slate-500 text-[10px] ml-2 font-sans truncate">{item.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:w-auto w-full">
          {timeRangeContent && <div className="flex-1 sm:flex-none">{timeRangeContent}</div>}

          <div className="flex items-center gap-2 flex-none">
            <button
              onClick={validateAndSubmit}
              disabled={isLoading || !query.trim()}
              className={clsx(
                'h-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border',
                'bg-orange-600 hover:bg-orange-500 text-white border-orange-500/50 shadow-lg shadow-orange-900/20',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                !isLoading && query.trim() && 'active:scale-95',
              )}
            >
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">{isLoading ? t.running : t.runQuery}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
