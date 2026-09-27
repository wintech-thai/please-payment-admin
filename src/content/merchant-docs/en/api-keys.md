---
title: API Keys
summary: Create and manage credentials that let your backend systems connect to the API on their own, without a real user account having to log in.
keywords: api key, secret, token, custom role
updatedAt: "{{BUILD_DATE}}"
---

# API Keys

An API Key is a "digital key" that lets your store's backend systems (not a person) authenticate when calling the API. For example, when your website needs to automatically create a payment request every time a customer places an order, your system attaches this API Key to every request to prove "this really is this store's system."

## Screenshot

![API Keys list page](/docs/merchant/api-keys/api-keys-01.png)

| Number | What it is |
|---|---|
| 1 | "Add Key" button and multi-select delete button |
| 2 | Columns: Key name, Description, Custom Role, Roles, Status |
| 3 | Action menu: Disable Key / Enable Key |

## What you can do here

### Create a new API Key

![Create API Key page](/docs/merchant/api-keys/api-keys-02.png)

| Number | What it is |
|---|---|
| 1 | Key Information — Key name (required) and description |
| 2 | Roles & Permissions — select a Custom Role |
| 3 | System Roles — a two-panel selector (pick items on the left and click the arrow to move them to "Selected Roles" on the right) |

1. Click the **"Add Key"** button
2. Enter a **Key name** (required) and a description (optional)
3. Set the permissions this Key will have — choose from a **Custom Role** you've already created (see [Custom Roles](/documents/merchant/custom-roles)) and/or select system **Roles** from the list on the left, then click the arrow button to move them to "Selected" on the right
4. Click **Save**

![Modal showing the Secret Key value](/docs/merchant/api-keys/api-keys-03.png)

| Number | What it is |
|---|---|
| 1 | The Secret Key value (shown only once) with a copy button |
| 2 | "Done & Return" button |

<div class="warning-box">
  <p class="warning-title">Very important — read before closing this window</p>
  <ul>
    <li>After a Key is created, the system shows the <strong>Secret Key value only once</strong>, in a text box with a copy button.</li>
    <li><strong>Copy and store this value somewhere safe immediately</strong> — for example, in a password manager, or a config file only your dev team can access.</li>
    <li>If you close the window without copying it, <strong>you will not be able to view that Secret Key value again</strong> — you'll have to create a new Key instead.</li>
  </ul>
</div>

### Edit an existing Key

Click a Key's name in the list to edit its name, description, or change the Custom Role/Roles attached to it — editing **does not show or change the existing Secret Key value**; only the information and permissions can be changed.

### Enable/disable a Key

Use the Action menu in each row to **temporarily disable** a Key without deleting it (useful when you suspect a Key may have been leaked but aren't sure yet, and want to stop it from being used in the meantime), or **re-enable** it when you're ready to use it again.

### Delete an API Key

Select the Key(s) you want and click delete. The system will clearly warn you that **"any service using this Key will immediately lose access"** — make sure no system is actually still using this Key before deleting it.

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>If you forget to copy the Secret Key, don't try to recover it — just create a new Key and configure it in your system instead, then delete the old Key afterward.</li>
    <li>It's a good idea to create a separate Key for each system/service you use, rather than reusing the same Key everywhere, so you can disable just the affected one if there's ever a problem.</li>
  </ul>
</div>

## Related pages

- [Custom Roles](/documents/merchant/custom-roles) — build a permission set ahead of time before attaching it to a Key
- [Merchant Info](/documents/merchant/merchant-info) — the API URL to use together with this Key
