---
title: Users
summary: Invite your teammates to use Please Payment together, and set permissions for each person based on their role.
keywords: users, invite, reset password, custom role
updatedAt: "{{BUILD_DATE}}"
---

# Users

This page manages **who on your team can log in to Please Payment** and what each person can do once they're in — from inviting new members and setting permissions, to helping reset a password when needed.

## Screenshot

![Users list page](/docs/merchant/users/users-01.png)

| Number | What it is |
|---|---|
| 1 | "Add User" button and a bulk-delete button for selected rows |
| 2 | Columns: username (with an "Owner" badge if they're the account owner), tags, Custom Role, Roles, whether they're the system's first user (Initial User), and status |
| 3 | Action menu: Disable / Enable / Generate password reset link / Generate registration link |

## What you can do here

### Invite a new user to your team

Click **"Add User"** and fill in:

![Invite new user page](/docs/merchant/users/users-02.png)

| Number | What it is |
|---|---|
| 1 | User Information — username and email (both required), tags |
| 2 | Roles & Permissions — Custom Role and System Roles |

1. **Username** and **email** (both required)
2. Tags (optional) — use them to categorize users, e.g. by department
3. Set this person's permissions — choose a **Custom Role** and/or system **Roles** (the same as when creating an [API Key](/documents/merchant/api-keys))
4. Click **Add User**

Once submitted, the system shows a one-time-use **Registration Link** for you to copy and send to the invited person (via chat or email, for example) so they can open it and set their own password. If you don't see the link in the success dialog, it means the account was created in "Pending" status instead — go generate a new link from the Action menu in the list.

### Edit an existing user's permissions

Click a username in the list to edit them — only **tags, Custom Role, and Roles** can be edited.

<div class="warning-box">
  <p class="warning-title">Good to know</p>
  <ul>
    <li><strong>Username and email can't be changed</strong> once the account is created. If you made a typo when inviting someone, delete that account and invite them again.</li>
  </ul>
</div>

### Manage a user's account status

Use the Action menu on each row:

- **Disable / Enable** — temporarily block or restore login access without deleting the account
- **Generate password reset link** — creates a link for the user to set a new password; use this when a user has forgotten their password and needs an admin's help
- **Generate registration link** — only available for accounts still in "Pending" status, for creating a new invite link if the original one has expired or been lost

<div class="warning-box">
  <p class="warning-title">Important about these links</p>
  <ul>
    <li>Password reset links and registration links are <strong>single-use and expire once used</strong> — never share them publicly, and send them directly to the account owner only.</li>
  </ul>
</div>

### Delete a user

Select the user(s) you want to remove (you can select multiple at once), then click delete — you'll always be asked to confirm before it's final.

## Related pages

- [Custom Roles](/documents/merchant/custom-roles) — prepare a set of permissions in advance before inviting users
- [Audit Log](/documents/merchant/audit-log) — check what each person has done in the system
