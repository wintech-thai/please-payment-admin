---
title: Webhooks
---

# Webhooks

เมื่อการชำระเงินสำเร็จ Please Payment จะส่ง HTTP POST ไปยัง Webhook URL ที่ Merchant กำหนดไว้ เพื่อให้ Merchant อัปเดตข้อมูลในระบบของตนเอง

## การตั้งค่า Webhook URL

ตั้งค่าได้ใน **Admin Panel → Business Setup → Webhook Config** → กด "Add Webhook"

ตัวอย่าง Webhook URL ของ Merchant: `https://your-domain.com/webhooks/payment`

## Events

| Event | คำอธิบาย |
|---|---|
| `PaymentIn.Success` | ลูกค้าชำระเงิน Pay-In สำเร็จ เงินเข้าบัญชี Merchant แล้ว |
| `PaymentIn.Rejected` | Pay-In Request ถูกปฏิเสธ |
| `PaymentOut.Success` | ระบบโอนเงิน Pay-Out ออกสำเร็จ เงินถูกโอนไปยังบัญชีปลายทางแล้ว |
| `PaymentOut.Rejected` | Pay-Out Request ถูกปฏิเสธ |

## Fields ใหม่ใน Payload

ทุก webhook payload ตั้งแต่เวอร์ชันนี้เป็นต้นไปจะมี parameter เพิ่มเติม 3 ตัว:

| Parameter | คำอธิบาย |
|---|---|
| `EVENT_TYPE` | ประเภทของ event เช่น `PaymentIn.Success`, `PaymentIn.Rejected`, `PaymentOut.Success`, `PaymentOut.Rejected` |
| `STATUS_CODE` | สถานะการทำงาน — เป็น `OK` เมื่อไม่มีปัญหา; **สำหรับ Rejected events จะมีค่าไม่เท่ากับ `OK`** |
| `PAYMENT_TYPE` | ประเภทของ payment — มีค่าเป็น `PayIn` หรือ `PayOut` เท่านั้น |

> **หมายเหตุ:** พวก event ที่เป็น Rejected (`PaymentIn.Rejected`, `PaymentOut.Rejected`) จะมี `STATUS_CODE` ไม่เท่ากับ `"OK"` เสมอ ใช้ field นี้เพื่อเช็คว่าการทำงานมีปัญหาหรือไม่

---

