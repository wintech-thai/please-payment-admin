'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'

export type RowActionItem = {
  label: string
  icon: React.ReactNode
  danger?: boolean
  success?: boolean
  disabled?: boolean
  onClick: () => void
  hidden?: boolean
}

const MENU_WIDTH = 208 // w-52

export default function RowActionsMenu({ items }: { items: RowActionItem[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, dropUp: false })
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const calcPos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const dropUp = window.innerHeight - rect.bottom < 200
    setPos({
      top: dropUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
      dropUp,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('resize', calcPos)
    window.addEventListener('scroll', calcPos, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('resize', calcPos)
      window.removeEventListener('scroll', calcPos, true)
    }
  }, [open, calcPos])

  const visible = items.filter(i => !i.hidden)

  return (
    <div className="relative flex justify-center">
      <button
        ref={btnRef}
        onClick={e => { e.stopPropagation(); if (!open) calcPos(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          ref={ref}
          className="fixed z-[200] w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden"
          style={{ top: pos.top, left: pos.left, transform: pos.dropUp ? 'translateY(-100%)' : undefined }}
        >
          {visible.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (!item.disabled) { item.onClick(); setOpen(false) } }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
                item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : item.success
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
