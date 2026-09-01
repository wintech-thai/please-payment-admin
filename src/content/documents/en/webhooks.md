---
title: Webhooks
---

# Webhooks

When a payment succeeds, the system sends an HTTP POST to the Webhook URL configured by the Merchant, so the Merchant can update their own system's data.

## Configuring the Webhook URL

Configure it in the **Admin Panel → Business Setup → Webhook Config** → click "Add Webhook"

Example of a Merchant's Webhook URL: `https://your-domain.com/webhooks/payment`

## Events

| Event | Description |
|---|---|
| `PaymentIn.Success` | The customer's Pay-In payment succeeded; funds have been credited to the Merchant's account |
| `PaymentIn.Rejected` | The Pay-In Request was rejected |
| `PaymentOut.Success` | The system's Pay-Out transfer succeeded; funds have been transferred to the destination account |
| `PaymentOut.Rejected` | The Pay-Out Request was rejected |

## New Fields in the Payload

Starting from this version, every webhook payload includes 3 additional parameters:

| Parameter | Description |
|---|---|
| `EVENT_TYPE` | The event type, e.g. `PaymentIn.Success`, `PaymentIn.Rejected`, `PaymentOut.Success`, `PaymentOut.Rejected` |
| `STATUS_CODE` | The outcome status — `OK` when there's no problem; **for Rejected events, the value will not be `OK`** |
| `STATUS_REASON` | Explanation of the status — populated when `STATUS_CODE` is not `OK` (e.g. Rejected events) |
| `PAYMENT_TYPE` | The payment type — either `PayIn` or `PayOut` only |

> **Note:** Rejected events (`PaymentIn.Rejected`, `PaymentOut.Rejected`) will always have a `STATUS_CODE` that is not `"OK"`. Use this field to check whether something went wrong.

---

## Payload Format

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
    { "Name": "MERCHANT_NAME",           "Value": "Merchant Name" },
    { "Name": "PAYIN_REQUEST_AMOUNT",    "Value": "325" },
    { "Name": "PAYIN_GENERATED_AMOUNT",  "Value": "325.52" },
    { "Name": "PAYIN_FEE_PCT",           "Value": "0" },
    { "Name": "PAYIN_BANK_CODE",         "Value": "SCB" },
    { "Name": "PAYIN_BANK_ACCOUNT_NO",   "Value": "xxx-xxxxx-x" },
    { "Name": "PAYIN_BANK_ACCOUNT_NAME", "Value": "Account Name" }
  ]
}
```

#### Key Fields

| Parameter | Description |
|---|---|
| `EVENT_TYPE` | `PaymentIn.Success` |
| `STATUS_CODE` | `OK` |
| `PAYMENT_TYPE` | `PayIn` |
| `PMR_REF_ID1` | Ref 1 — the reference ID the Merchant sent when creating the Payment Request, used to map to an order in the Merchant's system |
| `PMR_REF_ID2` | Ref 2 — an optional reference set by the Merchant |
| `PMR_REF_ID3` | Ref 3 — an optional reference set by the Merchant |
| `PMR_ID` | UUID of the Payment Request in the system |
| `PAYIN_REQUEST_AMOUNT` | The originally requested amount |
| `PAYIN_GENERATED_AMOUNT` | The actual amount received (may differ by a small fraction) |

---

### PaymentIn.Rejected

```json
{
  "Id": "job-uuid",
  "Type": "PaymentIn.Rejected",
  "Parameters": [
    { "Name": "EVENT_TYPE",              "Value": "PaymentIn.Rejected" },
    { "Name": "STATUS_CODE",             "Value": "REJECTED" },
    { "Name": "STATUS_REASON",           "Value": "Reason for rejection" },
    { "Name": "PAYMENT_TYPE",            "Value": "PayIn" },
    { "Name": "ORG_ID",                  "Value": "org-id" },
    { "Name": "PMR_ID",                  "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID1",             "Value": "ORDER-20260701-001" },
    { "Name": "PMR_REF_ID2",             "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",             "Value": null },
    { "Name": "MERCHANT_ID",             "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",           "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",           "Value": "Merchant Name" },
    { "Name": "PAYIN_REQUEST_AMOUNT",    "Value": "325" },
    { "Name": "PAYIN_BANK_CODE",         "Value": "SCB" },
    { "Name": "PAYIN_BANK_ACCOUNT_NO",   "Value": "xxx-xxxxx-x" },
    { "Name": "PAYIN_BANK_ACCOUNT_NAME", "Value": "Account Name" }
  ]
}
```

#### Key Fields

| Parameter | Description |
|---|---|
| `EVENT_TYPE` | `PaymentIn.Rejected` |
| `STATUS_CODE` | Not `OK` — use this to check for a problem |
| `STATUS_REASON` | The reason for rejection |
| `PAYMENT_TYPE` | `PayIn` |
| `PMR_ID` | UUID of the rejected Pay-In Request |

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
    { "Name": "MERCHANT_NAME",             "Value": "Merchant Name" },
    { "Name": "TX_AMOUNT",                 "Value": "1000.00" },
    { "Name": "PAYOUT_REQUEST_AMOUNT",     "Value": "1000" },
    { "Name": "PAYOUT_FEE",                "Value": "5.00" },
    { "Name": "PAYOUT_FEE_PCT",            "Value": "0.5" },
    { "Name": "PAYOUT_BANK_CODE",          "Value": "KBank" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NO",    "Value": "xxx-xxxxx-x" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NAME",  "Value": "Destination Account Name" },
    { "Name": "PAYOUT_PROMPTPAY_ID",       "Value": null },
    { "Name": "PAYOUT_PAID_AMOUNT_INCLUSIVE", "Value": "1000.00" },
    { "Name": "PAYOUT_IS_PARTIAL",         "Value": "False" }
  ]
}
```

