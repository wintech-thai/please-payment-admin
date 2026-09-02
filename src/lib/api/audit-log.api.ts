import { client } from '@/lib/axios'

export interface AuditLogDocument {
  id: string
  '@timestamp': string
  user_name: string
  id_type: string
  role: string
  action: string
  path: string
  resource: string
  status_code: number
  client_ip: string
  remote_ip: string
  [key: string]: unknown
}

export interface AuditLogPayload {
  limit?: number
  offset?: number
  search?: string
  sortBy?: string
  sortDesc?: boolean
  from?: string
  to?: string
  [key: string]: unknown
}

const getOrgId = () =>
  typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : ''

const BASE = '/api/AuditLog'
const APP_TYPE = 'PLEASE-PAYMENT-ADMIN'

export const auditLogApi = {
  getAuditLogs: (payload: AuditLogPayload = {}) =>
    client.post(`${BASE}/org/${getOrgId()}/action/GetAuditLogs`, {
      ApplicationType: APP_TYPE,
      ...payload,
    }),

  getAuditLogCount: (payload: AuditLogPayload = {}) =>
    client.post(`${BASE}/org/${getOrgId()}/action/GetAuditLogCount`, {
      ApplicationType: APP_TYPE,
      ...payload,
    }),

  getAuditLogById: (id: string) =>
    client.get(`${BASE}/org/${getOrgId()}/action/GetAuditLogById/${id}`),
}
