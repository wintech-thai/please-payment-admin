---
title: Pay-Out Requests
summary: Track requests to transfer money out of the system to a destination account, including the P2P mechanism that can auto-match against incoming money.
keywords: pay-out request, withdrawal, p2p, partial payout, fee payer, qr code
updatedAt: "{{BUILD_DATE}}"
---

# Pay-Out Requests

This page is the mirror image of Pay-In Requests — instead of asking for money to come in, a Pay-Out Request asks the system to **send money out** to a destination bank account. For example: refunding a customer, paying a partner, or withdrawing profit out of the system.

<div class="warning-box">
  <p class="warning-title">Pay-Out Requests aren't created from this page</p>
  <ul>
    <li>This page is for <strong>viewing and tracking</strong> Pay-Out Requests only.</li>
    <li>Creating a new Pay-Out Request is done on the <strong>Admin side</strong>, not from this Merchant page — if you need to withdraw money, contact your team or system administrator to create the request for you.</li>
  </ul>
</div>

## Screenshot

![Pay-Out Requests list page](/docs/merchant/pay-out-requests/pay-out-requests-01.png)

| Number | What it is |
|---|---|
| 1 | Filters: search, status, type, time range |
| 2 | Table columns: Date, Merchant, Amount, Fee + Fee Payer, Destination Account (To), Source Account (From), Status, Reference Number |
| 3 | "Withdraw" badge (shown when this record is a withdrawal out of the system) |
| 4 | Notice badges |

## What you can do here

### Track a request's status

| Status | Meaning |
|---|---|
| **Paid / Approved** | The money has been successfully transferred to the destination. |
| **Pending** | The request is waiting to be processed. An age counter is shown. |
| **Rejected / Failed** | The request couldn't be processed, with a reason given. |
| **Cancelled** | The request was cancelled. |

### Read a request's details

![Pay-Out Request detail page](/docs/merchant/pay-out-requests/pay-out-requests-02.png)

| Number | What it is |
|---|---|
| 1 | Requested amount (Amount) |
| 2 | Fee and Fee Payer |
| 3 | QR Code for reference when transferring the money (or plain account details if QR isn't supported) |
| 4 | Status + notice badges |

P2P records show an additional "Partial Payouts" table below this section (see the next section).

Click the date on any row to open the details — you'll see the destination account, amount, fee, and net amount, along with the **Fee Payer** — indicating whether this withdrawal's fee is deducted from "the store" (you) or from "the recipient" (if the latter, the amount the destination receives will be less than the full requested amount).

### Understand the P2P / Partial Payout mechanism

Some Pay-Out Requests aren't paid directly out of your store's balance. Instead, the system **matches them against money another customer happens to be transferring in at the same time**, and immediately forwards that money on to the specified destination (this is called P2P). A single request can be matched this way multiple times until it's fully paid (Partial Payout), up to a maximum number of matches set per store (see this value on the [Merchant Info](/documents/merchant/merchant-info) page).

On the detail page of a P2P request, you'll see a **"Partial Payouts"** table showing how much has been paid so far, how many matches it took, and how much remains before the full amount is reached.

### Using the QR Code for a transfer

The request's detail page shows a QR Code for reference when transferring the money to the destination — if the destination account/bank doesn't support generating a QR, the system shows the plain account details instead for a manual transfer.

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>Approving a Pay-Out Request is handled by the Please Payment team on the backend — there's no approve button on this page.</li>
  </ul>
</div>

## Related pages

- [Pay-Out Transactions](/documents/merchant/pay-out-transactions) — see records that have been fully completed
- [Merchant Info](/documents/merchant/merchant-info) — see withdrawal limits and the Partial Count Limit
