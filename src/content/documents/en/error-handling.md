---
title: Error Handling
---

# Error Handling

## Response Format

The API always responds in the same format, whether the request succeeds or fails:

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

> **Important:** An HTTP status code of `200` does not always mean success — you must always check the `status` field in the JSON body.

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | The server accepted the request — check the `status` in the body as well |
| `400` | The submitted data is invalid |
| `401` | The API Key is invalid or was not provided |
| `403` | No permission to access this resource |
| `404` | The requested resource was not found |
| `500` | Internal server error |

## Status Codes in the Response Body

| Status | Description |
|---|---|
| `OK` | Success |
| `REF_ID_MISSING` | `RefId` was not provided |
| `INVALID_PAYMENT_AMOUNT` | `RequestedAmount` must be greater than 0 |
| `ERROR_NO_PAYIN_ACCOUNT` | No Pay-In account is configured for this Merchant |
| `INVALID_API_KEY` | The API Key is invalid or has been disabled |
| `MERCHANT_NOT_FOUND` | The specified Merchant ID was not found |
| `UUID_INVALID` | The UUID format is invalid |
| `NOTFOUND` | The specified Payment Request was not found |

## Error Handling Examples

### Python

```python
import requests

def create_payment(org_id, merchant_id, api_key, ref_id, amount):
    url = f"{{API_URL}}/api/PaymentRequest/org/{org_id}/action/SubmitPayInRequest/{merchant_id}"

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
        print("Request timed out — please try again")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        return None
```

### JavaScript (fetch)

```javascript
async function createPayment(orgId, merchantId, apiKey, refId, amount) {
  const credentials = btoa(`api:${apiKey}`)
  const url = `{{API_URL}}/api/PaymentRequest/org/${orgId}/action/SubmitPayInRequest/${merchantId}`

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
