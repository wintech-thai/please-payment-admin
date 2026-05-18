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

// ─── Merchant ────────────────────────────────────────────────────────────────

export interface MerchantItem {
  id: string
  orgId?: string | null
  code?: string | null
  name?: string | null
  description?: string | null
  contactEmail?: string | null
  tags?: string | null
  contactPhone?: string | null
  payinFeePct?: number | null
  payoutFeePct?: number | null
  payinMinAmount?: number | null
  payinMaxAmount?: number | null
  payoutMinAmount?: number | null
  payoutMaxAmount?: number | null
  status?: string | null
  createdDate?: string | null
  payInBankAccountCount?: number | null
  payOutBankAccountCount?: number | null
}

export interface GetMerchantsPayload {
  search?: string
  page?: number
  limit?: number
  Status?: string
}

export interface AddMerchantPayload {
  OrgCustomId?: string
  OrgName?: string
  OrgDescription?: string
  OrgType?: string
  Tags?: string
  Status?: string
  Merchant?: {
    Code?: string
    Name?: string
    ContactEmail?: string
    ContactPhone?: string
    PayinFeePct?: number | string
    PayoutFeePct?: number | string
    PayinMinAmount?: number | string
    PayinMaxAmount?: number | string
    PayoutMinAmount?: number | string
    PayoutMaxAmount?: number | string
  }
}

export interface UpdateMerchantPayload {
  Code?: string
  Name?: string
  ContactEmail?: string
  ContactPhone?: string
  PayinFeePct?: number | string
  PayoutFeePct?: number | string
  PayinMinAmount?: number | string
  PayinMaxAmount?: number | string
  PayoutMinAmount?: number | string
  PayoutMaxAmount?: number | string
}

// ─── Merchant Org Users & API Keys ───────────────────────────────────────────

export interface OrgUserItem {
  orgUserId: string
  userId?: string | null
  userName?: string | null
  userEmail?: string | null
  tmpUserEmail?: string | null
  userStatus?: string | null
  tags?: string | null
  rolesList?: string | null
  roles?: unknown[]
  isOrgInitialUser?: string | null
  createdDate?: string | null
  invitedDate?: string | null
  invitedBy?: string | null
}

export interface OrgApiKeyItem {
  keyId: string
  apiKey?: string | null
  keyName?: string | null
  keyDescription?: string | null
  keyStatus?: string | null
  keyCreatedDate?: string | null
  rolesList?: string | null
  roles?: unknown[]
}

export interface InviteOrgUserPayload {
  UserName: string
  UserEmail: string
}

// ─── Bank Account ────────────────────────────────────────────────────────────

export interface BankItem {
  bankCode: string
  bankName?: string | null
  bankShortName?: string | null
  bankNameEng?: string | null
  bankNameTh?: string | null
  qrSupportFlag?: boolean | null
  type?: string | null
}

export interface BankAccountItem {
  accountId: string
  bankAccountId?: string | null
  bankCode?: string | null
  bankName?: string | null
  accountNumber?: string | null
  accountName?: string | null
  promptPayId?: string | null
  tags?: string | null
  accountType?: string | null       // "PromptPay" | "Native"
  accountCategory?: string | null   // "PayIn"
  accountLevel?: string | null      // "Global" | "Selected"
  payinMinAmount?: number | null
  payinMaxAmount?: number | null
  payoutMinAmount?: number | null
  payoutMaxAmount?: number | null
  dailyQuota?: number | null
  status?: string | null
  createdDate?: string | null
  merchantLinkCount?: number | null
}

export interface GetBankAccountsPayload {
  FullTextSearch?: string
  AccountCategory?: string
  AccountType?: string
  AccountLevel?: string
  page?: number
  limit?: number
}

export interface AddBankAccountPayload {
  BankCode?: string
  AccountNumber?: string
  AccountName?: string
  PromptPayId?: string
  Tags?: string
  AccountType?: string
  AccountCategory?: string
  AccountLevel?: string
  PayinMinAmount?: number
  PayinMaxAmount?: number
  PayoutMinAmount?: number
  PayoutMaxAmount?: number
  DailyQuota?: number
}

export interface UpdateBankAccountPayload {
  BankCode?: string
  AccountNumber?: string
  AccountName?: string
  PromptPayId?: string
  Tags?: string
  AccountType?: string
  AccountLevel?: string
  PayinMinAmount?: number
  PayinMaxAmount?: number
  PayoutMinAmount?: number
  PayoutMaxAmount?: number
  DailyQuota?: number
}

export interface BankAccountMerchantItem {
  merchantId: string
  merchantName?: string | null
  merchantCode?: string | null
  isSelected?: boolean | null
}

// ─── QR Payment ──────────────────────────────────────────────────────────────

export interface SubmitPaymentRequestPayload {
  RefId: string
  RefId1?: string
  RefId2?: string
  Description?: string
  Currency?: string
  RequestedAmount: number
  QrProvider?: string
  SelectedPayInBankAccountId?: string
}

export interface PaymentRequestResponse {
  id?: string
  referenceId?: string
  requestedAmount?: number
  generatedAmount?: number
  currency?: string
  qrCode?: string
  qrCodeImage?: string
  payInBankAccountNo?: string
  payInBankAccountName?: string
  payInBankCode?: string
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
