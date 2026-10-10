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
  "paymentResponse": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sessionId": "session-abc123",
    "type": "PayIn",
    "status": "Pending",
    "requestedAmount": 325.00,
    "generatedAmount": 325.52,
    "currency": "THB",
    "qrCode": "00020101021...",
    "qrCodeImage": "data:image/png;base64,...",
    "paymentUrl": "https://...",
    "websocketPath": "/realtime/payment-tx",
    "createdAt": "2026-07-01T10:00:00Z",
    "expireAt": "2026-07-01T10:15:00Z",
    "isQrAvailable": true,
    "payInBankCode": "SCB",
    "payInBankAccountNo": "xxx-xxxxx-x",
    "payInBankAccountName": "公司名称",
    "payInPromptPayId": null,
    "slipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-...",
    "paymentStatusUrl": "/payin-status/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/e5f6a7b8-..."
  }
}
```

### Response Fields

| Field | 说明 |
|---|---|
| `id` | Payment Request 的 UUID —— 请保存以便查询 |
| `status` | 当前状态（参见[支付状态](/documents/payment-status)） |
| `requestedAmount` | 请求的金额 |
| `generatedAmount` | 实际应支付的金额（可能包含随机小数以便匹配） |
| `isQrAvailable` | `true` 表示 QR Code 已就绪，可供客户扫描；`false` 表示目标账户不支持 QR（例如未绑定 PromptPay）—— 详见下文 |
| `qrCodeImage` | Base64 格式的 QR Code 图片 —— 可直接在 App 中显示（当 `isQrAvailable` 为 `false` 时为空） |
| `payInBankCode` | 目标银行代码 |
| `payInBankAccountNo` | 目标账号 |
| `payInBankAccountName` | 目标账户名称 |
| `payInPromptPayId` | 目标 PromptPay 号码（如有） |
| `sessionId` | 用于通过 WebSocket 连接以接收实时状态 |
| `websocketPath` | WebSocket 的路径（`/realtime/payment-tx`） |
| `expireAt` | QR Code 的过期时间 |
| `slipUploadUrl` | 回单上传页面的相对路径 —— 不含域名前缀，需自行拼接 `{{MERCHANT_URL}}`（详见下文说明）以生成完整 URL，再提供给客户打开回单上传页面，无需登录 |
| `paymentStatusUrl` | 支付状态页面的相对路径 —— 与 `slipUploadUrl` 一样为相对路径，同样需拼接 `{{MERCHANT_URL}}`。该页面无需登录，并**沿用此笔 Payment Request 原本的 QR Code**（不会重新生成）。适合用于客户已取得 QR 但忘记扫描，或已扫描但想查看状态的情况 |

> **重要 —— 应拼接哪个域名：** `slipUploadUrl` 与 `paymentStatusUrl` 仅为相对路径，需自行拼接 `{{MERCHANT_URL}}` 域名。例如若 `slipUploadUrl` 为 `/payin-slip-upload/org123/xxx/yyy`，则完整 URL 应为 `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy`

### 支付状态页面（Payment Status Page）

`paymentStatusUrl` 指向一个公开页面（无需登录），显示：

- Payment Request 的当前状态（Pending / Approved / Paid）
- 原始 QR Code（若状态仍为 Pending）—— 若状态已不是 Pending，QR 会以打叉的方式显示，并附带警示文字提醒不要扫描
- 金额、目标银行账户名称/账号，或 PromptPay ID
- `refId1`、`refId2`、`refId3`、付款人姓名（Payer Name）
- 商户信息
- 一个链接到回单上传页面的按钮（在新分页打开）

该页面**可在浏览器中刷新以查看最新状态**（未使用 WebSocket 实时更新）—— 适合取代每次客户重新索取 QR 时都创建新 Payment Request 的做法。创建时取得的同一个 `paymentStatusUrl` 可在 token 过期（24 小时）前重复使用。

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:360px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:var(--font-prompt),-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff">
  <!-- header -->
  <div style="background:linear-gradient(135deg,#0d7a6e,#14b8a6);padding:18px 20px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="color:#fff;font-weight:700;font-size:15px">支付状态</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px">Payment Status</div>
    </div>
    <div style="width:32px;height:32px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M21 2v6h-6M3 22v-6h6M3.51 9a9 9 0 0114.85-3.36L21 8M3 16l2.64 2.36A9 9 0 0020.49 15"/></svg>
    </div>
  </div>
  <!-- body -->
  <div style="padding:24px 20px;background:#fff;text-align:center">
    <span style="display:inline-block;background:#d1fae5;color:#059669;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:14px">已支付</span>
    <div style="font-size:30px;font-weight:800;color:#1a1a1a;line-height:1.1">111.00</div>
    <div style="font-size:11px;color:#999;margin-bottom:18px">THB</div>
    <!-- QR with do-not-scan overlay -->
    <div style="position:relative;width:180px;height:180px;margin:0 auto 18px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <svg width="180" height="180" viewBox="0 0 21 21" style="opacity:0.35">
        <rect width="21" height="21" fill="#ffffff"/>
        <rect x="0" y="0" width="7" height="7" fill="#1a1a1a"/><rect x="1" y="1" width="5" height="5" fill="#ffffff"/><rect x="2" y="2" width="3" height="3" fill="#1a1a1a"/>
        <rect x="14" y="0" width="7" height="7" fill="#1a1a1a"/><rect x="15" y="1" width="5" height="5" fill="#ffffff"/><rect x="16" y="2" width="3" height="3" fill="#1a1a1a"/>
        <rect x="0" y="14" width="7" height="7" fill="#1a1a1a"/><rect x="1" y="15" width="5" height="5" fill="#ffffff"/><rect x="2" y="16" width="3" height="3" fill="#1a1a1a"/>
        <rect x="9" y="1" width="1" height="1" fill="#1a1a1a"/><rect x="11" y="2" width="1" height="1" fill="#1a1a1a"/><rect x="9" y="4" width="1" height="1" fill="#1a1a1a"/><rect x="12" y="5" width="1" height="1" fill="#1a1a1a"/><rect x="10" y="6" width="1" height="1" fill="#1a1a1a"/>
        <rect x="9" y="8" width="1" height="1" fill="#1a1a1a"/><rect x="11" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="9" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="12" y="11" width="1" height="1" fill="#1a1a1a"/><rect x="10" y="12" width="1" height="1" fill="#1a1a1a"/>
        <rect x="9" y="14" width="1" height="1" fill="#1a1a1a"/><rect x="11" y="15" width="1" height="1" fill="#1a1a1a"/><rect x="9" y="17" width="1" height="1" fill="#1a1a1a"/><rect x="12" y="18" width="1" height="1" fill="#1a1a1a"/><rect x="10" y="19" width="1" height="1" fill="#1a1a1a"/>
        <rect x="14" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="16" y="8" width="1" height="1" fill="#1a1a1a"/><rect x="18" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="15" y="11" width="1" height="1" fill="#1a1a1a"/><rect x="17" y="12" width="1" height="1" fill="#1a1a1a"/>
        <rect x="19" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="14" y="13" width="1" height="1" fill="#1a1a1a"/><rect x="16" y="14" width="1" height="1" fill="#1a1a1a"/><rect x="18" y="15" width="1" height="1" fill="#1a1a1a"/><rect x="15" y="16" width="1" height="1" fill="#1a1a1a"/>
        <rect x="17" y="17" width="1" height="1" fill="#1a1a1a"/><rect x="19" y="18" width="1" height="1" fill="#1a1a1a"/><rect x="14" y="19" width="1" height="1" fill="#1a1a1a"/>
        <rect x="2" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="4" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="6" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="3" y="11" width="1" height="1" fill="#1a1a1a"/><rect x="5" y="12" width="1" height="1" fill="#1a1a1a"/><rect x="1" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="6" y="12" width="1" height="1" fill="#1a1a1a"/>
      </svg>
      <div style="position:absolute;inset:0;background:rgba(255,255,255,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        <div style="color:#dc2626;font-weight:700;font-size:11px;text-align:center;padding:0 10px">请勿扫描 —— 此请求已不处于待处理状态</div>
      </div>
    </div>
    <!-- bank info -->
    <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;margin-bottom:14px;text-align:left;font-size:13px">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#222">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
        李四
      </div>
      <div style="color:#888;font-size:12px;margin:2px 0 6px 22px">KTB · 098-0-01234-5</div>
      <div style="display:flex;align-items:center;gap:8px;color:#555">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        PromptPay: 081-234-5678
      </div>
    </div>
    <!-- ref / payer / merchant -->
    <div style="text-align:left;font-size:12px;color:#555;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
        <span style="color:#999">付款人:</span> <strong style="color:#333">张三</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">参考编号 1:</span> <strong style="color:#333">ORDER-2026-001</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">参考编号 2:</span> <strong style="color:#333">222</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">参考编号 3:</span> <strong style="color:#333">333</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
        <span style="color:#999">商户:</span> <strong style="color:#333">示例商户</strong>
      </div>
    </div>
    <!-- button -->
    <button disabled style="width:100%;padding:12px;background:linear-gradient(135deg,#0d7a6e,#14b8a6);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:not-allowed">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg>
      上传回单
    </button>
  </div>
</div>
</div>

> 以上示例展示的是状态**已不是 Pending**（已支付）的情况，因此 QR 呈淡化显示并叠加打叉图标与"请勿扫描"提示 —— 若状态仍为 **Pending**，则会正常展示 QR，不带遮罩，可正常扫描。

### QR 与账户信息的展示方式

**展示前应始终先检查 `isQrAvailable`：**

| 场景 | 展示方式 |
|---|---|
| `isQrAvailable = true` | 照常展示 `qrCodeImage` 中的 QR Code 供客户扫描 |
| `isQrAvailable = false` | 没有 QR Code —— 展示账户信息（`payInBankCode`、`payInBankAccountNo`、`payInBankAccountName`、`payInPromptPayId`）供客户自行填写转账信息 |

> **提示：** 建议始终将账户信息（`payInBankCode`、`payInBankAccountNo`、`payInBankAccountName`、`payInPromptPayId`）与 QR Code 一并展示 —— 部分客户即使有 QR Code 也可能希望手动转账

> **建议：** 将 `slipUploadUrl` 生成为 **QR Code** 并展示在支付页面中 —— 客户用手机摄像头扫描后即可直接打开回单上传页面，无需手动输入 URL。适用于**普通 Pay-In** 和 **Pay-In P2P**

### 回单上传页面

当客户打开 Slip Upload URL 时，会看到该 Payment Request 对应的回单上传页面，具有以下功能：

- **Payment Request 确认信息** —— 显示商户名称、金额、目标账户、付款人姓名，方便客户确认上传的是正确的请求
- **上传回单图片** —— 从手机相机或相册中选择图片
- **回单参考号** —— 输入回单参考号（字母数字）的前 4 位和后 4 位，用于匹配及重复检测
- **备注** —— 可选的附加说明字段
- **重复回单检测** —— 若系统中已存在相同参考号的回单，会自动发出警告

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:var(--font-prompt),-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff">
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
    <!-- payment info card -->
    <div style="background:#eef2f1;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">商户</span><span style="font-weight:600;color:#333">示例商户</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">金额</span><span style="font-weight:700;color:#0d7a6e">500.00 THB</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">转入账户</span><span style="font-weight:600;color:#333">Kasikorn 012-3-45678-9</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#888">付款人</span><span style="font-weight:600;color:#333">张三</span></div>
    </div>
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
  "paymentResponse": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "type": "PayIn",
    "status": "Pending",
    "requestedAmount": 1000.00,
    "generatedAmount": 1000.00,
    "currency": "THB",
    "qrCode": null,
    "qrCodeImage": "",
    "isQrAvailable": false,
    "payInBankCode": "KBANK",
    "payInBankAccountNo": "012-3-45678-9",
    "payInBankAccountName": "收款方账户名称",
    "payInPromptPayId": "0812345678",
    "slipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-...",
    "paymentStatusUrl": "/payin-status/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/e5f6a7b8-..."
  }
}
```

