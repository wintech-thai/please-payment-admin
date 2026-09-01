---
title: Webhooks
---

# Webhooks

当支付成功时，系统会向商户配置的 Webhook URL 发送 HTTP POST 请求，以便商户更新其自身系统中的数据。

## 配置 Webhook URL

可在 **Admin Panel → Business Setup → Webhook Config** 中配置 —— 点击 "Add Webhook"

商户 Webhook URL 示例：`https://your-domain.com/webhooks/payment`

## Events

| Event | 说明 |
|---|---|
| `PaymentIn.Success` | 客户的 Pay-In 支付成功，资金已进入商户账户 |
| `PaymentIn.Rejected` | Pay-In Request 被拒绝 |
| `PaymentOut.Success` | 系统的 Pay-Out 转账成功，资金已转入目标账户 |
| `PaymentOut.Rejected` | Pay-Out Request 被拒绝 |

## Payload 中的新增字段

从此版本起，所有 webhook payload 都会新增 3 个参数：

| Parameter | 说明 |
|---|---|
| `EVENT_TYPE` | Event 类型，例如 `PaymentIn.Success`、`PaymentIn.Rejected`、`PaymentOut.Success`、`PaymentOut.Rejected` |
| `STATUS_CODE` | 处理状态 —— 无问题时为 `OK`；**对于 Rejected 事件，值不会为 `OK`** |
| `STATUS_REASON` | 状态的原因说明 —— 当 `STATUS_CODE` 不为 `OK` 时会有值（例如 Rejected 事件） |
| `PAYMENT_TYPE` | 支付类型 —— 仅为 `PayIn` 或 `PayOut` |

> **注意：** Rejected 类型的事件（`PaymentIn.Rejected`、`PaymentOut.Rejected`）的 `STATUS_CODE` 永远不等于 `"OK"`。可使用此字段判断处理是否出现问题。

---

## Payload 格式

### PaymentIn.Success

```json
{
  "Id": "job-uuid",
  "Type": "PaymentIn.Success",
  "Parameters": [
    { "Name": "EVENT_TYPE",              "Value": "PaymentIn.Success" },
    { "Name": "STATUS_CODE",             "Value": "OK" },
    { "Name": "PAYMENT_TYPE",            "Value": "PayIn" },
    { "Name": "ORG_ID",                  "Value": "org-id" },
    { "Name": "PMR_ID",                  "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID1",             "Value": "ORDER-20260701-001" },
    { "Name": "PMR_REF_ID2",             "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",             "Value": null },
    { "Name": "MERCHANT_ID",             "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",           "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",           "Value": "商户名称" },
    { "Name": "PAYIN_REQUEST_AMOUNT",    "Value": "325" },
    { "Name": "PAYIN_GENERATED_AMOUNT",  "Value": "325.52" },
    { "Name": "PAYIN_FEE_PCT",           "Value": "0" },
    { "Name": "PAYIN_BANK_CODE",         "Value": "SCB" },
    { "Name": "PAYIN_BANK_ACCOUNT_NO",   "Value": "xxx-xxxxx-x" },
    { "Name": "PAYIN_BANK_ACCOUNT_NAME", "Value": "账户名称" }
  ]
}
```

#### 关键字段

| Parameter | 说明 |
|---|---|
| `EVENT_TYPE` | `PaymentIn.Success` |
| `STATUS_CODE` | `OK` |
| `PAYMENT_TYPE` | `PayIn` |
| `PMR_REF_ID1` | Ref 1 —— 商户在创建 Payment Request 时提供的 Reference ID，用于与商户系统中的订单进行映射 |
| `PMR_REF_ID2` | Ref 2 —— 商户设置的可选参考字段 |
| `PMR_REF_ID3` | Ref 3 —— 商户设置的可选参考字段 |
| `PMR_ID` | 系统中 Payment Request 的 UUID |
| `PAYIN_REQUEST_AMOUNT` | 最初请求的金额 |
| `PAYIN_GENERATED_AMOUNT` | 实际收到的金额（可能存在细微差额） |

