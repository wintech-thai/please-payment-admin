---
title: Endpoints
---

# Endpoints

系统为商户提供 2 个接口

> **orgId** 和 **merchantId** 会在申请开通服务时由服务提供商颁发，无需自行创建

---

## 创建收款请求（Pay-In）

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}
```

创建 Payment Request 并返回 QR Code，供客户扫描并将资金直接转入商户账户。

### Request Body

| Field | Type | Required | 说明 |
|---|---|---|---|
| `RefId1` | string | ✅ | 商户提供的 Reference ID（必须唯一） |
| `RefId2` | string | ❌ | 附加参考字段 2 |
| `RefId3` | string | ❌ | 附加参考字段 3 |
| `PayerName` | string | ✅ | 付款人姓名 |
| `RequestedAmount` | number | ✅ | 金额（必须大于 0，且在商户设定的范围内） |
| `Currency` | string | ✅ | 货币 —— 目前仅支持 `THB` |
| `QrProvider` | string | ✅ | 发行 QR 的银行 —— `PP`（PromptPay）或 `SCB` |
| `Description` | string | ❌ | 交易说明 |
| `CustomerEmail` | string | ❌ | 客户邮箱 |
| `CustomerPhone` | string | ❌ | 客户电话号码 |
| `Tags` | string | ❌ | 用于分组交易的标签 |

### 请求示例

```json
{
  "RefId1": "ORDER-20260701-001",
  "PayerName": "Somchai Jaidee",
  "RequestedAmount": 325,
  "Currency": "THB",
  "QrProvider": "PP",
  "Description": "商品付款",
  "RefId2": "CUST-12345"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "data": {
    "Id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "SessionId": "session-abc123",
    "Type": "PayIn",
    "Status": "Pending",
    "RequestedAmount": 325.00,
    "GeneratedAmount": 325.52,
    "Currency": "THB",
    "QrCode": "00020101021...",
    "QrCodeImage": "data:image/png;base64,...",
    "PaymentUrl": "https://...",
    "WebsocketPath": "/realtime/payment-tx",
    "CreatedAt": "2026-07-01T10:00:00Z",
    "ExpireAt": "2026-07-01T10:15:00Z",
    "PayInBankCode": "SCB",
    "PayInBankAccountNo": "xxx-xxxxx-x",
    "PayInBankAccountName": "公司名称",
    "PayInPromptPayId": null,
    "SlipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-..."
  }
}
```

### Response Fields

| Field | 说明 |
|---|---|
| `Id` | Payment Request 的 UUID —— 请保存以便查询 |
| `Status` | 当前状态（参见[支付状态](/documents/payment-status)） |
| `RequestedAmount` | 请求的金额 |
| `GeneratedAmount` | 实际应支付的金额（可能包含随机小数以便匹配） |
| `IsQrAvailable` | `true` 表示 QR Code 已就绪，可供客户扫描；`false` 表示目标账户不支持 QR（例如未绑定 PromptPay）—— 详见下文 |
| `QrCodeImage` | Base64 格式的 QR Code 图片 —— 可直接在 App 中显示（当 `IsQrAvailable` 为 `false` 时为空） |
| `PayInBankCode` | 目标银行代码 |
| `PayInBankAccountNo` | 目标账号 |
| `PayInBankAccountName` | 目标账户名称 |
| `PayInPromptPayId` | 目标 PromptPay 号码（如有） |
| `SessionId` | 用于通过 WebSocket 连接以接收实时状态 |
| `WebsocketPath` | WebSocket 的路径（`/realtime/payment-tx`） |
| `ExpireAt` | QR Code 的过期时间 |
| `SlipUploadUrl` | 回单上传页面的相对路径 —— 不含域名前缀，需自行拼接 `{{MERCHANT_URL}}`（详见下文说明）以生成完整 URL，再提供给客户打开回单上传页面，无需登录 |

> **重要 —— 应拼接哪个域名：** `SlipUploadUrl` 仅为相对路径，需自行拼接 `{{MERCHANT_URL}}` 域名。例如若 `SlipUploadUrl` 为 `/payin-slip-upload/org123/xxx/yyy`，则完整 URL 应为 `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy`

### QR 与账户信息的展示方式

**展示前应始终先检查 `IsQrAvailable`：**

| 场景 | 展示方式 |
|---|---|
| `IsQrAvailable = true` | 照常展示 `QrCodeImage` 中的 QR Code 供客户扫描 |
| `IsQrAvailable = false` | 没有 QR Code —— 展示账户信息（`PayInBankCode`、`PayInBankAccountNo`、`PayInBankAccountName`、`PayInPromptPayId`）供客户自行填写转账信息 |

> **提示：** 建议始终将账户信息（`PayInBankCode`、`PayInBankAccountNo`、`PayInBankAccountName`、`PayInPromptPayId`）与 QR Code 一并展示 —— 部分客户即使有 QR Code 也可能希望手动转账

> **建议：** 将 `SlipUploadUrl` 生成为 **QR Code** 并展示在支付页面中 —— 客户用手机摄像头扫描后即可直接打开回单上传页面，无需手动输入 URL。适用于**普通 Pay-In** 和 **Pay-In P2P**

### 回单上传页面

当客户打开 Slip Upload URL 时，会看到该 Payment Request 对应的回单上传页面，具有以下功能：

- **上传回单图片** —— 从手机相机或相册中选择图片
- **回单参考号** —— 输入回单参考号（字母数字）的前 4 位和后 4 位，用于匹配及重复检测
- **备注** —— 可选的附加说明字段
- **重复回单检测** —— 若系统中已存在相同参考号的回单，会自动发出警告

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:sans-serif;background:#fff">
  <!-- header -->
  <div style="background:linear-gradient(135deg,#0d7a6e,#14b8a6);padding:18px 20px;display:flex;align-items:center;gap:12px">
    <div style="width:38px;height:38px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
    </div>
    <div>
      <div style="color:#fff;font-weight:700;font-size:15px">Upload Payment Slip</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px">上传转账回单</div>
    </div>
  </div>
  <!-- body -->
  <div style="padding:20px;background:#f8f9fa">
    <p style="text-align:center;color:#555;font-size:13px;margin:0 0 14px">Select a payment slip image to upload</p>
    <!-- drop zone -->
    <div style="border:2px dashed #cdd5e0;border-radius:12px;padding:36px 20px;text-align:center;background:#fff;margin-bottom:16px">
      <div style="width:44px;height:44px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#0d7a6e" stroke-width="2"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg>
      </div>
      <div style="font-weight:600;color:#222;font-size:14px">Tap to select image</div>
      <div style="color:#999;font-size:12px;margin-top:4px">JPG, PNG, WebP</div>
    </div>
    <!-- slip reference -->
    <div style="margin-bottom:14px">
      <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:8px">Slip Reference <span style="color:#888;font-weight:400">(Optional)</span></label>
      <div style="display:flex;align-items:center;gap:8px">
        <input readonly value="A1B2" style="flex:1;padding:10px 12px;border:1px solid #dde2ea;border-radius:8px;font-size:14px;color:#aaa;background:#fff;text-align:center;outline:none" />
        <span style="color:#aaa;font-weight:600">—</span>
        <input readonly value="C3D4" style="flex:1;padding:10px 12px;border:1px solid #dde2ea;border-radius:8px;font-size:14px;color:#aaa;background:#fff;text-align:center;outline:none" />
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:11px;color:#999">First 4 digits</span>
        <span style="font-size:11px;color:#999">Last 4 digits</span>
      </div>
    </div>
    <!-- note -->
    <div style="margin-bottom:16px">
      <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:8px">Note <span style="color:#888;font-weight:400">(Optional)</span></label>
      <textarea readonly rows="2" placeholder="Additional notes" style="width:100%;padding:10px 12px;border:1px solid #dde2ea;border-radius:8px;font-size:13px;color:#aaa;background:#fff;resize:none;outline:none;box-sizing:border-box"></textarea>
    </div>
    <!-- button -->
    <button disabled style="width:100%;padding:13px;background:#b0bec5;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:not-allowed">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg>
      Upload Slip
    </button>
  </div>
  <!-- dup warning -->
  <div style="margin:0 20px 20px;background:#fff3cd;border:1px solid #ffc107;border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px">
    <span style="font-size:16px;line-height:1">⚠️</span>
    <div>
      <div style="font-size:13px;font-weight:700;color:#856404">发现重复回单！</div>
      <div style="font-size:12px;color:#856404;margin-top:2px">若发现相同参考号，系统会显示警告，并提供<strong>继续上传</strong>或<strong>取消</strong>的选项</div>
    </div>
  </div>
</div>
</div>

> 客户无需登录即可使用此页面 —— URL 中已内嵌 token，并在 24 小时后过期

> 即使 HTTP status code 为 `200`，仍需检查 response body 中的 `status` 字段 —— 若为 `"OK"` 则表示成功，其他值表示出现错误（参见[错误处理](/documents/error-handling)）

---

## 创建 P2P 收款请求（Pay-In P2P）

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequestP2P/{merchantId}
```

