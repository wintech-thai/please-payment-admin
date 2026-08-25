import { client } from '@/lib/axios'

export type AuditNotice = {
  id?: string | null
  orgId?: string | null
  trackModel?: string | null
  rowId?: string | null
  message?: string | null
  createdDate?: string | null
}

export const auditNoticeApi = {
  getByRowId: (rowId: string) =>
    client.get<AuditNotice[]>(`/admin-api/AdminAuditNotice/org/global/action/GetAuditNoticesByRowId/${rowId}`),
}
