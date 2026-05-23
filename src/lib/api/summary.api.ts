import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminSummary/org/global/action'

export interface GetMerchantSummaryPayload {
  FromDate?: string
  ToDate?: string
  fromDate?: string
  toDate?: string
}

export const summaryApi = {
  getMerchantSummary: (payload: GetMerchantSummaryPayload = {}) =>
    client.post(`${BASE}/GetMerchantSummary`, payload),
}