### 与普通 Pay-In 的区别

| | 普通 Pay-In | Pay-In P2P |
|---|---|---|
| `isQrAvailable` | `true`（多数情况） | `false`（多数情况）—— P2P 账户通常未绑定 PromptPay |
| `qrCodeImage` | QR Code 图片 | 当 `isQrAvailable = false` 时为空（`""`） |
| `payInBankAccountName` | 商户账户 | 收款方账户（来自匹配的 Pay-Out Request） |
| 转账方式 | 扫描 QR Code | 直接转账至 response 中指定的账户（需自行填写账户信息） |
| `slipUploadUrl` | ✅ | ✅（非常重要 —— 客户必须上传回单作为凭证） |
| `paymentStatusUrl` | ✅ | ✅（也可用于查看状态 + 链接到回单上传页面） |

> **重要：** 对于 P2P —— `isQrAvailable` 通常为 `false`，因为目标账户可能未绑定 PromptPay。此时**必须展示账户信息**（`payInBankCode`、`payInBankAccountNo`、`payInBankAccountName`、`payInPromptPayId`），以便客户自行填写转账，同时展示 `slipUploadUrl` 以便上传转账凭证。

> **重要 —— 应拼接哪个域名：** `slipUploadUrl` 与 `paymentStatusUrl` 与普通 Pay-In 一样为相对路径，需自行拼接 `{{MERCHANT_URL}}`，例如 `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy`（完整说明参见上文 [Response Fields](#response-fields)）

> **建议：** 将 `slipUploadUrl` 生成为 **QR Code**，与目标账户信息一并展示 —— 客户转账后扫描 QR 即可直接打开回单上传页面，无需手动输入 URL（示例参见上方回单上传页面）

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
| `BankCode` | string | ✅ | 目标银行代码，例如 `SCB`、`KBANK`、`BAY` —— 查看[所有支持的代码](/documents/bank-codes) |
| `BankAccountNo` | string | ✅ | 目标账号 |
| `BankAccountName` | string | ✅ | 目标账户名称 |
| `PromptPayId` | string | ❌ | 目标 PromptPay 号码 |
| `AccountType` | string | ❌ | 账户类型：`Native` 或 `PromptPay` |

> 目标账户信息：必须始终发送 `BankCode`+`BankAccountNo`+`BankAccountName`（见[支持的银行代码](/documents/bank-codes)），即使通过 PromptPay 转账也是如此 —— 如果同时知道目标的 PromptPay 号码，可以额外发送 `PromptPayId`+`AccountType`；也可以用 `PayinBankAccountId`（系统中的 ID）代替以上全部信息

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
  "paymentResponse": {
    "id": "7bc95f12-3a21-4f89-c4ed-1d852a77bfc8",
    "type": "PayOut",
    "status": "Pending",
    "requestedAmount": 500.00,
    "currency": "THB",
    "createdAt": "2026-07-01T10:05:00Z"
  }
}
```

---

## 创建提现请求（Withdrawal）

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitWithdrawalRequest/{merchantId}
```

