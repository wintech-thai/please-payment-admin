import { client } from '@/lib/axios'
import type {
  MerchantItem,
  GetMerchantsPayload,
  AddMerchantPayload,
  UpdateMerchantPayload,
} from './types'

const BASE = '/admin-api/AdminMerchant/org/global/action'
const ORG_BASE = '/admin-api/AdminOrganization/org/global/action'

export const merchantApi = {
  getMerchants: (payload: GetMerchantsPayload = {}) =>
    client.post<{ merchants: MerchantItem[] }>(`${BASE}/GetMerchants`, payload),

  getMerchantCount: (payload: GetMerchantsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetMerchantCount`, payload),

  getMerchantById: (id: string) =>
    client.get<{ merchant: MerchantItem }>(`${BASE}/GetMerchantById/${id}`),

  updateMerchantById: (id: string, payload: UpdateMerchantPayload) =>
    client.post(`${BASE}/UpdateMerchantById/${id}`, payload),

  enableMerchantById: (id: string) =>
    client.post(`${BASE}/EnableMerchantById/${id}`, {}),

  disableMerchantById: (id: string) =>
    client.post(`${BASE}/DisableMerchantById/${id}`, {}),

  getPaymentEndpoint: (id: string) =>
    client.get(`${BASE}/GetMerchantPaymentRequestEndPoint/${id}`),

  addMerchant: (payload: AddMerchantPayload) =>
    client.post(`${ORG_BASE}/AddOrganization`, payload),
}
