---
title: 商户信息 (Merchant Info)
summary: 汇总店铺各项配置的页面——手续费、限额、用于对接的 API endpoint、Webhook 以及钱包余额（仅供查看，无法编辑）。
keywords: merchant info, 商户信息, 手续费, 限额, endpoint, webhook, wallet, 钱包
updatedAt: "{{BUILD_DATE}}"
---

# 商户信息 (Merchant Info)

这个页面就是您店铺在 Please Payment 系统里的"身份证"——汇总了店铺各项配置信息，从手续费、每日最高限额，到您的开发团队对接 API 需要用到的 URL，都能在这里找到。

<div class="warning-box">
  <p class="warning-title">开始前请注意</p>
  <ul>
    <li>此页面所有字段均为<strong>只读信息 (read-only)</strong>，页面上没有任何编辑/保存按钮。</li>
    <li>如需变更手续费、限额或页面中显示的任何设置，请联系 Please Payment 团队或您的系统管理员。</li>
  </ul>
</div>

此页面共有 4 个标签页，每个标签页的内容差异较大，因此下方分别为每个标签页提供了独立的截图。

## 您可以在此页面做什么

### "Info" 标签页

![Info 标签页](/docs/merchant/merchant-info/merchant-info-01.png)

| 编号 | 说明 |
|---|---|
| 1 | 店铺状态徽章 (Active / Disabled / Pending) |
| 2 | 标签栏：Info、Payment Endpoint、Webhooks、Wallet Summary |
| 3 | 基本信息：商户编号、名称、邮箱、电话、状态 |
| 4 | 手续费卡片：收款 (Pay-In) 端与付款 (Pay-Out) 端的手续费百分比 |
| 5 | 限额卡片：单笔金额与每日总限额（向下滚动可查看 Payout Partial Count Limit，以及紧接其后的舍去零头/收款请求过期时间设置） |

这是打开后看到的第一个标签页，汇总了店铺的核心配置：

- **基本信息** — 商户编号、店铺名称、邮箱、电话号码及账户状态
- **手续费 (Fees)** — 每次有款项进账 (Pay-In Fee) 和每次有款项出账 (Pay-Out Fee) 时系统扣除的百分比，可用这两个数字计算每笔交易的实际成本
- **限额 (Limits)** — 收款和付款两端每笔交易允许的最低/最高金额，以及**每日总限额**（金额与笔数），并配有色条显示当前已使用的限额百分比（绿色 = 余量充足，黄色 = 接近上限 70-90%，红色 = 非常接近上限 ≥90%）。如果经常看到红色，建议联系团队根据实际交易量申请调整限额
- **Payout Partial Count Limit (P2P)** — 一笔提现请求最多可以与客户多次转入的款项匹配的次数上限（详见[提现请求](/documents/merchant/pay-out-requests)页面）
- **舍去零头 (Discard Cent)** — 若已启用，系统会自动将收款金额的零头部分向下取整
- **收款请求过期时间** — 每笔收款请求 (Pay-In Request) 创建后经过多少分钟即视为过期。如果客户在此时间内未完成转账，该请求将失效

### "Payment Endpoint" 标签页

![Payment Endpoint 标签页](/docs/merchant/merchant-info/merchant-info-02.png)

| 编号 | 说明 |
|---|---|
| 1 | Payment Request Endpoints 表格（类型、URL、复制按钮） |
| 2 | "View API Documentation" 链接 |
| 3 | IP Whitelist / Blacklist 区块（向下滚动可查看完整的 Web/API 白名单与黑名单列表） |

此标签页专为您店铺的开发团队准备——汇总了您自己后台系统调用 API 创建收款/付款请求时需要用到的 URL。

- **Payment Request Endpoints** 表格显示各个 endpoint 的类型与 URL，并附有复制按钮（点击后会短暂显示"已复制"状态）
- **"View API Documentation"** 链接会跳转到完整的开发者 Public API 文档
- **IP Whitelist / Blacklist** 列表 — 分别列出网页端 (Web) 与 API 端已允许 (Whitelist) 或被封锁 (Blacklist) 的 IP，可用来确认您的系统是否从正确的 IP 发起连接

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>收款请求 (Pay-In Request) <strong>不是从这个页面创建的</strong>——必须通过调用此标签页中显示的 endpoint 来创建。详细调用方式请参阅 "View API Documentation"。</li>
  </ul>
</div>

### "Webhooks" 标签页

![Webhooks 标签页](/docs/merchant/merchant-info/merchant-info-03.png)

| 编号 | 说明 |
|---|---|
| 1 | Event 名称（彩色标签） |
| 2 | Event 说明 |
| 3 | Endpoint URL + HTTP 方法 |
| 4 | Active/Inactive 状态 |

Webhook 是系统用来自动向您的系统"推送通知"的机制——例如付款成功时，系统会立即将数据推送到您设置好的 URL。此标签页列出所有已配置的 Webhook（Event 名称、说明、目标 URL + HTTP 方法、启用状态）。

<div class="warning-box">
  <p class="warning-title">请注意</p>
  <ul>
    <li>此页面<strong>仅用于查看 Webhook 列表</strong>，Merchant 系统中没有新增/编辑 Webhook 的按钮。如需新增或修改 Webhook，请联系 Please Payment 团队。</li>
  </ul>
</div>

### "Wallet Summary" 标签页

![Wallet Summary 标签页](/docs/merchant/merchant-info/merchant-info-04.png)

| 编号 | 说明 |
|---|---|
| 1 | 钱包余额 (Current Balance) |
| 2 | 每日收款限额条 (Pay-In Daily Amount) |
| 3 | Wallet Transactions 表格 |
| 4 | 每行可点击的 Tag 标签（链接到来源记录） |

显示您店铺钱包 (Wallet) 的余额与变动记录——如果店铺尚未启用钱包功能，此标签页会显示尚未配置的提示信息。

- 页面上方以大号数字显示当前余额 (Wallet Balance)，并配有每日收款限额条（如已设置）
- **Wallet Transactions** 表格 — 按日期排列的所有影响钱包余额的记录。每一行标明该笔是收款 (Pay-In，绿色)、付款 (Pay-Out，红色) 还是提现 (Withdraw)，并显示该笔发生前后的余额——可用来追溯余额变动来自哪一笔记录
- 点击表格中记录的 Tag 标签，即可在新标签页打开该来源记录的详情（例如相关的收款请求或提现请求）

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>部分记录属于跨商户的 P2P 交易，系统不允许您查看其详情（会弹出提示信息，而不是打开新页面）。这是系统的正常行为，并非故障。</li>
  </ul>
</div>

## 相关页面

- [提现请求 (Pay-Out Requests)](/documents/merchant/pay-out-requests) — 查看限额与 P2P Partial Payout 机制的详细说明
- [创建收款请求 (Pay-In Requests)](/documents/merchant/pay-in-requests) — 了解收款请求是如何通过 API 创建的
