'use client'

import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export interface TopNBucket {
  key: string
  doc_count: number
  /** Optional sample count backing doc_count (e.g. how many hits an average was computed from), shown as a small "×N" badge. */
  sampleCount?: number
}

interface Props {
  title: string
  data: TopNBucket[]
  activeKey?: string | null
  onSelect: (key: string) => void
  colCountLabel: string
  loading?: boolean
  emptyLabel?: string
  accentClassName?: string
  icon?: LucideIcon
  iconWrapClassName?: string
  variant?: 'default' | 'warning'
  topBarClassName?: string
  valueFormatter?: (docCount: number) => string
  /** Header label for the sample-count column. Only rendered as a column when at least one bucket has sampleCount set. */
  sampleCountLabel?: string
  /** Header label for the main value column (e.g. "ms"). Defaults to colCountLabel. */
  valueLabel?: string
}

export function TopNPanel({ title, data, activeKey, onSelect, colCountLabel, loading, emptyLabel, accentClassName, icon: Icon, iconWrapClassName, variant = 'default', topBarClassName, valueFormatter, sampleCountLabel, valueLabel }: Props) {
  const formatValue = valueFormatter || ((n: number) => n.toLocaleString())
  const maxCount = Math.max(1, ...data.map(d => d.doc_count))
  const isWarning = variant === 'warning'
  const hasSampleCount = data.some(d => d.sampleCount != null)

  return (
    <div className={clsx(
      'rounded-2xl shadow-sm border overflow-hidden flex flex-col h-[260px] transition-shadow hover:shadow-md',
      isWarning ? 'bg-red-50/40 border-red-100' : 'bg-white border-gray-100'
    )}>
      <div className={clsx('h-1.5 flex-none', topBarClassName || (isWarning ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-primary-400 to-primary-600'))} />
      <div className="flex items-center gap-2.5 px-5 pt-4 mb-3 flex-none">
        {Icon && (
          <span className={clsx(
            'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
            iconWrapClassName || (isWarning ? 'bg-red-100 text-red-600' : 'bg-primary-50 text-primary-600')
          )}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
        <p className={clsx('text-xs font-bold uppercase tracking-wider', isWarning ? 'text-red-600' : 'text-gray-500')}>{title}</p>
      </div>
      {hasSampleCount && !loading && data.length > 0 && (
        <div className="flex items-center justify-end gap-3 px-7 pb-1 flex-none">
          <span className="w-10 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide">{sampleCountLabel}</span>
          <span className="w-14 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide">{valueLabel ?? colCountLabel}</span>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 px-5 pb-4">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-300">…</div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-300 text-center px-4">{emptyLabel || 'No data'}</div>
        ) : (
          data.map(bucket => {
            const isActive = activeKey === bucket.key
            const pct = (bucket.doc_count / maxCount) * 100
            return (
              <button
                key={bucket.key}
                onClick={() => onSelect(bucket.key)}
                title={`${bucket.key} — ${formatValue(bucket.doc_count)} ${colCountLabel}${bucket.sampleCount != null ? ` (${bucket.sampleCount.toLocaleString()} samples)` : ''}`}
                className={clsx(
                  'relative flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors overflow-hidden flex-shrink-0',
                  isActive
                    ? (isWarning ? 'ring-1 ring-red-400 bg-red-100/60' : 'ring-1 ring-primary-400 bg-primary-50')
                    : (isWarning ? 'hover:bg-red-100/40' : 'hover:bg-gray-50')
                )}
              >
                <div
                  className={clsx('absolute inset-y-0 left-0 opacity-15', accentClassName || (isWarning ? 'bg-red-500' : 'bg-primary-500'))}
                  style={{ width: `${pct}%` }}
                />
                <span className={clsx('relative z-10 truncate font-medium min-w-0 flex-1', isWarning ? 'text-red-700' : 'text-gray-700')}>{bucket.key || '—'}</span>
                <span className="relative z-10 flex items-center gap-3 flex-shrink-0">
                  {hasSampleCount && (
                    <span className={clsx('w-10 text-right font-mono font-bold', isWarning ? 'text-red-900' : 'text-gray-900')}>{bucket.sampleCount != null ? bucket.sampleCount.toLocaleString() : '—'}</span>
                  )}
                  <span className={clsx('w-14 text-right font-mono font-bold', isWarning ? 'text-red-900' : 'text-gray-900')}>{formatValue(bucket.doc_count)}</span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
