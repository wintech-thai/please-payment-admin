'use client'

import clsx from 'clsx'

export type SortOrder = 'newest' | 'oldest'

export interface LokiDisplayOptions {
  showTime: boolean
  wrapLines: boolean
  prettifyJson: boolean
  sortOrder: SortOrder
}

interface OptionsTranslations {
  time: string
  wrapLines: string
  prettifyJson: string
  newestFirst: string
  oldestFirst: string
  limitWarning: string
}

interface LokiOptionsBarProps {
  options: LokiDisplayOptions
  onChange: (opts: LokiDisplayOptions) => void
  t: OptionsTranslations
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors group"
    >
      <div
        className={clsx(
          'w-7 h-4 rounded-full transition-colors relative flex-none',
          active ? 'bg-orange-600' : 'bg-slate-700',
        )}
      >
        <div
          className={clsx(
            'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
            active ? 'translate-x-3.5' : 'translate-x-0.5',
          )}
        />
      </div>
      <span>{label}</span>
    </button>
  )
}

export function LokiOptionsBar({ options, onChange, t }: LokiOptionsBarProps) {
  const set = <K extends keyof LokiDisplayOptions>(key: K, val: LokiDisplayOptions[K]) =>
    onChange({ ...options, [key]: val })

  return (
    <div className="flex-none border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
      <div className="px-4 py-2 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <Toggle label={t.time} active={options.showTime} onClick={() => set('showTime', !options.showTime)} />
          <Toggle label={t.wrapLines} active={options.wrapLines} onClick={() => set('wrapLines', !options.wrapLines)} />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => set('sortOrder', 'newest')}
            className={clsx(
              'px-3 py-1 text-xs rounded-md transition-colors',
              options.sortOrder === 'newest'
                ? 'bg-slate-700 text-slate-100 font-medium shadow'
                : 'text-slate-500 hover:text-slate-300',
            )}
          >
            {t.newestFirst}
          </button>
          <button
            onClick={() => set('sortOrder', 'oldest')}
            className={clsx(
              'px-3 py-1 text-xs rounded-md transition-colors',
              options.sortOrder === 'oldest'
                ? 'bg-slate-700 text-slate-100 font-medium shadow'
                : 'text-slate-500 hover:text-slate-300',
            )}
          >
            {t.oldestFirst}
          </button>
        </div>
      </div>
    </div>
  )
}
