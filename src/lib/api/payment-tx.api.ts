import { client } from '@/lib/axios'
import type { PayInTxItem, PayInTxDetail, PaymentTxJob, GetPayInTxPayload, SubmitLinePaymentTxPayload } from './types'

const BASE = '/admin-api/AdminPaymentTx/org/global/action'

export const paymentTxApi = {
  getPayInTransactions: (payload: GetPayInTxPayload = {}) =>
    client.post<{ payInTransactions: PayInTxItem[] }>(`${BASE}/GetPayInTransactions`, payload),

  getPayInTransactionCount: (payload: GetPayInTxPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetPayInTransactionCount`, payload),

  getPaymentTransactionById: (id: string) =>
    client.get<{ paymentTransaction: PayInTxDetail }>(`${BASE}/GetPaymentTransactionById/${id}`),

  getPaymentTransactionJobById: (pmtId: string, jobId: string) =>
    client.get<PaymentTxJob>(`${BASE}/GetPaymentTransactionJobById/${pmtId}/${jobId}`),

  submitLinePaymentTxNotification: (bankAccountId: string, payload: SubmitLinePaymentTxPayload, apiKey?: string) =>
    client.post(`${BASE}/SubmitLinePaymentTxNotification/${bankAccountId}`, payload, {
      headers: apiKey ? { Authorization: `ApiKey ${apiKey}` } : undefined,
    }),

  approveUnidentifiedPaymentTx: (pmtId: string, merchantId: string) =>
    client.post(`${BASE}/ApproveUnidentifiedPaymentTx/${pmtId}/${merchantId}`, null),

  rejectUnidentifiedPaymentTx: (pmtId: string, statusReason: string) =>
    client.post(`${BASE}/RejectUnidentifiedPaymentTx/${pmtId}`, { StatusReason: statusReason }),
}
