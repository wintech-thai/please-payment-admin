// ─── User ───────────────────────────────────────────────────────────────────

export interface UserItem {
  adminUserId: string
  userId: string
  userName: string
  userEmail: string
  tmpUserEmail?: string | null
  userStatus: string          // "Active" | "Disabled" | "Pending" etc.
  previousUserStatus?: string | null
  createdDate?: string | null
  invitedDate?: string | null
  invitedBy?: string | null
  rolesList?: string | null   // comma-separated string e.g. "Admin,User,OWNER"
  roles?: unknown[]
  customRoleId?: string | null
  customRoleName?: string | null
  customRoleDesc?: string | null
  tags?: string | null        // comma-separated string e.g. "test,local"
  isOrgInitialUser?: string | null  // "YES" | "NO"
}

export interface GetUsersPayload {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface InviteUserPayload {
  userName: string
  userEmail: string
  tmpUserEmail: string  // API validates this field for invite
  name?: string
  lastName?: string
  phoneNumber?: string
  customRoleId?: string
  rolesList?: string   // comma-separated string e.g. "ADMIN,USER"
  tags?: string        // comma-separated string e.g. "prod,backend"
}

export interface InviteUserWithLinkPayload {
  userName: string
  userEmail: string
  tmpUserEmail: string
  customRoleId?: string
  CustomRoleId?: string  // PascalCase variant for backends that require it
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string
}

export interface UpdateUserPayload {
  name?: string
  lastName?: string
  phoneNumber?: string
  customRoleId?: string
  CustomRoleId?: string  // PascalCase variant for backends that require it
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string e.g. "prod,backend"
}

// ─── Custom Role ─────────────────────────────────────────────────────────────

export interface PermissionItem {
  controllerName: string
  apiName: string
  isAllowed: boolean
}

export interface ControllerPermissions {
  controllerName: string
  apiPermissions: PermissionItem[]
}

export interface CustomRoleItem {
  roleId: string
  orgId?: string
  roleName: string
  roleDescription?: string
  roleDefinition?: string
  tags?: string
  level?: string
  roleCreatedDate?: string
  permissions?: ControllerPermissions[]
}

export interface GetCustomRolesPayload {
  search?: string
  page?: number
  limit?: number
}

export interface AddCustomRolePayload {
  roleName: string
  roleDescription?: string
  roleDefinition?: string
  tags?: string
  level?: string
  permissions?: ControllerPermissions[]
}

export interface UpdateCustomRolePayload {
  roleName?: string
  roleDescription?: string
  roleDefinition?: string
  tags?: string
  level?: string
  permissions?: ControllerPermissions[]
}

// ─── API Key ─────────────────────────────────────────────────────────────────

export interface ApiKeyItem {
  keyId: string
  apiKey?: string | null          // key value (only on creation)
  orgId?: string
  keyName?: string | null
  keyCreatedDate?: string | null
  keyExpiredDate?: string | null
  keyDescription?: string | null
  keyStatus?: string | null       // null = active in some cases
  rolesList?: string | null       // comma-separated string
  roles?: unknown[]
  customRoleId?: string | null
  customRoleName?: string | null
  customRoleDesc?: string | null
}

export interface GetApiKeysPayload {
  search?: string
  page?: number
  limit?: number
}

export interface AddApiKeyPayload {
  keyName: string
  keyDescription?: string
  customRoleId?: string
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string e.g. "prod,backend"
}

export interface UpdateApiKeyPayload {
  keyName?: string
  keyDescription?: string
  customRoleId?: string
  CustomRoleId?: string  // PascalCase variant for backends that require it
  Roles?: string[]     // array of role names e.g. ["OWNER", "VIEWER"]
  tags?: string        // comma-separated string e.g. "prod,backend"
}

// ─── Common ──────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface CountResponse {
  count: number
}
