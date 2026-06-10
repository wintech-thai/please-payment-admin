import { client } from '@/lib/axios'
import type {
  AgentItem,
  AgentEndpointItem,
  AgentApiKeyItem,
  GetAgentsPayload,
  AddAgentPayload,
  UpdateAgentPayload,
} from './types'

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
}