## รูปแบบ Payload

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
    { "Name": "PMR_REF_ID",              "Value": "ORDER-20260701-001" },
    { "Name": "PMR_REF_ID1",             "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID2",             "Value": null },
    { "Name": "MERCHANT_ID",             "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",           "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",           "Value": "ชื่อร้านค้า" },
    { "Name": "PAYIN_REQUEST_AMOUNT",    "Value": "325" },
    { "Name": "PAYIN_GENERATED_AMOUNT",  "Value": "325.52" },
    { "Name": "PAYIN_FEE_PCT",           "Value": "0" },
    { "Name": "PAYIN_BANK_CODE",         "Value": "SCB" },
    { "Name": "PAYIN_BANK_ACCOUNT_NO",   "Value": "xxx-xxxxx-x" },
    { "Name": "PAYIN_BANK_ACCOUNT_NAME", "Value": "ชื่อบัญชี" }
  ]
}
```

#### Field ที่สำคัญ

| Parameter | คำอธิบาย |
|---|---|
| `EVENT_TYPE` | `PaymentIn.Success` |
| `STATUS_CODE` | `OK` |
| `PAYMENT_TYPE` | `PayIn` |
| `PMR_REF_ID` | Reference ID ที่ Merchant ส่งมาตั้งแต่ตอนสร้าง Payment Request — ใช้สำหรับ mapping กับ order ในระบบของ Merchant |
| `PMR_ID` | UUID ของ Payment Request ในระบบ Please Payment |
| `PAYIN_REQUEST_AMOUNT` | จำนวนเงินที่ขอตั้งต้น |
| `PAYIN_GENERATED_AMOUNT` | จำนวนเงินที่รับจริง (อาจมีเศษสตางค์ต่างกัน) |

---

### PaymentIn.Rejected

```json
{
  "Id": "job-uuid",
  "Type": "PaymentIn.Rejected",
  "Parameters": [
    { "Name": "EVENT_TYPE",              "Value": "PaymentIn.Rejected" },
    { "Name": "STATUS_CODE",             "Value": "REJECTED" },
    { "Name": "STATUS_REASON",           "Value": "เหตุผลที่ปฏิเสธ" },
    { "Name": "PAYMENT_TYPE",            "Value": "PayIn" },
    { "Name": "ORG_ID",                  "Value": "org-id" },
    { "Name": "PMR_ID",                  "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID",              "Value": "ORDER-20260701-001" },
    { "Name": "PMR_REF_ID1",             "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID2",             "Value": null },
    { "Name": "MERCHANT_ID",             "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",           "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",           "Value": "ชื่อร้านค้า" },
    { "Name": "PAYIN_REQUEST_AMOUNT",    "Value": "325" },
    { "Name": "PAYIN_BANK_CODE",         "Value": "SCB" },
    { "Name": "PAYIN_BANK_ACCOUNT_NO",   "Value": "xxx-xxxxx-x" },
    { "Name": "PAYIN_BANK_ACCOUNT_NAME", "Value": "ชื่อบัญชี" }
  ]
}
```

#### Field ที่สำคัญ

| Parameter | คำอธิบาย |
|---|---|
| `EVENT_TYPE` | `PaymentIn.Rejected` |
| `STATUS_CODE` | ไม่เท่ากับ `OK` — ใช้เช็คว่ามีปัญหา |
| `STATUS_REASON` | เหตุผลที่ปฏิเสธ |
| `PAYMENT_TYPE` | `PayIn` |
| `PMR_ID` | UUID ของ Pay-In Request ที่ถูกปฏิเสธ |

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
    { "Name": "MERCHANT_NAME",             "Value": "ชื่อร้านค้า" },
    { "Name": "TX_AMOUNT",                 "Value": "1000.00" },
    { "Name": "PAYOUT_REQUEST_AMOUNT",     "Value": "1000" },
    { "Name": "PAYOUT_FEE",                "Value": "5.00" },
    { "Name": "PAYOUT_FEE_PCT",            "Value": "0.5" },
    { "Name": "PAYOUT_BANK_CODE",          "Value": "KBank" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NO",    "Value": "xxx-xxxxx-x" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NAME",  "Value": "ชื่อบัญชีปลายทาง" },
    { "Name": "PAYOUT_PROMPTPAY_ID",       "Value": null },
    { "Name": "PAYOUT_IS_PARTIAL",         "Value": "False" }
  ]
}
```

#### Field ที่สำคัญ

| Parameter | คำอธิบาย |
|---|---|
| `EVENT_TYPE` | `PaymentOut.Success` |
| `STATUS_CODE` | `OK` |
| `PAYMENT_TYPE` | `PayOut` |
| `PMR_REF_ID1` | Ref 1 (auto-generated YYMMDDHHMMSS) |
| `PMR_REF_ID2` | Ref 2 — optional reference ที่ Merchant กำหนด |
| `PMR_REF_ID3` | Ref 3 — optional reference ที่ Merchant กำหนด |
| `PMR_ID` | UUID ของ Pay-Out Request ในระบบ Please Payment |
| `TX_AMOUNT` | จำนวนเงินที่โอนออกจริง |
| `PAYOUT_REQUEST_AMOUNT` | จำนวนเงินที่ขอโอนตั้งต้น |
| `PAYOUT_FEE` | ค่าธรรมเนียม |
| `PAYOUT_BANK_CODE` | รหัสธนาคารปลายทาง |
| `PAYOUT_IS_PARTIAL` | `True` ถ้าเป็น P2P partial payout |

