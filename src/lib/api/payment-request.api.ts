import { client } from '@/lib/axios'
import type {
  PayInRequestItem,
  PayInRequestDetail,
  GetPayInRequestsPayload,
  PayOutRequestItem,
  PayOutRequestDetail,
  GetPayOutRequestsPayload,
  CreatePayOutRequestPayload,
  UpdatePayOutRequestPayload,
  ApprovePayOutRequestPayload,
  RejectPayOutRequestPayload,
} from './types'

const BASE = '/admin-api/AdminPaymentRequest/org/global/action'

export const paymentRequestApi = {
  // ── Pay-In ────────────────────────────────────────────────────────────────
  getPayInRequests: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ paymentRequests: PayInRequestItem[] }>(`${BASE}/GetPayInRequests`, payload),

  getPayInRequestCount: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetPayInRequestCount`, payload),

  getPaymentRequestById: (id: string) =>
    client.get<{ paymentRequest: PayInRequestDetail }>(`${BASE}/GetPaymentRequestById/${id}`),

  // ── Pay-Out ───────────────────────────────────────────────────────────────
  createPayOutRequest: (payload: CreatePayOutRequestPayload) =>
    client.post(`${BASE}/CreatePayOutRequest`, payload),

  getPayOutRequests: (payload: GetPayOutRequestsPayload = {}) =>
    client.post<{ paymentRequests: PayOutRequestItem[] }>(`${BASE}/GetPayOutRequests`, payload),

  getPayOutRequestCount: (payload: GetPayOutRequestsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetPayOutRequestCount`, payload),

  getPayOutRequestById: (id: string) =>
    client.get<{ paymentRequest: PayOutRequestDetail }>(`${BASE}/GetPayOutRequestById/${id}`),

  updatePayOutRequestById: (id: string, payload: UpdatePayOutRequestPayload) =>
    client.post(`${BASE}/UpdatePayOutRequestById/${id}`, payload),

  approvePayOutRequestById: (id: string, payload: ApprovePayOutRequestPayload) =>
    client.post(`${BASE}/ApprovePayOutRequestById/${id}`, payload),

  rejectPayOutRequestById: (id: string, payload: RejectPayOutRequestPayload) =>
    client.post(`${BASE}/RejectPayOutRequestById/${id}`, payload),
}
