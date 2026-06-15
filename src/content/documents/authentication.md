---
title: การยืนยันตัวตน
---

# การยืนยันตัวตน

API ทุก endpoint ต้องส่ง Header ต่อไปนี้:

| Header | ค่า | คำอธิบาย |
|---|---|---|
| `X-API-Key` | `your-api-key` | API Key ที่ได้รับจากระบบ |
| `X-Signature` | HMAC-SHA256 | Signature ที่สร้างจาก request body |
| `X-Timestamp` | Unix timestamp | เวลาปัจจุบัน (วินาที) |

## การสร้างลายเซ็น

Signature คำนวณจาก HMAC-SHA256 ของ `timestamp + "." + body` โดยใช้ API Secret เป็น key

### ตัวอย่างโค้ด

```javascript
const crypto = require('crypto')

function createSignature(apiSecret, timestamp, body) {
  const message = `${timestamp}.${body}`
  return crypto
    .createHmac('sha256', apiSecret)
    .update(message)
    .digest('hex')
}

// ตัวอย่างการใช้งาน
const timestamp = Math.floor(Date.now() / 1000).toString()
const body = JSON.stringify({ amount: 100, currency: 'THB' })
const signature = createSignature(process.env.API_SECRET, timestamp, body)
```

```python
import hmac
import hashlib
import time
import json

def create_signature(api_secret, body):
    timestamp = str(int(time.time()))
    message = f"{timestamp}.{body}"
    signature = hmac.new(
        api_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return timestamp, signature
```

## ข้อควรระวัง

- Timestamp ต้องอยู่ภายใน **5 นาที** จากเวลาปัจจุบันของ server
- ห้ามเปิดเผย API Secret ใน frontend code
- หมุนเวียน API Key เป็นประจำเพื่อความปลอดภัย
