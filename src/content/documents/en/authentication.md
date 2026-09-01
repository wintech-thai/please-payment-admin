---
title: Authentication
---

# Authentication

The system uses **HTTP Basic Authentication** for authentication.

## How to Send the API Key

Every request must use **HTTP Basic Authentication**:

- **Username:** `api` (fixed)
- **Password:** the API Key issued by the provider

Every HTTP library (curl, Python requests, Ruby Net::HTTP) handles the encoding automatically — you don't need to base64-encode it yourself.

> API Keys are created and managed in the Admin Panel → Business Setup → Pay-In Request Endpoint

## Code Examples

### cURL

```bash
curl -X POST "{{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}" \
  -u "api:YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"RefId1": "ORDER-001", "RequestedAmount": 325, "Currency": "THB", "QrProvider": "PP"}'
```

Or use the header directly:

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
<div class="warning-title">⚠ Important</div>

- Do not expose the API Key in frontend code or a public repository
- If you suspect the API Key has leaked, notify the provider immediately to request a new one
- The API Key is tied to a Merchant — use the correct Merchant's Key for each request

</div>