---

### PaymentIn.Rejected

```json
{
  "Id": "job-uuid",
  "Type": "PaymentIn.Rejected",
  "Parameters": [
    { "Name": "EVENT_TYPE",              "Value": "PaymentIn.Rejected" },
    { "Name": "STATUS_CODE",             "Value": "REJECTED" },
    { "Name": "STATUS_REASON",           "Value": "拒绝原因" },
    { "Name": "PAYMENT_TYPE",            "Value": "PayIn" },
    { "Name": "ORG_ID",                  "Value": "org-id" },
    { "Name": "PMR_ID",                  "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID1",             "Value": "ORDER-20260701-001" },
    { "Name": "PMR_REF_ID2",             "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",             "Value": null },
    { "Name": "MERCHANT_ID",             "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",           "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",           "Value": "商户名称" },
    { "Name": "PAYIN_REQUEST_AMOUNT",    "Value": "325" },
    { "Name": "PAYIN_BANK_CODE",         "Value": "SCB" },
    { "Name": "PAYIN_BANK_ACCOUNT_NO",   "Value": "xxx-xxxxx-x" },
    { "Name": "PAYIN_BANK_ACCOUNT_NAME", "Value": "账户名称" }
  ]
}
```

#### 关键字段

| Parameter | 说明 |
|---|---|
| `EVENT_TYPE` | `PaymentIn.Rejected` |
| `STATUS_CODE` | 不为 `OK` —— 用于判断是否出现问题 |
| `STATUS_REASON` | 拒绝原因 |
| `PAYMENT_TYPE` | `PayIn` |
| `PMR_ID` | 被拒绝的 Pay-In Request 的 UUID |

---

### PaymentOut.Success

```json
{
  "Id": "job-uuid",
  "Type": "PaymentOut.Success",
  "Parameters": [
    { "Name": "EVENT_TYPE",                "Value": "PaymentOut.Success" },
    { "Name": "STATUS_CODE",               "Value": "OK" },
    { "Name": "PAYMENT_TYPE",              "Value": "PayOut" },
    { "Name": "ORG_ID",                    "Value": "org-id" },
    { "Name": "PMT_ID",                    "Value": "payment-tx-uuid" },
    { "Name": "PMR_ID",                    "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID1",               "Value": "260802110325" },
    { "Name": "PMR_REF_ID2",               "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",               "Value": null },
    { "Name": "MERCHANT_ID",               "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",             "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",             "Value": "商户名称" },
    { "Name": "TX_AMOUNT",                 "Value": "1000.00" },
    { "Name": "PAYOUT_REQUEST_AMOUNT",     "Value": "1000" },
    { "Name": "PAYOUT_FEE",                "Value": "5.00" },
    { "Name": "PAYOUT_FEE_PCT",            "Value": "0.5" },
    { "Name": "PAYOUT_BANK_CODE",          "Value": "KBank" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NO",    "Value": "xxx-xxxxx-x" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NAME",  "Value": "目标账户名称" },
    { "Name": "PAYOUT_PROMPTPAY_ID",       "Value": null },
    { "Name": "PAYOUT_PAID_AMOUNT_INCLUSIVE", "Value": "1000.00" },
    { "Name": "PAYOUT_IS_PARTIAL",         "Value": "False" }
  ]
}
```

#### 关键字段

| Parameter | 说明 |
|---|---|
| `EVENT_TYPE` | `PaymentOut.Success` |
| `STATUS_CODE` | `OK` |
| `PAYMENT_TYPE` | `PayOut` |
| `PMR_REF_ID1` | Ref 1（自动生成，格式为 YYMMDDHHMMSS） |
| `PMR_REF_ID2` | Ref 2 —— 商户设置的可选参考字段 |
| `PMR_REF_ID3` | Ref 3 —— 商户设置的可选参考字段 |
| `PMR_ID` | 系统中 Pay-Out Request 的 UUID |
| `TX_AMOUNT` | 本轮实际转出的金额（单笔交易） |
| `PAYOUT_REQUEST_AMOUNT` | 最初请求转出的金额 |
| `PAYOUT_FEE` | 手续费 |
| `PAYOUT_BANK_CODE` | 目标银行代码 |
| `PAYOUT_PAID_AMOUNT_INCLUSIVE` | 该 Pay-Out Request 迄今累计已转出的总金额（含至本轮的所有轮次）—— 与仅表示本轮金额的 `TX_AMOUNT` 不同 |
| `PAYOUT_IS_PARTIAL` | 若为 P2P 分批付款则为 `True`（详见下文） |

