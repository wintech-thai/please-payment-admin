---
title: 用户管理 (Users)
summary: 邀请团队成员共同使用 Please Payment 系统，并根据各自的职责设置相应权限。
keywords: users, 用户管理, invite, 邀请用户, reset password, custom role
updatedAt: "{{BUILD_DATE}}"
---

# 用户管理 (Users)

此页面用于管理**您团队中哪些人可以登录 Please Payment 系统**，以及每个人在系统中能做什么——从邀请新成员、设置权限，到在必要时帮忙重置密码。

## 页面截图

![用户列表页面](/docs/merchant/users/users-01.png)

| 编号 | 说明 |
|---|---|
| 1 | "Add User" 按钮，以及可多选批量删除的按钮 |
| 2 | 列内容：用户名（若为账号所有者会显示 "Owner" 标签）、标签、Custom Role、Roles、是否为系统的初始用户 (Initial User)、状态 |
| 3 | Action 操作菜单：禁用 / 启用 / 生成重置密码链接 / 生成注册链接 |

## 您可以在此页面做什么

### 邀请新用户加入团队

点击 **"Add User"** 按钮，然后填写：

![邀请新用户页面](/docs/merchant/users/users-02.png)

| 编号 | 说明 |
|---|---|
| 1 | User Information — 用户名与邮箱（均为必填）、标签 |
| 2 | Roles & Permissions — Custom Role 与 System Roles |

1. **用户名**与**邮箱**（均为必填）
2. 标签（选填）——用于分类，例如按部门划分
3. 为该用户设置权限——选择 **Custom Role** 和/或系统 **Roles**（方式与创建 [API Key](/documents/merchant/api-keys) 时相同）
4. 点击 **Add User**

提交成功后，系统会显示一个一次性的**注册链接 (Registration Link)**，供您复制并转发给被邀请的人（例如通过聊天工具或邮件），让对方打开链接并自行设置密码。如果成功弹窗中没有看到链接，说明该账号已被创建为"待处理 (Pending)"状态，请改为从列表中的 Action 菜单重新生成链接。

### 编辑现有用户的权限

点击列表中的用户名即可编辑——仅可编辑**标签、Custom Role 与 Roles**。

<div class="warning-box">
  <p class="warning-title">请注意</p>
  <ul>
    <li>账号创建后，<strong>用户名与邮箱无法修改</strong>。如果邀请时填错了，需删除该账号后重新邀请。</li>
  </ul>
</div>

### 管理用户账号状态

使用每一行的 Action 操作菜单：

- **禁用 / 启用** — 暂时停用或恢复登录权限，无需删除账号
- **生成重置密码链接** — 生成一个让用户设置新密码的链接，适用于用户忘记密码、需要管理员协助的情况
- **生成注册链接** — 仅适用于仍处于"待处理"状态的账号，用于在原链接过期或遗失时生成新的邀请链接

<div class="warning-box">
  <p class="warning-title">关于链接的重要提醒</p>
  <ul>
    <li>重置密码链接与注册链接均为<strong>一次性使用，使用后即失效</strong>——请勿公开传播，务必直接发送给账号所有者本人。</li>
  </ul>
</div>

### 删除用户

勾选要删除的用户（可多选），然后点击删除——系统会再次要求您确认后才会真正删除。

## 相关页面

- [权限设置 (Custom Roles)](/documents/merchant/custom-roles) — 在邀请用户之前预先准备好权限组合
- [操作日志 (Audit Log)](/documents/merchant/audit-log) — 查看每个人在系统中做过哪些操作
