import { client } from '@/lib/axios'
import type {
  BankAccountItem,
  BankItem,
  GetBankAccountsPayload,
  AddBankAccountPayload,
  UpdateBankAccountPayload,
  BankAccountMerchantItem,
} from './types'

const BASE = '/admin-api/AdminBankAccount/org/global/action'

export const bankAccountApi = {
  getBankAccounts: (payload: GetBankAccountsPayload = {}) =>
    client.post<{ bankAccounts: BankAccountItem[] }>(`${BASE}/GetBankAccounts`, {
      AccountCategory: 'PayIn',
      ...payload,
    }),

  getBankAccountCount: (payload: GetBankAccountsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetBankAccountCount`, {
      AccountCategory: 'PayIn',
      ...payload,
    }),

  getBankAccountById: (id: string) =>
    client.get<{ bankAccount: BankAccountItem }>(`${BASE}/GetBankAccountById/${id}`),

  addBankAccount: (payload: AddBankAccountPayload) =>
    client.post(`${BASE}/AddBankAccount`, payload),

  updateBankAccountById: (id: string, payload: UpdateBankAccountPayload) =>
    client.post(`${BASE}/UpdateBankAccountById/${id}`, payload),

  enableBankAccountById: (id: string) =>
    client.post(`${BASE}/EnableBankAccountById/${id}`, {}),

  disableBankAccountById: (id: string) =>
    client.post(`${BASE}/DisableBankAccountById/${id}`, {}),

  deleteBankAccountById: (id: string) =>
    client.delete(`${BASE}/DeleteBankAccountById/${id}`),

  getAvailableBanks: () =>
    client.get<{ banks: BankItem[] }>(`${BASE}/GetAvailableBanks`),

  getAvailableSupportQrBanks: () =>
    client.get<{ banks: BankItem[] }>(`${BASE}/GetAvailableSupportQrBanks`),

  getMerchantsForBankAccount: (id: string) =>
    client.get<{ merchants: BankAccountMerchantItem[] }>(`${BASE}/GetMerchantsForBankAccount/${id}`),

  selectMerchant: (bankAccountId: string, merchantId: string) =>
    client.post(`${BASE}/SelectMerchantById/${bankAccountId}/${merchantId}`, {}),

  unselectMerchant: (bankAccountId: string, merchantId: string) =>
    client.post(`${BASE}/UnSelectMerchantById/${bankAccountId}/${merchantId}`, {}),
}
