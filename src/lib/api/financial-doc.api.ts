import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminFinancialDoc/org/global/action'

export interface FinancialDocLineItem {
  code?: string | null
  label?: string | null
  amount?: number | null
  percent?: number | null
  expenseDate?: string | null
}

export interface FinancialDocItem {
  id: string
  orgId?: string | null
  documentNo?: string | null
  description?: string | null
  tags?: string | null
  fromDate?: string | null
  toDate?: string | null
  totalRevenue?: number | null
  totalExpense?: number | null
  profitLoss?: number | null
  createdDate?: string | null
  expenseItemsArr?: FinancialDocLineItem[] | null
  revenueItemsArr?: FinancialDocLineItem[] | null
  sharingItemsArr?: FinancialDocLineItem[] | null
}

export interface MVFinancialDoc {
  status?: string
  description?: string
  financialDoc?: FinancialDocItem
}

export interface AddFinancialDocPayload {
  DocumentNo?: string
  Description?: string
  Tags?: string
  FromDate: string
  ToDate: string
  ExpenseItemsArr?: FinancialDocLineItem[]
  RevenueItemsArr?: FinancialDocLineItem[]
  SharingItemsArr?: FinancialDocLineItem[]
}

export type UpdateFinancialDocPayload = AddFinancialDocPayload

export interface GetFinancialDocsPayload {
  FullTextSearch?: string
  FromDate?: string
  ToDate?: string
  Page?: number
  Limit?: number
}

export interface RevenueSummaryResult {
  totalPayInAmount?: number
  totalPayOutAmount?: number
  totalPayInFee?: number
  totalPayOutFee?: number
  totalPayInCount?: number
  totalPayOutCount?: number
}

export interface CalculateRevenuePayload {
  FromDate: string
  ToDate: string
}

export const financialDocApi = {
  getFinancialDocs: (payload: GetFinancialDocsPayload = {}) =>
    client.post<FinancialDocItem[]>(`${BASE}/GetFinancialDocs`, payload),

  getFinancialDocCount: (payload: GetFinancialDocsPayload = {}) =>
    client.post<number>(`${BASE}/GetFinancialDocCount`, payload),

  getFinancialDocById: (financialDocId: string) =>
    client.get<MVFinancialDoc>(`${BASE}/GetFinancialDocById/${financialDocId}`),

  addFinancialDoc: (payload: AddFinancialDocPayload) =>
    client.post<MVFinancialDoc>(`${BASE}/AddFinancialDoc`, payload),

  updateFinancialDocById: (financialDocId: string, payload: UpdateFinancialDocPayload) =>
    client.post<MVFinancialDoc>(`${BASE}/UpdateFinancialDocById/${financialDocId}`, payload),

  deleteFinancialDocById: (financialDocId: string) =>
    client.delete(`${BASE}/DeleteFinancialDocById/${financialDocId}`),

  calculateRevenue: (payload: CalculateRevenuePayload) =>
    client.post<RevenueSummaryResult>(`${BASE}/CalculateRevenue`, payload),
}
