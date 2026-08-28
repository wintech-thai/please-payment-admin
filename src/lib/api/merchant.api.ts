import { client } from '@/lib/axios'
import type {
  MerchantItem,
  GetMerchantsPayload,
  AddMerchantPayload,
  UpdateMerchantPayload,
  OrgUserItem,
  OrgApiKeyItem,
  InviteOrgUserPayload,
  SubmitPaymentRequestPayload,
} from './types'

const BASE = '/admin-api/AdminMerchant/org/global/action'
const ORG_BASE = '/admin-api/AdminOrganization/org/global/action'
const PMR_BASE = '/admin-api/AdminPaymentRequest/org/global/action'

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

  getPayOutEndpoint: (id: string) =>
    client.get(`${BASE}/GetMerchantPayOutRequestEndpoint/${id}`),

  getMerchantPaymentEndpoints: (merchantId: string) =>
    client.get<Array<{ name: string; value: string }>>(`${BASE}/GetMerchantPaymentEndpoints/${merchantId}`),

  getPayOutApiKeys: (orgCustomId: string) =>
    client.get(`${ORG_BASE}/GetPayOutRequestApiKeys/${orgCustomId}`),

  createPayOutApiKey: (orgCustomId: string) =>
    client.post(`${ORG_BASE}/CreatePayOutRequestApiKey/${orgCustomId}`, {}),

  addMerchant: (payload: AddMerchantPayload) =>
    client.post(`${ORG_BASE}/AddOrganization`, payload),

  // ── Org Users ────────────────────────────────────────────────────────────
  getOrgUsers: (orgCustomId: string) =>
    client.get<{ users: OrgUserItem[] }>(`${ORG_BASE}/GetOrgUsers/${orgCustomId}`),

  enableOrgUser: (orgCustomId: string, orgUserId: string) =>
    client.post(`${ORG_BASE}/EnableOrgUserById/${orgCustomId}/${orgUserId}`, null),

  disableOrgUser: (orgCustomId: string, orgUserId: string) =>
    client.post(`${ORG_BASE}/DisableOrgUserById/${orgCustomId}/${orgUserId}`, null),

  inviteOrgUser: (orgCustomId: string, payload: InviteOrgUserPayload) =>
    client.post(`${ORG_BASE}/InviteOrganizationUser/${orgCustomId}`, payload),

  deleteOrgUser: (orgCustomId: string, orgUserId: string) =>
    client.delete(`${ORG_BASE}/DeleteOrgUserById/${orgCustomId}/${orgUserId}`),

  getOrgUserForgotPasswordLink: (orgCustomId: string, orgUserId: string) =>
    client.get<{ forgotPasswordUrl?: string }>(`${ORG_BASE}/GetOrgUserForgotPasswordLink/${orgCustomId}/${orgUserId}`),

  // ── Org API Keys ─────────────────────────────────────────────────────────
  getOrgApiKeys: (orgCustomId: string) =>
    client.get<{ apiKeys: OrgApiKeyItem[] }>(`${ORG_BASE}/GetPaymentRequestApiKeys/${orgCustomId}`),

  getPaymentApiKeys: (orgCustomId: string) =>
    client.get<OrgApiKeyItem[]>(`${ORG_BASE}/GetPaymentApiKeys/${orgCustomId}`),

  createOrgApiKey: (orgCustomId: string) =>
    client.post(`${ORG_BASE}/CreatePaymentRequestApiKey/${orgCustomId}`, {}),

  createPaymentEndpointsApiKey: (orgCustomId: string, roles: string) =>
    client.post(`/admin-api/AdminApiKey/org/global/action/CreatePaymentEndpointsApiKey/${orgCustomId}/${encodeURIComponent(roles)}`, {}),

  enableOrgApiKey: (orgCustomId: string, keyId: string) =>
    client.post(`${ORG_BASE}/EnablePaymentRequestApiKeyById/${orgCustomId}/${keyId}`, null),

  disableOrgApiKey: (orgCustomId: string, keyId: string) =>
    client.post(`${ORG_BASE}/DisableRequestApiKeyById/${orgCustomId}/${keyId}`, null),

  deleteOrgApiKey: (orgCustomId: string, keyId: string) =>
    client.post(`${ORG_BASE}/DeletePaymentRequestApiKeyById/${orgCustomId}/${keyId}`, {}),

  // ── QR Payment ───────────────────────────────────────────────────────────
  getPayInBankAccountsForMerchant: (merchantId: string) =>
    client.get(`${BASE}/GetPayInBankAccountsForMerchant/${merchantId}`),

  submitPaymentRequest: (merchantId: string, payload: SubmitPaymentRequestPayload) =>
    client.post(`${PMR_BASE}/SubmitPaymentRequestByMerchantId/${merchantId}`, payload),

  submitPaymentRequestP2P: (merchantId: string, payload: { RefId1?: string; RefId2?: string; RefId3?: string; Currency?: string; RequestedAmount: number; QrProvider?: string; PayerName?: string }) =>
    client.post(`${PMR_BASE}/SubmitPaymentRequestByMerchantIdP2P/${merchantId}`, payload),
}
