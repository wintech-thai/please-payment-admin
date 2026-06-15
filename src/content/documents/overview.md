---
title: ภาพรวม
version: "1.0.0"
updatedAt: "2026-06-15"
---

# เอกสาร Public API

**เวอร์ชัน:** 1.0.0 &nbsp;|&nbsp; **อัปเดตล่าสุด:** 15 มิถุนายน 2569

## สภาพแวดล้อม

| สภาพแวดล้อม | Base URL | คำอธิบาย |
|---|---|---|
| Production | `https://api.please-payment.com/api` | ธุรกรรมจริง, การชำระเงินจริง |
| Sandbox | `https://api-dev.please-payment.com/api` | ธุรกรรมทดสอบ (เฉพาะ merchant ประเภท sandbox) |

## ภาพรวม

Please Payment Public API ช่วยให้ร้านค้าสามารถเชื่อมต่อระบบชำระเงินเข้ากับแอปพลิเคชันของตน คำขอ API ทั้งหมดต้องมีการยืนยันตัวตนด้วย HMAC-SHA256

### Production vs Sandbox

ใช้ **Sandbox** สำหรับการพัฒนาและทดสอบก่อน go-live ไม่มีการเรียกเก็บเงินจริงในโหมด Sandbox

## ภาพรวม Payment Flow

![Payment Flow Diagram](/docs/images/payment-flow.svg)

> วางรูปภาพไว้ที่ `public/docs/images/` แล้ว reference ใน markdown ด้วย `/docs/images/filename.svg` หรือ `.png`

## การเริ่มต้นใช้งาน

1. ขอ API Key จากทีม Please Payment
2. ตั้งค่า HMAC-SHA256 signature
3. เรียก API ผ่าน Base URL ที่กำหนด
4. ตรวจสอบ response และจัดการ error ตามมาตรฐาน
