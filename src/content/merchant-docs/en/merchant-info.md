---
title: Merchant Info
summary: A single page with all of your store's configuration — fees, limits, the API endpoints for integration, Webhooks, and your wallet balance (view-only).
keywords: merchant info, fees, limits, endpoint, webhook, wallet, balance
updatedAt: "{{BUILD_DATE}}"
---

# Merchant Info

This page is your store's "ID card" in Please Payment — it brings together everything that describes how your store is configured, from fees and daily limits to the URLs your development team needs to integrate with the API.

<div class="warning-box">
  <p class="warning-title">Good to know before you start</p>
  <ul>
    <li>Every field on this page is <strong>view-only (read-only)</strong> — there's no edit or save button anywhere on this page.</li>
    <li>To change a fee, limit, or any other setting shown here, contact the Please Payment team or your system administrator.</li>
  </ul>
</div>

This page has 4 tabs, and each one looks quite different, so there's a separate screenshot for each below.

## What you can do here

### The "Info" tab

![Info tab](/docs/merchant/merchant-info/merchant-info-01.png)

| Number | What it is |
|---|---|
| 1 | Store status badge (Active / Disabled / Pending) |
| 2 | Tab bar: Info, Payment Endpoint, Webhooks, Wallet Summary |
| 3 | Basic info: Merchant ID, name, email, phone number, status |
| 4 | Fee card: Pay-In fee % and Pay-Out fee % |
| 5 | Limits card: per-transaction amount and total daily limit (scroll down for the Payout Partial Count Limit and the cent-rounding/Pay-In request expiry settings just below this section) |

This is the first tab you land on, and it covers your store's core settings:

- **Basic info** — Merchant ID, store name, email, phone number, and account status
- **Fees** — the percentage the system deducts every time money comes in (Pay-In Fee) and every time money goes out (Pay-Out Fee). Use these figures to calculate your per-transaction cost
- **Limits** — the minimum/maximum amount allowed per transaction, for both Pay-In and Pay-Out, plus the **total daily limit** for both amount and transaction count, with a colored bar showing what percentage of the limit is currently in use (green = plenty of room left, yellow = getting close at 70-90%, red = very close to the limit at ≥90%). If you see red often, contact the team to request a limit adjustment that matches your actual transaction volume
- **Payout Partial Count Limit (P2P)** — the maximum number of times a single Pay-Out Request can be matched against multiple incoming customer transfers (see [Pay-Out Requests](/documents/merchant/pay-out-requests) for details)
- **Discard Cent** — when enabled, the system automatically rounds down the cent portion of the charged amount
- **Pay-In request expiry** — how many minutes after creation a Pay-In Request expires. If the customer doesn't transfer money within this window, the request becomes invalid

### The "Payment Endpoint" tab

![Payment Endpoint tab](/docs/merchant/merchant-info/merchant-info-02.png)

| Number | What it is |
|---|---|
| 1 | Payment Request Endpoints table (type, URL, copy button) |
| 2 | "View API Documentation" link |
| 3 | IP Whitelist / Blacklist section (scroll down to see the full Web/API Whitelist and Blacklist lists) |

This tab is specifically for your store's development team — it holds the API URLs your own backend needs to call to create Pay-In or Pay-Out records.

- The **Payment Request Endpoints** table shows each endpoint's type and URL with a copy button (clicking it briefly shows a "Copied" status)
- The **"View API Documentation"** link takes you to the full Public API Docs for developers
- The **IP Whitelist / Blacklist** lists show which IPs are allowed (Whitelist) or blocked (Blacklist), separately for the Web side and the API side — use these to verify your system is connecting from the correct IP

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>Pay-In Requests <strong>are not created from this page</strong> — they must be created by calling the API at the endpoints shown in this tab. See "View API Documentation" for the full integration guide.</li>
  </ul>
</div>

### The "Webhooks" tab

![Webhooks tab](/docs/merchant/merchant-info/merchant-info-03.png)

| Number | What it is |
|---|---|
| 1 | Event name (colored badge) |
| 2 | Event description |
| 3 | Endpoint URL + HTTP method |
| 4 | Active/Inactive status |

A Webhook is the mechanism the system uses to automatically "notify" your system — for example, when a payment succeeds, the system immediately sends data to the URL you've configured. This tab lists all configured Webhooks (event name, description, destination URL + HTTP method, active status).

<div class="warning-box">
  <p class="warning-title">Good to know</p>
  <ul>
    <li>This page is for <strong>viewing Webhooks only</strong> — there's no button to create or edit a Webhook in the Merchant system. To add or change a Webhook, contact the Please Payment team.</li>
  </ul>
</div>

### The "Wallet Summary" tab

![Wallet Summary tab](/docs/merchant/merchant-info/merchant-info-04.png)

| Number | What it is |
|---|---|
| 1 | Wallet balance (Current Balance) |
| 2 | Daily Pay-In limit bar (Pay-In Daily Amount) |
| 3 | Wallet Transactions table |
| 4 | Clickable Tag badge on each row (links to the source record) |

Shows your store's wallet balance and transaction history — if your store hasn't set up a wallet, this tab shows a message saying it isn't configured yet.

- The current balance (Wallet Balance) is shown as a large number at the top, along with the daily Pay-In limit bar (if one is configured)
- The **Wallet Transactions** table — a history of every entry that affected the wallet balance, sorted by date. Each row shows whether it was money in (Pay-In, green), money out (Pay-Out, red), or a withdrawal (Withdraw), along with the balance before and after that entry — useful for tracing exactly which transaction changed your balance
- Click the Tag on any row to open the details of that source record (e.g. the related Pay-In Request or Pay-Out Request) in a new tab

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>Some entries are cross-merchant P2P transactions, which the system won't let you open (you'll see a notice instead of a new page). This is expected behavior, not an error.</li>
  </ul>
</div>

## Related pages

- [Pay-Out Requests](/documents/merchant/pay-out-requests) — see the full details of limits and the P2P Partial Payout mechanism
- [Pay-In Requests](/documents/merchant/pay-in-requests) — understand how Pay-In Requests are created via the API
