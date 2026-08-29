---
title: ภาพรวม
version: "{{APP_VERSION}}"
updatedAt: "{{BUILD_DATE}}"
---

# เอกสาร Public API

Public API ฉบับนี้ช่วยให้ร้านค้า (Merchant) เชื่อมต่อระบบชำระเงินเข้ากับแอปพลิเคชันของตนเองได้โดยตรง

## Base URL

```
{{API_URL}}
```

URL นี้จะถูกนำหน้า endpoint ทุกตัว เช่น `{{API_URL}}/api/PaymentRequest/org/...`

## ภาพรวม Payment Flow

```
Merchant สร้าง Payment Request
        ↓
ได้รับ QR Code กลับมา
        ↓
ลูกค้า scan QR แล้วโอนเงินผ่านแอปธนาคาร
        ↓
เงินเข้าบัญชีธนาคารของ Merchant โดยตรง (ไม่ผ่านระบบตัวกลาง)
        ↓
ระบบแจ้ง Merchant ผ่าน Webhook (Payment.Success)
```

โมเดลนี้เรียกว่า **Non-Custodial** — ระบบไม่เคยถือเงินของ Merchant เลย

## การเริ่มต้นใช้งาน

1. ติดต่อผู้ให้บริการเพื่อรับ **API Key**, **Org ID**, และ **Merchant ID**
2. ใช้ Basic Authentication ในทุก request (ดู [การยืนยันตัวตน](/documents/authentication))
3. เรียก endpoint สร้าง Payment Request เพื่อรับ QR Code (ดู [Endpoints](/documents/endpoints))
4. แจ้งผู้ให้บริการเพื่อตั้งค่า Webhook URL สำหรับรับการแจ้งเตือนเมื่อชำระเงินสำเร็จ (ดู [Webhooks](/documents/webhooks))
