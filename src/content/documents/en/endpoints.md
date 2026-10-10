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
    "payInBankAccountName": "Company Name",
    "payInPromptPayId": null,
    "slipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-...",
    "paymentStatusUrl": "/payin-status/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/e5f6a7b8-..."
  }
}
```

### Response Fields

| Field | Description |
|---|---|
| `id` | UUID of the Payment Request — keep it for reference |
| `status` | Current status (see [Payment Status](/documents/payment-status)) |
| `requestedAmount` | The amount requested |
| `generatedAmount` | The actual amount to be paid (may include a randomized fraction of a baht for matching) |
| `isQrAvailable` | `true` if a QR Code is ready for the customer to scan, `false` if the destination account doesn't support QR (e.g. not linked to PromptPay) — see details below |
| `qrCodeImage` | The QR Code image as Base64 — can be displayed directly in your app (empty when `isQrAvailable` is `false`) |
| `payInBankCode` | Destination bank code |
| `payInBankAccountNo` | Destination account number |
| `payInBankAccountName` | Destination account name |
| `payInPromptPayId` | Destination PromptPay number (if any) |
| `sessionId` | Used to connect via WebSocket to receive real-time status |
| `websocketPath` | The WebSocket path (`/realtime/payment-tx`) |
| `expireAt` | When the QR Code expires |
| `slipUploadUrl` | Relative path to the slip upload page — has no domain prefix, must be concatenated with `{{MERCHANT_URL}}` (see explanation below) to form the full URL, then given to the customer to open the slip upload page without needing to log in |
| `paymentStatusUrl` | Relative path to the payment status page — a relative path just like `slipUploadUrl`, also needs to be concatenated with `{{MERCHANT_URL}}`. This page requires no login and **reuses the original QR Code** of this payment request (never re-generated). Useful for a customer who already got a QR but forgot to scan it, or scanned it and wants to check the status |

> **Important — which domain to concatenate:** `slipUploadUrl` and `paymentStatusUrl` are relative paths only. You must concatenate them with the `{{MERCHANT_URL}}` domain yourself. For example, if `slipUploadUrl` is `/payin-slip-upload/org123/xxx/yyy`, form the full URL as `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy`

### Payment Status Page

`paymentStatusUrl` leads to a public page (no login required) that shows:

- The current status of the Payment Request (Pending / Approved / Paid)
- The original QR Code (if still Pending) — if the status is no longer Pending, the QR is shown crossed out with a warning not to scan it
- The amount, destination bank account name/number, or PromptPay ID
- `refId1`, `refId2`, `refId3`, and the Payer Name
- Merchant information
- A button linking to the slip upload page (opens in a new tab)

This page **can be refreshed in the browser to see the latest status** (it does not use real-time WebSocket updates) — useful instead of creating a new Payment Request every time a customer asks for the QR again. The same `paymentStatusUrl` from the original creation response can be reused repeatedly until the token expires (24 hours).

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:360px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:var(--font-prompt),-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff">
  <!-- header -->
  <div style="background:linear-gradient(135deg,#0d7a6e,#14b8a6);padding:18px 20px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="color:#fff;font-weight:700;font-size:15px">Payment Status</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px">สถานะการชำระเงิน</div>
    </div>
    <div style="width:32px;height:32px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M21 2v6h-6M3 22v-6h6M3.51 9a9 9 0 0114.85-3.36L21 8M3 16l2.64 2.36A9 9 0 0020.49 15"/></svg>
    </div>
  </div>
  <!-- body -->
  <div style="padding:24px 20px;background:#fff;text-align:center">
    <span style="display:inline-block;background:#d1fae5;color:#059669;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:14px">Paid</span>
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
        <div style="color:#dc2626;font-weight:700;font-size:11px;text-align:center;padding:0 10px">Do not scan — this request is no longer Pending</div>
      </div>
    </div>
    <!-- bank info -->
    <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;margin-bottom:14px;text-align:left;font-size:13px">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#222">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
        Jane Smith
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
        <span style="color:#999">Payer:</span> <strong style="color:#333">John Doe</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">Ref 1:</span> <strong style="color:#333">ORDER-2026-001</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">Ref 2:</span> <strong style="color:#333">222</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">Ref 3:</span> <strong style="color:#333">333</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
        <span style="color:#999">Merchant:</span> <strong style="color:#333">Example Shop</strong>
      </div>
    </div>
    <!-- button -->
    <button disabled style="width:100%;padding:12px;background:linear-gradient(135deg,#0d7a6e,#14b8a6);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:not-allowed">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg>
      Upload Slip
    </button>
  </div>
</div>
</div>

> The example above shows a status that is **no longer Pending** (Paid), so the QR appears faded with a crossed-out overlay and a "do not scan" warning — if the status is still **Pending**, the QR is shown normally without the overlay, ready to scan.

### Displaying the QR and Account Info

**Always check `isQrAvailable` before rendering:**

| Scenario | How to display |
|---|---|
| `isQrAvailable = true` | Show the QR Code from `qrCodeImage` for the customer to scan as usual |
| `isQrAvailable = false` | No QR Code — show the account details (`payInBankCode`, `payInBankAccountNo`, `payInBankAccountName`, `payInPromptPayId`) so the customer can enter the transfer manually |

> **Note:** It's recommended to always show the account details (`payInBankCode`, `payInBankAccountNo`, `payInBankAccountName`, `payInPromptPayId`) alongside the QR Code — some customers may prefer to transfer manually even when a QR is available

> **Recommended:** Turn `slipUploadUrl` into a **QR Code** displayed on your payment page — the customer scans it with their phone camera and opens the slip upload page directly, without typing the URL. Works for both **standard Pay-In** and **Pay-In P2P**

### Slip Upload Page

When the customer opens the Slip Upload URL, they'll see the slip upload page for that Payment Request, which offers:

- **Payment Request confirmation info** — shows the merchant name, amount, destination account, and payer name so the customer can confirm they're uploading to the right request
- **Upload slip image** — choose an image from the camera or the phone's gallery
- **Slip reference number** — enter the first 4 and last 4 digits of the slip reference number (alphanumeric) for matching and duplicate detection
- **Note** — an optional field for additional text
- **Duplicate slip check** — the system automatically warns if a slip with the same reference number already exists

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:var(--font-prompt),-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff">
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
    <!-- payment info card -->
    <div style="background:#eef2f1;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">Merchant</span><span style="font-weight:600;color:#333">Example Shop</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">Amount</span><span style="font-weight:700;color:#0d7a6e">500.00 THB</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">Transfer to</span><span style="font-weight:600;color:#333">Kasikorn 012-3-45678-9</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#888">Payer</span><span style="font-weight:600;color:#333">John Doe</span></div>
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
    "payInBankAccountName": "Recipient Account Name",
    "payInPromptPayId": "0812345678",
    "slipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-...",
    "paymentStatusUrl": "/payin-status/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/e5f6a7b8-..."
  }
}
```

