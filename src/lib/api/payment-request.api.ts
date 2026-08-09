import { client } from '@/lib/axios'
import type {
  PayInRequestItem,
  PayInRequestDetail,
  GetPayInRequestsPayload,
  PaymentTxJob,
  PayOutRequestItem,
  PayOutRequestDetail,
  GetPayOutRequestsPayload,
  CreatePayOutRequestPayload,
  UpdatePayOutRequestPayload,
  ApprovePayOutRequestPayload,
  RejectPayOutRequestPayload,
  TransferRequestItem,
  TransferRequestDetail,
  GetTransferRequestsPayload,
  CreateTransferRequestPayload,
  UpdateTransferRequestPayload,
  ApproveTransferRequestPayload,
  RejectTransferRequestPayload,
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

  createPaymentTxByPayInRequestId: (id: string) =>
    client.post(`/admin-api/AdminPaymentTx/org/global/action/CreatePaymentTxByPayInRequestId/${id}`, {}),

  rejectPendingPayInRequestById: (id: string, reason?: string, rejectStatus?: string) =>
    client.post(`${BASE}/RejectPendingPayInRequestById/${id}`, {
      StatusReason: reason ?? '',
      ...(rejectStatus ? { StatusCode: rejectStatus } : {}),
    }),

  getPaymentRequestJobById: (pmtId: string, jobId: string) =>
    client.get<PaymentTxJob>(`${BASE}/GetPaymentRequestJobById/${pmtId}/${jobId}`),

  getPayInSlipUploads: (_orgId: string, paymentRequestId: string) =>
    client.get(`/admin-api/AdminPaymentRequest/org/global/action/GetPayInSlipUpload/${paymentRequestId}`),

  generatePayInSlipUploadToken: (_orgId: string, paymentRequestId: string) =>
    client.get(`/admin-api/AdminPaymentRequest/org/global/action/GeneratePayInSlipUploadToken/${paymentRequestId}`),

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

  // ── Transfer ──────────────────────────────────────────────────────────────
  createTransferRequest: (payload: CreateTransferRequestPayload) =>
    client.post(`${BASE}/CreateTransferRequest`, payload),

  getTransferRequests: (payload: GetTransferRequestsPayload = {}) =>
    client.post<{ paymentRequests: TransferRequestItem[] }>(`${BASE}/GetTransferRequests`, payload),

  getTransferRequestCount: (payload: GetTransferRequestsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetTransferRequestCount`, payload),

  getTransferRequestById: (id: string) =>
    client.get<{ paymentRequest: TransferRequestDetail }>(`${BASE}/GetPaymentRequestById/${id}`),

  updateTransferRequestById: (id: string, payload: UpdateTransferRequestPayload) =>
    client.post(`${BASE}/UpdateTransferRequestById/${id}`, payload),

  approveTransferRequestById: (id: string, payload: ApproveTransferRequestPayload) =>
    client.post(`${BASE}/ApproveTransferRequestById/${id}`, payload),

  rejectTransferRequestById: (id: string, payload: RejectTransferRequestPayload) =>
    client.post(`${BASE}/RejectTransferRequestById/${id}`, payload),
}
