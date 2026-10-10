---
title: Endpoints
---

# Endpoints

ระบบมี 2 endpoint สำหรับ Merchant

> **orgId** และ **merchantId** จะได้รับจากผู้ให้บริการเมื่อสมัครใช้งาน ไม่ต้องสร้างเอง

---

## สร้างคำขอรับเงิน (Pay-In)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequest/{merchantId}
```

สร้าง Payment Request แล้วได้รับ QR Code สำหรับให้ลูกค้า scan และโอนเงินเข้าบัญชีของ Merchant โดยตรง

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID จาก Merchant (ต้องไม่ซ้ำกัน) |
| `RefId2` | string | ❌ | Reference เพิ่มเติม 2 |
| `RefId3` | string | ❌ | Reference เพิ่มเติม 3 |
| `PayerName` | string | ✅ | ชื่อผู้จ่าย |
| `RequestedAmount` | number | ✅ | จำนวนเงิน (ต้องมากกว่า 0 และอยู่ใน range ที่ Merchant กำหนด) |
| `Currency` | string | ✅ | สกุลเงิน — ปัจจุบันรองรับเฉพาะ `THB` |
| `QrProvider` | string | ✅ | ธนาคารที่ออก QR — `PP` (PromptPay) หรือ `SCB` |
| `Description` | string | ❌ | คำอธิบายรายการ |
| `CustomerEmail` | string | ❌ | อีเมลของลูกค้า |
| `CustomerPhone` | string | ❌ | เบอร์โทรของลูกค้า |
| `Tags` | string | ❌ | Tag สำหรับจัดกลุ่มรายการ |

### ตัวอย่าง Request

```json
{
  "RefId1": "ORDER-20260701-001",
  "PayerName": "สมชาย ใจดี",
  "RequestedAmount": 325,
  "Currency": "THB",
  "QrProvider": "PP",
  "Description": "ชำระค่าสินค้า",
  "RefId2": "CUST-12345"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "paymentResponse": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sessionId": "session-abc123",
    "type": "PayIn",
    "status": "Pending",
    "requestedAmount": 325.00,
    "generatedAmount": 325.52,
    "currency": "THB",
    "qrCode": "00020101021...",
    "qrCodeImage": "data:image/png;base64,...",
    "paymentUrl": "https://...",
    "websocketPath": "/realtime/payment-tx",
    "createdAt": "2026-07-01T10:00:00Z",
    "expireAt": "2026-07-01T10:15:00Z",
    "isQrAvailable": true,
    "payInBankCode": "SCB",
    "payInBankAccountNo": "xxx-xxxxx-x",
    "payInBankAccountName": "ชื่อบริษัท",
    "payInPromptPayId": null,
    "slipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-...",
    "paymentStatusUrl": "/payin-status/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/e5f6a7b8-..."
  }
}
```

### Response Fields

| Field | คำอธิบาย |
|---|---|
| `id` | UUID ของ Payment Request — เก็บไว้สำหรับ reference |
| `status` | สถานะปัจจุบัน (ดู [สถานะการชำระเงิน](/documents/payment-status)) |
| `requestedAmount` | จำนวนเงินที่ขอ |
| `generatedAmount` | จำนวนเงินที่ใช้จริง (อาจมีเศษสตางค์ random เพื่อ matching) |
| `isQrAvailable` | `true` หาก QR Code พร้อมให้ลูกค้า scan, `false` หากบัญชีปลายทางไม่รองรับ QR (เช่น ไม่ได้ผูกกับ PromptPay) — ดูรายละเอียดด้านล่าง |
| `qrCodeImage` | รูป QR Code เป็น Base64 — นำไปแสดงในแอปได้เลย (ว่างเปล่าหาก `isQrAvailable` เป็น `false`) |
| `payInBankCode` | รหัสธนาคารปลายทาง |
| `payInBankAccountNo` | เลขบัญชีปลายทาง |
| `payInBankAccountName` | ชื่อบัญชีปลายทาง |
| `payInPromptPayId` | หมายเลข PromptPay ปลายทาง (ถ้ามี) |
| `sessionId` | ใช้เชื่อมต่อ WebSocket เพื่อรับสถานะแบบ real-time |
| `websocketPath` | path สำหรับ WebSocket (`/realtime/payment-tx`) |
| `expireAt` | QR Code หมดอายุเมื่อไหร่ |
| `slipUploadUrl` | Relative path สำหรับหน้าอัปโหลดสลิป — ไม่มี domain นำหน้า ต้องนำไปต่อกับ `{{MERCHANT_URL}}` (ดูคำอธิบายด้านล่าง) เพื่อสร้าง URL เต็ม แล้วส่งให้ลูกค้าเปิดหน้าอัปโหลดสลิปได้โดยไม่ต้อง login |
| `paymentStatusUrl` | Relative path สำหรับหน้าแสดงสถานะการชำระเงิน — relative path เหมือน `slipUploadUrl` ต้องนำไปต่อกับ `{{MERCHANT_URL}}` เช่นกัน หน้านี้ไม่ต้อง login และ**ใช้ QR Code เดิม**ของ Payment Request นี้ (ไม่ generate QR ใหม่) เหมาะสำหรับส่งให้ลูกค้าที่ขอ QR ไปแล้วแต่ลืม scan หรือ scan ไปแล้วแต่อยากเช็คสถานะ |

> **สำคัญ — ต้อง concat กับโดเมนไหน:** `slipUploadUrl` และ `paymentStatusUrl` เป็น relative path เท่านั้น ต้องนำไปต่อกับโดเมน `{{MERCHANT_URL}}` เอง เช่น หาก `slipUploadUrl` คือ `/payin-slip-upload/org123/xxx/yyy` ก็ให้สร้าง URL เต็มเป็น `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy`

### หน้าแสดงสถานะการชำระเงิน (Payment Status Page)

`paymentStatusUrl` พาไปยังหน้า page สาธารณะ (ไม่ต้อง login) ที่แสดง:

- สถานะปัจจุบันของ Payment Request (Pending / Approved / Paid)
- QR Code เดิม (ถ้าสถานะยังเป็น Pending) — ถ้าสถานะไม่ใช่ Pending แล้ว จะแสดง QR แบบมีกากบาททับพร้อมข้อความเตือนว่าห้ามสแกน
- จำนวนเงิน, ชื่อบัญชี/เลขบัญชีธนาคารปลายทาง หรือ PromptPay ID
- `refId1`, `refId2`, `refId3`, ชื่อผู้โอน (Payer Name)
- ข้อมูล Merchant
- ปุ่มลิงก์ไปหน้าอัปโหลดสลิป (เปิด tab ใหม่)

หน้านี้ **refresh browser ได้เพื่อดูสถานะล่าสุด** (ไม่ได้ทำ real-time ผ่าน WebSocket) เหมาะสำหรับใช้แทนการสร้าง Payment Request ใหม่ทุกครั้งที่ลูกค้าขอ QR ซ้ำ — ใช้ `paymentStatusUrl` เดิมที่ได้จาก response ตอนสร้าง Payment Request ครั้งแรกซ้ำได้เรื่อยๆ จนกว่า token จะหมดอายุ (24 ชั่วโมง)

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:360px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:var(--font-prompt),-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff">
  <!-- header -->
  <div style="background:linear-gradient(135deg,#0d7a6e,#14b8a6);padding:18px 20px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="color:#fff;font-weight:700;font-size:15px">สถานะการชำระเงิน</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px">Payment Status</div>
    </div>
    <div style="width:32px;height:32px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M21 2v6h-6M3 22v-6h6M3.51 9a9 9 0 0114.85-3.36L21 8M3 16l2.64 2.36A9 9 0 0020.49 15"/></svg>
    </div>
  </div>
  <!-- body -->
  <div style="padding:24px 20px;background:#fff;text-align:center">
    <span style="display:inline-block;background:#d1fae5;color:#059669;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:14px">ชำระเงินแล้ว</span>
    <div style="font-size:30px;font-weight:800;color:#1a1a1a;line-height:1.1">111.00</div>
    <div style="font-size:11px;color:#999;margin-bottom:18px">THB</div>
    <!-- QR with do-not-scan overlay -->
    <div style="position:relative;width:180px;height:180px;margin:0 auto 18px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <svg width="180" height="180" viewBox="0 0 21 21" style="opacity:0.35">
        <rect width="21" height="21" fill="#ffffff"/>
        <rect x="0" y="0" width="7" height="7" fill="#1a1a1a"/><rect x="1" y="1" width="5" height="5" fill="#ffffff"/><rect x="2" y="2" width="3" height="3" fill="#1a1a1a"/>
        <rect x="14" y="0" width="7" height="7" fill="#1a1a1a"/><rect x="15" y="1" width="5" height="5" fill="#ffffff"/><rect x="16" y="2" width="3" height="3" fill="#1a1a1a"/>
        <rect x="0" y="14" width="7" height="7" fill="#1a1a1a"/><rect x="1" y="15" width="5" height="5" fill="#ffffff"/><rect x="2" y="16" width="3" height="3" fill="#1a1a1a"/>
        <rect x="9" y="1" width="1" height="1" fill="#1a1a1a"/><rect x="11" y="2" width="1" height="1" fill="#1a1a1a"/><rect x="9" y="4" width="1" height="1" fill="#1a1a1a"/><rect x="12" y="5" width="1" height="1" fill="#1a1a1a"/><rect x="10" y="6" width="1" height="1" fill="#1a1a1a"/>
        <rect x="9" y="8" width="1" height="1" fill="#1a1a1a"/><rect x="11" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="9" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="12" y="11" width="1" height="1" fill="#1a1a1a"/><rect x="10" y="12" width="1" height="1" fill="#1a1a1a"/>
        <rect x="9" y="14" width="1" height="1" fill="#1a1a1a"/><rect x="11" y="15" width="1" height="1" fill="#1a1a1a"/><rect x="9" y="17" width="1" height="1" fill="#1a1a1a"/><rect x="12" y="18" width="1" height="1" fill="#1a1a1a"/><rect x="10" y="19" width="1" height="1" fill="#1a1a1a"/>
        <rect x="14" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="16" y="8" width="1" height="1" fill="#1a1a1a"/><rect x="18" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="15" y="11" width="1" height="1" fill="#1a1a1a"/><rect x="17" y="12" width="1" height="1" fill="#1a1a1a"/>
        <rect x="19" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="14" y="13" width="1" height="1" fill="#1a1a1a"/><rect x="16" y="14" width="1" height="1" fill="#1a1a1a"/><rect x="18" y="15" width="1" height="1" fill="#1a1a1a"/><rect x="15" y="16" width="1" height="1" fill="#1a1a1a"/>
        <rect x="17" y="17" width="1" height="1" fill="#1a1a1a"/><rect x="19" y="18" width="1" height="1" fill="#1a1a1a"/><rect x="14" y="19" width="1" height="1" fill="#1a1a1a"/>
        <rect x="2" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="4" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="6" y="9" width="1" height="1" fill="#1a1a1a"/><rect x="3" y="11" width="1" height="1" fill="#1a1a1a"/><rect x="5" y="12" width="1" height="1" fill="#1a1a1a"/><rect x="1" y="10" width="1" height="1" fill="#1a1a1a"/><rect x="6" y="12" width="1" height="1" fill="#1a1a1a"/>
      </svg>
      <div style="position:absolute;inset:0;background:rgba(255,255,255,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        <div style="color:#dc2626;font-weight:700;font-size:11px;text-align:center;padding:0 10px">ห้ามสแกน — รายการนี้ไม่ได้อยู่ในสถานะรอดำเนินการแล้ว</div>
      </div>
    </div>
    <!-- bank info -->
    <div style="background:#f8f9fa;border-radius:10px;padding:12px 14px;margin-bottom:14px;text-align:left;font-size:13px">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#222">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
        สมหญิง มีสุข
      </div>
      <div style="color:#888;font-size:12px;margin:2px 0 6px 22px">KTB · 098-0-01234-5</div>
      <div style="display:flex;align-items:center;gap:8px;color:#555">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
        PromptPay: 081-234-5678
      </div>
    </div>
    <!-- ref / payer / merchant -->
    <div style="text-align:left;font-size:12px;color:#555;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
        <span style="color:#999">ผู้โอน:</span> <strong style="color:#333">สมชาย ใจดี</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">เลขอ้างอิง 1:</span> <strong style="color:#333">ORDER-2026-001</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">เลขอ้างอิง 2:</span> <strong style="color:#333">222</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18"/></svg>
        <span style="color:#999">เลขอ้างอิง 3:</span> <strong style="color:#333">333</strong>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#999" stroke-width="2" style="flex-shrink:0"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
        <span style="color:#999">ร้านค้า:</span> <strong style="color:#333">ร้านค้าตัวอย่าง</strong>
      </div>
    </div>
    <!-- button -->
    <button disabled style="width:100%;padding:12px;background:linear-gradient(135deg,#0d7a6e,#14b8a6);border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:not-allowed">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg>
      อัปโหลดสลิป
    </button>
  </div>
</div>
</div>

> ตัวอย่างข้างบนคือกรณีสถานะ **ไม่ใช่ Pending** แล้ว (ชำระเงินแล้ว) จึงเห็น QR ถูกจางลงพร้อมกากบาททับและข้อความ "ห้ามสแกน" — ถ้าสถานะยังเป็น **Pending** จะแสดง QR ปกติไม่มีกากบาท ให้สแกนได้ตามปกติ

### การแสดงผล QR และข้อมูลบัญชี

**ควรตรวจสอบ `isQrAvailable` ก่อนแสดงผลเสมอ:**

| สถานการณ์ | วิธีแสดงผล |
|---|---|
| `isQrAvailable = true` | แสดง QR Code จาก `qrCodeImage` ให้ลูกค้า scan ตามปกติ |
| `isQrAvailable = false` | ไม่มี QR Code — แสดงข้อมูลบัญชี (`payInBankCode`, `payInBankAccountNo`, `payInBankAccountName`, `payInPromptPayId`) เพื่อให้ลูกค้ากรอกข้อมูลโอนเงินเอง |

> **หมายเหตุ:** แนะนำให้แสดงข้อมูลบัญชี (`payInBankCode`, `payInBankAccountNo`, `payInBankAccountName`, `payInPromptPayId`) ควบคู่กับ QR Code เสมอ — ลูกค้าบางรายอาจต้องการโอนด้วยตัวเองแม้มี QR

> **แนะนำ:** นำ `slipUploadUrl` ไปทำเป็น **QR Code** แสดงในหน้าชำระเงินของคุณ — ลูกค้าสแกน QR ด้วยกล้องมือถือแล้วเปิดหน้าอัปโหลดสลิปได้เลย ไม่ต้องพิมพ์ URL เอง ใช้ได้ทั้ง **Pay-In ปกติ** และ **Pay-In P2P**

### หน้าอัปโหลดสลิป

เมื่อลูกค้าเปิด Slip Upload URL ลูกค้าจะเจอหน้าอัปโหลดสลิปสำหรับ Payment Request นั้นๆ ซึ่งมีฟีเจอร์ดังนี้:

- **ข้อมูลยืนยัน Payment Request** — แสดงชื่อ Merchant, จำนวนเงิน, บัญชีปลายทาง, ชื่อผู้โอน ให้ลูกค้าเช็คก่อนอัปโหลดว่า upload ไปให้ request ที่ถูกต้อง
- **อัปโหลดรูปสลิป** — เลือกรูปจากกล้องหรือ Gallery ของมือถือ
- **เลขอ้างอิงสลิป** — กรอก 4 หลักแรกและ 4 หลักสุดท้ายของเลขอ้างอิงสลิป (alphanumeric) เพื่อ matching และตรวจจับสลิปซ้ำ
- **หมายเหตุ** — ช่องเสริมสำหรับข้อความเพิ่มเติม
- **ตรวจสอบสลิปซ้ำ** — ระบบแจ้งเตือนอัตโนมัติถ้าพบสลิปที่มีเลขอ้างอิงเดียวกันในระบบแล้ว

<div style="display:flex;justify-content:center;margin:1.5rem 0">
<div style="width:100%;max-width:520px;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.35);font-family:var(--font-prompt),-apple-system,'Segoe UI',Roboto,sans-serif;background:#fff">
  <!-- header -->
  <div style="background:linear-gradient(135deg,#0d7a6e,#14b8a6);padding:18px 20px;display:flex;align-items:center;gap:12px">
    <div style="width:38px;height:38px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
    </div>
    <div>
      <div style="color:#fff;font-weight:700;font-size:15px">Upload Payment Slip</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px">อัปโหลดสลิปการโอนเงิน</div>
    </div>
  </div>
  <!-- body -->
  <div style="padding:20px;background:#f8f9fa">
    <!-- payment info card -->
    <div style="background:#eef2f1;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">ร้านค้า</span><span style="font-weight:600;color:#333">ร้านค้าตัวอย่าง</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">จำนวนเงิน</span><span style="font-weight:700;color:#0d7a6e">500.00 THB</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="color:#888">โอนเข้าบัญชี</span><span style="font-weight:600;color:#333">กสิกรไทย 012-3-45678-9</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:#888">ผู้โอน</span><span style="font-weight:600;color:#333">สมชาย ใจดี</span></div>
    </div>
    <p style="text-align:center;color:#555;font-size:13px;margin:0 0 14px">Select a payment slip image to upload</p>
    <!-- drop zone -->
    <div style="border:2px dashed #cdd5e0;border-radius:12px;padding:36px 20px;text-align:center;background:#fff;margin-bottom:16px">
      <div style="width:44px;height:44px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#0d7a6e" stroke-width="2"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg>
      </div>
      <div style="font-weight:600;color:#222;font-size:14px">Tap to select image</div>
      <div style="color:#999;font-size:12px;margin-top:4px">JPG, PNG, WebP</div>
    </div>
    <!-- slip reference -->
    <div style="margin-bottom:14px">
      <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:8px">Slip Reference <span style="color:#888;font-weight:400">(Optional)</span></label>
      <div style="display:flex;align-items:center;gap:8px">
        <input readonly value="A1B2" style="flex:1;padding:10px 12px;border:1px solid #dde2ea;border-radius:8px;font-size:14px;color:#aaa;background:#fff;text-align:center;outline:none" />
        <span style="color:#aaa;font-weight:600">—</span>
        <input readonly value="C3D4" style="flex:1;padding:10px 12px;border:1px solid #dde2ea;border-radius:8px;font-size:14px;color:#aaa;background:#fff;text-align:center;outline:none" />
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:11px;color:#999">First 4 digits</span>
        <span style="font-size:11px;color:#999">Last 4 digits</span>
      </div>
    </div>
    <!-- note -->
    <div style="margin-bottom:16px">
      <label style="display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:8px">Note <span style="color:#888;font-weight:400">(Optional)</span></label>
      <textarea readonly rows="2" placeholder="Additional notes" style="width:100%;padding:10px 12px;border:1px solid #dde2ea;border-radius:8px;font-size:13px;color:#aaa;background:#fff;resize:none;outline:none;box-sizing:border-box"></textarea>
    </div>
    <!-- button -->
    <button disabled style="width:100%;padding:13px;background:#b0bec5;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:not-allowed">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg>
      Upload Slip
    </button>
  </div>
  <!-- dup warning -->
  <div style="margin:0 20px 20px;background:#fff3cd;border:1px solid #ffc107;border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px">
    <span style="font-size:16px;line-height:1">⚠️</span>
    <div>
      <div style="font-size:13px;font-weight:700;color:#856404">พบสลิปซ้ำในระบบ!</div>
      <div style="font-size:12px;color:#856404;margin-top:2px">หากพบเลขอ้างอิงเดียวกัน ระบบจะแสดงคำเตือน พร้อมตัวเลือก <strong>อัปโหลดต่อไป</strong> หรือ <strong>ยกเลิก</strong></div>
    </div>
  </div>
</div>
</div>

> ลูกค้าไม่ต้อง login เพื่อใช้หน้านี้ — URL มี token ฝังอยู่แล้ว และหมดอายุใน 24 ชั่วโมง

> แม้ HTTP status code จะเป็น `200` แต่ต้องตรวจสอบ `status` ใน response body ด้วย — ถ้า `"OK"` คือสำเร็จ ถ้าค่าอื่นคือมีข้อผิดพลาด (ดู [การจัดการ Error](/documents/error-handling))

---

## สร้างคำขอรับเงินแบบ P2P (Pay-In P2P)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayInRequestP2P/{merchantId}
```