### Differences from Standard Pay-In

| | Standard Pay-In | Pay-In P2P |
|---|---|---|
| `isQrAvailable` | `true` (usually) | `false` (usually) — P2P accounts are often not linked to PromptPay |
| `qrCodeImage` | QR Code image | Empty (`""`) when `isQrAvailable = false` |
| `payInBankAccountName` | Merchant's account | The recipient's account (from the matched Pay-Out Request) |
| Transfer method | Scan the QR Code | Transfer directly to the account specified in the response (enter account details manually) |
| `slipUploadUrl` | ✅ | ✅ (very important — the customer must upload a slip as proof) |
| `paymentStatusUrl` | ✅ | ✅ (also usable to check status + link to the slip upload page) |

> **Important:** For P2P — `isQrAvailable` is usually `false` because the destination account may not be linked to PromptPay. In this case **you must display the account details** (`payInBankCode`, `payInBankAccountNo`, `payInBankAccountName`, `payInPromptPayId`) so the customer can enter the transfer manually, and also show `slipUploadUrl` so they can upload proof of transfer.

> **Important — which domain to concatenate:** `slipUploadUrl` and `paymentStatusUrl` are relative paths, same as standard Pay-In. You must concatenate them with `{{MERCHANT_URL}}` yourself, e.g. `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy` (see the full explanation in [Response Fields](#response-fields) above)

> **Recommended:** Turn `slipUploadUrl` into a **QR Code** shown alongside the destination account details — the customer transfers funds, then scans the QR to open the slip upload page directly without typing the URL (see the slip upload page example above)

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
| `BankCode` | string | ✅ | Destination bank code, e.g. `SCB`, `KBANK`, `BAY` — see [all supported codes](/documents/bank-codes) |
| `BankAccountNo` | string | ✅ | Destination account number |
| `BankAccountName` | string | ✅ | Destination account name |
| `PromptPayId` | string | ❌ | Destination PromptPay number |
| `AccountType` | string | ❌ | Account type: `Native` or `PromptPay` |

> Destination account details: `BankCode`+`BankAccountNo`+`BankAccountName` must always be sent (see [Supported Bank Codes](/documents/bank-codes)), even when paying out via PromptPay — if you also know the destination's PromptPay number, you may additionally send `PromptPayId`+`AccountType`, or send `PayinBankAccountId` (an ID from the system) instead of all of the above

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

## Create a Withdrawal Request

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitWithdrawalRequest/{merchantId}
```

Use this endpoint when the **Merchant itself** is withdrawing funds out to its own account — as opposed to a standard Pay-Out, which transfers funds out to the Merchant's *customer*. Internally the system creates the exact same kind of request as a Pay-Out, just flagged as a withdrawal, so it appears separately from ordinary Pay-Outs in reporting.

> **Request body, fee calculation, response shape, and webhooks are all 100% identical to [Create a Pay-Out Request](#create-a-payout-request)** — the only difference is the endpoint path (`SubmitWithdrawalRequest` instead of `SubmitPayOutRequest`). Everything documented above for Pay-Out applies here unchanged.

### Request Body

Same as [Create a Pay-Out Request](#create-a-payout-request) — `RefId1`, `RefId2`, `RefId3`, `RequestedAmount`, `QrProvider`, and destination account fields (`BankCode`+`BankAccountNo`+`BankAccountName`, or `PromptPayId`+`AccountType`, or `PayinBankAccountId`).

### Sample Request

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

> **Webhooks:** No new event type — a Withdrawal Request still fires the same `PaymentOut.Success` / `PaymentOut.Rejected` events documented in [Webhooks](/documents/webhooks), with the same payload fields.
