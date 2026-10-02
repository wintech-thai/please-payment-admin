import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminProxy/org/global/action/Loki/loki/api/v1'

// --- Loki API response types ---

export interface LokiStream {
  stream: Record<string, string>
  values: [string, string][] // [nanosecond-timestamp, log-line]
}

interface LokiQueryRangeResponse {
  status: string
  data: {
    resultType: 'streams' | 'matrix' | 'vector'
    result: LokiStream[] | LokiMatrixResult[]
    stats?: Record<string, unknown>
  }
}

/** Matrix result from metric queries like count_over_time */
interface LokiMatrixResult {
  metric: Record<string, string>
  values: [number, string][] // [unix-seconds, value-string]
}

interface LokiLabelsResponse {
  status: string
  data: string[]
}

// --- Parsed types for UI ---

export interface LokiLogEntry {
  id: string
  timestamp: string // ISO string
  timestampNano: string // original nanosecond ts
  timestampDisplay: string // formatted for display (local browser time for now)
  level: 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'critical' | 'fatal' | 'unknown'
  line: string
  labels: Record<string, string>
  detectedFields?: Record<string, string>
}

export interface VolumeDataPoint {
  time: number // ms timestamp
  stdout: number
  stderr: number
  [key: string]: number
}

// --- Parsers ---

function detectLogLevel(line: string, labels: Record<string, string>): LokiLogEntry['level'] {
  const labelLevel = (labels.level || labels.log_level || labels.severity || '').toLowerCase()
  if (labelLevel) {
    if (labelLevel.includes('err') || labelLevel === 'error') return 'error'
    if (labelLevel.includes('warn')) return 'warn'
    if (labelLevel === 'info') return 'info'
    if (labelLevel === 'debug') return 'debug'
    if (labelLevel === 'trace') return 'trace'
    if (labelLevel.includes('crit') || labelLevel.includes('fatal')) return 'critical'
  }

  const lower = line.toLowerCase()
  const jsonLevelMatch = line.match(/"(?:level|severity|log_level)"\s*:\s*"([^"]+)"/i)
  if (jsonLevelMatch) {
    const lvl = jsonLevelMatch[1].toLowerCase()
    if (lvl.includes('err')) return 'error'
    if (lvl.includes('warn')) return 'warn'
    if (lvl === 'info') return 'info'
    if (lvl === 'debug') return 'debug'
    if (lvl === 'trace') return 'trace'
    if (lvl.includes('crit') || lvl.includes('fatal')) return 'critical'
  }

  if (/\b(error|err|fatal|crit|panic)\b/i.test(lower)) return 'error'
  if (/\b(warn|warning)\b/i.test(lower)) return 'warn'
  if (/\b(debug|dbg)\b/i.test(lower)) return 'debug'
  if (/\b(trace|trce)\b/i.test(lower)) return 'trace'
  if (/\b(info|inf)\b/i.test(lower)) return 'info'

  return 'unknown'
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0')
}

// NOTE: formats using the browser's local timezone for now. Item 2/3 of this
// work order (x073) adds a per-user timezone preference that should replace
// this with a timezone-aware formatter — see project_x073_loki_log memory.
function formatNanoTimestamp(nanoTs: string): { iso: string; display: string } {
  const ms = Math.floor(Number(BigInt(nanoTs) / BigInt(1_000_000)))
  const d = new Date(ms)
  const iso = d.toISOString()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const millis = pad(ms % 1000, 3)
  const display = `${pad(d.getDate())} ${months[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${millis}`
  return { iso, display }
}

function tryParseJsonFields(line: string): Record<string, string> | undefined {
  try {
    const parsed = JSON.parse(line)
    if (typeof parsed === 'object' && parsed !== null) {
      const fields: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (k === 'level' || k === 'severity' || k === 'log_level') continue
        fields[k] = typeof v === 'string' ? v : JSON.stringify(v)
      }
      return Object.keys(fields).length > 0 ? fields : undefined
    }
  } catch {
    // not JSON
  }
  return undefined
}

/** Parse Loki streams response into a flat LokiLogEntry array */
export function parseLokiStreams(streams: LokiStream[]): LokiLogEntry[] {
  const entries: LokiLogEntry[] = []

  for (const stream of streams) {
    const labels = stream.stream
    for (const [nanoTs, line] of stream.values) {
      const { iso, display } = formatNanoTimestamp(nanoTs)
      entries.push({
        id: `${nanoTs}-${entries.length}`,
        timestamp: iso,
        timestampNano: nanoTs,
        timestampDisplay: display,
        level: detectLogLevel(line, labels),
        line,
        labels,
        detectedFields: tryParseJsonFields(line),
      })
    }
  }

  return entries
}

/** Compute step interval string for a given time range and desired bucket count. */
function computeStep(startSec: number, endSec: number, buckets = 48): string {
  const rangeSec = endSec - startSec
  const stepSec = Math.max(1, Math.ceil(rangeSec / buckets))
  if (stepSec < 60) return `${stepSec}s`
  if (stepSec < 3600) return `${Math.ceil(stepSec / 60)}m`
  return `${Math.ceil(stepSec / 3600)}h`
}

