---
title: Endpoints
---

# Endpoints

ระบบมี 2 endpoint สำหรับ Merchant

> **orgId** และ **merchantId** จะได้รับจากผู้ให้บริการเมื่อสมัครใช้งาน ไม่ต้องสร้างเอง

---

## สร้างคำขอรับเงิน (Pay-In)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}
```

สร้าง Payment Request แล้วได้รับ QR Code สำหรับให้ลูกค้า scan และโอนเงินเข้าบัญชีของ Merchant โดยตรง

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID จาก Merchant (ต้องไม่ซ้ำกัน) |
| `RefId2` | string | ❌ | Reference เพิ่มเติม 2 |
| `RefId3` | string | ❌ | Reference เพิ่มเติม 3 |
| `PayerName` | string | ✅ | ชื่อผู้จ่าย |
| `RequestedAmount` | number | ✅ | จำนวนเงิน (ต้องมากกว่า 0 และอยู่ใน range ที่ Merchant กำหนด) |
| `Currency` | string | ✅ | สกุลเงิน — ปัจจุบันรองรับเฉพาะ `THB` |
| `QrProvider` | string | ✅ | ธนาคารที่ออก QR — `PP` (PromptPay) หรือ `SCB` |
| `Description` | string | ❌ | คำอธิบายรายการ |
| `CustomerEmail` | string | ❌ | อีเมลของลูกค้า |
| `CustomerPhone` | string | ❌ | เบอร์โทรของลูกค้า |
| `Tags` | string | ❌ | Tag สำหรับจัดกลุ่มรายการ |

### ตัวอย่าง Request

```json
{
  "RefId1": "ORDER-20260701-001",
  "PayerName": "สมชาย ใจดี",
  "RequestedAmount": 325,
  "Currency": "THB",
  "QrProvider": "PP",
  "Description": "ชำระค่าสินค้า",
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
    "PayInBankAccountName": "ชื่อบริษัท",
    "PayInPromptPayId": null,
    "SlipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-..."
  }
}
```

### Response Fields

| Field | คำอธิบาย |
|---|---|
| `Id` | UUID ของ Payment Request — เก็บไว้สำหรับ reference |
| `Status` | สถานะปัจจุบัน (ดู [สถานะการชำระเงิน](/documents/payment-status)) |
| `RequestedAmount` | จำนวนเงินที่ขอ |
| `GeneratedAmount` | จำนวนเงินที่ใช้จริง (อาจมีเศษสตางค์ random เพื่อ matching) |
| `IsQrAvailable` | `true` หาก QR Code พร้อมให้ลูกค้า scan, `false` หากบัญชีปลายทางไม่รองรับ QR (เช่น ไม่ได้ผูกกับ PromptPay) — ดูรายละเอียดด้านล่าง |
| `QrCodeImage` | รูป QR Code เป็น Base64 — นำไปแสดงในแอปได้เลย (ว่างเปล่าหาก `IsQrAvailable` เป็น `false`) |
| `PayInBankCode` | รหัสธนาคารปลายทาง |
| `PayInBankAccountNo` | เลขบัญชีปลายทาง |
| `PayInBankAccountName` | ชื่อบัญชีปลายทาง |
| `PayInPromptPayId` | หมายเลข PromptPay ปลายทาง (ถ้ามี) |
| `SessionId` | ใช้เชื่อมต่อ WebSocket เพื่อรับสถานะแบบ real-time |
| `WebsocketPath` | path สำหรับ WebSocket (`/realtime/payment-tx`) |
| `ExpireAt` | QR Code หมดอายุเมื่อไหร่ |
| `SlipUploadUrl` | Relative path สำหรับหน้าอัปโหลดสลิป — ไม่มี domain นำหน้า ต้องนำไปต่อกับ domain ของ merchant portal เองเช่น `https://<merchant-domain>` + `SlipUploadUrl` เพื่อสร้าง URL เต็ม แล้วส่งให้ลูกค้าเปิดหน้าอัปโหลดสลิปได้โดยไม่ต้อง login |

### การแสดงผล QR และข้อมูลบัญชี

**ควรตรวจสอบ `IsQrAvailable` ก่อนแสดงผลเสมอ:**

| สถานการณ์ | วิธีแสดงผล |
|---|---|
| `IsQrAvailable = true` | แสดง QR Code จาก `QrCodeImage` ให้ลูกค้า scan ตามปกติ |
| `IsQrAvailable = false` | ไม่มี QR Code — แสดงข้อมูลบัญชี (`PayInBankCode`, `PayInBankAccountNo`, `PayInBankAccountName`, `PayInPromptPayId`) เพื่อให้ลูกค้ากรอกข้อมูลโอนเงินเอง |

