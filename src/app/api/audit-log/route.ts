import { NextResponse } from 'next/server'
import { Client } from '@elastic/elasticsearch'

// ── ElasticSearch backend (existing) ─────────────────────────────────────────

const getEsClient = () => {
  if (!process.env.ES_URL) throw new Error('ES_URL environment variable is missing.')
  return new Client({
    node: process.env.ES_URL,
    auth: { username: process.env.ES_USER || '', password: process.env.ES_PASSWORD || '' },
    tls: { rejectUnauthorized: false },
  })
}

async function handleElasticsearch(req: Request): Promise<Response> {
  const orgId = req.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ status: 'ERROR', message: 'Missing Org ID' }, { status: 400 })

  const { esPayload, orgIds } = await req.json()
  const index = process.env.ES_INDEX_PATTERN || 'onix-v2*'

  if (esPayload.query?.bool?.must) {
    if (Array.isArray(orgIds)) {
      if (orgIds.length > 0) {
        esPayload.query.bool.must.push({ terms: { 'data.api.OrgId.keyword': orgIds } })
      }
    } else {
      esPayload.query.bool.must.push({ term: { 'data.api.OrgId.keyword': 'global' } })
    }
    const envRun = process.env.ENV_RUN || process.env.NEXT_PUBLIC_ENV_RUN
    if (envRun) {
      esPayload.query.bool.must.push({ match_phrase: { 'data.Environment': envRun } })
    }
    esPayload.query.bool.must.push({
      terms: { 'data.OrgType.keyword': ['OrgType:GLOBAL', 'OrgType:PLEASE-PAYMENT'] },
    })
  }

  const esClient = getEsClient()
  const result: any = await esClient.search({ index, ...esPayload })

  const responseBody = result.body || result
  const hits = responseBody.hits?.hits || []
  const rawTotal = responseBody.hits?.total
  const total = typeof rawTotal === 'number' ? rawTotal : (rawTotal?.value || 0)
  const aggregations = responseBody.aggregations || null

  const logs = hits.map((hit: any) => ({ _id: hit._id, ...hit._source }))

  return NextResponse.json({ status: 'OK', data: logs, total, aggregations })
}

// ── PostgreSQL backend (via C# API) ──────────────────────────────────────────

function extractTimeRange(esPayload: any): { fromDate?: string; toDate?: string } {
  const must: any[] = esPayload?.query?.bool?.must || []
  const rangeClause = must.find((m: any) => m.range?.['@timestamp'])
  if (!rangeClause) return {}
  const ts = rangeClause.range['@timestamp']
  return { fromDate: ts.gte, toDate: ts.lte }
}

function extractSearch(esPayload: any): string | undefined {
  const must: any[] = esPayload?.query?.bool?.must || []
  const mm = must.find((m: any) => m.multi_match)
  return mm?.multi_match?.query
}

function extractOrgIds(orgIds: any): string[] | undefined {
  if (Array.isArray(orgIds) && orgIds.length > 0) return orgIds
  return undefined
}

async function handlePostgres(req: Request): Promise<Response> {
  const orgId = req.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ status: 'ERROR', message: 'Missing Org ID' }, { status: 400 })

  const body = await req.json()
  const { esPayload, orgIds } = body

  const { fromDate, toDate } = extractTimeRange(esPayload)
  const search = extractSearch(esPayload)
  const from: number = esPayload?.from ?? 0
  const size: number = esPayload?.size ?? 25
  const returnDocs = size > 0

  const apiBase = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || ''
  const token = req.headers.get('authorization') || ''

  const payload: Record<string, unknown> = {
    fromDate,
    toDate,
    FullTextSearch: search ?? '',
    Limit: returnDocs ? size : 0,
    Offset: returnDocs ? Math.floor(from / (size || 1)) + 1 : 1,
    ReturnDocs: returnDocs,
    OrgIds: extractOrgIds(orgIds),
  }

  const apiRes = await fetch(`${apiBase}/admin-api/AdminAuditLog/org/global/action/QueryAuditLogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!apiRes.ok) {
    const text = await apiRes.text()
    return NextResponse.json({ status: 'ERROR', message: text }, { status: apiRes.status })
  }

  const result = await apiRes.json()
  return NextResponse.json(result)
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const source = process.env.AUDIT_LOG_SOURCE || 'elasticsearch'
    if (source === 'postgres') {
      return await handlePostgres(req)
    }
    return await handleElasticsearch(req)
  } catch (error: any) {
    console.error('Audit log query error:', error)
    return NextResponse.json({ status: 'ERROR', message: error.message }, { status: 500 })
  }
}
