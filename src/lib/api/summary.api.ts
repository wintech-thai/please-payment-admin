import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminSummary/org/global/action'

export interface GetMerchantSummaryPayload {
  FromDate?: string
  ToDate?: string
  fromDate?: string
  toDate?: string
}

export interface GetRevenueSummaryPayload {
  fromDate?: string
  toDate?: string
  offset?: number
  limit?: number
  needMerchantSummary?: boolean
}

export interface GetExpenseSummaryPayload {
  fromDate?: string
  toDate?: string
}

export interface GetBankSummaryPayload {
  fromDate?: string
  toDate?: string
  bankCode?: string
  accountNumber?: string
  merchantCode?: string
  includeP2P?: boolean
}

export interface GetPayerSummaryPayload {
  fromDate?: string
  toDate?: string
  merchantCode?: string
  payerName?: string
}

export const summaryApi = {
  getMerchantSummary: (payload: GetMerchantSummaryPayload = {}) =>
    client.post(`${BASE}/GetMerchantSummary`, payload),

  getRevenueSummary: (payload: GetRevenueSummaryPayload = {}) =>
    client.post(`${BASE}/GetRevenueSummary`, payload),

  getExpenseSummary: (payload: GetExpenseSummaryPayload = {}) =>
    client.post(`${BASE}/GetExpenseSummary`, payload),

  getBankSummary: (payload: GetBankSummaryPayload = {}) =>
    client.post(`${BASE}/GetBankSummary`, payload),

  getPayerSummary: (payload: GetPayerSummaryPayload = {}) =>
    client.post(`${BASE}/GetPayerSummary`, payload),
}
