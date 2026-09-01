---
title: 概览
version: "{{APP_VERSION}}"
updatedAt: "{{BUILD_DATE}}"
---

# Public API 文档

此 Public API 让商户（Merchant）可以将支付系统直接集成到自己的应用程序中。

## Base URL

```
{{API_URL}}
```

此 URL 会作为所有接口的前缀，例如：`{{API_URL}}/api/PaymentRequest/org/...`

## 支付流程概览

```
商户创建 Payment Request
        ↓
获得返回的 QR Code
        ↓
客户扫描 QR Code 并通过银行 App 转账
        ↓
资金直接进入商户的银行账户（不经过中间系统）
        ↓
系统通过 Webhook 通知商户（Payment.Success）
```

此模式称为 **Non-Custodial（非托管）** —— 系统从不持有商户的资金。

## 开始使用

1. 联系服务提供商获取 **API Key**、**Org ID** 和 **Merchant ID**
2. 在每个请求中使用 Basic Authentication（参见[身份验证](/documents/authentication)）
3. 调用创建 Payment Request 的接口以获取 QR Code（参见 [Endpoints](/documents/endpoints)）
4. 联系服务提供商设置 Webhook URL，以便在支付成功时接收通知（参见 [Webhooks](/documents/webhooks)）
