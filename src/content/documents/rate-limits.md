---
title: Rate Limits
version: "1.0.0"
updatedAt: "2026-06-15"
---

# Rate Limits

## ขีดจำกัดการเรียก API

| สภาพแวดล้อม | ขีดจำกัด |
|---|---|
| Production | 1,000 request / นาที |
| Sandbox | 100 request / นาที |

ขีดจำกัดคำนวณต่อ **API Key** ไม่ใช่ต่อ IP

## Response Headers

ทุก response จะมี header แสดงสถานะ rate limit

| Header | ความหมาย |
|---|---|
| `X-RateLimit-Limit` | จำนวน request สูงสุดต่อนาที |
| `X-RateLimit-Remaining` | request ที่เหลือในช่วงเวลาปัจจุบัน |
| `X-RateLimit-Reset` | Unix timestamp ที่ขีดจำกัดจะรีเซ็ต |

## เมื่อเกินขีดจำกัด

API จะตอบกลับด้วย HTTP **429 Too Many Requests**

```json
{
  "status": "ERROR",
  "code": "RATE_LIMIT_EXCEEDED",
  "description": "Too many requests. Please retry after 30 seconds.",
  "retryAfter": 30
}
```

## การจัดการใน Code

```javascript
async function callApiWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options)

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '60')
      console.warn(`Rate limited, retrying in ${retryAfter}s...`)
      await new Promise(r => setTimeout(r, retryAfter * 1000))
      continue
    }

    return res
  }
  throw new Error('Max retries exceeded')
}
```

## แนวทางลดการใช้ Rate Limit

- **Cache ข้อมูล** ที่ไม่เปลี่ยนบ่อย เช่น รายการธนาคาร
- **Batch requests** แทนการเรียกทีละ request
- **Webhook** แทนการ poll สถานะซ้ำๆ
- ใช้ **exponential backoff** เมื่อได้รับ 429

## ขีดจำกัดเพิ่มเติม

| ประเภท | ขีดจำกัด |
|---|---|
| ขนาด Request Body | 1 MB |
| Webhook Timeout | 10 วินาที |
| QR Code อายุ | 15 นาที |
| Pay-Out ต่อวัน | ตามแพ็กเกจ |
