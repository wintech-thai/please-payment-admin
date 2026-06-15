---
title: Endpoints
---

# Endpoints

## สร้างรายการฝากเงิน (Pay-In)

`POST /PaymentRequest/org/{orgId}/action/SubmitPaymentRequest/{merchantId}`

สร้าง Payment Request สำหรับรับเงินจากลูกค้า

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `amount` | number | ✅ | จำนวนเงิน (THB) |
| `ref1` | string | ❌ | Reference 1 (สูงสุด 20 ตัวอักษร) |
| `ref2` | string | ❌ | Reference 2 (สูงสุด 20 ตัวอักษร) |
| `payInBankAccountId` | string | ❌ | ID ของบัญชีรับเงิน |

### ตัวอย่าง Request

```json
{
  "amount": 1000.00,
  "ref1": "ORDER-001",
  "ref2": "CUSTOMER-123"
}
```

### Response

```json
{
  "status": "OK",
  "data": {
    "paymentRequestId": "pr_abc123",
    "qrCodeImage": "data:image/png;base64,...",
    "amount": 1000.00,
    "expiresAt": "2026-06-15T15:00:00Z"
  }
}
```

### Response Fields

| Field | Type | คำอธิบาย |
|---|---|---|
| `paymentRequestId` | string | ID ของ Payment Request |
| `qrCodeImage` | string | รูปภาพ QR Code (Base64) |
| `amount` | number | จำนวนเงินที่ต้องชำระ |
| `expiresAt` | string | วันหมดอายุ (ISO 8601) |

---

## สร้างรายการถอนเงิน (Pay-Out)

`POST /PayOutRequest/org/{orgId}/action/SubmitPayOutRequest/{merchantId}`

สร้าง Pay-Out Request สำหรับโอนเงินให้ลูกค้า

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `amount` | number | ✅ | จำนวนเงิน (THB) |
| `bankCode` | string | ✅ | รหัสธนาคาร |
| `bankAccountNo` | string | ✅ | เลขบัญชีธนาคาร |
| `bankAccountName` | string | ✅ | ชื่อบัญชีธนาคาร |
| `ref1` | string | ❌ | Reference 1 |

### ตัวอย่าง Request

```json
{
  "amount": 500.00,
  "bankCode": "SCB",
  "bankAccountNo": "1234567890",
  "bankAccountName": "สมชาย ใจดี",
  "ref1": "WITHDRAW-001"
}
```
