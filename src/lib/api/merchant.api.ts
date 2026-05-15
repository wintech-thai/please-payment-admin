import { client } from '@/lib/axios'
import type {
  MerchantItem,
  GetMerchantsPayload,
  AddMerchantPayload,
  UpdateMerchantPayload,
  OrgUserItem,
  OrgApiKeyItem,
  InviteOrgUserPayload,
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

  // ── Org Users ────────────────────────────────────────────────────────────
  getOrgUsers: (orgCustomId: string) =>
    client.get<{ users: OrgUserItem[] }>(`${ORG_BASE}/GetOrgUsers/${orgCustomId}`),

  enableOrgUser: (orgCustomId: string, orgUserId: string) =>
    client.post(`${ORG_BASE}/EnableOrgUserById/${orgCustomId}/${orgUserId}`, null),

  disableOrgUser: (orgCustomId: string, orgUserId: string) =>
    client.post(`${ORG_BASE}/DisableOrgUserById/${orgCustomId}/${orgUserId}`, null),

  inviteOrgUser: (orgCustomId: string, payload: InviteOrgUserPayload) =>
    client.post(`${ORG_BASE}/InviteOrganizationUser/${orgCustomId}`, payload),

  // ── Org API Keys ─────────────────────────────────────────────────────────
  getOrgApiKeys: (orgCustomId: string) =>
    client.get<{ apiKeys: OrgApiKeyItem[] }>(`${ORG_BASE}/GetPaymentRequestApiKeys/${orgCustomId}`),

  createOrgApiKey: (orgCustomId: string) =>
    client.post(`${ORG_BASE}/CreatePaymentRequestApiKey/${orgCustomId}`, {}),

  enableOrgApiKey: (orgCustomId: string, keyId: string) =>
    client.post(`${ORG_BASE}/EnablePaymentRequestApiKeyById/${orgCustomId}/${keyId}`, null),

  disableOrgApiKey: (orgCustomId: string, keyId: string) =>
    client.post(`${ORG_BASE}/DisableRequestApiKeyById/${orgCustomId}/${keyId}`, null),
}
