import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminConfiguration/org/global/action'

export interface BrandConfigData {
  brandName?: string
  documentId?: string
  logoPath?: string
  logoMimeType?: string
  logoImageUrl?: string
  themeName?: string
}

export interface AdminConfig {
  configId?: string
  orgId?: string
  configType?: string
  status?: string   // "Enable" | "Disable"
  createdDate?: string
  brandConfig?: BrandConfigData
}

export interface PresignedUrlResponse {
  presignedUrl?: string
  objectName?: string
  documentId?: string
  url?: string
}

// "Backend" = the Admin/Merchant Next.js apps, "Api" = onix-api itself. Each side has
// its own independent Client IP Source config now — they no longer share one setting.
export type ClientIpScope = 'Backend' | 'Api'

export interface ClientIpSourceConfigData {
  sourceType?: string // Native | Header
  headerName?: string
  headerIndex?: number
}

export interface ClientIpSourceConfigResponse {
  status?: string
  description?: string
  resolvedIp?: string | null
  configuration?: {
    configId?: string
    orgId?: string
    configType?: string
    status?: string
    createdDate?: string
    clientIpSourceConfig?: ClientIpSourceConfigData
  }
}

export interface ClientIpDebugResponse {
  resolvedIp?: string | null
  note?: string
  sourceType?: string | null
  headerName?: string | null
}

export const adminConfigApi = {
  getBrandConfig: () =>
    client.get<AdminConfig>(
      `${BASE}/GetBrandConfig`,
      { headers: { Authorization: undefined } }  // public endpoint — skip auth
    ),

  setBrandConfig: (payload: AdminConfig) =>
    client.post(`${BASE}/SetBrandConfig`, payload),

  enableConfigById: (configId: string) =>
    client.post(`${BASE}/EnableConfigById/${configId}`, {}),

  disableConfigById: (configId: string) =>
    client.post(`${BASE}/DisableConfigById/${configId}`, {}),

  getLogoUploadPresignedUrl: (payload: { mimeType: string }) =>
    client.post<PresignedUrlResponse>(`${BASE}/GetBrandLogoUploadPresignedUrl`, payload),

  getClientIpSource: (scope: ClientIpScope) =>
    client.get<ClientIpSourceConfigResponse>(`${BASE}/GetClientIpSource/${scope}`),

  setClientIpSource: (scope: ClientIpScope, payload: ClientIpSourceConfigData) =>
    client.post(`${BASE}/SetClientIpSource/${scope}`, { ClientIpSourceConfig: payload }),

  // Resolved directly by this Admin app's own Next.js pod (not proxied to onix-api) —
  // lets you tell apart "ingress isn't forwarding the header to the Admin pod" from
  // "the proxy relay isn't forwarding it on to onix-api".
  getClientIpDebug: async (): Promise<ClientIpDebugResponse> => {
    const res = await fetch('/api/debug-client-ip', { cache: 'no-store' })
    return res.json()
  },
}
