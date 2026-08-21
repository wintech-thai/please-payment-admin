import { client } from '@/lib/axios'

export type AuditTrack = {
  id?: string | null
  orgId?: string | null
  trackModel?: string | null
  rowId?: string | null
  actionName?: string | null
  actionRequested?: string | null
  actionBy?: string | null
  ipAddress?: string | null
  ipAddress2?: string | null
  oldValue?: string | null
  newValue?: string | null
  apiName?: string | null
  createdDate?: string | null
}

export const auditTrailApi = {
  getByRowId: (rowId: string) =>
    client.get<AuditTrack[]>(`/admin-api/AdminAuditTrail/org/global/action/GetAuditTrailByRowId/${rowId}`),
}
