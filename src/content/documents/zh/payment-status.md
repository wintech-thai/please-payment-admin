---
title: 支付状态
---

# 支付状态

## Pay-In 状态

| 状态 | 值 | 说明 |
|---|---|---|
| 待付款 | `Pending` | 已创建 Payment Request，等待客户转账 |
| 付款成功 | `Paid` | 银行已确认收到款项 |
| 已拒绝 | `Rejected` | 该笔交易被拒绝（例如金额不符） |

## Pay-Out 状态

| 状态 | 值 | 说明 |
|---|---|---|
| 处理中 | `Pending` | 已收到请求，等待系统处理 |
| 转账成功 | `Paid` | 已成功转账至目标账户 |
| 已拒绝 | `Rejected` | 转账失败（例如目标账户信息不正确） |

## 重要：请始终检查 Response Body 中的 status

HTTP status code `200` 只表示服务器已成功接收请求 — 你必须始终检查 JSON response body 中的 `status` 字段。

```json
{
  "status": "OK",       ← 检查此处
  "description": "Success",
  "data": {
    "Status": "Pending"  ← 并检查此处的支付状态
  }
}
```

Python 检查示例：

```python
response = requests.post(url, auth=("api", API_KEY), json=payload)
result = response.json()

if result.get("status") != "OK":
    # API 错误 — 查看 description 获取详细信息
    print(f"Error: {result.get('description')}")
else:
    payment_status = result["data"]["Status"]
    payment_id = result["data"]["Id"]
    print(f"Payment {payment_id} status: {payment_status}")
```

## 实时状态

除了轮询检查状态外，系统还支持通过 WebSocket 实时接收状态更新，使用从 Pay-In response 中获取的 `SessionId` 和 `WebsocketPath`。

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