#### 与 P2P 相关的 PaymentOut.Success

对于匹配到 **P2P Pay-In** 的 Pay-Out Request（`PAYOUT_IS_PARTIAL = "True"`），`PaymentOut.Success` webhook **可能针对同一个 Pay-Out Request 被发送多次** —— 因为一笔 Pay-Out 可能由多笔 P2P Pay-In 分批完成（partial payouts）。

**示例：** 一笔 10,000 泰铢的 Pay-Out Request 可能通过 3 轮 P2P Pay-In 完成：

| 轮次 | TX_AMOUNT（本轮金额） | PAYOUT_PAID_AMOUNT_INCLUSIVE（累计金额） | PAYOUT_IS_PARTIAL |
|---|---|---|---|
| 第 1 轮 | 4,000 泰铢 | 4,000 泰铢 | `True` |
| 第 2 轮 | 3,500 泰铢 | 7,500 泰铢 | `True` |
| 第 3 轮 | 2,500 泰铢 | 10,000 泰铢 | `True` |

**商户系统应执行的操作：**

- 始终先检查 `PAYOUT_IS_PARTIAL`
- 若为 `True` —— 不要立即将 Pay-Out 标记为「已完成」，应比较 `PAYOUT_PAID_AMOUNT_INCLUSIVE` 与 `PAYOUT_REQUEST_AMOUNT`，而不是自行逐轮累加 `TX_AMOUNT`（系统已在此字段中提供累计金额）
- 若为 `False` —— Pay-Out 已一次性完成，可立即标记为「已完成」

```python
# 示例：处理 P2P 类型的 PaymentOut.Success
elif event_type == 'PaymentOut.Success':
    paid_inclusive = float(params.get('PAYOUT_PAID_AMOUNT_INCLUSIVE', 0))
    requested_amount = float(params.get('PAYOUT_REQUEST_AMOUNT', 0))
    is_partial = params.get('PAYOUT_IS_PARTIAL', 'False') == 'True'
    pmr_id = params.get('PMR_ID')

    if is_partial:
        # P2P 分批 —— 直接检查系统提供的累计金额，无需自行累加
        if paid_inclusive >= requested_amount:
            mark_payout_completed(pmr_id)
    else:
        # 一次性付清
        mark_payout_completed(pmr_id)
```

---

### PaymentOut.Rejected

```json
{
  "Id": "job-uuid",
  "Type": "PaymentOut.Rejected",
  "Parameters": [
    { "Name": "EVENT_TYPE",                  "Value": "PaymentOut.Rejected" },
    { "Name": "STATUS_CODE",                 "Value": "REJECTED" },
    { "Name": "STATUS_REASON",               "Value": "拒绝原因" },
    { "Name": "PAYMENT_TYPE",                "Value": "PayOut" },
    { "Name": "ORG_ID",                      "Value": "org-id" },
    { "Name": "PMR_ID",                      "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID1",                 "Value": "260802110325" },
    { "Name": "PMR_REF_ID2",                 "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",                 "Value": null },
    { "Name": "MERCHANT_ID",                 "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",               "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",               "Value": "商户名称" },
    { "Name": "PAYOUT_REQUEST_AMOUNT",       "Value": "1000" },
    { "Name": "PAYOUT_BANK_CODE",            "Value": "KBank" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NO",      "Value": "xxx-xxxxx-x" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NAME",    "Value": "目标账户名称" }
  ]
}
```

