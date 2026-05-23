import { client } from '@/lib/axios'
import type { WalletItem, PointTxItem, AddPointPayload, GetPointTxsPayload } from './types'

const BASE = '/admin-api/AdminWallet/org/global/action'

export const walletApi = {
  getWalletByMerchantId: (merchantId: string) =>
    client.get<WalletItem>(`${BASE}/GetWalletByMerchantId/${merchantId}`),

  getWalletByBankAccountId: (bankAccountId: string) =>
    client.get<WalletItem>(`${BASE}/GetWalletByBankAccountId/${bankAccountId}`),

  getPointTxsByWalletId: (orgId: string, walletId: string, payload: GetPointTxsPayload = {}) =>
    client.post<PointTxItem[]>(`${BASE}/GetPointTxsByWalletId/${orgId}/${walletId}`, payload),

  getPointTxsCountByWalletId: (orgId: string, walletId: string, payload: GetPointTxsPayload = {}) =>
    client.post<number>(`${BASE}/GetPointTxsCountByWalletId/${orgId}/${walletId}`, payload),

  addPoint: (orgId: string, walletId: string, payload: AddPointPayload) =>
    client.post(`${BASE}/AddPoint/${orgId}/${walletId}`, payload),

  deductPoint: (orgId: string, walletId: string, payload: AddPointPayload) =>
    client.post(`${BASE}/DeductPoint/${orgId}/${walletId}`, payload),
}
