---
title: 创建收款请求 (Pay-In Requests)
summary: 追踪并查看系统创建的每一笔收款请求，从等待客户转账到成功匹配为实际到账记录的全过程。
keywords: pay-in request, 收款请求, qr code, slip, 转账凭证, p2p, 状态 pending paid rejected
updatedAt: "{{BUILD_DATE}}"
---

# 创建收款请求 (Pay-In Requests)

Pay-In Request 就是"请求客户向您转账"的一笔请求，一次收款申请对应一笔请求——通常会附带 QR Code 或收款账号供客户转入。这个页面就是您追踪每笔请求状态的地方：是否已有人转账、是否匹配成功。

<div class="warning-box">
  <p class="warning-title">收款请求不是从这个页面创建的</p>
  <ul>
    <li>此页面<strong>仅用于查看与追踪</strong>收款请求，没有"新建"按钮。</li>
    <li>每一笔收款请求都是由<strong>您自己的后台系统</strong>通过调用 API 创建的（URL 可在 <a href="/documents/merchant/merchant-info">商户信息</a> 页面的 Payment Endpoint 标签页中查看）。例如客户在您的网站/App 上点击付款时，您的系统会调用此 API 来获取供客户扫描的 QR Code。</li>
  </ul>
</div>

## 页面截图

![Pay-In Requests 列表页](/docs/merchant/pay-in-requests/pay-in-requests-01.png)

| 编号 | 说明 |
|---|---|
| 1 | 筛选条件：文字搜索、状态、P2P 类型、时间范围 |
| 2 | 刷新按钮与 Export CSV 按钮 |
| 3 | 表格列：日期（点击可查看详情）、商户、金额、手续费、收款账户、付款人、状态、参考编号 |
| 4 | 提醒标签（三角形图标）— 点击可查看系统与该记录关联的自动警告记录（如果客户附带了转账凭证，旁边还会有一个显示凭证数量的回形针图标标签） |

## 您可以在此页面做什么

### 搜索与筛选列表

使用全文搜索框，配合状态与时间范围筛选条件，可以更快找到需要的收款请求。例如筛选"待处理"状态，查看哪些请求客户还未转账。

### 读懂各笔记录的状态

| 状态 | 含义 |
|---|---|
| **成功 (Paid / Approved)** | 系统已将该请求与转入的款项匹配成功，会附带链接跳转至对应的实际收款记录 (Pay-In Transaction)。 |
| **待处理 (Pending)** | 尚未有与该请求匹配的转账进账，会显示该请求已等待的时长（例如"12 分钟"、"2 小时 5 分钟"）。 |
| **失败 (Rejected / Error)** | 无法确认/匹配该记录，通常会在状态下方附带具体原因。 |

### 查看请求详情

![Pay-In Request 详情页](/docs/merchant/pay-in-requests/pay-in-requests-02.png)

| 编号 | 说明 |
|---|---|
| 1 | 基本信息 (General Information) — 创建/过期日期、金额、收款银行账户、参考编号 |
| 2 | Slip Link 按钮 — 生成链接/QR 供客户上传转账凭证 |
| 3 | 状态 + 提醒标签（如有） |

点击每一行的日期即可查看该请求的完整详情。详情页中可以看到：

- **基本信息** — 创建日期、过期日期、申请/实际生成金额、收款银行账户、参考编号 1-3
- **已附带的转账凭证** — 如果有客户上传凭证并关联到此请求，点击"Slip (数量)"按钮即可全屏查看凭证图片，多张凭证可逐张滑动查看
- **Slip Link** — 生成一次性链接/QR Code 的按钮，可发送给客户，让其专门为此请求上传转账凭证——适用于系统自动匹配失败、需要改用凭证确认的情况
- **处理步骤** — 系统对该请求执行的处理流程记录（如有）

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>如果看到红色横幅提示"检测到重复的凭证参考编号"并附带指向其他请求的链接，说明所附凭证的参考编号与之前已上传到其他请求的凭证相同——系统以此提示防止凭证被重复使用，处理前请务必先核实。</li>
    <li>系统中多个页面（不只是这一页）出现的提醒标签 (Notices) 使用的都是同一套机制——随时点击即可查看具体原因。</li>
  </ul>
</div>

## 相关页面

- [收款记录 (Pay-In Transactions)](/documents/merchant/pay-in-transactions) — 查看已成功匹配的完整记录
- [商户信息 (Merchant Info)](/documents/merchant/merchant-info) — 查看用于创建收款请求的 API URL
