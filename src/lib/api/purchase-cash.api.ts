import { client } from '@/lib/axios'
import type { PurchaseCashItem, PurchaseCashResult } from './types'

const BASE = '/admin-api/AdminPurchaseCash/org/global/action'

export interface GetPurchaseCashesPayload {
  FullTextSearch?: string
  DocumentStatus?: string
  OrgIdFilter?: string
  Offset?: number
  Limit?: number
  FromDate?: string
  ToDate?: string
}

export const purchaseCashApi = {
  getPurchaseCashes: (payload: GetPurchaseCashesPayload = {}) =>
    client.post<PurchaseCashItem[]>(`${BASE}/GetPurchaseCashes`, payload),

  getPurchaseCashCount: (payload: GetPurchaseCashesPayload = {}) =>
    client.post<number>(`${BASE}/GetPurchaseCashCount`, payload),

  getPurchaseCashById: (id: string) =>
    client.get<PurchaseCashResult>(`${BASE}/GetPurchaseCashById/${id}`),

  approvePurchaseCashById: (id: string) =>
    client.post<PurchaseCashResult>(`${BASE}/ApprovePurchaseCashById/${id}`),

  rejectPurchaseCashById: (id: string, reason: string) =>
    client.post<PurchaseCashResult>(`${BASE}/RejectPurchaseCashById/${id}`, { Reason: reason }),
}