function parseStep(step: string): number {
  const match = step.match(/^(\d+)(s|m|h)$/)
  if (!match) return 60
  const n = parseInt(match[1])
  switch (match[2]) {
    case 's': return n
    case 'm': return n * 60
    case 'h': return n * 3600
    default: return 60
  }
}

// --- Loki service ---

export const lokiService = {
  queryRange: async (
    logql: string,
    start: number,
    end: number,
    limit = 1000,
    direction: 'forward' | 'backward' = 'backward',
  ): Promise<{ entries: LokiLogEntry[]; streams: LokiStream[] }> => {
    const params = new URLSearchParams({
      query: logql,
      start: start.toString(),
      end: end.toString(),
      limit: limit.toString(),
      direction,
    })
    const res = await client.get<LokiQueryRangeResponse>(`${BASE}/query_range?${params}`)
    const streams = (res.data?.data?.result ?? []) as LokiStream[]
    const entries = parseLokiStreams(streams)
    return { entries, streams }
  },

  getLabels: async (start?: number, end?: number, queryContext?: string): Promise<string[]> => {
    if (queryContext) {
      const params = new URLSearchParams()
      params.append('match[]', queryContext)
      if (start) params.set('start', start.toString())
      if (end) params.set('end', end.toString())

      try {
        const res = await client.get<{ status: string; data: Record<string, string>[] | string[] }>(
          `${BASE}/series?${params}`,
        )
        const seriesList = res.data?.data ?? []
        const uniqueKeys = new Set<string>()
        for (const series of seriesList) {
          if (typeof series === 'object' && series !== null && !Array.isArray(series)) {
            for (const key of Object.keys(series)) {
              if (key !== '__name__') uniqueKeys.add(key)
            }
          }
        }
        return Array.from(uniqueKeys).sort()
      } catch {
        // fall through to global labels
      }
    }

    const params = new URLSearchParams()
    if (start) params.set('start', start.toString())
    if (end) params.set('end', end.toString())
    const res = await client.get<LokiLabelsResponse>(`${BASE}/labels?${params}`)
    return res.data?.data ?? []
  },

  getLabelValues: async (
    labelName: string,
    start?: number,
    end?: number,
    queryContext?: string,
  ): Promise<string[]> => {
    if (queryContext) {
      const params = new URLSearchParams()
      params.append('match[]', queryContext)
      if (start) params.set('start', start.toString())
      if (end) params.set('end', end.toString())

      try {
        const res = await client.get<{ status: string; data: Record<string, string>[] | string[] }>(
          `${BASE}/series?${params}`,
        )
        const seriesList = res.data?.data ?? []
        const uniqueValues = new Set<string>()
        for (const series of seriesList) {
          if (typeof series === 'object' && series !== null && !Array.isArray(series)) {
            if (series[labelName]) uniqueValues.add(series[labelName])
          }
        }
        return Array.from(uniqueValues).sort()
      } catch {
        // fall through
      }
    }

    const params = new URLSearchParams()
    if (start) params.set('start', start.toString())
    if (end) params.set('end', end.toString())
    if (queryContext) params.set('query', queryContext)
    const res = await client.get<LokiLabelsResponse>(`${BASE}/label/${encodeURIComponent(labelName)}/values?${params}`)
    return res.data?.data ?? []
  },

  queryVolume: async (logql: string, start: number, end: number, bucketCount = 48): Promise<VolumeDataPoint[]> => {
    const step = computeStep(start, end, bucketCount)
    const stepSec = parseStep(step)
    const metricQuery = `sum by (stream) (count_over_time(${logql} [${step}]))`
    const params = new URLSearchParams({
      query: metricQuery,
      start: start.toString(),
      end: end.toString(),
      step: stepSec.toString(),
    })

    try {
      const res = await client.get<LokiQueryRangeResponse>(`${BASE}/query_range?${params}`)
      const results = (res.data?.data?.result ?? []) as LokiMatrixResult[]

      const volumeMap = new Map<number, { stdout: number; stderr: number }>()
      for (const series of results) {
        const streamLabel = (series.metric.stream || '').toLowerCase()
        const isStderr = streamLabel === 'stderr'
        for (const [ts, val] of series.values) {
          const msTs = ts * 1000
          if (!volumeMap.has(msTs)) volumeMap.set(msTs, { stdout: 0, stderr: 0 })
          const current = volumeMap.get(msTs)!
          const count = parseInt(val, 10)
          if (isStderr) current.stderr += count
          else current.stdout += count
        }
      }

      return Array.from(volumeMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([time, counts]) => ({ time, stdout: counts.stdout, stderr: counts.stderr }))
    } catch {
      return []
    }
  },
}

/** Validates basic LogQL syntax: balanced braces and quotes. */
export function isValidLogQL(query: string): boolean {
  if (!query.trim()) return false

  const openBraces = (query.match(/\{/g) || []).length
  const closeBraces = (query.match(/\}/g) || []).length
  const unescapedQuotes = query.replace(/\\"/g, '')
  const quotesCount = (unescapedQuotes.match(/"/g) || []).length

  if (openBraces !== closeBraces || quotesCount % 2 !== 0) return false
  if (openBraces > 0 && closeBraces === 0) return false

  return true
}