#### Key Fields

| Parameter | Description |
|---|---|
| `EVENT_TYPE` | `PaymentOut.Success` |
| `STATUS_CODE` | `OK` |
| `PAYMENT_TYPE` | `PayOut` |
| `PMR_REF_ID1` | Ref 1 (auto-generated as YYMMDDHHMMSS) |
| `PMR_REF_ID2` | Ref 2 — an optional reference set by the Merchant |
| `PMR_REF_ID3` | Ref 3 — an optional reference set by the Merchant |
| `PMR_ID` | UUID of the Pay-Out Request in the system |
| `TX_AMOUNT` | The amount actually transferred in this round (a single transaction) |
| `PAYOUT_REQUEST_AMOUNT` | The originally requested transfer amount |
| `PAYOUT_FEE` | The fee |
| `PAYOUT_BANK_CODE` | Destination bank code |
| `PAYOUT_PAID_AMOUNT_INCLUSIVE` | The cumulative total paid out so far for this Pay-Out Request (across all rounds up to and including this one) — different from `TX_AMOUNT`, which is only this round's amount |
| `PAYOUT_IS_PARTIAL` | `True` if this is a P2P partial payout (see below) |

#### PaymentOut.Success for P2P Transactions

For a Pay-Out Request matched with **P2P Pay-In** transactions (`PAYOUT_IS_PARTIAL = "True"`), the `PaymentOut.Success` webhook **may be sent more than once for the same Pay-Out Request** — because a single Pay-Out may be fulfilled by multiple P2P Pay-In transactions (partial payouts).

**Example:** A 10,000 THB Pay-Out Request may be fulfilled by 3 rounds of P2P Pay-In:

| Round | TX_AMOUNT (this round) | PAYOUT_PAID_AMOUNT_INCLUSIVE (cumulative) | PAYOUT_IS_PARTIAL |
|---|---|---|---|
| Round 1 | 4,000 THB | 4,000 THB | `True` |
| Round 2 | 3,500 THB | 7,500 THB | `True` |
| Round 3 | 2,500 THB | 10,000 THB | `True` |