当 **商户本身** 需要将资金提现到自己的账户时使用此接口 —— 区别于普通 Pay-Out（将资金转给商户的*客户*）。系统内部会创建与 Pay-Out 完全相同的请求，只是标记为提现，以便在报表中与普通 Pay-Out 区分开来。

> **Request body、手续费计算方式、Response 格式和 Webhook 都与 [创建付款请求（Pay-Out）](#创建付款请求payout) 完全一致** —— 唯一的区别是接口路径（使用 `SubmitWithdrawalRequest` 而非 `SubmitPayOutRequest`）。上文关于 Pay-Out 的所有说明同样适用于此接口。

### Request Body

与 [创建付款请求（Pay-Out）](#创建付款请求payout) 相同 —— `RefId1`、`RefId2`、`RefId3`、`RequestedAmount`、`QrProvider`，以及目标账户信息（`BankCode`+`BankAccountNo`+`BankAccountName`，或 `PromptPayId`+`AccountType`，或 `PayinBankAccountId`）。

### 请求示例

```json
{
  "RefId1": "WITHDRAW-20260701-001",
  "RequestedAmount": 500,
  "QrProvider": "PP",
  "BankCode": "KBANK",
  "BankAccountNo": "0123456789",
  "BankAccountName": "Somchai Jaidee",
  "AccountType": "Native"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "paymentResponse": {
    "id": "7bc95f12-3a21-4f89-c4ed-1d852a77bfc8",
    "type": "PayOut",
    "status": "Pending",
    "requestedAmount": 500.00,
    "currency": "THB",
    "createdAt": "2026-07-01T10:05:00Z"
  }
}
```

> **Webhook：** 没有新的事件类型 —— 提现请求仍会触发与 [Webhooks](/documents/webhooks) 中说明相同的 `PaymentOut.Success` / `PaymentOut.Rejected` 事件，payload 字段也完全一致。
