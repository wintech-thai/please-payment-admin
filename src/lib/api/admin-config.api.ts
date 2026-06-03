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
}
