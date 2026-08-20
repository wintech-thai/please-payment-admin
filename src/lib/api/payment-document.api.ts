import { client } from '@/lib/axios'
import type {
  PayInSlipItem,
  PayInSlipDetail,
  GetPayInDocumentsPayload,
  AddPayInDocumentPayload,
  UpdatePayInDocumentPayload,
  ApprovePayInDocumentPayload,
  RejectPayInDocumentPayload,
} from './types'

const BASE = '/admin-api/AdminPaymentDocument/org/global/action'

export const paymentDocumentApi = {
  getPayInDocuments: (payload: GetPayInDocumentsPayload = {}) =>
    client.post<{ paymentDocuments: PayInSlipItem[] }>(`${BASE}/GetPayInDocuments`, payload),

  getPayInDocumentCount: (payload: GetPayInDocumentsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetPayInDocumentCount`, payload),

  getPaymentDocumentById: (id: string) =>
    client.get<{ paymentDocument: PayInSlipDetail }>(`${BASE}/GetPaymentDocumentById/${id}`),

  addPayInDocument: (merchantId: string, payload: AddPayInDocumentPayload) =>
    client.post(`${BASE}/AddPayInDocument/${merchantId}`, payload),

  updatePayInDocumentById: (id: string, payload: UpdatePayInDocumentPayload) =>
    client.post(`${BASE}/UpdatePayInDocumentById/${id}`, payload),

  approvePayInDocumentById: (id: string, payload: ApprovePayInDocumentPayload) =>
    client.post(`${BASE}/ApprovePayInDocumentById/${id}`, payload),

  rejectPayInDocumentById: (id: string, payload: RejectPayInDocumentPayload) =>
    client.post(`${BASE}/RejectPayInDocumentById/${id}`, payload),

  getPendingPayInRequestsForPaymentTx: (payload: {
    GeneratedAmountStr?: string
    BankAccountId?: string
    MerchantId?: string
  }) =>
    client.post(
      '/admin-api/AdminPaymentTx/org/global/action/GetPendingPayInRequestsForPaymentTx',
      payload
    ),
}
