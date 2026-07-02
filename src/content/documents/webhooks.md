---
title: Webhooks
---

# Webhooks

เมื่อการชำระเงินสำเร็จ Please Payment จะส่ง HTTP POST ไปยัง Webhook URL ที่ Merchant กำหนดไว้ เพื่อให้ Merchant อัปเดตข้อมูลในระบบของตนเอง

## การตั้งค่า Webhook URL

ตั้งค่าได้ใน **Admin Panel → Business Setup → Webhook Config** → กด "Add Webhook"

ตัวอย่าง Webhook URL ของ Merchant: `https://your-domain.com/webhooks/payment`

## Events

ขณะนี้มี event เดียวคือ:

| Event | คำอธิบาย |
|---|---|
| `Payment.Success` | ลูกค้าชำระเงิน Pay-In สำเร็จ เงินเข้าบัญชี Merchant แล้ว |

## รูปแบบ Payload

Please Payment จะ POST JSON body ต่อไปนี้มาให้:

```json
{
  "Id": "job-uuid",
  "Type": "Payment.Success",
  "Parameters": [
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

### Field ที่สำคัญ

| Parameter | คำอธิบาย |
|---|---|
| `PMR_REF_ID` | Reference ID ที่ Merchant ส่งมาตั้งแต่ตอนสร้าง Payment Request — ใช้สำหรับ mapping กับ order ในระบบของ Merchant |
| `PMR_ID` | UUID ของ Payment Request ในระบบ Please Payment |
| `PAYIN_REQUEST_AMOUNT` | จำนวนเงินที่ขอตั้งต้น |
| `PAYIN_GENERATED_AMOUNT` | จำนวนเงินที่รับจริง (อาจมีเศษสตางค์ต่างกัน) |

## ตัวอย่างการรับ Webhook

### Python (Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/payment', methods=['POST'])
def handle_webhook():
    data = request.get_json()

    if data.get('Type') != 'Payment.Success':
        return jsonify({'ok': True})

    # แปลง Parameters array เป็น dict
    params = {p['Name']: p['Value'] for p in data.get('Parameters', [])}

    ref_id = params.get('PMR_REF_ID')
    amount = params.get('PAYIN_REQUEST_AMOUNT')

    # อัปเดต order ในระบบของเรา
    update_order_status(ref_id, 'paid', amount)

    return jsonify({'ok': True}), 200
```

### Node.js (Express)

```javascript
app.post('/webhooks/payment', express.json(), (req, res) => {
  const { Type, Parameters } = req.body

  if (Type !== 'Payment.Success') return res.json({ ok: true })

  const params = Object.fromEntries(
    Parameters.map(p => [p.Name, p.Value])
  )

  const refId = params.PMR_REF_ID
  const amount = params.PAYIN_REQUEST_AMOUNT

  // อัปเดต order ในระบบของเรา
  updateOrderStatus(refId, 'paid', amount)

  res.json({ ok: true })
})
```

## ข้อควรทราบ

- ตอบกลับด้วย HTTP `200` เพื่อยืนยันว่าได้รับ webhook แล้ว
- ระบบยังไม่มี retry policy — หาก webhook ล้มเหลว ข้อมูลจะไม่ถูกส่งซ้ำ
- ระบบยังไม่มี signature verification — แนะนำให้ตรวจสอบ `PMR_REF_ID` ว่าตรงกับ order ในระบบก่อนทำรายการ
