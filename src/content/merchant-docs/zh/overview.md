---
title: 概览 (Overview)
summary: 登录后看到的第一个页面，快速汇总收款、付款、手续费与商户当前余额。
keywords: overview, dashboard, 概览, 汇总, pay-in, pay-out, wallet, 余额
updatedAt: "{{BUILD_DATE}}"
---

# 概览 (Overview)

这是您每次登录 Please Payment 系统后看到的第一个页面。设计初衷是让您"看一眼就知道店铺现状"——收了多少钱、付了多少钱、扣了多少手续费、系统里目前还剩多少余额，都不需要一页一页去翻查。

## 这个页面是什么

Overview 把您店铺在**所选时间范围内**的所有资金活动汇总在一个页面里。如果您想知道"过去 24 小时卖了多少"或"这个月资金进出多少"，这个页面就是首选。

## 页面截图

![Overview 页面](/docs/merchant/overview/overview-01.png)

| 编号 | 说明 |
|---|---|
| 1 | 时间范围选择器 — 可选预设区间（24 小时、7 天、30 天）或自定义日期范围（默认为最近 30 天） |
| 2 | 刷新按钮 — 重新加载数据，无需刷新整个页面 |
| 3 | 5 张汇总卡片：总收款 (Total Pay-In)、总付款 (Total Pay-Out)、总提现 (Total Withdrawal)、总手续费 (Total Fee)、净流量 (Net Flow) |
| 4 | 钱包余额横幅 — 仅在店铺已启用钱包功能时显示 |
| 5 | 每日柱状图 — 比较所选区间内每天的收款/付款/提现金额 |

## 您可以在此页面做什么

### 查看指定时间范围的汇总

在上方切换时间范围，页面上所有数字都会立即更新。例如选择"7 天"查看最近一周的概况，或自定义日期范围来对比上个月的数据。

### 读懂每张汇总卡片

- **总收款 (Total Pay-In)** — 该时间段内客户付给您的所有款项，并附带交易笔数
- **总付款 (Total Pay-Out)** — 您付给他人的款项（例如退款给客户或付款给合作伙伴）
- **总提现 (Total Withdrawal)** — 从系统提现到您真实银行账户的金额
- **总手续费 (Total Fee)** — 该时间段内收款和付款两端被扣除的手续费总和
- **净流量 (Net Flow)** — 总收款减去总付款；如果是正数（绿色），说明进账多于出账

### 查看当前余额

如果店铺已启用钱包 (Wallet)，会看到一个大号数字显示当前余额。详细的余额变动记录可在[商户信息](/documents/merchant/merchant-info)页面的 Wallet 标签页查看。

### 从图表观察每日趋势

下方的柱状图能帮您看出哪天销售好、哪天付款异常偏高——比逐条查看记录更快发现异常情况。

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>此页面没有商户筛选器，因为只显示您当前正在使用的店铺。如果您管理多家店铺，请先从上方菜单切换店铺。</li>
    <li>想看更详细的数据，例如按日拆分的表格，或经常付款的客户信息？请前往<a href="/documents/merchant/report-analytic">报表与分析</a>页面。</li>
  </ul>
</div>

## 相关页面

- [报表与分析 (Report & Analytic)](/documents/merchant/report-analytic) — 查看更详细的数据，含表格与 CSV 导出
- [商户信息 (Merchant Info)](/documents/merchant/merchant-info) — 查看详细的钱包余额记录
