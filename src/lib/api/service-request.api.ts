import { client } from '@/lib/axios'
import type { ServiceRequestItem, ServiceRequestResult, PaymentTxJob } from './types'

const BASE = '/admin-api/AdminServiceRequest/org/global/action'

export interface GetServiceRequestsPayload {
  FullTextSearch?: string
  ServiceType?: string
  Status?: string
  Offset?: number
  Limit?: number
  FromDate?: string
  ToDate?: string
}

export interface CreateRegistrationLinkPayload {
  Email: string
  AdminDomain: string
  Lang?: string
  FirstName?: string
  LastName?: string
  Phone?: string
}

export const serviceRequestApi = {
  createRegistrationLink: (payload: CreateRegistrationLinkPayload) =>
    client.post<ServiceRequestResult>(`${BASE}/CreatePleasePaymentRegistrationLink`, payload),

  getServiceRequests: (payload: GetServiceRequestsPayload = {}) =>
    client.post<ServiceRequestItem[]>(`${BASE}/GetServiceRequests`, payload),

  getServiceRequestCount: (payload: GetServiceRequestsPayload = {}) =>
    client.post<number>(`${BASE}/GetServiceRequestCount`, payload),

  getServiceRequestById: (id: string) =>
    client.get<ServiceRequestResult>(`${BASE}/GetServiceRequestById/${id}`),

  updateServiceRequestById: (id: string, payload: Partial<ServiceRequestItem>) =>
    client.post<ServiceRequestResult>(`${BASE}/UpdateServiceRequestById/${id}`, payload),

  deleteServiceRequestById: (id: string) =>
    client.delete<ServiceRequestResult>(`${BASE}/DeleteServiceRequestById/${id}`),

  regenerateLink: (id: string, adminDomain?: string) =>
    client.post<ServiceRequestResult>(`${BASE}/RegenerateServiceRequestLink/${id}`, null, { params: { adminDomain } }),

  resendLinkEmail: (id: string) =>
    client.post<ServiceRequestResult>(`${BASE}/ResendServiceRequestLinkEmail/${id}`),

  getServiceRequestJobs: (id: string) =>
    client.get<PaymentTxJob[]>(`${BASE}/GetServiceRequestJobs/${id}`),
}
