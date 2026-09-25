---
title: 提现交易记录 (Pay-Out Transactions)
summary: 提现请求处理完成后，系统中每一笔成功转出资金的确认记录。
keywords: pay-out transaction, 提现交易, 净额, 手续费, 收付款账户
updatedAt: "{{BUILD_DATE}}"
---

# 提现交易记录 (Pay-Out Transactions)

这个页面记录的是[提现请求 (Pay-Out Request)](/documents/merchant/pay-out-requests)处理完成后，**已经实际从系统转出**的资金的确认记录。

## 页面截图

![Pay-Out Transactions 列表页面](/docs/merchant/pay-out-transactions/pay-out-transactions-01.png)

| 编号 | 说明 |
|---|---|
| 1 | 筛选条件：搜索、状态、类型、时间范围 |
| 2 | 刷新按钮与 Export CSV 按钮 |
| 3 | 表格栏位：日期（如适用会显示 Withdraw 标签）、金额、手续费及由谁承担手续费、目标账户、来源账户、状态、参考编号 |

## 您可以在此页面做什么

### 了解每笔交易的状态

| 状态 | 含义 |
|---|---|
| **成功 (Completed / Success / Paid)** | 资金已成功转入目标账户 |
| **失败 (Failed / Error / Rejected)** | 交易处理未成功，并附有失败原因 |
| **处理中 (Pending / Processing)** | 仍在转账流程中，会显示等待时长 |

### 查看交易详情

![Pay-Out Transaction 详情页面](/docs/merchant/pay-out-transactions/pay-out-transactions-02.png)

| 编号 | 说明 |
|---|---|
| 1 | 基本信息 (General Information) — 日期、状态、金额、参考编号 |
| 2 | Pay-Out Request ID — 链接回原始提现请求 |
| 3 | 手续费信息 (Fee Information) — Tx Amount、Fee Rate、Pay-Out Fee、以及 Net Amount |
| 4 | 目标账户信息 (Destination Information) — 收款的银行与账号 |

点击日期即可打开详情，您会看到：

- **基本信息** — 金额、币种、链接回原始提现请求、参考编号
- **手续费信息** — 手续费百分比、手续费金额，以及扣除手续费后**目标账户实际收到的净额**（如果手续费设定为由收款方承担，这个金额会与全额不同）
- **目标账户 (Destination)** — 实际收款的账户
- **来源账户 (Source)** — 实际付款出账的账户（仅在系统掌握此信息时显示）

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>如果想知道这笔交易是由哪一笔提现请求产生的，可以点击详情页面中的"来源提现请求"链接查看。</li>
  </ul>
</div>

## 相关页面

- [提现请求 (Pay-Out Requests)](/documents/merchant/pay-out-requests) — 本页所有交易的起点
