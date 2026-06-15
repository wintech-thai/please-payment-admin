---
title: สถานะการชำระเงิน
version: "1.0.0"
updatedAt: "2026-06-15"
---

# สถานะการชำระเงิน

## สถานะ Pay-In

| สถานะ | ค่า | คำอธิบาย |
|---|---|---|
| รอชำระ | `Pending` | สร้าง Payment Request แล้ว รอลูกค้าโอนเงิน |
| สำเร็จ | `Completed` | ได้รับเงินเรียบร้อย |
| หมดอายุ | `Expired` | QR Code หมดอายุ ไม่มีการชำระเงิน |
| ยกเลิก | `Cancelled` | ยกเลิกโดย merchant |

## สถานะ Pay-Out

| สถานะ | ค่า | คำอธิบาย |
|---|---|---|
| รอดำเนินการ | `Pending` | รอระบบประมวลผลการโอน |
| กำลังโอน | `Processing` | อยู่ระหว่างโอนเงินไปยังบัญชีปลายทาง |
| สำเร็จ | `Completed` | โอนเงินสำเร็จ |
| ล้มเหลว | `Failed` | โอนเงินไม่สำเร็จ (เลขบัญชีผิด, ยอดไม่พอ) |

## การตรวจสอบสถานะ

### Pay-In

`GET /PaymentRequest/org/{orgId}/GetPaymentRequest/{paymentRequestId}`

```json
{
  "status": "OK",
  "data": {
    "paymentRequestId": "pr_abc123",
    "status": "Completed",
    "amount": 1000.00,
    "paidAt": "2026-06-15T10:30:00Z"
  }
}
```

### Pay-Out

`GET /PayOutRequest/org/{orgId}/GetPayOutRequest/{payOutRequestId}`

```json
{
  "status": "OK",
  "data": {
    "payOutRequestId": "po_xyz789",
    "status": "Completed",
    "amount": 500.00,
    "transferredAt": "2026-06-15T11:00:00Z"
  }
}
```

## Real-Time Status (SignalR)

นอกจากการ polling API แล้ว ระบบรองรับการรับสถานะแบบ real-time ผ่าน SignalR

### เชื่อมต่อ Hub

```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl('https://api.please-payment.com/realtime/payment-tx', {
    skipNegotiation: true,
    transport: signalR.HttpTransportType.WebSockets,
    accessTokenFactory: () => apiKey,
  })
  .build()

await connection.start()
await connection.invoke('JoinPayment', sessionId)
```

### Events

| Event | คำอธิบาย |
|---|---|
| `payment.completed` | ชำระเงินสำเร็จ |
