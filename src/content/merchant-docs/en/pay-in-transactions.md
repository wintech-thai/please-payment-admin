---
title: Pay-In Transactions
summary: The confirmed record of every baht that actually arrived in your store's account, with the net amount after fees.
keywords: pay-in transaction, net amount, identified, unidentified, fee
updatedAt: "{{BUILD_DATE}}"
---

# Pay-In Transactions

If a Pay-In Request is "asking the customer to transfer money," a Pay-In Transaction is **confirmed proof that the money actually arrived** — every time money is transferred into your store's bank account and the system detects it, it's logged as a record on this page, whether or not it was matched to a Pay-In Request.

## Screenshot

![Pay-In Transactions list page](/docs/merchant/pay-in-transactions/pay-in-transactions-01.png)

| Number | What it is |
|---|---|
| 1 | Filters: search, status, P2P, time range |
| 2 | Refresh button and Export CSV button |
| 3 | Table columns: Date, Merchant, Amount, Fee, Destination Account, Payer, Status (linked to the source Pay-In Request when matched), Reference Number |

## What you can do here

### Read each record's status

| Status | Meaning |
|---|---|
| **Identified / Approved** | The incoming money has been successfully matched to a Pay-In Request. A link to the source request is shown. |
| **UnIdentified** | The money genuinely arrived, but no matching Pay-In Request has been found yet. A counter shows how long it's been waiting. |
| **Error / Rejected** | An error occurred while processing this record. |

### View a record's details

![Pay-In Transaction detail page](/docs/merchant/pay-in-transactions/pay-in-transactions-02.png)

| Number | What it is |
|---|---|
| 1 | General Information — date, status, amount, receiving account, reference number |
| 2 | Payment Request ID — a link back to the source Pay-In Request |
| 3 | Fee Information — Tx Amount, Fee Rate, Pay-In Fee, and Net Amount |

Click the date to open the details. You'll see:

- **General Information** — amount, currency, receiving bank account, reference number, and a link back to the source Pay-In Request (if any)
- **Fee Information** — the actual amount received (before fees), the fee %, the fee amount deducted, and the **net amount your store actually received** (after fees). This is the figure to use when reconciling your real bank balance — not the gross amount before fees
- **Payer info** — the payer's account name/bank (if the system detected it)
- **Processing steps** — the sequence the system used to verify and match this record

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>If a record has been stuck as "UnIdentified" for a while, check whether there's a Pay-In Request with a matching amount that hasn't expired yet, or send a Slip Link for the customer to upload a confirmation slip instead (from the detail page of the corresponding <a href="/documents/merchant/pay-in-requests">Pay-In Request</a>).</li>
  </ul>
</div>

## Related pages

- [Pay-In Requests](/documents/merchant/pay-in-requests) — the source request behind each record
- [Report & Analytic](/documents/merchant/report-analytic) — see daily/monthly totals
