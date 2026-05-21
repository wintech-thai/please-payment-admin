import { client } from '@/lib/axios'
import type { WalletItem, PointTxItem, AddPointPayload, GetPointTxsPayload } from './types'

const BASE = '/admin-api/AdminWallet/org/global/action'

export const walletApi = {
  getWalletByMerchantId: (merchantId: string) =>
    client.get<WalletItem>(`${BASE}/GetWalletByMerchantId/${merchantId}`),

  getPointTxsByWalletId: (orgId: string, merchantId: string, payload: GetPointTxsPayload = {}) =>
    client.post<PointTxItem[]>(`${BASE}/GetPointTxsByWalletId/${orgId}/${merchantId}`, payload),

  getPointTxsCountByWalletId: (orgId: string, merchantId: string, payload: GetPointTxsPayload = {}) =>
    client.post<number>(`${BASE}/GetPointTxsCountByWalletId/${orgId}/${merchantId}`, payload),

  addPoint: (orgId: string, merchantId: string, payload: AddPointPayload) =>
    client.post(`${BASE}/AddPoint/${orgId}/${merchantId}`, payload),

  deductPoint: (orgId: string, merchantId: string, payload: AddPointPayload) =>
    client.post(`${BASE}/DeductPoint/${orgId}/${merchantId}`, payload),
}
