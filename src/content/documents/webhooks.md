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
| `STATUS_REASON` | คำอธิบายเหตุผลของ status — จะมีค่าเมื่อ `STATUS_CODE` ไม่เท่ากับ `OK` (เช่น Rejected events) |
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
    { "Name": "PMR_REF_ID1",             "Value": "ORDER-20260701-001" },
    { "Name": "PMR_REF_ID2",             "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",             "Value": null },
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
| `PMR_REF_ID1` | Ref 1 — Reference ID ที่ Merchant ส่งมาตอนสร้าง Payment Request ใช้สำหรับ mapping กับ order ในระบบของ Merchant |
| `PMR_REF_ID2` | Ref 2 — optional reference ที่ Merchant กำหนด |
| `PMR_REF_ID3` | Ref 3 — optional reference ที่ Merchant กำหนด |
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
    { "Name": "PMR_REF_ID1",             "Value": "ORDER-20260701-001" },
    { "Name": "PMR_REF_ID2",             "Value": "CUST-12345" },
    { "Name": "PMR_REF_ID3",             "Value": null },
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
    { "Name": "PAYOUT_PAID_AMOUNT_INCLUSIVE", "Value": "1000.00" },
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
| `TX_AMOUNT` | จำนวนเงินที่โอนออกจริงในรอบนี้ (transaction เดียว) |
| `PAYOUT_REQUEST_AMOUNT` | จำนวนเงินที่ขอโอนตั้งต้น |
| `PAYOUT_FEE` | ค่าธรรมเนียม |
| `PAYOUT_BANK_CODE` | รหัสธนาคารปลายทาง |
| `PAYOUT_PAID_AMOUNT_INCLUSIVE` | ยอดรวมสะสมที่ payout ออกไปแล้วทั้งหมดของ Pay-Out Request นี้ (รวมทุกรอบจนถึงรอบปัจจุบัน) — ต่างจาก `TX_AMOUNT` ที่เป็นยอดของรอบนี้รอบเดียว |
| `PAYOUT_IS_PARTIAL` | `True` ถ้าเป็น P2P partial payout (ดูด้านล่าง) |

#### PaymentOut.Success กับรายการ P2P

สำหรับ Pay-Out Request ที่ถูกจับคู่กับ **P2P Pay-In** (`PAYOUT_IS_PARTIAL = "True"`) webhook `PaymentOut.Success` **อาจถูกส่งมากกว่าหนึ่งครั้งสำหรับ Pay-Out Request เดียวกัน** — เพราะ Pay-Out หนึ่งรายการอาจถูกแบ่งชำระจาก P2P Pay-In หลายรายการ (partial payouts)

**ตัวอย่าง:** Pay-Out Request 10,000 บาท อาจถูก fulfill จาก P2P Pay-In 3 รอบ:

| รอบ | TX_AMOUNT (ยอดรอบนี้) | PAYOUT_PAID_AMOUNT_INCLUSIVE (ยอดสะสม) | PAYOUT_IS_PARTIAL |
|---|---|---|---|
| รอบที่ 1 | 4,000 บาท | 4,000 บาท | `True` |
| รอบที่ 2 | 3,500 บาท | 7,500 บาท | `True` |
| รอบที่ 3 | 2,500 บาท | 10,000 บาท | `True` |

**สิ่งที่ต้องทำในระบบของ Merchant:**

- ตรวจสอบ `PAYOUT_IS_PARTIAL` ก่อนเสมอ
- ถ้า `True` — อย่า mark Pay-Out ว่า "สำเร็จ" ทันที เทียบ `PAYOUT_PAID_AMOUNT_INCLUSIVE` กับ `PAYOUT_REQUEST_AMOUNT` แทนการรวม `TX_AMOUNT` เองทีละรอบ (ระบบสะสมยอดให้แล้วในฟิลด์นี้)
- ถ้า `False` — Pay-Out สำเร็จในครั้งเดียว สามารถ mark ว่า "สำเร็จ" ได้ทันที

```python
# ตัวอย่าง: รับ PaymentOut.Success แบบ P2P
elif event_type == 'PaymentOut.Success':
    paid_inclusive = float(params.get('PAYOUT_PAID_AMOUNT_INCLUSIVE', 0))
    requested_amount = float(params.get('PAYOUT_REQUEST_AMOUNT', 0))
    is_partial = params.get('PAYOUT_IS_PARTIAL', 'False') == 'True'
    pmr_id = params.get('PMR_ID')

    if is_partial:
        # P2P partial — เช็คยอดสะสมที่ระบบส่งมาให้ตรง ๆ ไม่ต้องรวมเอง
        if paid_inclusive >= requested_amount:
            mark_payout_completed(pmr_id)
    else:
        # จ่ายครบรอบเดียว
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

## Response ที่ merchant ต้องตอบกลับ

เมื่อระบบยิง webhook ไปหา merchant แล้ว ฝั่ง merchant **ต้องตอบกลับเป็น JSON ที่มีฟีลด์ `status`** เสมอ เพื่อให้ระบบรู้ว่า merchant รับข้อมูลและประมวลผลสำเร็จจริง ไม่ใช่แค่ได้รับ request เฉย ๆ

```json
{ "status": "ok" }
```

ระบบตรวจสอบผลลัพธ์ตามลำดับนี้:

1. **HTTP status ที่ไม่ใช่ `20X`** → ถือว่า **failed** ทั้งหมด (ไม่ต้องดู response body ต่อ)
2. **ถ้าเป็น `20X`** ระบบจะแกะ response body เป็น JSON แล้วเช็คฟีลด์ `status` ต่อ
   - ต้องเป็น `success` หรือ `OK` (ไม่สนตัวพิมพ์ใหญ่/เล็ก) จึงจะถือว่า **สำเร็จ**
   - ถ้า response ไม่ใช่ JSON ที่แกะได้ หรือฟีลด์ `status` ไม่ใช่ `success`/`OK` → ถือว่า **failed** เช่นกัน

หาก failed ไม่ว่ากรณีใดก็ตาม (webhook config ไม่ได้ตั้งค่าไว้, ยิงไม่ถึง merchant, HTTP status ไม่ใช่ 20X, หรือ 20X แต่ response ไม่ผ่านเงื่อนไขข้างต้น) ระบบจะสร้าง **AuditNotice** (warning) ไว้ที่ Payment Request / Payment Transaction รายการนั้น — สังเกตได้จากไอคอน ⚠️ ในคอลัมน์ Status บน Admin Portal และ Merchant Portal กดไอคอนเพื่อดูรายละเอียดข้อผิดพลาด และระบบจะแจ้งกลับไปยัง merchant ด้วย

## ข้อควรทราบ

- ตอบกลับด้วย HTTP `200` และ JSON `{ "status": "ok" }` เพื่อยืนยันว่าได้รับและประมวลผล webhook สำเร็จ (ดูรายละเอียดด้านบน)
- ระบบยังไม่มี retry policy — หาก webhook ล้มเหลว ข้อมูลจะไม่ถูกส่งซ้ำ
- ระบบยังไม่มี signature verification — แนะนำให้ตรวจสอบ `PMR_REF_ID1` ว่าตรงกับ order ในระบบก่อนทำรายการ
