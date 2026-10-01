---
title: API Connection
summary: A developer walkthrough of how to connect to and call the system's API
keywords: video, tutorial, developer, api, api connection
videoUrl: "https://customer-c3liglnw3agnd0u2.cloudflarestream.com/39c3c22beadc5a65062e079eab9ccdf1/manifest/video.m3u8"
updatedAt: "{{BUILD_DATE}}"
---

# API Connection

This video is for developers who want to connect their system to our API — it covers the basic steps for connecting and making API calls.

By the end, you'll understand the API's structure, which endpoints to call, and how to set up a webhook to receive transaction results — a necessary starting point before writing any integration code.

## What this video covers

- **A quick look at the Merchant Portal overview** first (balance, recent transactions) to set the context for what you're about to integrate with via the API
- **Touring the Public API Docs** — the Endpoints, Webhooks, and Error Codes sections, including a real example spec for the "Create P2P Pay-In Request" endpoint with its full Request Body and Response Fields
- **Viewing a merchant's Payment Endpoints page** — the real URLs for calling Pay-In, Pay-In (P2P), Pay-Out, and Withdraw, with a copy button and a link to the API Documentation, plus the IP Whitelist/Blacklist settings
- **A worked, end-to-end example** — creating real Pay-In, Pay-In (P2P), and Pay-Out requests from the Admin/Merchant side and seeing the result reflected immediately in the transaction list
- **Configuring Webhooks** — pointing a merchant's endpoint URL at specific events (e.g. PaymentIn.Success, PaymentIn.Rejected, PaymentOut.Success), the JSON payload structure the system sends, the expected response format (`{"status": "ok"}`), and the HTTP status code rules the system expects from the merchant's side
