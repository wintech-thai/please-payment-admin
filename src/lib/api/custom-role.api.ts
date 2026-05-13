import { client } from '@/lib/axios'
import type {
  CustomRoleItem,
  GetCustomRolesPayload,
  AddCustomRolePayload,
  UpdateCustomRolePayload,
  ControllerPermissions,
} from './types'

const BASE = '/admin-api/AdminCustomRole/org/global/action'

export const customRoleApi = {
  getCustomRoles: (payload: GetCustomRolesPayload = {}) =>
    client.post<{ customRoles: CustomRoleItem[] }>(`${BASE}/GetCustomRoles`, payload),

  getCustomRoleCount: (payload: GetCustomRolesPayload = {}) =>
    client.post<{ count: number }>(`${BASE}/GetCustomRoleCount`, payload),

  getCustomRoleById: (customRoleId: string) =>
    client.get<{ customRole: CustomRoleItem }>(`${BASE}/GetCustomRoleById/${customRoleId}`),

  getInitialUserRolePermissions: () =>
    client.get<{ permissions: ControllerPermissions[] }>(`${BASE}/GetInitialUserRolePermissions`),

  addCustomRole: (payload: AddCustomRolePayload) =>
    client.post(`${BASE}/AddCustomRole`, payload),

  updateCustomRoleById: (customRoleId: string, payload: UpdateCustomRolePayload) =>
    client.post(`${BASE}/UpdateCustomRoleById/${customRoleId}`, payload),

  deleteCustomRoleById: (customRoleId: string) =>
    client.delete(`${BASE}/DeleteCustomRoleById/${customRoleId}`),
}
