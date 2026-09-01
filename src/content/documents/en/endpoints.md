---
title: Endpoints
---

# Endpoints

The system provides 2 endpoints for Merchants

> **orgId** and **merchantId** are issued by the provider when you sign up — you don't create them yourself

---

## Create a Pay-In Request

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}
```

Creates a Payment Request and returns a QR Code for the customer to scan and transfer funds directly into the Merchant's account.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID from the Merchant (must be unique) |
| `RefId2` | string | ❌ | Additional reference 2 |
| `RefId3` | string | ❌ | Additional reference 3 |
| `PayerName` | string | ✅ | Name of the payer |
| `RequestedAmount` | number | ✅ | Amount (must be greater than 0 and within the range set by the Merchant) |
| `Currency` | string | ✅ | Currency — currently only `THB` is supported |
| `QrProvider` | string | ✅ | Bank issuing the QR — `PP` (PromptPay) or `SCB` |
| `Description` | string | ❌ | Description of the transaction |
| `CustomerEmail` | string | ❌ | Customer's email |
| `CustomerPhone` | string | ❌ | Customer's phone number |
| `Tags` | string | ❌ | Tag for grouping transactions |

### Sample Request

```json
{
  "RefId1": "ORDER-20260701-001",
  "PayerName": "Somchai Jaidee",
  "RequestedAmount": 325,
  "Currency": "THB",
  "QrProvider": "PP",
  "Description": "Payment for goods",
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
    "PayInBankAccountName": "Company Name",
    "PayInPromptPayId": null,
    "SlipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-..."
  }
}
```

### Response Fields

| Field | Description |
|---|---|
| `Id` | UUID of the Payment Request — keep it for reference |
| `Status` | Current status (see [Payment Status](/documents/payment-status)) |
| `RequestedAmount` | The amount requested |
| `GeneratedAmount` | The actual amount to be paid (may include a randomized fraction of a baht for matching) |
| `IsQrAvailable` | `true` if a QR Code is ready for the customer to scan, `false` if the destination account doesn't support QR (e.g. not linked to PromptPay) — see details below |
| `QrCodeImage` | The QR Code image as Base64 — can be displayed directly in your app (empty when `IsQrAvailable` is `false`) |
| `PayInBankCode` | Destination bank code |
| `PayInBankAccountNo` | Destination account number |
| `PayInBankAccountName` | Destination account name |
| `PayInPromptPayId` | Destination PromptPay number (if any) |
| `SessionId` | Used to connect via WebSocket to receive real-time status |
| `WebsocketPath` | The WebSocket path (`/realtime/payment-tx`) |
| `ExpireAt` | When the QR Code expires |
| `SlipUploadUrl` | Relative path to the slip upload page — has no domain prefix, must be concatenated with `{{MERCHANT_URL}}` (see explanation below) to form the full URL, then given to the customer to open the slip upload page without needing to log in |

> **Important — which domain to concatenate:** `SlipUploadUrl` is a relative path only. You must concatenate it with the `{{MERCHANT_URL}}` domain yourself. For example, if `SlipUploadUrl` is `/payin-slip-upload/org123/xxx/yyy`, form the full URL as `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy`

### Displaying the QR and Account Info

**Always check `IsQrAvailable` before rendering:**

| Scenario | How to display |
|---|---|
| `IsQrAvailable = true` | Show the QR Code from `QrCodeImage` for the customer to scan as usual |
| `IsQrAvailable = false` | No QR Code — show the account details (`PayInBankCode`, `PayInBankAccountNo`, `PayInBankAccountName`, `PayInPromptPayId`) so the customer can enter the transfer manually |

> **Note:** It's recommended to always show the account details (`PayInBankCode`, `PayInBankAccountNo`, `PayInBankAccountName`, `PayInPromptPayId`) alongside the QR Code — some customers may prefer to transfer manually even when a QR is available

> **Recommended:** Turn `SlipUploadUrl` into a **QR Code** displayed on your payment page — the customer scans it with their phone camera and opens the slip upload page directly, without typing the URL. Works for both **standard Pay-In** and **Pay-In P2P**

### Slip Upload Page

When the customer opens the Slip Upload URL, they'll see the slip upload page for that Payment Request, which offers:

- **Upload slip image** — choose an image from the camera or the phone's gallery
- **Slip reference number** — enter the first 4 and last 4 digits of the slip reference number (alphanumeric) for matching and duplicate detection
- **Note** — an optional field for additional text
- **Duplicate slip check** — the system automatically warns if a slip with the same reference number already exists

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:sans-serif;background:#fff">
  <!-- header -->
  <div style="background:linear-gradient(135deg,#0d7a6e,#14b8a6);padding:18px 20px;display:flex;align-items:center;gap:12px">
    <div style="width:38px;height:38px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
    </div>
    <div>
      <div style="color:#fff;font-weight:700;font-size:15px">Upload Payment Slip</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px">Upload your transfer slip</div>
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
      <div style="font-size:13px;font-weight:700;color:#856404">Duplicate slip found!</div>
      <div style="font-size:12px;color:#856404;margin-top:2px">If the same reference number is found, the system shows a warning with the option to <strong>continue uploading</strong> or <strong>cancel</strong></div>
    </div>
  </div>
</div>
</div>

> The customer does not need to log in to use this page — the URL already has a token embedded and expires after 24 hours

> Even if the HTTP status code is `200`, you must still check the `status` field in the response body — if `"OK"`, it succeeded; any other value indicates an error (see [Error Handling](/documents/error-handling))

---

## Create a Pay-In Request (P2P)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequestP2P/{merchantId}
```