> **หมายเหตุ:** แนะนำให้แสดงข้อมูลบัญชี (`PayInBankCode`, `PayInBankAccountNo`, `PayInBankAccountName`, `PayInPromptPayId`) ควบคู่กับ QR Code เสมอ — ลูกค้าบางรายอาจต้องการโอนด้วยตัวเองแม้มี QR

> **แนะนำ:** นำ `SlipUploadUrl` ไปทำเป็น **QR Code** แสดงในหน้าชำระเงินของคุณ — ลูกค้าสแกน QR ด้วยกล้องมือถือแล้วเปิดหน้าอัปโหลดสลิปได้เลย ไม่ต้องพิมพ์ URL เอง ใช้ได้ทั้ง **Pay-In ปกติ** และ **Pay-In P2P**

### หน้าอัปโหลดสลิป

เมื่อลูกค้าเปิด Slip Upload URL ลูกค้าจะเจอหน้าอัปโหลดสลิปสำหรับ Payment Request นั้นๆ ซึ่งมีฟีเจอร์ดังนี้:

- **อัปโหลดรูปสลิป** — เลือกรูปจากกล้องหรือ Gallery ของมือถือ
- **เลขอ้างอิงสลิป** — กรอก 4 หลักแรกและ 4 หลักสุดท้ายของเลขอ้างอิงสลิป (alphanumeric) เพื่อ matching และตรวจจับสลิปซ้ำ
- **หมายเหตุ** — ช่องเสริมสำหรับข้อความเพิ่มเติม
- **ตรวจสอบสลิปซ้ำ** — ระบบแจ้งเตือนอัตโนมัติถ้าพบสลิปที่มีเลขอ้างอิงเดียวกันในระบบแล้ว

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:sans-serif;background:#fff">
  <!-- header -->
  <div style="background:linear-gradient(135deg,#0d7a6e,#14b8a6);padding:18px 20px;display:flex;align-items:center;gap:12px">
    <div style="width:38px;height:38px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
    </div>
    <div>
      <div style="color:#fff;font-weight:700;font-size:15px">Upload Payment Slip</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px">อัปโหลดสลิปการโอนเงิน</div>
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
      <div style="font-size:13px;font-weight:700;color:#856404">พบสลิปซ้ำในระบบ!</div>
      <div style="font-size:12px;color:#856404;margin-top:2px">หากพบเลขอ้างอิงเดียวกัน ระบบจะแสดงคำเตือน พร้อมตัวเลือก <strong>อัปโหลดต่อไป</strong> หรือ <strong>ยกเลิก</strong></div>
    </div>
  </div>
</div>
</div>

> ลูกค้าไม่ต้อง login เพื่อใช้หน้านี้ — URL มี token ฝังอยู่แล้ว และหมดอายุใน 24 ชั่วโมง

> แม้ HTTP status code จะเป็น `200` แต่ต้องตรวจสอบ `status` ใน response body ด้วย — ถ้า `"OK"` คือสำเร็จ ถ้าค่าอื่นคือมีข้อผิดพลาด (ดู [การจัดการ Error](/documents/error-handling))

---

