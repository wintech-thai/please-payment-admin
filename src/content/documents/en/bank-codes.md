---
title: Supported Bank Codes
---

# Supported Bank Codes

The `BankCode` field used in [`SubmitPayOutRequest`](/documents/endpoints#create-a-payout-request) and [`SubmitWithdrawalRequest`](/documents/endpoints#create-a-withdrawal-request) (and when configuring a bank account) accepts a fixed set of short codes — **not** the official 3-digit codes issued by the Bank of Thailand (BOT). The table below maps the two so you can cross-reference them.

> **Note:** `BankCode`, `BankAccountNo`, and `BankAccountName` must always be sent — **even when paying out via PromptPay**. `PromptPayId` is additional information, not a replacement for the bank account details.

| Bank Code | BOT Code | Bank Name (EN) | Bank Name (TH) |
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

Sending a `BankCode` outside this list returns an error — see [Error Handling](/documents/error-handling).
