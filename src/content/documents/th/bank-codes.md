---
title: รหัสธนาคารที่รองรับ
---

# รหัสธนาคารที่รองรับ

ฟีลด์ `BankCode` ที่ใช้ใน [`SubmitPayOutRequest`](/documents/endpoints#สร้างคำขอโอนเงินออก-payout) และ [`SubmitWithdrawalRequest`](/documents/endpoints#สร้างคำขอถอนเงิน-withdrawal) (และตอนตั้งค่าบัญชีธนาคาร) รองรับเฉพาะรหัสย่อชุดนี้เท่านั้น — **ไม่ใช่** รหัส 3 หลักมาตรฐานของธนาคารแห่งประเทศไทย (ธปท.) ตารางด้านล่างเทียบให้ทั้งสองแบบ

> **หมายเหตุ:** ต้องส่ง `BankCode`, `BankAccountNo`, `BankAccountName` เข้ามาด้วยทุกครั้ง **แม้จะโอนออกผ่าน PromptPay ก็ตาม** — `PromptPayId` เป็นข้อมูลเพิ่มเติม ไม่ได้ใช้แทนข้อมูลบัญชีธนาคาร

| รหัสธนาคาร (ระบบ) | รหัส ธปท. | ชื่อธนาคาร (EN) | ชื่อธนาคาร (TH) |
|---|---|---|---|
| `BBL` | 002 | Bank of Bangkok | ธนาคารกรุงเทพ |
| `KBANK` | 004 | Kasikorn Bank | ธนาคารกสิกรไทย |
| `KTB` | 006 | Krung Thai Bank | ธนาคารกรุงไทย |
| `TMB` | 011 | Bank of Thailand (TMB) | ธนาคารทหารไทย |
| `SCB` | 014 | Siam Commercial Bank | ธนาคารไทยพาณิชย์ |
| `CITI` | 017 | Citibank | ธนาคารซิตี้แบงก์ |
| `SCBT` | 020 | Standard Chartered Bank (Thailand) | ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย) |
| `CIMBT` | 022 | CIMB Thai Bank | ธนาคารซีไอเอ็มบี ไทย |
| `UOB` | 024 | United Overseas Bank | ธนาคารยูโอบี |
| `BAY` | 025 | Bank of Ayudhya | ธนาคารกรุงศรีอยุธยา |
| `GSB` | 030 | Government Savings Bank | ธนาคารออมสิน |
| `EXIM` | 035 | Export-Import Bank of Thailand | ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย |
| `TISCO` | 067 | Tisco Bank | ธนาคารทิสโก้ |
| `ICBC` | 070 | Industrial and Commercial Bank of China (Thailand) | ธนาคารไอซีบีซี (ไทย) |
| `LHFG` | 073 | Land and Houses Bank | ธนาคารแลนด์ แอนด์ เฮ้าส์ |

ถ้าส่ง `BankCode` ที่ไม่อยู่ในลิสต์นี้ ระบบจะตอบ error กลับมา — ดูเพิ่มเติมที่ [การจัดการ Error](/documents/error-handling)