สร้าง Pay-In Request แบบ **Peer-to-Peer (P2P)** — ระบบจะจับคู่กับ Pay-Out Request ที่รอดำเนินการอยู่โดยอัตโนมัติ แล้วให้ลูกค้าโอนเงินตรงไปยังบัญชีของผู้รับ (แทนที่จะโอนผ่าน QR Code ของระบบ)

> **P2P คืออะไร?** แทนที่เงินจะเข้าบัญชีของ Merchant ก่อน แล้วค่อยโอนออก — P2P ให้ผู้ส่งโอนตรงถึงผู้รับเลย ระบบทำหน้าที่จับคู่และยืนยัน

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID จาก Merchant (ต้องไม่ซ้ำกัน) |
| `RefId2` | string | ❌ | Reference เพิ่มเติม 2 |
| `RefId3` | string | ❌ | Reference เพิ่มเติม 3 |
| `PayerName` | string | ✅ | ชื่อผู้จ่าย |
| `RequestedAmount` | number | ✅ | จำนวนเงิน (ต้องมากกว่า 0 และอยู่ใน range ที่ Merchant กำหนด) |
| `Currency` | string | ✅ | สกุลเงิน — ปัจจุบันรองรับเฉพาะ `THB` |
| `QrProvider` | string | ✅ | `PP` หรือ `SCB` (ระบบใช้สำหรับ internal matching) |
| `Description` | string | ❌ | คำอธิบายรายการ |

