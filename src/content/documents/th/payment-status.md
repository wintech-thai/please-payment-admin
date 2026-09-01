---
title: สถานะการชำระเงิน
---

# สถานะการชำระเงิน

## สถานะ Pay-In

| สถานะ | ค่า | คำอธิบาย |
|---|---|---|
| รอชำระ | `Pending` | สร้าง Payment Request แล้ว รอลูกค้าโอนเงิน |
| ชำระสำเร็จ | `Paid` | ธนาคารยืนยันว่าได้รับเงินแล้ว |
| ถูกปฏิเสธ | `Rejected` | รายการถูก reject (เช่น ยอดเงินไม่ตรง) |

## สถานะ Pay-Out

| สถานะ | ค่า | คำอธิบาย |
|---|---|---|
| รอดำเนินการ | `Pending` | รับคำขอแล้ว รอระบบประมวลผล |
| โอนสำเร็จ | `Paid` | โอนเงินไปยังบัญชีปลายทางสำเร็จ |
| ถูกปฏิเสธ | `Rejected` | โอนไม่สำเร็จ (เช่น บัญชีปลายทางไม่ถูกต้อง) |

## สำคัญ: ตรวจสอบ status ใน response body เสมอ

HTTP status code `200` บอกแค่ว่า server รับ request ได้ — ต้องตรวจ `status` ใน JSON response body ด้วยเสมอ

```json
{
  "status": "OK",       ← ตรวจตรงนี้
  "description": "Success",
  "data": {
    "Status": "Pending"  ← และตรวจสถานะ payment ตรงนี้
  }
}
```

ตัวอย่างการตรวจสอบใน Python:

```python
response = requests.post(url, auth=("api", API_KEY), json=payload)
result = response.json()

if result.get("status") != "OK":
    # API error — ดู description สำหรับรายละเอียด
    print(f"Error: {result.get('description')}")
else:
    payment_status = result["data"]["Status"]
    payment_id = result["data"]["Id"]
    print(f"Payment {payment_id} status: {payment_status}")
```

## Real-Time Status

นอกจากการตรวจสถานะแบบ polling แล้ว ระบบรองรับการรับสถานะแบบ real-time ผ่าน WebSocket โดยใช้ `SessionId` และ `WebsocketPath` ที่ได้รับจาก Pay-In response

```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl(`{{API_URL}}/realtime/payment-tx`, {
    skipNegotiation: true,
    transport: signalR.HttpTransportType.WebSockets,
    accessTokenFactory: () => API_KEY,
  })
  .build()

await connection.start()
await connection.invoke('JoinPayment', sessionId)

connection.on('payment.completed', (data) => {
  console.log('Payment completed:', data)
})
```
