---
title: Pay-Out Transactions
summary: A confirmed record of every baht successfully transferred out of the system, once a Pay-Out Request has been processed.
keywords: pay-out transaction, transaction history, net amount, fee, source and destination account
updatedAt: "{{BUILD_DATE}}"
---

# Pay-Out Transactions

This page is a confirmed record of money that has **actually been transferred out of the system**, after a [Pay-Out Request](/documents/merchant/pay-out-requests) has been processed.

## Screenshot

![Pay-Out Transactions list page](/docs/merchant/pay-out-transactions/pay-out-transactions-01.png)

| Number | What it is |
|---|---|
| 1 | Filters: search, status, type, time range |
| 2 | Refresh button and Export CSV button |
| 3 | Table columns: Date (+ Withdraw tag if applicable), Amount, Fee + who's responsible for the fee, Destination account, Source account, Status, Reference number |

## What you can do here

### Read each transaction's status

| Status | Meaning |
|---|---|
| **Completed / Success / Paid** | The money has been transferred to its destination successfully |
| **Failed / Error / Rejected** | The transaction did not go through, along with the reason |
| **Pending / Processing** | Still in the transfer process; an age indicator is shown |

### View transaction details

![Pay-Out Transaction detail page](/docs/merchant/pay-out-transactions/pay-out-transactions-02.png)

| Number | What it is |
|---|---|
| 1 | General Information — date, status, amount, reference number |
| 2 | Pay-Out Request ID — a link back to the original Pay-Out Request |
| 3 | Fee Information — Tx Amount, Fee Rate, Pay-Out Fee, and Net Amount |
| 4 | Destination Information — the bank and account number that received the money |

Click the date to open the details. You'll see:

- **General Information** — amount, currency, a link back to the original Pay-Out Request, reference number
- **Fee Information** — fee %, fee amount, and the **net amount actually received at the destination** after fees (this differs from the full amount if the fee is set to be paid by the destination recipient)
- **Destination account (Destination)** — the account that actually received the money
- **Source account (Source)** — the account the money was actually paid out from (only shown when the system has this information)

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>If you want to know which Pay-Out Request produced this transaction, follow the "source Pay-Out Request" link on the detail page.</li>
  </ul>
</div>

## Related pages

- [Pay-Out Requests](/documents/merchant/pay-out-requests) — the starting point for every transaction on this page