Creates a **Peer-to-Peer (P2P)** Pay-In Request — the system automatically matches it with a pending Pay-Out Request, and the customer transfers funds directly to the recipient's account (instead of transferring via the system's QR Code).

> **What is P2P?** Instead of funds going into the Merchant's account first and then being transferred out, P2P lets the sender transfer directly to the recipient — the system's role is to match and confirm the transaction.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID from the Merchant (must be unique) |
| `RefId2` | string | ❌ | Additional reference 2 |
| `RefId3` | string | ❌ | Additional reference 3 |
| `PayerName` | string | ✅ | Name of the payer |
| `RequestedAmount` | number | ✅ | Amount (must be greater than 0 and within the range set by the Merchant) |
| `Currency` | string | ✅ | Currency — currently only `THB` is supported |
| `QrProvider` | string | ✅ | `PP` or `SCB` (used internally by the system for matching) |
| `Description` | string | ❌ | Description of the transaction |

### Sample Request

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
    "PayInBankAccountName": "Recipient Account Name",
    "PayInPromptPayId": "0812345678",
    "SlipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-..."
  }
}
```

### Differences from Standard Pay-In

| | Standard Pay-In | Pay-In P2P |
|---|---|---|
| `IsQrAvailable` | `true` (usually) | `false` (usually) — P2P accounts are often not linked to PromptPay |
| `QrCodeImage` | QR Code image | Empty (`""`) when `IsQrAvailable = false` |
| `PayInBankAccountName` | Merchant's account | The recipient's account (from the matched Pay-Out Request) |
| Transfer method | Scan the QR Code | Transfer directly to the account specified in the response (enter account details manually) |
| `SlipUploadUrl` | ✅ | ✅ (very important — the customer must upload a slip as proof) |

> **Important:** For P2P — `IsQrAvailable` is usually `false` because the destination account may not be linked to PromptPay. In this case **you must display the account details** (`PayInBankCode`, `PayInBankAccountNo`, `PayInBankAccountName`, `PayInPromptPayId`) so the customer can enter the transfer manually, and also show `SlipUploadUrl` so they can upload proof of transfer.

> **Important — which domain to concatenate:** `SlipUploadUrl` is a relative path, same as standard Pay-In. You must concatenate it with `{{MERCHANT_URL}}` yourself, e.g. `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy` (see the full explanation in [Response Fields](#response-fields) above)

> **Recommended:** Turn `SlipUploadUrl` into a **QR Code** shown alongside the destination account details — the customer transfers funds, then scans the QR to open the slip upload page directly without typing the URL (see the slip upload page example above)

> **Error `ERROR_NO_P2P_ACCOUNT_MATCH`:** If there is no pending Pay-Out Request in the system, you'll receive this error — meaning there's currently no matching transaction available.

---

## Create a Pay-Out Request

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayOutRequest/{merchantId}
```

Creates a request to transfer funds out to a destination account.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID from the Merchant (must be unique) |
| `RefId2` | string | ❌ | Additional reference 2 |
| `RefId3` | string | ❌ | Additional reference 3 |
| `RequestedAmount` | number | ✅ | Amount (must be greater than 0) |
| `QrProvider` | string | ✅ | Must be `PP` (PromptPay only, for Pay-Out) |
| `BankCode` | string | ❌ | Destination bank code, e.g. `SCB`, `KBANK`, `BAY` |
| `BankAccountNo` | string | ❌ | Destination account number |
| `BankAccountName` | string | ❌ | Destination account name |
| `PromptPayId` | string | ❌ | Destination PromptPay number |
| `AccountType` | string | ❌ | Account type: `Native` or `PromptPay` |

> Destination account details: send either `PayinBankAccountId` (an ID from the system), or `BankCode`+`BankAccountNo`+`BankAccountName`, or `PromptPayId`+`AccountType`

> **Recommended:** If you know the destination account's PromptPay number, it's recommended to send `PromptPayId` — transferring via PromptPay lets the system process faster, and the recipient receives funds more quickly

### Sample Request (Bank Account Transfer)

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

### Sample Request (PromptPay Transfer)

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