#### 关键字段

| Parameter | 说明 |
|---|---|
| `EVENT_TYPE` | `PaymentOut.Rejected` |
| `STATUS_CODE` | 不为 `OK` —— 用于判断是否出现问题 |
| `STATUS_REASON` | 拒绝原因 |
| `PAYMENT_TYPE` | `PayOut` |
| `PMR_ID` | 被拒绝的 Pay-Out Request 的 UUID |

## Webhook 接收示例

### Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/payment', methods=['POST'])
def handle_webhook():
    data = request.get_json()
    event_type = data.get('Type')

    # 将 Parameters 数组转换为 dict
    params = {p['Name']: p['Value'] for p in data.get('Parameters', [])}
    ref_id = params.get('PMR_REF_ID1')

    status_code = params.get('STATUS_CODE')
    payment_type = params.get('PAYMENT_TYPE')

    if event_type == 'PaymentIn.Success':
        amount = params.get('PAYIN_REQUEST_AMOUNT')
        update_order_status(ref_id, 'paid_in', amount)

    elif event_type == 'PaymentIn.Rejected':
        reason = params.get('STATUS_REASON')
        update_order_status(ref_id, 'rejected', reason=reason)

    elif event_type == 'PaymentOut.Success':
        amount = params.get('TX_AMOUNT')
        update_order_status(ref_id, 'paid_out', amount)

    elif event_type == 'PaymentOut.Rejected':
        reason = params.get('STATUS_REASON')
        update_order_status(ref_id, 'payout_rejected', reason=reason)

    return jsonify({'status': 'ok'}), 200
```

### Node.js (Express)

```javascript
app.post('/webhooks/payment', express.json(), (req, res) => {
  const { Type, Parameters } = req.body
  const params = Object.fromEntries(Parameters.map(p => [p.Name, p.Value]))
  const refId = params.PMR_REF_ID1

  if (Type === 'PaymentIn.Success') {
    updateOrderStatus(refId, 'paid_in', params.PAYIN_REQUEST_AMOUNT)
  } else if (Type === 'PaymentIn.Rejected') {
    updateOrderStatus(refId, 'rejected', null, params.STATUS_REASON)
  } else if (Type === 'PaymentOut.Success') {
    updateOrderStatus(refId, 'paid_out', params.TX_AMOUNT)
  } else if (Type === 'PaymentOut.Rejected') {
    updateOrderStatus(refId, 'payout_rejected', null, params.STATUS_REASON)
  }

  res.json({ status: 'ok' })
})
```

## 商户必须回应的 Response

当系统向商户发送 webhook 后，商户端**必须始终返回包含 `status` 字段的 JSON**，以便系统确认商户已收到并成功处理了数据，而不仅仅是收到了请求。

```json
{ "status": "ok" }
```

系统按以下顺序检查结果：

1. **HTTP status 不是 `20X`** → 一律视为**失败**（不再检查 response body）
2. **若为 `20X`**，系统会将 response body 解析为 JSON，并检查 `status` 字段
   - 必须为 `success` 或 `OK`（不区分大小写）才视为**成功**
   - 若 response 无法解析为 JSON，或 `status` 字段不是 `success`/`OK` → 同样视为**失败**

无论因何种原因失败（未配置 webhook、无法送达商户、HTTP status 不是 20X，或是 20X 但 response 不满足上述条件），系统都会在该 Payment Request / Payment Transaction 上创建 **AuditNotice**（警告）—— 可在 Admin Portal 与 Merchant Portal 的 Status 列中看到 ⚠️ 图标，点击图标可查看错误详情，系统同时也会通知商户。

## 须知事项

- 应以 HTTP `200` 及 JSON `{ "status": "ok" }` 回应，以确认已收到并成功处理该 webhook（详见上文说明）
- 系统目前尚无重试机制 —— 若 webhook 失败，数据不会被重新发送
- 系统目前尚无签名验证机制 —— 建议在处理前先验证 `PMR_REF_ID1` 是否与系统中的订单一致
