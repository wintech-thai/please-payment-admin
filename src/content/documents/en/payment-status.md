---
title: Payment Status
---

# Payment Status

## Pay-In Status

| Status | Value | Description |
|---|---|---|
| Awaiting payment | `Pending` | The Payment Request has been created; waiting for the customer to transfer funds |
| Paid successfully | `Paid` | The bank has confirmed the funds were received |
| Rejected | `Rejected` | The transaction was rejected (e.g. the amount didn't match) |

## Pay-Out Status

| Status | Value | Description |
|---|---|---|
| Pending | `Pending` | The request has been received; awaiting processing |
| Transfer successful | `Paid` | Funds were successfully transferred to the destination account |
| Rejected | `Rejected` | The transfer failed (e.g. an invalid destination account) |

## Important: Always Check the Status in the Response Body

An HTTP status code of `200` only means the server accepted the request — you must always check the `status` field in the JSON response body as well.

```json
{
  "status": "OK",       ← check here
  "description": "Success",
  "data": {
    "Status": "Pending"  ← and check the payment status here
  }
}
```

Example check in Python:

```python
response = requests.post(url, auth=("api", API_KEY), json=payload)
result = response.json()

if result.get("status") != "OK":
    # API error — see description for details
    print(f"Error: {result.get('description')}")
else:
    payment_status = result["data"]["Status"]
    payment_id = result["data"]["Id"]
    print(f"Payment {payment_id} status: {payment_status}")
```

## Real-Time Status

In addition to polling for status, the system supports receiving status updates in real time via WebSocket, using the `SessionId` and `WebsocketPath` returned in the Pay-In response.

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
