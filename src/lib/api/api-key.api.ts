import { client } from '@/lib/axios'
import type {
  ApiKeyItem,
  GetApiKeysPayload,
  AddApiKeyPayload,
  UpdateApiKeyPayload,
} from './types'

const BASE = '/admin-api/AdminApiKey/org/global/action'

export const apiKeyApi = {
  getApiKeys: (payload: GetApiKeysPayload = {}) =>
    client.post<{ apiKeys: ApiKeyItem[] }>(`${BASE}/GetApiKeys`, payload),

  getApiKeyCount: (payload: GetApiKeysPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetApiKeyCount`, payload),

  getApiKeyById: (keyId: string) =>
    client.get<{ apiKey: ApiKeyItem }>(`${BASE}/GetApiKeyById/${keyId}`),

  verifyApiKey: (apiKey: string) =>
    client.get<{ valid: boolean }>(`${BASE}/VerifyApiKey/${apiKey}`),

  addApiKey: (payload: AddApiKeyPayload) =>
    client.post<{ apiKey: ApiKeyItem }>(`${BASE}/AddApiKey`, payload),

  updateApiKeyById: (keyId: string, payload: UpdateApiKeyPayload) =>
    client.post(`${BASE}/UpdateApiKeyById/${keyId}`, payload),

  enableApiKeyById: (keyId: string) =>
    client.post(`${BASE}/EnableApiKeyById/${keyId}`, {}),

  disableApiKeyById: (keyId: string) =>
    client.post(`${BASE}/DisableApiKeyById/${keyId}`, {}),

  deleteApiKeyById: (keyId: string) =>
    client.delete(`${BASE}/DeleteApiKeyById/${keyId}`),
}
