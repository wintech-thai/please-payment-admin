import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminRiskPolicy/org/global/action'

export interface RiskPolicyItem {
  id: string
  orgId?: string | null
  name?: string | null
  description?: string | null
  tags?: string | null
  status?: string | null
  allowBlankPayerName: boolean
  allowUnknownPayerName: boolean
  allowSuspiciousPayerName: boolean
  allowMaliciousPayerName: boolean
  createdDate?: string | null
}

export interface MVRiskPolicy {
  status?: string
  description?: string
  riskPolicy?: RiskPolicyItem
}

export interface GetRiskPoliciesPayload {
  FullTextSearch?: string
  Status?: string
  FromDate?: string
  ToDate?: string
  Offset?: number
  Limit?: number
}

export interface AddRiskPolicyPayload {
  Name: string
  Description?: string
  Tags?: string
  Status?: string
  AllowBlankPayerName?: boolean
  AllowUnknownPayerName?: boolean
  AllowSuspiciousPayerName?: boolean
  AllowMaliciousPayerName?: boolean
}

export interface UpdateRiskPolicyPayload {
  Name: string
  Description?: string
  Tags?: string
  AllowBlankPayerName?: boolean
  AllowUnknownPayerName?: boolean
  AllowSuspiciousPayerName?: boolean
  AllowMaliciousPayerName?: boolean
}

export const riskPolicyApi = {
  getRiskPolicies: (payload: GetRiskPoliciesPayload = {}) =>
    client.post<RiskPolicyItem[]>(`${BASE}/GetRiskPolicies`, payload),

  getRiskPolicyCount: (payload: GetRiskPoliciesPayload = {}) =>
    client.post<number>(`${BASE}/GetRiskPolicyCount`, payload),

  getRiskPolicyById: (riskPolicyId: string) =>
    client.get<MVRiskPolicy>(`${BASE}/GetRiskPolicyById/${riskPolicyId}`),

  addRiskPolicy: (payload: AddRiskPolicyPayload) =>
    client.post<MVRiskPolicy>(`${BASE}/AddRiskPolicy`, payload),

  updateRiskPolicyById: (riskPolicyId: string, payload: UpdateRiskPolicyPayload) =>
    client.post<MVRiskPolicy>(`${BASE}/UpdateRiskPolicyById/${riskPolicyId}`, payload),

  enableRiskPolicyById: (riskPolicyId: string) =>
    client.post<MVRiskPolicy>(`${BASE}/EnableRiskPolicyById/${riskPolicyId}`, {}),

  disableRiskPolicyById: (riskPolicyId: string) =>
    client.post<MVRiskPolicy>(`${BASE}/DisableRiskPolicyById/${riskPolicyId}`, {}),

  deleteRiskPolicyById: (riskPolicyId: string) =>
    client.delete(`${BASE}/DeleteRiskPolicyById/${riskPolicyId}`),
}
