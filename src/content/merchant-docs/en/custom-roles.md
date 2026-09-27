---
title: Custom Roles
summary: Build your own permission sets, down to the level of "which API can be called" — then assign them to users or API Keys.
keywords: custom role, role, access permission, permission, api permission
updatedAt: "{{BUILD_DATE}}"
---

# Custom Roles

A Custom Role is a "permission set" that you name yourself — like "Accounting Staff" or "Dev Team" — where you decide exactly which functions (APIs) of the system anyone assigned this role can call. You can then attach this role directly to a [User](/documents/merchant/users) or an [API Key](/documents/merchant/api-keys), instead of setting permissions one person at a time.

## Screenshot

![Custom Roles list page](/docs/merchant/custom-roles/custom-roles-01.png)

| Number | What it is |
|---|---|
| 1 | "Add Role" button and multi-select delete button |
| 2 | Columns: Role name, Description, Tags |
| 3 | Search box |

## What you can do here

### Create a new role

Click "Add Role" and fill in:

![Create new role page](/docs/merchant/custom-roles/custom-roles-02.png)

| Number | What it is |
|---|---|
| 1 | Role Information — role name (required), description, tags |
| 2 | Search permissions box |
| 3 | "Selected / Total" counter |
| 4 | List of permission groups (organized by the system's function groups), with checkboxes to select an entire group or individual items |

1. **Role name** (required) — give it a meaningful name, e.g. "Accounting Team - View Only"
2. **Description** and **Tags** (optional) — help you categorize and find it later
3. **Select permissions** — use the search box to filter for the functions you need, then check items one at a time, or check a group heading to select the whole group at once

<div class="warning-box">
  <p class="warning-title">Understand this before setting up a role</p>
  <ul>
    <li>Roles here are a <strong>fine-grained list of individual functions (APIs)</strong>, not broad permission levels like "Admin"/"Staff" — you must choose exactly which functions to allow. If a function isn't checked, anyone assigned this role <strong>will not be able to</strong> use it at all.</li>
    <li>Only select the permissions actually needed for the job (the "least privilege" principle) to reduce security risk.</li>
  </ul>
</div>

### Edit an existing role

Click a role's name in the list to open it for editing. The form automatically loads and checks the permissions that were previously selected. Make your changes and save immediately (if you leave the page without saving, the system will always ask you to confirm first).

### Delete a role

Select the role(s) you want to remove (you can select multiple at once) and click delete — the system will always ask for confirmation before actually deleting, since deletion cannot be undone.

<div class="tip-box">
  <p class="tip-title">Good to know</p>
  <ul>
    <li>If any users or API Keys are currently attached to this role, check first before deleting to make sure it won't affect their access.</li>
  </ul>
</div>

## Related pages

- [Users](/documents/merchant/users) — assign this role to your staff
- [API Keys](/documents/merchant/api-keys) — attach this role to an API Key for automated systems
