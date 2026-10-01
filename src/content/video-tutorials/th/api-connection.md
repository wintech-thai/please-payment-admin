---
title: การเชื่อมต่อ API
summary: วิดีโอสอนสำหรับนักพัฒนา อธิบายวิธีเชื่อมต่อและเรียกใช้งาน API ของระบบ
keywords: video, tutorial, developer, api, การเชื่อมต่อ api, สอนการใช้งาน
videoUrl: "https://customer-c3liglnw3agnd0u2.cloudflarestream.com/39c3c22beadc5a65062e079eab9ccdf1/manifest/video.m3u8"
updatedAt: "{{BUILD_DATE}}"
---

# การเชื่อมต่อ API

วิดีโอนี้สำหรับนักพัฒนาที่ต้องการเชื่อมต่อระบบเข้ากับ API ของเรา อธิบายขั้นตอนการเชื่อมต่อและเรียกใช้งาน API เบื้องต้น

ดูจบแล้วคุณจะเข้าใจโครงสร้าง API, endpoint ที่ต้องเรียก และวิธีตั้งค่า Webhook รับผลธุรกรรม — จำเป็นสำหรับนักพัฒนาที่จะเชื่อมต่อระบบของตัวเองเข้ากับระบบนี้ ก่อนเริ่มเขียนโค้ดจริง

## วิดีโอนี้พูดถึงอะไรบ้าง

- **ดูหน้าภาพรวมของร้านค้าฝั่ง Merchant Portal** ก่อนเริ่ม (ยอดเงิน, รายการล่าสุด) เพื่อให้เห็นบริบทของสิ่งที่จะเชื่อมต่อผ่าน API
- **ดูหน้า Public API Docs** — เมนู Endpoints, Webhooks, Error Codes พร้อมตัวอย่าง spec จริงของ endpoint "สร้างคำขอรับเงินแบบ P2P (Pay-In P2P)" ครบทั้ง Request Body และ Response Fields
- **ดูหน้า Payment Endpoints ของร้านค้า** — URL จริงสำหรับเรียก Pay-In, Pay-In (P2P), Pay-Out, Withdraw พร้อมปุ่ม Copy และลิงก์ไปหน้า API Documentation, รวมถึงช่องตั้งค่า IP Whitelist/Blacklist
- **ตัวอย่างการสร้างคำขอแบบ end-to-end** — สร้าง Pay-In, Pay-In (P2P) และ Pay-Out Request จริงจากฝั่ง Admin/Merchant แล้วดูผลลัพธ์ที่สะท้อนในรายการธุรกรรมทันที
- **ตั้งค่า Webhook** — ผูก URL ปลายทางของร้านค้าเข้ากับ event ต่าง ๆ (เช่น PaymentIn.Success, PaymentIn.Rejected, PaymentOut.Success) ดูตัวอย่างโครงสร้าง Payload JSON ที่ระบบจะส่งไป และรูปแบบ response (`{"status": "ok"}`) พร้อมกฎการตีความ HTTP status code ที่ระบบคาดหวังจากฝั่งร้านค้า
