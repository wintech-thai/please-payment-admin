import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminMasterRef/org/global/action'

export interface ShareholderDefinitionItem {
  name: string
  percent: number
}

export interface MasterRefItem {
  id: string
  orgId?: string | null
  code?: string | null
  description?: string | null
  definition?: string | null
  tags?: string | null
  refType?: string | null
  createdDate?: string | null
  updatedDate?: string | null
  definitionObj?: ShareholderDefinitionItem[] | null
}

export interface MVMasterRef {
  status?: string
  description?: string
  masterRef?: MasterRefItem
}

export interface AddMasterRefPayload {
  Code: string
  Description?: string
  Tags?: string
  RefType: string
  DefinitionObj?: ShareholderDefinitionItem[]
}

export interface UpdateMasterRefPayload {
  Description?: string
  Tags?: string
  DefinitionObj?: ShareholderDefinitionItem[]
}

export interface GetMasterRefsPayload {
  FullTextSearch?: string
  RefType?: string
  Page?: number
  Limit?: number
}

export const masterRefApi = {
  getMasterRefs: (payload: GetMasterRefsPayload = {}) =>
    client.post<MasterRefItem[]>(`${BASE}/GetMasterRefs`, payload),

  getMasterRefCount: (payload: GetMasterRefsPayload = {}) =>
    client.post<number>(`${BASE}/GetMasterRefCount`, payload),

  getMasterRefById: (masterRefId: string) =>
    client.get<MVMasterRef>(`${BASE}/GetMasterRefById/${masterRefId}`),

  addMasterRef: (payload: AddMasterRefPayload) =>
    client.post<MVMasterRef>(`${BASE}/AddMasterRef`, payload),

  updateMasterRefById: (masterRefId: string, payload: UpdateMasterRefPayload) =>
    client.post<MVMasterRef>(`${BASE}/UpdateMasterRefById/${masterRefId}`, payload),

  deleteMasterRefById: (masterRefId: string) =>
    client.delete(`${BASE}/DeleteMasterRefById/${masterRefId}`),
}