## สร้างคำขอรับเงินแบบ P2P (Pay-In P2P)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequestP2P/{merchantId}
```

สร้าง Pay-In Request แบบ **Peer-to-Peer (P2P)** — ระบบจะจับคู่กับ Pay-Out Request ที่รอดำเนินการอยู่โดยอัตโนมัติ แล้วให้ลูกค้าโอนเงินตรงไปยังบัญชีของผู้รับ (แทนที่จะโอนผ่าน QR Code ของระบบ)

> **P2P คืออะไร?** แทนที่เงินจะเข้าบัญชีของ Merchant ก่อน แล้วค่อยโอนออก — P2P ให้ผู้ส่งโอนตรงถึงผู้รับเลย ระบบทำหน้าที่จับคู่และยืนยัน

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID จาก Merchant (ต้องไม่ซ้ำกัน) |
| `RefId2` | string | ❌ | Reference เพิ่มเติม 2 |
| `RefId3` | string | ❌ | Reference เพิ่มเติม 3 |
| `PayerName` | string | ✅ | ชื่อผู้จ่าย |
| `RequestedAmount` | number | ✅ | จำนวนเงิน (ต้องมากกว่า 0 และอยู่ใน range ที่ Merchant กำหนด) |
| `Currency` | string | ✅ | สกุลเงิน — ปัจจุบันรองรับเฉพาะ `THB` |
| `QrProvider` | string | ✅ | `PP` หรือ `SCB` (ระบบใช้สำหรับ internal matching) |
| `Description` | string | ❌ | คำอธิบายรายการ |

### ตัวอย่าง Request

```json
{
  "RefId1": "P2P-ORDER-20260701-001",
  "PayerName": "สมชาย ใจดี",
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
    "PayInBankAccountName": "ชื่อผู้รับปลายทาง",
    "PayInPromptPayId": "0812345678",
    "SlipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-..."
  }
}
```

### ความแตกต่างจาก Pay-In ปกติ

| | Pay-In ปกติ | Pay-In P2P |
|---|---|---|
| `IsQrAvailable` | `true` (ส่วนใหญ่) | `false` (ส่วนใหญ่) — บัญชี P2P มักไม่ผูกกับ PromptPay |
| `QrCodeImage` | รูป QR Code | ว่างเปล่า (`""`) เมื่อ `IsQrAvailable = false` |
| `PayInBankAccountName` | บัญชี Merchant | บัญชีของผู้รับปลายทาง (จาก Pay-Out Request ที่จับคู่) |
| การโอนเงิน | สแกน QR Code | โอนตรงไปยังบัญชีที่ระบุใน response (กรอกข้อมูลบัญชีเอง) |
| `SlipUploadUrl` | ✅ | ✅ (สำคัญมาก — ลูกค้าต้องอัปโหลดสลิปเป็นหลักฐาน) |

> **สำคัญ:** สำหรับ P2P — `IsQrAvailable` มักเป็น `false` เพราะบัญชีปลายทางอาจไม่ผูกกับ PromptPay ในกรณีนี้ **ต้องแสดงข้อมูลบัญชี** (`PayInBankCode`, `PayInBankAccountNo`, `PayInBankAccountName`, `PayInPromptPayId`) เพื่อให้ลูกค้ากรอกโอนเงินเองด้วยตัวเอง พร้อมทั้งแสดง `SlipUploadUrl` เพื่อให้อัปโหลดสลิปหลักฐานการโอน

> **แนะนำ:** นำ `SlipUploadUrl` ไปทำเป็น **QR Code** แสดงควบคู่กับข้อมูลบัญชีปลายทาง — ลูกค้าโอนเงินแล้วสแกน QR เปิดหน้าอัปโหลดสลิปได้เลยโดยไม่ต้องพิมพ์ URL เอง (ดูตัวอย่างหน้าอัปโหลดสลิปด้านบน)

> **Error `ERROR_NO_P2P_ACCOUNT_MATCH`:** หากไม่มี Pay-Out Request ที่รอดำเนินการอยู่ในระบบ จะได้รับ error นี้ — แปลว่าในขณะนั้นไม่มีรายการที่สามารถจับคู่ได้

---

## สร้างคำขอโอนเงินออก (Pay-Out)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayOutRequest/{merchantId}
```

สร้างคำขอโอนเงินออกไปยังบัญชีปลายทาง

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID จาก Merchant (ต้องไม่ซ้ำกัน) |
| `RefId2` | string | ❌ | Reference เพิ่มเติม 2 |
| `RefId3` | string | ❌ | Reference เพิ่มเติม 3 |
| `RequestedAmount` | number | ✅ | จำนวนเงิน (ต้องมากกว่า 0) |
| `QrProvider` | string | ✅ | ต้องเป็น `PP` (PromptPay เท่านั้น สำหรับ Pay-Out) |
| `BankCode` | string | ❌ | รหัสธนาคารปลายทาง เช่น `SCB`, `KBANK`, `BAY` |
| `BankAccountNo` | string | ❌ | เลขบัญชีปลายทาง |
| `BankAccountName` | string | ❌ | ชื่อบัญชีปลายทาง |
| `PromptPayId` | string | ❌ | หมายเลข PromptPay ปลายทาง |
| `AccountType` | string | ❌ | ประเภทบัญชี: `Native` หรือ `PromptPay` |

> ข้อมูลบัญชีปลายทาง: ส่ง `PayinBankAccountId` (ID จากระบบ) หรือ ส่ง `BankCode`+`BankAccountNo`+`BankAccountName` หรือ `PromptPayId`+`AccountType` อย่างใดอย่างหนึ่ง

> **แนะนำ:** หากทราบหมายเลข PromptPay ของบัญชีปลายทาง แนะนำให้ส่ง `PromptPayId` มาด้วย เนื่องจากการโอนผ่าน PromptPay จะช่วยให้ระบบประมวลผลได้เร็วขึ้น และผู้รับได้รับเงินได้รวดเร็วยิ่งขึ้น

### ตัวอย่าง Request (โอนผ่านบัญชีธนาคาร)

```json
{
  "RefId1": "PAYOUT-20260701-001",
  "RequestedAmount": 500,
  "QrProvider": "PP",
  "BankCode": "KBANK",
  "BankAccountNo": "0123456789",
  "BankAccountName": "สมชาย ใจดี",
  "AccountType": "Native"
}
```

### ตัวอย่าง Request (โอนผ่าน PromptPay)

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