### ตัวอย่าง Request

```json
{
  "RefId1": "P2P-ORDER-20260701-001",
  "PayerName": "สมชาย ใจดี",
  "RequestedAmount": 1000,
  "Currency": "THB",
  "QrProvider": "PP"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "paymentResponse": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "type": "PayIn",
    "status": "Pending",
    "requestedAmount": 1000.00,
    "generatedAmount": 1000.00,
    "currency": "THB",
    "qrCode": null,
    "qrCodeImage": "",
    "isQrAvailable": false,
    "payInBankCode": "KBANK",
    "payInBankAccountNo": "012-3-45678-9",
    "payInBankAccountName": "ชื่อผู้รับปลายทาง",
    "payInPromptPayId": "0812345678",
    "slipUploadUrl": "/payin-slip-upload/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/a1b2c3d4-...",
    "paymentStatusUrl": "/payin-status/org123/3fa85f64-5717-4562-b3fc-2c963f66afa6/e5f6a7b8-..."
  }
}
```

### ความแตกต่างจาก Pay-In ปกติ

| | Pay-In ปกติ | Pay-In P2P |
|---|---|---|
| `isQrAvailable` | `true` (ส่วนใหญ่) | `false` (ส่วนใหญ่) — บัญชี P2P มักไม่ผูกกับ PromptPay |
| `qrCodeImage` | รูป QR Code | ว่างเปล่า (`""`) เมื่อ `isQrAvailable = false` |
| `payInBankAccountName` | บัญชี Merchant | บัญชีของผู้รับปลายทาง (จาก Pay-Out Request ที่จับคู่) |
| การโอนเงิน | สแกน QR Code | โอนตรงไปยังบัญชีที่ระบุใน response (กรอกข้อมูลบัญชีเอง) |
| `slipUploadUrl` | ✅ | ✅ (สำคัญมาก — ลูกค้าต้องอัปโหลดสลิปเป็นหลักฐาน) |
| `paymentStatusUrl` | ✅ | ✅ (ใช้ดูสถานะ + ลิงก์ไปอัปโหลดสลิปได้เหมือนกัน) |

