import { client } from '@/lib/axios'
import type {
  AgentItem,
  AgentEndpointItem,
  AgentApiKeyItem,
  AgentEventItem,
  GetAgentsPayload,
  GetAgentEventsPayload,
  AddAgentPayload,
  UpdateAgentPayload,
} from './types'


export interface AgentEventTimeSeriesPayload {
  FromDate?: string
  ToDate?: string
  Channel?: string
  EventType?: string
  FullTextSearch?: string
}

export interface AgentEventTimeSeriesItem {
  time: string
  eventType: string
  count: number
}

const BASE = '/admin-api/AdminAgent/org/global/action'

export const agentApi = {
  getAgents: (payload: GetAgentsPayload = {}) =>
    client.post<{ agents: AgentItem[] }>(`${BASE}/GetAgents`, payload),

  getAgentCount: (payload: GetAgentsPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetAgentCount`, payload),

  getAgentById: (agentId: string) =>
    client.get<{ agent: AgentItem }>(`${BASE}/GetAgentById/${agentId}`),

  addAgent: (payload: AddAgentPayload) =>
    client.post<{ agent: AgentItem }>(`${BASE}/AddAgent`, payload),

  updateAgentById: (agentId: string, payload: UpdateAgentPayload) =>
    client.post(`${BASE}/UpdateAgentById/${agentId}`, payload),

  deleteAgentById: (agentId: string) =>
    client.delete(`${BASE}/DeleteAgentById/${agentId}`),

  getAgentEndPoints: (agentId: string) =>
    client.get<AgentEndpointItem>(`${BASE}/GetAgentEndPoints/${agentId}`),

  getAgentApiKeys: (agentId: string) =>
    client.get<{ apiKeys: AgentApiKeyItem[] }>(`${BASE}/GetAgentApiKeys/${agentId}`),

  createAgentApiKey: (agentId: string) =>
    client.post<{ apiKey: AgentApiKeyItem }>(`${BASE}/CreateAgentApiKey/${agentId}`, {}),

  disableAgentApiKey: (keyId: string) =>
    client.post(`/admin-api/AdminApiKey/org/global/action/DisableApiKeyById/${keyId}`, {}),

  enableAgentApiKey: (keyId: string) =>
    client.post(`/admin-api/AdminApiKey/org/global/action/EnableApiKeyById/${keyId}`, {}),

  deleteAgentApiKey: (keyId: string) =>
    client.delete(`/admin-api/AdminApiKey/org/global/action/DeleteApiKeyById/${keyId}`),

  getAgentEvents: (agentId: string, payload: GetAgentEventsPayload = {}) =>
    client.post<{ events: AgentEventItem[] }>(`${BASE}/GetAgentEvents/${agentId}`, payload),

  getAgentEventCount: (agentId: string, payload: GetAgentEventsPayload = {}) =>
    client.post<number>(`${BASE}/GetAgentEventCount/${agentId}`, payload),

  getAgentEventById: (eventId: string) =>
    client.get(`${BASE}/GetAgentEventById/${eventId}`),

  getAgentEventTimeSeries: (agentId: string, payload: AgentEventTimeSeriesPayload = {}) =>
    client.post<AgentEventTimeSeriesItem[]>(`${BASE}/GetAgentEventTimeSeries/${agentId}`, payload),

  addLineApiAgent: (payload: AddAgentPayload) =>
    client.post<{ agent: AgentItem }>(`${BASE}/AddLineApiAgent`, payload),

  restartLineApiAgentById: (agentId: string) =>
    client.post(`${BASE}/RestartLineApiAgentById/${agentId}`, {}),

  reloadLineApiAgentById: (agentId: string) =>
    client.post(`${BASE}/ReloadLineApiAgentById/${agentId}`, {}),

  getLineApiAgentStatus: (agentId: string) =>
    client.get<{ ok?: boolean; podStatus?: string; login?: string; raw?: string }>(`${BASE}/GetLineApiAgentStatus/${agentId}`),

  getLineApiAgentLoginQr: (agentId: string) =>
    client.get<{ ok?: boolean; state?: string; qrUrl?: string; error?: string }>(`${BASE}/GetLineApiAgentLoginQR/${agentId}`),

  getLineApiAgentLoginStatus: (agentId: string) =>
    client.get<{ ok?: boolean; state?: string; pincode?: string; error?: string }>(`${BASE}/GetLineApiAgentLoginStatus/${agentId}`),
}
