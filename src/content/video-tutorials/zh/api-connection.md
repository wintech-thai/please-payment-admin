---
title: API 连接
summary: 面向开发者的视频，介绍如何连接并调用系统 API
keywords: video, tutorial, developer, api, api connection
videoUrl: "https://customer-c3liglnw3agnd0u2.cloudflarestream.com/39c3c22beadc5a65062e079eab9ccdf1/manifest/video.m3u8"
updatedAt: "{{BUILD_DATE}}"
---

# API 连接

本视频面向希望将其系统与我们的 API 对接的开发者，介绍连接与调用 API 的基本步骤。

看完后，您将了解 API 的结构、需要调用的端点，以及如何设置 Webhook 接收交易结果——这是开始编写对接代码前必须掌握的基础。

## 视频内容

- **先快速浏览 Merchant Portal 概览页**（余额、最近交易），为接下来要对接的 API 建立背景认识
- **浏览 Public API Docs**——Endpoints、Webhooks、Error Codes 板块，包含"创建 P2P Pay-In 请求"端点的真实示例规范，涵盖完整的 Request Body 与 Response Fields
- **查看商户的 Payment Endpoints 页面**——调用 Pay-In、Pay-In (P2P)、Pay-Out、Withdraw 的真实网址，带一键复制按钮及 API Documentation 链接，以及 IP Whitelist/Blacklist 设置
- **完整的端到端实操演示**——在 Admin/Merchant 端实际创建 Pay-In、Pay-In (P2P)、Pay-Out 请求，并立即在交易列表中查看结果
- **配置 Webhook**——将商户的接收网址绑定到特定事件（如 PaymentIn.Success、PaymentIn.Rejected、PaymentOut.Success），查看系统发送的 JSON payload 结构、期望的返回格式（`{"status": "ok"}`），以及系统对商户端 HTTP 状态码的判断规则
