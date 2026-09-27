---
title: Pay-In Requests
summary: Track and check every Pay-In Request your system has created, from waiting on a customer's transfer through to a successful match.
keywords: pay-in request, qr code, slip, p2p, status pending paid rejected
updatedAt: "{{BUILD_DATE}}"
---

# Pay-In Requests

A Pay-In Request is "a request asking the customer to send you money" — one request per ask. It's usually accompanied by a QR Code or a destination account number for the customer to transfer into. This is where you track each request's status: whether anyone has transferred money yet, and whether it was matched successfully.

<div class="warning-box">
  <p class="warning-title">Pay-In Requests aren't created from this page</p>
  <ul>
    <li>This page is for <strong>viewing and tracking</strong> Pay-In Requests only — there's no "Create New" button.</li>
    <li>Every Pay-In Request is created by <strong>your own backend system</strong> via an API call (find the URL in the Payment Endpoint tab on the <a href="/documents/merchant/merchant-info">Merchant Info</a> page). For example, when a customer clicks "pay" on your website or app, your system calls the API to request a QR Code for the customer to scan.</li>
  </ul>
</div>

## Screenshot

![Pay-In Requests list page](/docs/merchant/pay-in-requests/pay-in-requests-01.png)

| Number | What it is |
|---|---|
| 1 | Filters: text search, status, P2P type, time range |
| 2 | Refresh button and Export CSV button |
| 3 | Table columns: Date (click for details), Merchant, Amount, Fee, Destination Account, Payer, Status, Reference Number |
| 4 | Notice badge (triangle icon) — click to see the system's automated warning logs tied to this record (if the customer attached a slip, a paperclip icon badge showing the slip count appears right next to it) |

## What you can do here

### Search and filter the list

Use the full-text search box together with the status and time-range filters to find a Pay-In Request faster. For example, filter by "Pending" status to see which requests are still waiting for the customer to transfer money.

### Read each record's status

| Status | Meaning |
|---|---|
| **Paid / Approved** | The system successfully matched this request against an incoming transfer. You'll see a link to the resulting Pay-In Transaction. |
| **Pending** | No transfer has matched this request yet. An age counter (e.g. "12 minutes", "2 hr 5 min") shows how long it's been waiting. |
| **Rejected / Error** | The record couldn't be confirmed or matched. There's usually a reason shown below the status. |

### Open a request's details

![Pay-In Request detail page](/docs/merchant/pay-in-requests/pay-in-requests-02.png)

| Number | What it is |
|---|---|
| 1 | General Information — created/expiry date, amount, destination bank account, reference number |
| 2 | Slip Link button — generates a link/QR for the customer to upload a slip |
| 3 | Status + notice badge (if any) |

Click the date on any row to open that request's full details. On the detail page you'll see:

- **General Information** — created date, expiry date, requested/actual amount, destination bank account, Reference 1-3
- **Attached slips** — if a customer uploaded a slip against this request, click the "Slip (count)" button to view the slip image full-screen; swipe through them one at a time if there are multiple
- **Slip Link** — a button to generate a single-use link/QR Code you can send the customer so they can upload their transfer slip for this specific request — useful when automatic matching fails and you need to confirm with a slip instead
- **Processing steps** — the sequence of actions the system took on this request (if any)

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>If you see a red banner warning "Duplicate slip reference number found" with a link to another request, it means the attached slip has the same reference number as a slip already uploaded against a different request — the system flags this to prevent slip reuse. Check it before proceeding further.</li>
    <li>Notice badges appear across several pages of the system (not just this one) and all work the same way — you can always click one to see what caused it.</li>
  </ul>
</div>

## Related pages

- [Pay-In Transactions](/documents/merchant/pay-in-transactions) — see the full list of successfully matched records
- [Merchant Info](/documents/merchant/merchant-info) — find the API URL used to create Pay-In Requests
