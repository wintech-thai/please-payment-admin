import { client } from '@/lib/axios'
import type { PayInRequestItem, PayInRequestDetail, GetPayInRequestsPayload } from './types'

const BASE = '/admin-api/AdminPaymentRequest/org/global/action'

export const paymentRequestApi = {
  getPayInRequests: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ paymentRequests: PayInRequestItem[] }>(`${BASE}/GetPayInRequests`, payload),

  getPayInRequestCount: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetPayInRequestCount`, payload),

  getPaymentRequestById: (id: string) =>
    client.get<{ paymentRequest: PayInRequestDetail }>(`${BASE}/GetPaymentRequestById/${id}`),
}
