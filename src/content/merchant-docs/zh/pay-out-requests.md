---
title: 提现请求 (Pay-Out Requests)
summary: 追踪从系统转出到目标账户的付款请求，包含可与入账款项自动匹配的 P2P 机制。
keywords: pay-out request, 提现, 转账出款, p2p, partial payout, fee payer, qr code
updatedAt: "{{BUILD_DATE}}"
---

# 提现请求 (Pay-Out Requests)

此页面与 Pay-In Request 正好相反——提现请求 (Pay-Out Request) 不是请求收款，而是要求系统**将款项转出**到目标银行账户，例如退款给客户、支付给合作伙伴，或将利润从系统中提取出来。

<div class="warning-box">
  <p class="warning-title">提现请求不是从这个页面创建的</p>
  <ul>
    <li>此页面<strong>仅用于查看与追踪</strong>提现请求。</li>
    <li>新建提现请求的操作在<strong>Admin 端</strong>完成，而不是在这个 Merchant 页面——如需提现，请联系您的团队/系统管理员为您创建请求。</li>
  </ul>
</div>

## 页面截图

![Pay-Out Requests 列表页](/docs/merchant/pay-out-requests/pay-out-requests-01.png)

| 编号 | 说明 |
|---|---|
| 1 | 筛选条件：搜索、状态、类型、时间范围 |
| 2 | 表格列：日期、商户、金额、手续费 + 手续费承担方、目标账户 (To)、来源账户 (From)、状态、参考编号 |
| 3 | "Withdraw" 标签（该记录为系统提现时显示） |
| 4 | 提醒标签 (Notices) |

## 您可以在此页面做什么

### 追踪请求状态

| 状态 | 含义 |
|---|---|
| **成功 (Paid / Approved)** | 款项已成功转出至目标账户。 |
| **待处理 (Pending)** | 请求正在等待处理，会显示请求已等待的时长。 |
| **失败 (Rejected / Failed)** | 无法处理该请求，并附带原因说明。 |
| **已取消 (Cancelled)** | 该请求已被取消。 |

### 查看请求详情

![Pay-Out Request 详情页](/docs/merchant/pay-out-requests/pay-out-requests-02.png)

| 编号 | 说明 |
|---|---|
| 1 | 申请提现金额 (Amount) |
| 2 | 手续费与手续费承担方 (Fee Payer) |
| 3 | 用于转账参考的 QR Code（若不支持生成 QR，则直接显示账户信息） |
| 4 | 状态 + 提醒标签 |

P2P 类型的记录会在此区块下方额外显示 "Partial Payouts" 表格（详见下一节）。

在列表页点击日期即可查看详情，可以看到目标账户、金额、手续费与净额，以及**手续费承担方 (Fee Payer)**——标明此次提现的手续费是从"店铺"（您）扣除，还是从"收款方"扣除（若为后者，则目标账户实际收到的金额会少于申请提现的全额）。

### 了解 P2P / Partial Payout 机制

部分提现请求并非直接从您店铺的余额中支付，而是由系统**匹配其他客户当下正好转入的款项**，并立即将该笔款项转发至指定的目标账户（此机制称为 P2P）——同一笔请求可以被这样匹配多次，直到凑满全额为止 (Partial Payout)，每个店铺设有匹配次数的上限（可在[商户信息](/documents/merchant/merchant-info)页面查看该数值）。

在 P2P 请求的详情页中，会显示 **"Partial Payouts"** 表格，展示目前已支付的金额、匹配了多少次，以及距离凑满全额还差多少。

### 使用 QR Code 进行转账

请求详情页会显示 QR Code，供转账至目标账户时参考——如果目标账户/银行不支持生成 QR，系统会改为直接显示账户信息，供手动转账使用。

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>提现请求的审批由 Please Payment 团队在后台完成，此页面没有审批按钮。</li>
  </ul>
</div>

## 相关页面

- [提现记录 (Pay-Out Transactions)](/documents/merchant/pay-out-transactions) — 查看已完成处理的记录
- [商户信息 (Merchant Info)](/documents/merchant/merchant-info) — 查看提现限额与 Partial Count Limit
