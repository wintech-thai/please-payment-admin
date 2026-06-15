---
title: Webhooks
version: "1.0.0"
updatedAt: "2026-06-15"
---

# Webhooks

Please Payment จะส่ง HTTP POST ไปยัง URL ที่กำหนดไว้เมื่อมีเหตุการณ์สำคัญเกิดขึ้น

## การตั้งค่า Webhook URL

ตั้งค่า Webhook URL ได้ที่ Admin Panel → Business Setup → Merchant → Keys & Users

## Events

| Event | คำอธิบาย |
|---|---|
| `payment.completed` | ลูกค้าชำระเงิน Pay-In สำเร็จ |
| `payment.expired` | QR Code หมดอายุโดยไม่มีการชำระ |
| `payout.completed` | โอนเงิน Pay-Out สำเร็จ |
| `payout.failed` | โอนเงิน Pay-Out ล้มเหลว |

## รูปแบบ Payload

```json
{
  "event": "payment.completed",
  "timestamp": "2026-06-15T10:30:00Z",
  "data": {
    "paymentRequestId": "pr_abc123",
    "merchantId": "m_xyz",
    "amount": 1000.00,
    "currency": "THB",
    "ref1": "ORDER-001",
    "ref2": "CUSTOMER-123",
    "paidAt": "2026-06-15T10:30:00Z"
  }
}
```

## การตรวจสอบ Signature

ทุก request จาก Please Payment จะมี header `X-Webhook-Signature` สำหรับยืนยันว่ามาจากระบบจริง

```javascript
const crypto = require('crypto')

function verifyWebhook(secret, rawBody, signature) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}

// ใน Express handler
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-webhook-signature']
  if (!verifyWebhook(process.env.WEBHOOK_SECRET, req.body, sig)) {
    return res.status(401).send('Invalid signature')
  }
  const event = JSON.parse(req.body)
  // จัดการ event ต่อ
  res.sendStatus(200)
})
```

## ข้อกำหนด Response

- ต้องตอบกลับด้วย HTTP **200** ภายใน **10 วินาที**
- หากไม่ได้รับ 200 ระบบจะ retry สูงสุด **3 ครั้ง** ห่างกัน 1, 5, 30 นาที

## Retry Policy

| ครั้งที่ | หน่วงเวลา |
|---|---|
| 1 | 1 นาที |
| 2 | 5 นาที |
| 3 | 30 นาที |
