import { client } from '@/lib/axios'
import type {
  AvailableCurrencyItem,
  MerchantCurrencyItem,
  MerchantCurrencyResponse,
  AddMerchantCurrencyPayload,
  UpdateMerchantCurrencyPayload,
} from './types'

const BASE = '/admin-api/AdminMerchantCurrency/org/global/action'

export const currencyApi = {
  getAvailableFiatCurrencies: () =>
    client.get<AvailableCurrencyItem[]>(`${BASE}/GetAvailableFiatCurrencies`),

  getAvailableCryptoCurrencies: () =>
    client.get<AvailableCurrencyItem[]>(`${BASE}/GetAvailableCryptoCurrencies`),

  getCurrenciesByMerchantId: (merchantId: string) =>
    client.get<MerchantCurrencyItem[]>(`${BASE}/GetCurrenciesByMerchantId/${merchantId}`),

  getCurrencyById: (merchantCurrencyId: string) =>
    client.get<MerchantCurrencyResponse>(`${BASE}/GetMerchantCurrencyById/${merchantCurrencyId}`),

  addCurrency: (payload: AddMerchantCurrencyPayload) =>
    client.post<MerchantCurrencyResponse>(`${BASE}/AddMerchantCurrency`, payload),

  updateCurrencyById: (merchantCurrencyId: string, payload: UpdateMerchantCurrencyPayload) =>
    client.post<MerchantCurrencyResponse>(`${BASE}/UpdateMerchantCurrencyById/${merchantCurrencyId}`, payload),

  enableCurrency: (merchantCurrencyId: string) =>
    client.post<MerchantCurrencyResponse>(`${BASE}/EnableMerchantCurrency/${merchantCurrencyId}`, {}),

  disableCurrency: (merchantCurrencyId: string) =>
    client.post<MerchantCurrencyResponse>(`${BASE}/DisableMerchantCurrency/${merchantCurrencyId}`, {}),
}
