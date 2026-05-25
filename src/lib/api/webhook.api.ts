import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminWebhookConfig/org/global/action'

export interface WebhookConfigItem {
  webhookId?: string
  id?: string
  webhookConfigId?: string
  orgId?: string
  merchantId?: string
  eventName?: string | null
  description?: string | null
  endpointUrl?: string | null
  httpMethod?: string | null
  isActive?: boolean | null
  secretKey?: string | null
  signatureAlgorithm?: string | null
  timeoutSec?: number | null
  maxRetryCount?: number | null
  retryIntervalSec?: number | null
  headersDefinition?: string | null
  headers?: Record<string, string> | null
  createdDate?: string | null
}

export interface WebhookPayload {
  EventName: string
  Description?: string
  EndpointUrl: string
  HttpMethod: string
  IsActive: boolean
  SecretKey?: string
  SignatureAlgorithm: string
  TimeoutSec?: number
  MaxRetryCount?: number
  RetryIntervalSec?: number
  Headers?: Record<string, string>
}

export const webhookApi = {
  getWebhookConfigsByMerchantId: (orgId: string, merchantId: string, params?: { page?: number; limit?: number }) =>
    client.get<{ webhookConfigs: WebhookConfigItem[] }>(
      `${BASE}/GetWebhookConfigsByMerchantId/${orgId}/${merchantId}`,
      { params }
    ),

  getWebhookConfigsCountByMerchantId: (orgId: string, merchantId: string) =>
    client.get<{ count: number }>(
      `${BASE}/GetWebhookConfigsCountByMerchantId/${orgId}/${merchantId}`
    ),

  getWebhookConfigById: (orgId: string, webhookConfigId: string) =>
    client.get<{ webhookConfig: WebhookConfigItem }>(
      `${BASE}/GetWebhookConfigById/${orgId}/${webhookConfigId}`
    ),

  addMerchantWebhookConfig: (orgId: string, merchantId: string, payload: WebhookPayload) =>
    client.post(`${BASE}/AddMerchantWebhookConfig/${orgId}/${merchantId}`, payload),

  updateWebhookConfigById: (orgId: string, webhookConfigId: string, payload: WebhookPayload) =>
    client.post(`${BASE}/UpdateWebhookConfigById/${orgId}/${webhookConfigId}`, payload),

  deleteWebhookById: (orgId: string, webhookConfigId: string) =>
    client.delete(`${BASE}/DeleteWebhookById/${orgId}/${webhookConfigId}`),

  enableWebhookConfigById: (orgId: string, webhookConfigId: string) =>
    client.post(`${BASE}/EnableWebhookConfigById/${orgId}/${webhookConfigId}`, {}),

  disableWebhookConfigById: (orgId: string, webhookConfigId: string) =>
    client.post(`${BASE}/DisableWebhookConfigById/${orgId}/${webhookConfigId}`, {}),
}
