import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminIoc/org/global/action'

export interface IocItem {
  id: string
  orgId?: string | null
  iocType?: string | null
  iocValue?: string | null
  status?: string | null
  source?: string | null
  riskScore: number
  confidenceScore: number
  reputation?: string | null
  noted?: string | null
  tags?: string | null
  seenCount: number
  createdDate?: string | null
  lastSeenDate?: string | null
  firstSeenDate?: string | null
}

export interface MVIoc {
  status?: string
  description?: string
  ioc?: IocItem
}

export interface GetIocsPayload {
  FullTextSearch?: string
  IocType?: string
  Reputation?: string
  Status?: string
  FromDate?: string
  ToDate?: string
  Offset?: number
  Limit?: number
}

export interface AddIocPayload {
  IocType: string
  IocValue: string
  Source?: string
  RiskScore?: number
  ConfidenceScore?: number
  Reputation?: string
  Noted?: string
  Tags?: string
  Status?: string
}

export interface UpdateIocPayload {
  Source?: string
  RiskScore?: number
  ConfidenceScore?: number
  Reputation?: string
  Noted?: string
  Tags?: string
}

export const iocApi = {
  getIocs: (payload: GetIocsPayload = {}) =>
    client.post<IocItem[]>(`${BASE}/GetIocs`, payload),

  getIocCount: (payload: GetIocsPayload = {}) =>
    client.post<number>(`${BASE}/GetIocCount`, payload),

  getIocById: (iocId: string) =>
    client.get<MVIoc>(`${BASE}/GetIocById/${iocId}`),

  addIoc: (payload: AddIocPayload) =>
    client.post<MVIoc>(`${BASE}/AddIoc`, payload),

  updateIocById: (iocId: string, payload: UpdateIocPayload) =>
    client.post<MVIoc>(`${BASE}/UpdateIocById/${iocId}`, payload),

  enableIocById: (iocId: string) =>
    client.post<MVIoc>(`${BASE}/EnableIocById/${iocId}`, {}),

  disableIocById: (iocId: string) =>
    client.post<MVIoc>(`${BASE}/DisableIocById/${iocId}`, {}),

  deleteIocById: (iocId: string) =>
    client.delete(`${BASE}/DeleteIocById/${iocId}`),
}
