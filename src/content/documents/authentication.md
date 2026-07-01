---
title: การยืนยันตัวตน
---

# การยืนยันตัวตน

Please Payment ใช้ **HTTP Basic Authentication** ในการยืนยันตัวตน

## วิธีส่ง API Key

ทุก request ต้องส่ง `Authorization` header ในรูปแบบ Basic Auth โดย:

- **Username:** `api` (ตายตัว)
- **Password:** API Key ที่ได้รับจากผู้ให้บริการ

```
Authorization: Basic base64("api:YOUR_API_KEY")
```

> API Key สร้างและจัดการได้ใน Admin Panel → Business Setup → Pay-In Request Endpoint

## ตัวอย่างโค้ด

### cURL

```bash
curl -X POST "{{API_URL}}/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}" \
  -u "api:YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"RefId": "ORDER-001", "RequestedAmount": 325}'
```

หรือใช้ header โดยตรง:

```bash
curl -X POST "{{API_URL}}/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}" \
  -H "Authorization: Basic $(echo -n 'api:YOUR_API_KEY' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"RefId": "ORDER-001", "RequestedAmount": 325}'
```

### Python

```python
import requests

API_KEY = "YOUR_API_KEY"
ORG_ID = "your-org-id"
MERCHANT_ID = "your-merchant-id"
BASE_URL = "{{API_URL}}"

payload = {
    "RefId": "ORDER-001",
    "RequestedAmount": 325
}

response = requests.post(
    f"{BASE_URL}/PaymentRequest/org/{ORG_ID}/action/SubmitPayInRequest/{MERCHANT_ID}",
    auth=("api", API_KEY),
    json=payload
)

print(response.json())
```

## ข้อควรระวัง

- ไม่เปิดเผย API Key ใน frontend code หรือ public repository
- หากสงสัยว่า API Key รั่วไหล ให้ลบและสร้างใหม่ใน Admin Panel ทันที
- API Key ผูกกับ Merchant — ใช้ Key ของ Merchant ที่ถูกต้องสำหรับแต่ละ request
