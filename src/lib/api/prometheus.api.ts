import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminProxy/org/global/action/Prometheus'

export interface PrometheusResult {
  metric: Record<string, string>
  value: [number, string]
}

export interface PrometheusRangeResult {
  metric: Record<string, string>
  values: [number, string][]
}

interface PrometheusResponse<T> {
  status: string
  data: { resultType: string; result: T[] }
}

export async function queryPrometheus(promql: string): Promise<PrometheusResult[]> {
  const params = new URLSearchParams({ query: promql })
  const res = await client.get<PrometheusResponse<PrometheusResult>>(`${BASE}/api/v1/query?${params}`)
  return res.data?.data?.result ?? []
}

export async function queryRangePrometheus(
  promql: string,
  start: number,
  end: number,
  step: number
): Promise<PrometheusRangeResult[]> {
  const params = new URLSearchParams({
    query: promql,
    start: start.toString(),
    end: end.toString(),
    step: step.toString(),
  })
  const res = await client.get<PrometheusResponse<PrometheusRangeResult>>(`${BASE}/api/v1/query_range?${params}`)
  return res.data?.data?.result ?? []
}

export async function getLabelValues(label: string): Promise<string[]> {
  const res = await client.get<{ status: string; data: string[] }>(`${BASE}/api/v1/label/${label}/values`)
  return res.data?.data ?? []
}
