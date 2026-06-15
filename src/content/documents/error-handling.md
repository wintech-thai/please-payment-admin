---
title: การจัดการ Error
version: "1.0.0"
updatedAt: "2026-06-15"
---

# การจัดการ Error

## รูปแบบ Error Response

เมื่อเกิดข้อผิดพลาด API จะตอบกลับในรูปแบบนี้เสมอ

```json
{
  "status": "ERROR",
  "description": "คำอธิบายข้อผิดพลาด",
  "code": "ERROR_CODE"
}
```

## HTTP Status Codes

| Status Code | ความหมาย |
|---|---|
| `200` | สำเร็จ |
| `400` | ข้อมูลที่ส่งมาไม่ถูกต้อง (Bad Request) |
| `401` | ไม่ได้รับอนุญาต — API Key หรือ Signature ผิด |
| `403` | ไม่มีสิทธิ์เข้าถึง resource นี้ |
| `404` | ไม่พบ resource ที่ร้องขอ |
| `429` | ส่ง request เกิน Rate Limit |
| `500` | ข้อผิดพลาดภายใน server |

## Error Codes

| Code | คำอธิบาย |
|---|---|
| `INVALID_SIGNATURE` | Signature ไม่ถูกต้อง |
| `EXPIRED_TIMESTAMP` | Timestamp เกิน 5 นาที |
| `INVALID_API_KEY` | API Key ไม่ถูกต้องหรือถูกปิดใช้งาน |
| `MERCHANT_NOT_FOUND` | ไม่พบ Merchant |
| `INSUFFICIENT_BALANCE` | ยอดเงินไม่เพียงพอ (Pay-Out) |
| `INVALID_BANK_ACCOUNT` | ข้อมูลบัญชีธนาคารไม่ถูกต้อง |
| `PAYMENT_EXPIRED` | Payment Request หมดอายุแล้ว |
| `RATE_LIMIT_EXCEEDED` | เกิน Rate Limit |

## ตัวอย่างการจัดการ Error

```javascript
async function submitPayment(payload) {
  try {
    const res = await fetch('/api/payment', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (data.status !== 'OK') {
      switch (data.code) {
        case 'INSUFFICIENT_BALANCE':
          alert('ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อน')
          break
        case 'INVALID_BANK_ACCOUNT':
          alert('ข้อมูลบัญชีปลายทางไม่ถูกต้อง')
          break
        default:
          alert(`เกิดข้อผิดพลาด: ${data.description}`)
      }
      return null
    }
    return data.data
  } catch (err) {
    console.error('Network error:', err)
    alert('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง')
    return null
  }
}
```

## Idempotency

สำหรับ Pay-Out request แนะนำให้ส่ง `X-Idempotency-Key` header เพื่อป้องกันการโอนซ้ำกรณี network timeout

```http
POST /PayOutRequest/...
X-Idempotency-Key: unique-request-id-here
```

หากส่ง request ซ้ำด้วย key เดิม ระบบจะคืนผลลัพธ์ของ request เดิมโดยไม่ทำรายการซ้ำ
