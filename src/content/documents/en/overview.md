---
title: Overview
version: "{{APP_VERSION}}"
updatedAt: "{{BUILD_DATE}}"
---

# Public API Documentation

This Public API allows Merchants to integrate the payment system directly into their own applications.

## Base URL

```
{{API_URL}}
```

This URL is prefixed to every endpoint, for example: `{{API_URL}}/api/PaymentRequest/org/...`

## Payment Flow Overview

```
Merchant creates a Payment Request
        ↓
Receives a QR Code in return
        ↓
Customer scans the QR and transfers via a banking app
        ↓
Funds go directly into the Merchant's bank account (no intermediary)
        ↓
The system notifies the Merchant via Webhook (Payment.Success)
```

This model is called **Non-Custodial** — the system never holds the Merchant's funds.

## Getting Started

1. Contact the provider to obtain an **API Key**, **Org ID**, and **Merchant ID**
2. Use Basic Authentication on every request (see [Authentication](/documents/authentication))
3. Call the create Payment Request endpoint to receive a QR Code (see [Endpoints](/documents/endpoints))
4. Ask the provider to configure your Webhook URL to receive notifications when a payment succeeds (see [Webhooks](/documents/webhooks))