---

### PaymentOut.Rejected

```json
{
  "Id": "job-uuid",
  "Type": "PaymentOut.Rejected",
  "Parameters": [
    { "Name": "EVENT_TYPE",                  "Value": "PaymentOut.Rejected" },
    { "Name": "STATUS_CODE",                 "Value": "REJECTED" },
    { "Name": "STATUS_REASON",               "Value": "เหตุผลที่ปฏิเสธ" },
    { "Name": "PAYMENT_TYPE",                "Value": "PayOut" },
    { "Name": "ORG_ID",                      "Value": "org-id" },
    { "Name": "PMR_ID",                      "Value": "payment-request-uuid" },
    { "Name": "PMR_REF_ID1",                 "Value": "260802110325" },
    { "Name": "PMR_REF_ID2",                 "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",                 "Value": null },
    { "Name": "MERCHANT_ID",                 "Value": "merchant-uuid" },
    { "Name": "MERCHANT_CODE",               "Value": "merchant-code" },
    { "Name": "MERCHANT_NAME",               "Value": "ชื่อร้านค้า" },
    { "Name": "PAYOUT_REQUEST_AMOUNT",       "Value": "1000" },
    { "Name": "PAYOUT_BANK_CODE",            "Value": "KBank" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NO",      "Value": "xxx-xxxxx-x" },
    { "Name": "PAYOUT_BANK_ACCOUNT_NAME",    "Value": "ชื่อบัญชีปลายทาง" }
  ]
}
```

#### Field ที่สำคัญ

| Parameter | คำอธิบาย |
|---|---|
| `EVENT_TYPE` | `PaymentOut.Rejected` |
| `STATUS_CODE` | ไม่เท่ากับ `OK` — ใช้เช็คว่ามีปัญหา |
| `STATUS_REASON` | เหตุผลที่ปฏิเสธ |
| `PAYMENT_TYPE` | `PayOut` |
| `PMR_ID` | UUID ของ Pay-Out Request ที่ถูกปฏิเสธ |

## ตัวอย่างการรับ Webhook

### Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/payment', methods=['POST'])
def handle_webhook():
    data = request.get_json()
    event_type = data.get('Type')

    # แปลง Parameters array เป็น dict
    params = {p['Name']: p['Value'] for p in data.get('Parameters', [])}
    ref_id = params.get('PMR_REF_ID')

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

    return jsonify({'ok': True}), 200
```

### Node.js (Express)

```javascript
app.post('/webhooks/payment', express.json(), (req, res) => {
  const { Type, Parameters } = req.body
  const params = Object.fromEntries(Parameters.map(p => [p.Name, p.Value]))
  const refId = params.PMR_REF_ID

  if (Type === 'PaymentIn.Success') {
    updateOrderStatus(refId, 'paid_in', params.PAYIN_REQUEST_AMOUNT)
  } else if (Type === 'PaymentIn.Rejected') {
    updateOrderStatus(refId, 'rejected', null, params.STATUS_REASON)
  } else if (Type === 'PaymentOut.Success') {
    updateOrderStatus(refId, 'paid_out', params.TX_AMOUNT)
  } else if (Type === 'PaymentOut.Rejected') {
    updateOrderStatus(refId, 'payout_rejected', null, params.STATUS_REASON)
  }

  res.json({ ok: true })
})
```

## ข้อควรทราบ

- ตอบกลับด้วย HTTP `200` เพื่อยืนยันว่าได้รับ webhook แล้ว
- ระบบยังไม่มี retry policy — หาก webhook ล้มเหลว ข้อมูลจะไม่ถูกส่งซ้ำ
- ระบบยังไม่มี signature verification — แนะนำให้ตรวจสอบ `PMR_REF_ID` ว่าตรงกับ order ในระบบก่อนทำรายการ
