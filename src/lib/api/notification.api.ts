import { client } from '@/lib/axios'

const BASE = '/admin-api/AdminNotiChannel/org/global/action'

export const notificationApi = {
  getChannels: (payload: { FullTextSearch?: string; Status?: string; Page?: number; Limit?: number } = {}) =>
    client.post(`${BASE}/GetNotiChannels`, payload),

  getChannelCount: (payload: { FullTextSearch?: string; Status?: string } = {}) =>
    client.post(`${BASE}/GetNotiChannelCount`, payload),

  getChannelById: (id: string) =>
    client.get(`${BASE}/GetNotiChannelById/${id}`),

  getChannelTypes: () =>
    client.get(`${BASE}/GetChannelTypes`),

  getEventTypes: () =>
    client.get(`${BASE}/GetEventTypes`),

  addChannel: (payload: {
    ChannelName: string
    Description?: string
    Type: string
    Status?: string
    TelegramWebhookUrl?: string
    TelegramChatId?: string
    DiscordWebhookUrl?: string
    EventTypes?: string[]
  }) => client.post(`${BASE}/AddNotiChannel`, payload),

  updateChannelById: (id: string, payload: {
    ChannelName?: string
    Description?: string
    TelegramWebhookUrl?: string
    TelegramChatId?: string
    DiscordWebhookUrl?: string
    EventTypes?: string[]
  }) => client.post(`${BASE}/UpdateNotiChannelById/${id}`, payload),

  enableChannelById: (id: string) =>
    client.post(`${BASE}/EnableNotiChannelById/${id}`, {}),

  disableChannelById: (id: string) =>
    client.post(`${BASE}/DisableNotiChannelById/${id}`, {}),

  deleteChannelById: (id: string) =>
    client.delete(`${BASE}/DeleteNotiChannelById/${id}`),

  getEvents: (payload: { FullTextSearch?: string; Status?: string; FromDate?: string; ToDate?: string; Page?: number; Limit?: number } = {}) =>
    client.post(`${BASE}/GetNotiEvents`, payload),

  getEventCount: (payload: { FullTextSearch?: string; Status?: string; FromDate?: string; ToDate?: string } = {}) =>
    client.post(`${BASE}/GetNotiEventCount`, payload),

  getEventById: (id: string) =>
    client.get(`${BASE}/GetNotiEventById/${id}`),
}
