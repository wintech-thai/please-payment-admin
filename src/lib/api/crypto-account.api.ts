import { client } from '@/lib/axios'
import type {
  CurrencyAccountItem,
  GetCurrencyAccountsPayload,
  AddCurrencyAccountPayload,
  UpdateCurrencyAccountPayload,
} from './types'

const BASE = '/admin-api/AdminCurrencyAccount/org/global/action'

export const cryptoAccountApi = {
  getCurrencyAccounts: (payload: GetCurrencyAccountsPayload = {}) =>
    client.post<{ currencyAccounts: CurrencyAccountItem[] }>(`${BASE}/GetCurrencyAccounts`, {
      CurrencyCategory: 'CRYPTO',
      ...payload,
    }),

  getCurrencyAccountCount: (payload: GetCurrencyAccountsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetCurrencyAccountCount`, {
      CurrencyCategory: 'CRYPTO',
      ...payload,
    }),

  getCurrencyAccountById: (id: string) =>
    client.get<{ currencyAccount: CurrencyAccountItem }>(`${BASE}/GetCurrencyAccountById/${id}`),

  addCurrencyAccount: (payload: AddCurrencyAccountPayload) =>
    client.post(`${BASE}/AddCurrencyAccount`, { CurrencyCategory: 'CRYPTO', ...payload }),

  updateCurrencyAccountById: (id: string, payload: UpdateCurrencyAccountPayload) =>
    client.post(`${BASE}/UpdateCurrencyAccountById/${id}`, payload),

  enableCurrencyAccountById: (id: string) =>
    client.post(`${BASE}/EnableCurrencyAccountById/${id}`, {}),

  disableCurrencyAccountById: (id: string) =>
    client.post(`${BASE}/DisableCurrencyAccountById/${id}`, {}),

  deleteCurrencyAccountById: (id: string) =>
    client.delete(`${BASE}/DeleteCurrencyAccountById/${id}`),
}
