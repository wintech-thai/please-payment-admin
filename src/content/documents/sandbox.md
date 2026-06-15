---
title: ทดสอบ Sandbox
version: "1.0.0"
updatedAt: "2026-06-15"
---

# ทดสอบ Sandbox

Sandbox คือสภาพแวดล้อมสำหรับทดสอบโดยเฉพาะ ไม่มีการเคลื่อนไหวของเงินจริง

## Base URL

```
https://api-dev.please-payment.com/api
```

## การขอ API Key สำหรับ Sandbox

1. เข้า Admin Panel → Business Setup → Merchant
2. เลือก Merchant ที่ต้องการ
3. ไปที่ **Keys & Users**
4. คัดลอก **Pay-In API Key** หรือ **Pay-Out API Key**

> Merchant ใน Sandbox สามารถสร้าง API Key ได้ทันที ไม่ต้องรอ approval

## ข้อมูลทดสอบ

### บัญชีธนาคาร (Pay-In)

| ธนาคาร | เลขบัญชี | ชื่อบัญชี |
|---|---|---|
| KTB | `0980012757` | บัญชีทดสอบ KTB |
| SCB | `1234567890` | บัญชีทดสอบ SCB |
| PromptPay | `0812345678` | PromptPay ทดสอบ |

### จำลองผลลัพธ์

ส่ง `ref1` ด้วยค่าพิเศษเพื่อจำลองสถานะต่างๆ

| `ref1` | ผลลัพธ์ |
|---|---|
| `TEST_SUCCESS` | Payment สำเร็จทันที |
| `TEST_EXPIRE` | Payment หมดอายุใน 1 นาที |
| `TEST_FAIL` | Pay-Out ล้มเหลว |

## ข้อจำกัดของ Sandbox

- ธุรกรรมจะถูกล้างทุกวันอาทิตย์ 00:00 น.
- Rate Limit ใน Sandbox ต่ำกว่า Production (100 req/min)
- Webhook ส่งได้เฉพาะ URL ที่ขึ้นต้นด้วย `https://`

## ตัวอย่าง Request

```bash
curl -X POST https://api-dev.please-payment.com/api/PaymentRequest/org/{orgId}/action/SubmitPaymentRequest/{merchantId} \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-sandbox-api-key" \
  -H "X-Signature: hmac-sha256-signature" \
  -H "X-Timestamp: 1718445600" \
  -d '{
    "amount": 100.00,
    "ref1": "TEST_SUCCESS",
    "currency": "THB"
  }'
```

## ข้อแตกต่าง Sandbox vs Production

| | Sandbox | Production |
|---|---|---|
| เงินจริง | ❌ | ✅ |
| Webhook | จำลอง | จริง |
| Rate Limit | 100 req/min | 1,000 req/min |
| SLA | ไม่รับประกัน | 99.9% uptime |
