---
title: Endpoints
---

# Endpoints

Please Payment มี 2 endpoint สำหรับ Merchant

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
| `RequestedAmount` | number | ✅ | จำนวนเงิน (ต้องมากกว่า 0 และอยู่ใน range ที่ Merchant กำหนด) |
| `Currency` | string | ✅ | สกุลเงิน — ปัจจุบันรองรับเฉพาะ `THB` |
| `QrProvider` | string | ✅ | ธนาคารที่ออก QR — `PP` (PromptPay) หรือ `SCB` |
| `RefId2` | string | ❌ | Reference เพิ่มเติม 2 |
| `RefId3` | string | ❌ | Reference เพิ่มเติม 3 |
| `Description` | string | ❌ | คำอธิบายรายการ |
| `CustomerEmail` | string | ❌ | อีเมลของลูกค้า |
| `CustomerPhone` | string | ❌ | เบอร์โทรของลูกค้า |
| `Tags` | string | ❌ | Tag สำหรับจัดกลุ่มรายการ |

### ตัวอย่าง Request

```json
{
  "RefId1": "ORDER-20260701-001",
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
    "PayInPromptPayId": null
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
| `QrCodeImage` | รูป QR Code เป็น Base64 — นำไปแสดงในแอปได้เลย |
| `SessionId` | ใช้เชื่อมต่อ WebSocket เพื่อรับสถานะแบบ real-time |
| `WebsocketPath` | path สำหรับ WebSocket (`/realtime/payment-tx`) |
| `ExpireAt` | QR Code หมดอายุเมื่อไหร่ |

> แม้ HTTP status code จะเป็น `200` แต่ต้องตรวจสอบ `status` ใน response body ด้วย — ถ้า `"OK"` คือสำเร็จ ถ้าค่าอื่นคือมีข้อผิดพลาด (ดู [การจัดการ Error](/documents/error-handling))

---

## สร้างคำขอโอนเงินออก (Pay-Out)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayOutRequest/{merchantId}
```

สร้างคำขอโอนเงินออกไปยังบัญชีปลายทาง

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `RefId` | string | ✅ | Reference ID จาก Merchant (ต้องไม่ซ้ำกัน) |
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
  "RefId": "PAYOUT-20260701-001",
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
  "RefId": "PAYOUT-20260701-002",
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