**What to do in the Merchant's system:**

- Always check `PAYOUT_IS_PARTIAL` first
- If `True` — do not mark the Pay-Out as "completed" immediately. Compare `PAYOUT_PAID_AMOUNT_INCLUSIVE` against `PAYOUT_REQUEST_AMOUNT` instead of summing `TX_AMOUNT` yourself round by round (the system already accumulates the total in this field)
- If `False` — the Pay-Out completed in a single transfer and can be marked "completed" immediately

```python
# Example: handling PaymentOut.Success for P2P
elif event_type == 'PaymentOut.Success':
    paid_inclusive = float(params.get('PAYOUT_PAID_AMOUNT_INCLUSIVE', 0))
    requested_amount = float(params.get('PAYOUT_REQUEST_AMOUNT', 0))
    is_partial = params.get('PAYOUT_IS_PARTIAL', 'False') == 'True'
    pmr_id = params.get('PMR_ID')

    if is_partial:
        # P2P partial — check the cumulative amount the system already sends, don't sum it yourself
        if paid_inclusive >= requested_amount:
            mark_payout_completed(pmr_id)
    else:
        # Paid in full in a single round
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
    { "Name": "STATUS_REASON",               "Value": "Reason for rejection" },
    { "Name": "PAYMENT_TYPE",                "Value": "PayOut" },
    { "Name": "ORG_ID",                      "Value": "org-id" },
    { "Name": "PMR_ID",                      "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID1",                 "Value": "260802110325" },
    { "Name": "PMR_REF_ID2",                 "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",                 "Value": null },
    { "Name": "MERCHANT_ID",                 "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",               "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",               "Value": "Merchant Name" },
    { "Name": "PAYOUT_REQUEST_AMOUNT",       "Value": "1000" },
    { "Name": "PAYOUT_BANK_CODE",            "Value": "KBank" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NO",      "Value": "xxx-xxxxx-x" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NAME",    "Value": "Destination Account Name" }
  ]
}
```

#### Key Fields

| Parameter | Description |
|---|---|
| `EVENT_TYPE` | `PaymentOut.Rejected` |
| `STATUS_CODE` | Not `OK` — use this to check for a problem |
| `STATUS_REASON` | The reason for rejection |
| `PAYMENT_TYPE` | `PayOut` |
| `PMR_ID` | UUID of the rejected Pay-Out Request |

## Sample Webhook Receivers

### Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/payment', methods=['POST'])
def handle_webhook():
    data = request.get_json()
    event_type = data.get('Type')

    # Convert the Parameters array to a dict
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

## Response the Merchant Must Return

When the system fires a webhook to the merchant, the merchant side **must always respond with JSON containing a `status` field**, so the system knows the merchant received and successfully processed the data — not just received the request.

```json
{ "status": "ok" }
```

The system checks the result in this order:

1. **An HTTP status that is not `20X`** → treated as **failed** entirely (the response body is not inspected further)
2. **If it is `20X`**, the system parses the response body as JSON and checks the `status` field
   - It must be `success` or `OK` (case-insensitive) to be considered **successful**
   - If the response cannot be parsed as JSON, or the `status` field is not `success`/`OK` → also treated as **failed**

If it fails for any reason (the webhook is not configured, delivery to the merchant fails, the HTTP status is not 20X, or it is 20X but the response doesn't meet the above conditions), the system creates an **AuditNotice** (warning) on that Payment Request / Payment Transaction — indicated by a ⚠️ icon in the Status column on the Admin Portal and Merchant Portal. Click the icon to view error details. The system will also notify the merchant.

## Things to Know

- Respond with HTTP `200` and JSON `{ "status": "ok" }` to confirm the webhook was received and processed successfully (see details above)
- The system does not yet have a retry policy — if a webhook fails, the data will not be resent
- The system does not yet have signature verification — it's recommended to verify that `PMR_REF_ID1` matches an order in your system before processing
