---
title: 报表与分析 (Report & Analytic)
summary: 比 Overview 页面更深入的数据 — 按日查看数据、分析经常转账的客户，并可导出为 Excel 文件。
keywords: report, analytic, 报表, 分析, export excel, payer, 付款人
updatedAt: "{{BUILD_DATE}}"
---

# 报表与分析 (Report & Analytic)

如果说 [Overview](/documents/merchant/overview) 页面回答的是"整体情况如何"，那么这个页面回答的是更细致的问题，例如"哪一天销售最好"或"哪位客户转账最频繁"，并且可以把数据下载下来做进一步分析。

## 页面截图

这个页面内容较长，共有 3 个主要部分，请分别截图。

![第一部分：汇总 + 每日图表](/docs/merchant/report-analytic/report-analytic-01.png)

| 编号 | 说明 |
|---|---|
| 1 | 时间范围选择器（默认为 30 天） |
| 2 | 刷新按钮 |
| 3 | 8 张汇总卡片：总收款、总付款、总提现、总手续费、净流量，以及收款/付款/提现的交易笔数 |
| 4 | 每日交易金额图表，图表下方附有颜色说明 (Legend) |

在每日交易金额图表之后，是一个堆叠式 (stacked) 的每日手续费图表，再往下是按日/商户拆分的详细数据表：

![第二部分：按 Merchant 拆分的表格](/docs/merchant/report-analytic/report-analytic-02.png)

| 编号 | 说明 |
|---|---|
| 1 | "Detail by Merchant" 标题 |
| 2 | Export 按钮（下载为 Excel 文件） |
| 3 | 表格底部的合计行 (TOTAL) |

![第三部分：付款人汇总](/docs/merchant/report-analytic/report-analytic-03.png)

| 编号 | 说明 |
|---|---|
| 1 | 汇总卡片：付款人总数 (Total Payers)、总金额 (Total Amount)、总交易笔数 (Total Transactions) |
| 2 | 付款人姓名搜索框 |
| 3 | Export 按钮（下载为 Excel 文件） |
| 4 | 付款人汇总表 — 姓名、转账次数、总金额、首次/最近转账日期 |

## 您可以在此页面做什么

### 查看整体汇总与每日图表

上方的汇总卡片显示所选时间范围内的总数。下方两张图表帮您看出按日的趋势 — 第一张图表比较每天的收款/付款/提现金额，第二张图表则细分每天所付出的手续费类型。

### 查看按日与商户拆分的表格

"Detail by Merchant" 表格按日拆分了每一项数据（收款/付款/提现金额及各类手续费），表格底部有当前页面的合计行。点击 **Export** 即可将当前页面的数据下载为 Excel 文件。

### 分析转账客户 (Payer Summary)

这部分按付款人 (Payer) 姓名汇总数据，列出在所选时间范围内曾转账到您店铺的每位客户 — 显示转账次数、累计转账总额，以及首次和最近一次转账的日期。使用搜索框可以筛选出特定姓名，再点击 Export 下载筛选后的名单。可用于识别常客，或查看谁转账最频繁。

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>此页面没有单独的币种或商户筛选器，因为只显示您当前正在使用的店铺在所选时间范围内的数据。</li>
    <li>此页面的 Export 功能仅会下载<strong>当前表格页面正在显示的数据</strong>。如果需要更大时间范围内的完整数据，请改用列表页面（例如<a href="/documents/merchant/pay-in-requests">Pay-In Requests</a>）上的 Export CSV 按钮，该按钮会依据筛选条件下载全部数据，而不限于当前所看的页面。</li>
  </ul>
</div>

## 相关页面

- [概览 (Overview)](/documents/merchant/overview) — 简明汇总，适合每日快速查看