创建 **Peer-to-Peer（P2P）** 类型的 Pay-In Request —— 系统会自动将其与待处理的 Pay-Out Request 匹配，并让客户将资金直接转入收款方账户（而不是通过系统的 QR Code 转账）。

> **什么是 P2P？** 与资金先进入商户账户再转出不同，P2P 让付款人直接转账给收款人 —— 系统负责匹配与确认交易。

### Request Body

| Field | Type | Required | 说明 |
|---|---|---|---|
| `RefId1` | string | ✅ | 商户提供的 Reference ID（必须唯一） |
| `RefId2` | string | ❌ | 附加参考字段 2 |
| `RefId3` | string | ❌ | 附加参考字段 3 |
| `PayerName` | string | ✅ | 付款人姓名 |
| `RequestedAmount` | number | ✅ | 金额（必须大于 0，且在商户设定的范围内） |
| `Currency` | string | ✅ | 货币 —— 目前仅支持 `THB` |
| `QrProvider` | string | ✅ | `PP` 或 `SCB`（系统内部用于匹配） |
| `Description` | string | ❌ | 交易说明 |

### 请求示例

```json
{
  "RefId1": "P2P-ORDER-20260701-001",
  "PayerName": "Somchai Jaidee",
  "RequestedAmount": 1000,
  "Currency": "THB",
  "QrProvider": "PP"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "data": {
    "Id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "Type": "PayIn",
    "Status": "Pending",
    "RequestedAmount": 1000.00,
    "GeneratedAmount": 1000.00,
    "Currency": "THB",
    "QrCode": null,
    "QrCodeImage": "",
    "PayInBankCode": "KBANK",
    "PayInBankAccountNo": "012-3-45678-9",
    "PayInBankAccountName": "收款方账户名称",
    "PayInPromptPayId": "0812345678",
    "SlipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-..."
  }
}
```