> **สำคัญ:** สำหรับ P2P — `isQrAvailable` มักเป็น `false` เพราะบัญชีปลายทางอาจไม่ผูกกับ PromptPay ในกรณีนี้ **ต้องแสดงข้อมูลบัญชี** (`payInBankCode`, `payInBankAccountNo`, `payInBankAccountName`, `payInPromptPayId`) เพื่อให้ลูกค้ากรอกโอนเงินเองด้วยตัวเอง พร้อมทั้งแสดง `slipUploadUrl` เพื่อให้อัปโหลดสลิปหลักฐานการโอน

> **สำคัญ — ต้อง concat กับโดเมนไหน:** `slipUploadUrl` และ `paymentStatusUrl` เป็น relative path เช่นเดียวกับ Pay-In ปกติ ต้องนำไปต่อกับ `{{MERCHANT_URL}}` เอง เช่น `{{MERCHANT_URL}}/payin-slip-upload/org123/xxx/yyy` (ดูคำอธิบายเต็มในหัวข้อ [Response Fields](#response-fields) ด้านบน)

> **แนะนำ:** นำ `slipUploadUrl` ไปทำเป็น **QR Code** แสดงควบคู่กับข้อมูลบัญชีปลายทาง — ลูกค้าโอนเงินแล้วสแกน QR เปิดหน้าอัปโหลดสลิปได้เลยโดยไม่ต้องพิมพ์ URL เอง (ดูตัวอย่างหน้าอัปโหลดสลิปด้านบน)

> **Error `ERROR_NO_P2P_ACCOUNT_MATCH`:** หากไม่มี Pay-Out Request ที่รอดำเนินการอยู่ในระบบ จะได้รับ error นี้ — แปลว่าในขณะนั้นไม่มีรายการที่สามารถจับคู่ได้

---

## สร้างคำขอโอนเงินออก (Pay-Out)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitPayOutRequest/{merchantId}
```

สร้างคำขอโอนเงินออกไปยังบัญชีปลายทาง

### Request Body

| Field | Type | Required | คำอธิบาย |
|---|---|---|---|
| `RefId1` | string | ✅ | Reference ID จาก Merchant (ต้องไม่ซ้ำกัน) |
| `RefId2` | string | ❌ | Reference เพิ่มเติม 2 |
| `RefId3` | string | ❌ | Reference เพิ่มเติม 3 |
| `RequestedAmount` | number | ✅ | จำนวนเงิน (ต้องมากกว่า 0) |
| `QrProvider` | string | ✅ | ต้องเป็น `PP` (PromptPay เท่านั้น สำหรับ Pay-Out) |
| `BankCode` | string | ✅ | รหัสธนาคารปลายทาง เช่น `SCB`, `KBANK`, `BAY` — ดู[รหัสธนาคารที่รองรับทั้งหมด](/documents/bank-codes) |
| `BankAccountNo` | string | ✅ | เลขบัญชีปลายทาง |
| `BankAccountName` | string | ✅ | ชื่อบัญชีปลายทาง |
| `PromptPayId` | string | ❌ | หมายเลข PromptPay ปลายทาง |
| `AccountType` | string | ❌ | ประเภทบัญชี: `Native` หรือ `PromptPay` |

> ข้อมูลบัญชีปลายทาง: ต้องส่ง `BankCode`+`BankAccountNo`+`BankAccountName` เข้ามาเสมอทุกครั้ง (ดู[รหัสธนาคารที่รองรับ](/documents/bank-codes)) แม้จะโอนผ่าน PromptPay ก็ตาม — ถ้าทราบหมายเลข PromptPay ของปลายทางด้วย สามารถส่ง `PromptPayId`+`AccountType` เพิ่มเติมได้ หรือจะส่ง `PayinBankAccountId` (ID จากระบบ) แทนทั้งหมดนี้ก็ได้เช่นกัน

> **แนะนำ:** หากทราบหมายเลข PromptPay ของบัญชีปลายทาง แนะนำให้ส่ง `PromptPayId` มาด้วย เนื่องจากการโอนผ่าน PromptPay จะช่วยให้ระบบประมวลผลได้เร็วขึ้น และผู้รับได้รับเงินได้รวดเร็วยิ่งขึ้น

### ตัวอย่าง Request (โอนผ่านบัญชีธนาคาร)

```json
{
  "RefId1": "PAYOUT-20260701-001",
  "RequestedAmount": 500,
  "QrProvider": "PP",
  "BankCode": "KBANK",
  "BankAccountNo": "0123456789",
  "BankAccountName": "สมชาย ใจดี",
  "AccountType": "Native"
}
```

### ตัวอย่าง Request (โอนผ่าน PromptPay)

```json
{
  "RefId1": "PAYOUT-20260701-002",
  "RequestedAmount": 200,
  "QrProvider": "PP",
  "PromptPayId": "0812345678",
  "AccountType": "PromptPay"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "paymentResponse": {
    "id": "7bc95f12-3a21-4f89-c4ed-1d852a77bfc8",
    "type": "PayOut",
    "status": "Pending",
    "requestedAmount": 500.00,
    "currency": "THB",
    "createdAt": "2026-07-01T10:05:00Z"
  }
}
```

---

## สร้างคำขอถอนเงิน (Withdrawal)

```
POST {{API_URL}}/api/PaymentRequest/org/{orgId}/action/SubmitWithdrawalRequest/{merchantId}
```

ใช้ endpoint นี้เมื่อ **Merchant เองต้องการถอนเงินออกไปยังบัญชีของตัวเอง** ต่างจาก Pay-Out ทั่วไปที่เป็นการโอนเงินออกไปให้ *ลูกค้า* ของ Merchant — ภายในระบบจะสร้างคำขอชนิดเดียวกับ Pay-Out ทุกประการ เพียงแต่ติด flag ว่าเป็น withdrawal เพื่อให้แยกออกจาก Pay-Out ปกติในรายงานต่าง ๆ

> **Request body, วิธีคิดค่าธรรมเนียม, รูปแบบ Response และ Webhook เหมือนกับ [สร้างคำขอโอนเงินออก (Pay-Out)](#สร้างคำขอโอนเงินออก-payout) ทุกอย่าง 100%** — ต่างกันแค่ endpoint path (`SubmitWithdrawalRequest` แทน `SubmitPayOutRequest`) เท่านั้น ส่วนที่อธิบายไว้ด้านบนสำหรับ Pay-Out ใช้กับ endpoint นี้ได้เหมือนกันทุกประการ

### Request Body

เหมือนกับ [สร้างคำขอโอนเงินออก (Pay-Out)](#สร้างคำขอโอนเงินออก-payout) — `RefId1`, `RefId2`, `RefId3`, `RequestedAmount`, `QrProvider` และข้อมูลบัญชีปลายทาง (`BankCode`+`BankAccountNo`+`BankAccountName`, หรือ `PromptPayId`+`AccountType`, หรือ `PayinBankAccountId`)

### ตัวอย่าง Request

```json
{
  "RefId1": "WITHDRAW-20260701-001",
  "RequestedAmount": 500,
  "QrProvider": "PP",
  "BankCode": "KBANK",
  "BankAccountNo": "0123456789",
  "BankAccountName": "สมชาย ใจดี",
  "AccountType": "Native"
}
```

### Response

```json
{
  "status": "OK",
  "description": "Success",
  "paymentResponse": {
    "id": "7bc95f12-3a21-4f89-c4ed-1d852a77bfc8",
    "type": "PayOut",
    "status": "Pending",
    "requestedAmount": 500.00,
    "currency": "THB",
    "createdAt": "2026-07-01T10:05:00Z"
  }
}
```

> **Webhook:** ไม่มี event ใหม่ — คำขอถอนเงินยังคงยิง event `PaymentOut.Success` / `PaymentOut.Rejected` เหมือนที่อธิบายไว้ใน [Webhooks](/documents/webhooks) พร้อม payload fields แบบเดียวกันทุกประการ
