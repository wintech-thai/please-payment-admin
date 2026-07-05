import { client } from '@/lib/axios'

export interface SupportCaseItem {
  id?: string
  orgId?: string
  ref?: string
  subject?: string
  priority?: string
  status?: string
  description?: string
  createdBy?: string
  createdDate?: string
  updatedBy?: string
  updatedDate?: string
  closedBy?: string
  closedDate?: string
}

export interface SupportCaseCommentItem {
  id?: string
  caseId?: string
  orgId?: string
  content?: string
  authorType?: string
  createdBy?: string
  createdDate?: string
  updatedBy?: string
  updatedDate?: string
}

export interface GetCasesPayload {
  FullTextSearch?: string
  Status?: string
  Priority?: string
  OrgIdFilter?: string
  Limit?: number
  Offset?: number
  FromDate?: string
  ToDate?: string
}

const BASE = '/admin-api/AdminCaseManagement/org/global/action'

export const supportCaseApi = {
  getCases: (payload: GetCasesPayload = {}) =>
    client.post<SupportCaseItem[]>(`${BASE}/GetCases`, payload),

  getCaseCount: (payload: GetCasesPayload = {}) =>
    client.post<number>(`${BASE}/GetCaseCount`, payload),

  getCaseById: (caseId: string) =>
    client.get<{ status: string; description: string; caseManagement: SupportCaseItem }>(`${BASE}/GetCaseById/${caseId}`),

  updateCaseStatus: (caseId: string, status: string) =>
    client.post(`${BASE}/UpdateCaseStatus/${caseId}/${status}`, {}),

  addComment: (caseId: string, content: string) =>
    client.post(`${BASE}/AddComment/${caseId}`, { Content: content }),

  getComments: (caseId: string) =>
    client.get<{ status: string; comments: SupportCaseCommentItem[] }>(`${BASE}/GetComments/${caseId}`),
}
