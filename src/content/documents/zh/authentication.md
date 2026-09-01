---
title: 身份验证
---

# 身份验证

系统使用 **HTTP Basic Authentication** 进行身份验证。

## 如何发送 API Key

每个请求都必须使用 **HTTP Basic Authentication**：

- **Username：** `api`（固定值）
- **Password：** 服务提供商颁发的 API Key

所有 HTTP 库（curl、Python requests、Ruby Net::HTTP）都会自动处理编码 —— 无需自行进行 base64 编码。

> API Key 可在 Admin Panel → Business Setup → Pay-In Request Endpoint 中创建和管理

## 代码示例

### cURL

```bash
curl -X POST "{{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}" \
  -u "api:YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"RefId1": "ORDER-001", "RequestedAmount": 325, "Currency": "THB", "QrProvider": "PP"}'
```

或直接使用 header：

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
<div class="warning-title">⚠ 注意事项</div>

- 不要在前端代码或公共代码仓库中暴露 API Key
- 如果怀疑 API Key 已泄露，请立即联系服务提供商申请新的 API Key
- API Key 与商户绑定 —— 每个请求都应使用对应商户的正确 Key

</div>
