---
title: การยืนยันตัวตน
---

# การยืนยันตัวตน

ระบบใช้ **HTTP Basic Authentication** ในการยืนยันตัวตน

## วิธีส่ง API Key

ทุก request ต้องใช้ **HTTP Basic Authentication** โดย:

- **Username:** `api` (ตายตัว)
- **Password:** API Key ที่ได้รับจากผู้ให้บริการ

HTTP library ทุกตัว (curl, Python requests, Ruby Net::HTTP) จัดการ encoding ให้อัตโนมัติ — ไม่ต้อง base64 เอง

> API Key สร้างและจัดการได้ใน Admin Panel → Business Setup → Pay-In Request Endpoint

## ตัวอย่างโค้ด

### cURL

```bash
curl -X POST "{{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}" \
  -u "api:YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"RefId1": "ORDER-001", "RequestedAmount": 325, "Currency": "THB", "QrProvider": "PP"}'
```

หรือใช้ header โดยตรง:

```bash
curl -X POST "{{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}" \
  -H "Authorization: Basic $(echo -n 'api:YOUR_API_KEY' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"RefId1": "ORDER-001", "RequestedAmount": 325, "Currency": "THB", "QrProvider": "PP"}'
```

### Python

```python
import requests

API_KEY = "YOUR_API_KEY"
ORG_ID = "your-org-id"
MERCHANT_ID = "your-merchant-id"
BASE_URL = "{{API_URL}}"

payload = {
    "RefId1": "ORDER-001",
    "RequestedAmount": 325,
    "Currency": "THB",
    "QrProvider": "PP"
}

response = requests.post(
    f"{BASE_URL}/PaymentRequest/org/{ORG_ID}/action/SubmitPayInRequest/{MERCHANT_ID}",
    auth=("api", API_KEY),
    json=payload
)

print(response.json())
```

<div class="warning-box">
<div class="warning-title">⚠ ข้อควรระวัง</div>

- ไม่เปิดเผย API Key ใน frontend code หรือ public repository
- หากสงสัยว่า API Key รั่วไหล ให้แจ้งผู้ให้บริการ เพื่อขอ API Key ใหม่ทันที
- API Key ผูกกับ Merchant — ใช้ Key ของ Merchant ที่ถูกต้องสำหรับแต่ละ request

</div>
