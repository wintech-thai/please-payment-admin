import { client } from '@/lib/axios'
import type { PayInTxItem, PayInTxDetail, GetPayInTxPayload } from './types'

const BASE = '/admin-api/AdminPaymentTx/org/global/action'

export const paymentTxApi = {
  getPayInTransactions: (payload: GetPayInTxPayload = {}) =>
    client.post<{ payInTransactions: PayInTxItem[] }>(`${BASE}/GetPayInTransactions`, payload),

  getPayInTransactionCount: (payload: GetPayInTxPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetPayInTransactionCount`, payload),

  getPaymentTransactionById: (id: string) =>
    client.get<{ paymentTransaction: PayInTxDetail }>(`${BASE}/GetPaymentTransactionById/${id}`),
}
