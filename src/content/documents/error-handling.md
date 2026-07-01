---
title: การจัดการ Error
---

# การจัดการ Error

## รูปแบบ Response

API ตอบกลับในรูปแบบเดียวกันเสมอ ทั้งกรณีสำเร็จและล้มเหลว:

```json
{
  "status": "OK",
  "description": "Success",
  "data": { ... }
}
```

```json
{
  "status": "INVALID_PAYMENT_AMOUNT",
  "description": "Request amount [0] must be greater than 0.00"
}
```

> **สำคัญ:** HTTP status code `200` ไม่ได้แปลว่าสำเร็จเสมอไป — ต้องตรวจ `status` ใน JSON body ด้วยเสมอ

## HTTP Status Codes

| Code | ความหมาย |
|---|---|
| `200` | Server รับ request แล้ว — ดู `status` ใน body อีกครั้ง |
| `400` | ข้อมูลที่ส่งมาไม่ถูกต้อง |
| `401` | API Key ไม่ถูกต้องหรือไม่ได้ส่งมา |
| `403` | ไม่มีสิทธิ์เข้าถึง resource นี้ |
| `404` | ไม่พบ resource ที่ร้องขอ |
| `500` | ข้อผิดพลาดภายใน server |

## Status Codes ใน Response Body

| Status | คำอธิบาย |
|---|---|
| `OK` | สำเร็จ |
| `REF_ID_MISSING` | ไม่ได้ส่ง `RefId` มา |
| `INVALID_PAYMENT_AMOUNT` | `RequestedAmount` ต้องมากกว่า 0 |
| `ERROR_NO_PAYIN_ACCOUNT` | ไม่มีบัญชีรับเงินที่ตั้งค่าไว้สำหรับ Merchant นี้ |
| `INVALID_API_KEY` | API Key ไม่ถูกต้องหรือถูกปิดใช้งาน |
| `MERCHANT_NOT_FOUND` | ไม่พบ Merchant ID ที่ระบุ |
| `UUID_INVALID` | รูปแบบ UUID ไม่ถูกต้อง |
| `NOTFOUND` | ไม่พบ Payment Request ที่ระบุ |

## ตัวอย่างการจัดการ Error

### Python

```python
import requests

def create_payment(org_id, merchant_id, api_key, ref_id, amount):
    url = f"{{API_URL}}/PaymentRequest/org/{org_id}/action/SubmitPayInRequest/{merchant_id}"

    try:
        response = requests.post(
            url,
            auth=("api", api_key),
            json={"RefId": ref_id, "RequestedAmount": amount},
            timeout=10
        )
        response.raise_for_status()
        result = response.json()

        if result.get("status") != "OK":
            print(f"API Error [{result['status']}]: {result.get('description')}")
            return None

        return result["data"]

    except requests.exceptions.Timeout:
        print("Request timed out — กรุณาลองใหม่")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        return None
```

### JavaScript (fetch)

```javascript
async function createPayment(orgId, merchantId, apiKey, refId, amount) {
  const credentials = btoa(`api:${apiKey}`)
  const url = `{{API_URL}}/PaymentRequest/org/${orgId}/action/SubmitPayInRequest/${merchantId}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ RefId: refId, RequestedAmount: amount }),
    })

    const data = await res.json()

    if (data.status !== 'OK') {
      console.error(`API Error [${data.status}]: ${data.description}`)
      return null
    }

    return data.data
  } catch (err) {
    console.error('Network error:', err)
    return null
  }
}
```
