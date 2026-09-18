---
title: 支持的银行代码
---

# 支持的银行代码

[`SubmitPayOutRequest`](/documents/endpoints#创建付款请求payout) 和 `SubmitWithdrawalRequest`（以及配置银行账户时）中使用的 `BankCode` 字段仅接受下表中的一组固定简写代码 —— **不是**泰国银行（BOT）官方的 3 位数代码。下表将两者对照列出。

> **注意：** 必须始终发送 `BankCode`、`BankAccountNo`、`BankAccountName` —— **即使通过 PromptPay 转账也是如此**。`PromptPayId` 只是附加信息，不能替代银行账户信息。

| 银行代码（系统内） | BOT 代码 | 银行名称（英文） | 银行名称（泰文） |
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

发送不在此列表中的 `BankCode` 将返回错误 —— 详见[错误处理](/documents/error-handling)。
