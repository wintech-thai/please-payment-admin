'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

export interface MultiSelectOption {
  value: string
  label: string
}

interface Props {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  label: string
  allLabel: string
  searchPlaceholder?: string
  clearAllLabel?: string
  disabled?: boolean
  className?: string
}

export function MultiSelectDropdown({ options, selected, onChange, label, allLabel, searchPlaceholder, clearAllLabel, disabled, className }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const calcPos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: rect.left })
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', calcPos)
    window.addEventListener('scroll', calcPos, true)
    return () => {
      window.removeEventListener('resize', calcPos)
      window.removeEventListener('scroll', calcPos, true)
    }
  }, [isOpen, calcPos])

  const toggleValue = (v: string) => {
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  }

  const filtered = search ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())) : options
  const displayValue = selected.length === 0 ? allLabel : `${selected.length} selected`

  return (
    <div className={clsx('relative', className)} ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!isOpen) calcPos(); setIsOpen(v => !v) }}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors min-w-[200px] justify-between disabled:opacity-50"
      >
        <span className="truncate">{label}: {displayValue}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div
          className="fixed z-[200] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden w-[280px]"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 transition-colors"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg mb-1 transition-colors"
              >
                {clearAllLabel || 'Clear all'}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">—</p>
            ) : filtered.map(opt => {
              const checked = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleValue(opt.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <span className={clsx(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                  )}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="truncate text-gray-700">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
