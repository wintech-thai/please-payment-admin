---
title: Audit Log
summary: A record of every API call made against your store's account — who did what, from where, and whether it succeeded. Use it for security checks and troubleshooting.
keywords: audit log, security, troubleshooting, log
updatedAt: "{{BUILD_DATE}}"
---

# Audit Log

Think of this page as your system's "security camera" — it records every API call made against your store's account, whether the action came from someone logged in or from an API Key your system calls automatically. Use it when you need to check security or trace why something didn't happen the way you expected.

## Screenshot

![Audit Log page](/docs/merchant/audit-log/audit-log-01.png)

| Number | What it is |
|---|---|
| 1 | Filters: search (all fields / username / API / IP Address) and time range (default is the last 30 days) |
| 2 | Histogram chart — call volume over time, color-coded by the most frequently called APIs, with a total hit count |
| 3 | Table columns: time, username, identity type (ID Type), API called, status (HTTP status), role, IP Address |
| 4 | Detail button (eye icon) — opens a panel with the full record |

## What you can do here

### Search and filter records

Pick the time range you're interested in, then search in one of 3 specific ways: search all fields, username only, or IP Address only — very useful when you need to check "what has this person done recently?" or "what APIs is this IP calling?"

### Read the histogram chart

The chart at the top shows call volume broken down over time, helping you spot unusual activity (spikes or unusual drops) quickly, without scanning through the table row by row.

### Spot problem records

**Any row with an HTTP status other than 200 (success) is highlighted in red across the entire row**, from the username to the API name that was called, so you can immediately see failed requests without reading the status column line by line.

### View the full details of a record

Click the eye icon to open the detail panel — view the data as either a field table or raw JSON, with a search box inside the panel itself and buttons to step through the previous/next record without closing the panel.

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>If you suspect someone is using your API Key without authorization, try filtering by an unfamiliar IP Address and check what API calls are coming from it.</li>
  </ul>
</div>

## Related pages

- [Users](/documents/merchant/users) — disable an account if you spot unusual behavior
- [API Keys](/documents/merchant/api-keys) — disable a key you suspect has been leaked