### 与普通 Pay-In 的区别

| | 普通 Pay-In | Pay-In P2P |
|---|---|---|
| `IsQrAvailable` | `true`（多数情况） | `false`（多数情况）—— P2P 账户通常未绑定 PromptPay |
| `QrCodeImage` | QR Code 图片 | 当 `IsQrAvailable = false` 时为空（`""`） |
| `PayInBankAccountName` | 商户账户 | 收款方账户（来自匹配的 Pay-Out Request） |
| 转账方式 | 扫描 QR Code | 直接转账至 response 中指定的账户（需自行填写账户信息） |
| `SlipUploadUrl` | ✅ | ✅（非常重要 —— 客户必须上传回单作为凭证） |

> **重要：** 对于 P2P —— `IsQrAvailable` 通常为 `false`，因为目标账户可能未绑定 PromptPay。此时**必须展示账户信息**（`PayInBankCode`、`PayInBankAccountNo`、`PayInBankAccountName`、`PayInPromptPayId`），以便客户自行填写转账，同时展示 `SlipUploadUrl` 以便上传转账凭证。

> **重要 —— 应拼接哪个域名：** `SlipUploadUrl` 与普通 Pay-In 一样为相对路径，需自行拼接 `{{MERCHANT_URL}}`，例如 `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy`（完整说明参见上文 [Response Fields](#response-fields)）

> **建议：** 将 `SlipUploadUrl` 生成为 **QR Code**，与目标账户信息一并展示 —— 客户转账后扫描 QR 即可直接打开回单上传页面，无需手动输入 URL（示例参见上方回单上传页面）

> **错误 `ERROR_NO_P2P_ACCOUNT_MATCH`：** 若系统中没有待处理的 Pay-Out Request，将返回此错误 —— 表示当前没有可匹配的交易。

---

## 创建付款请求（Pay-Out）

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayOutRequest/{merchantId}
```

创建将资金转出至目标账户的请求。

### Request Body

| Field | Type | Required | 说明 |
|---|---|---|---|
| `RefId1` | string | ✅ | 商户提供的 Reference ID（必须唯一） |
| `RefId2` | string | ❌ | 附加参考字段 2 |
| `RefId3` | string | ❌ | 附加参考字段 3 |
| `RequestedAmount` | number | ✅ | 金额（必须大于 0） |
| `QrProvider` | string | ✅ | 必须为 `PP`（Pay-Out 仅支持 PromptPay） |
| `BankCode` | string | ❌ | 目标银行代码，例如 `SCB`、`KBANK`、`BAY` |
| `BankAccountNo` | string | ❌ | 目标账号 |
| `BankAccountName` | string | ❌ | 目标账户名称 |
| `PromptPayId` | string | ❌ | 目标 PromptPay 号码 |
| `AccountType` | string | ❌ | 账户类型：`Native` 或 `PromptPay` |

> 目标账户信息：可发送 `PayinBankAccountId`（系统中的 ID），或发送 `BankCode`+`BankAccountNo`+`BankAccountName`，或 `PromptPayId`+`AccountType` 其中一种

> **建议：** 若已知目标账户的 PromptPay 号码，建议一并发送 `PromptPayId` —— 通过 PromptPay 转账可让系统处理更快，收款方也能更快收到款项

### 请求示例（银行账户转账）

```json
{
  "RefId1": "PAYOUT-20260701-001",
  "RequestedAmount": 500,
  "QrProvider": "PP",
  "BankCode": "KBANK",
  "BankAccountNo": "0123456789",
  "BankAccountName": "Somchai Jaidee",
  "AccountType": "Native"
}
```

### 请求示例（PromptPay 转账）

```json
{
  "RefId1": "PAYOUT-20260701-002",
  "RequestedAmount": 200,
  "QrProvider": "PP",
  "PromptPayId": "0812345678",
  "AccountType": "PromptPay"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "data": {
    "Id": "7bc95f12-3a21-4f89-c4ed-1d852a77bfc8",
    "Type": "PayOut",
    "Status": "Pending",
    "RequestedAmount": 500.00,
    "Currency": "THB",
    "CreatedAt": "2026-07-01T10:05:00Z"
  }
}
```
