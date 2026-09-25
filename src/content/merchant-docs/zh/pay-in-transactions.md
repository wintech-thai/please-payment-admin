---
title: 收款记录 (Pay-In Transactions)
summary: 已确认到账的每一笔款项的记录，附带扣除手续费后的实际净额。
keywords: pay-in transaction, 收款记录, 净额, identified, unidentified, 手续费
updatedAt: "{{BUILD_DATE}}"
---

# 收款记录 (Pay-In Transactions)

如果说 Pay-In Request 是"请求客户转账"，那 Pay-In Transaction 就是**确认这笔钱已经真正到账的凭证**——每当有款项转入您店铺的银行账户并被系统检测到，都会在此页面生成一条记录，无论是否与某笔收款请求匹配成功。

## 页面截图

![Pay-In Transactions 列表页](/docs/merchant/pay-in-transactions/pay-in-transactions-01.png)

| 编号 | 说明 |
|---|---|
| 1 | 筛选条件：搜索、状态、P2P、时间范围 |
| 2 | 刷新按钮与 Export CSV 按钮 |
| 3 | 表格列：日期、商户、金额、手续费、收款账户、付款人、状态（匹配成功时附带指向来源收款请求的链接）、参考编号 |

## 您可以在此页面做什么

### 读懂各笔记录的状态

| 状态 | 含义 |
|---|---|
| **已匹配 (Identified / Approved)** | 到账款项已成功匹配到某笔收款请求，会附带链接查看来源请求。 |
| **未匹配 (UnIdentified)** | 款项确实已到账，但尚未找到与之对应的收款请求——会显示已等待的时长。 |
| **失败 (Error / Rejected)** | 处理该记录时发生错误。 |

### 查看记录详情

![Pay-In Transaction 详情页](/docs/merchant/pay-in-transactions/pay-in-transactions-02.png)

| 编号 | 说明 |
|---|---|
| 1 | 基本信息 (General Information) — 日期、状态、金额、收款账户、参考编号 |
| 2 | Payment Request ID — 链接回到来源收款请求 |
| 3 | 手续费信息 (Fee Information) — Tx Amount、Fee Rate、Pay-In Fee、Net Amount（净额） |

点击日期即可打开详情，可以看到：

- **基本信息** — 金额、币种、收款银行账户、参考编号，以及链接回来源收款请求（如有）
- **手续费信息** — 实际到账金额（扣费前）、手续费百分比、被扣除的手续费金额，以及**您店铺实际收到的净额**（扣除手续费后的金额）——对账时应以此数字为准，而不是扣费前的全额
- **付款人信息** — 转账人的账户名/银行信息（如系统检测到该信息）
- **处理步骤** — 系统对该记录进行验证与匹配的处理流程

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>如果某条记录长时间停留在"未匹配"状态，可以检查是否存在金额相符且尚未过期的收款请求，或改用 Slip Link 让客户上传凭证确认（可在对应<a href="/documents/merchant/pay-in-requests">收款请求</a>的详情页操作）。</li>
  </ul>
</div>

## 相关页面

- [创建收款请求 (Pay-In Requests)](/documents/merchant/pay-in-requests) — 各笔记录对应的来源请求
- [报表与分析 (Report & Analytic)](/documents/merchant/report-analytic) — 查看按日/按月的汇总数据
