import { client } from '@/lib/axios'
import type {
  PaymentGatewayItem,
  GetPaymentGatewaysPayload,
  AddPaymentGatewayPayload,
  UpdatePaymentGatewayPayload,
} from './types'

const BASE = '/admin-api/AdminPaymentGateway/org/global/action'

export const paymentGatewayApi = {
  getPaymentGateways: (payload: GetPaymentGatewaysPayload = {}) =>
    client.post<{ paymentGateways: PaymentGatewayItem[] }>(`${BASE}/GetPaymentGateways`, payload),

  getPaymentGatewayCount: (payload: GetPaymentGatewaysPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetPaymentGatewayCount`, payload),

  getPaymentGatewayById: (id: string) =>
    client.get<{ paymentGateway: PaymentGatewayItem }>(`${BASE}/GetPaymentGatewayById/${id}`),

  addPaymentGateway: (payload: AddPaymentGatewayPayload) =>
    client.post(`${BASE}/AddPaymentGateway`, payload),

  updatePaymentGatewayById: (id: string, payload: UpdatePaymentGatewayPayload) =>
    client.post(`${BASE}/UpdatePaymentGatewayById/${id}`, payload),

  deletePaymentGatewayById: (id: string) =>
    client.delete(`${BASE}/DeletePaymentGatewayById/${id}`),
}
