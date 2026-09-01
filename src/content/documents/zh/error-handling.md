---
title: 错误处理
---

# 错误处理

## Response 格式

无论请求成功还是失败，API 始终以相同的格式返回响应：

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

> **重要：** HTTP status code `200` 并不总是代表成功 — 你必须始终检查 JSON body 中的 `status` 字段。

## HTTP Status Codes

| Code | 含义 |
|---|---|
| `200` | 服务器已接收请求 — 请再次查看 body 中的 `status` |
| `400` | 提交的数据格式不正确 |
| `401` | API Key 不正确或未提供 |
| `403` | 无权访问该资源 |
| `404` | 未找到请求的资源 |
| `500` | 服务器内部错误 |

## Response Body 中的 Status Codes

| Status | 说明 |
|---|---|
| `OK` | 成功 |
| `REF_ID_MISSING` | 未提供 `RefId` |
| `INVALID_PAYMENT_AMOUNT` | `RequestedAmount` 必须大于 0 |
| `ERROR_NO_PAYIN_ACCOUNT` | 该 Merchant 尚未设置收款账户 |
| `INVALID_API_KEY` | API Key 不正确或已被停用 |
| `MERCHANT_NOT_FOUND` | 未找到指定的 Merchant ID |
| `UUID_INVALID` | UUID 格式不正确 |
| `NOTFOUND` | 未找到指定的 Payment Request |

## 错误处理示例

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
        print("Request timed out — 请重试")
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
