---
title: API Keys
summary: 创建并管理凭证，让您的后台系统自行连接 API，而无需使用真实的用户账号登录。
keywords: api key, 密钥, secret, token, custom role
updatedAt: "{{BUILD_DATE}}"
---

# API Keys

API Key 是一把"数字钥匙"，供您店铺的后台系统（而非真人）在调用 API 时用来验证身份。例如，当您的网站需要在每次客户下单时自动创建收款请求，您的系统就会在每个请求中附带这把 API Key，用以证明"这确实是本店铺的系统"。

## 页面截图

![API Keys 列表页面](/docs/merchant/api-keys/api-keys-01.png)

| 编号 | 说明 |
|---|---|
| 1 | "Add Key" 按钮与多选删除按钮 |
| 2 | 栏位：Key 名称、说明、Custom Role、Roles、状态 |
| 3 | Action 菜单：停用 Key / 启用 Key |

## 您可以在此页面做什么

### 创建新的 API Key

![创建 API Key 页面](/docs/merchant/api-keys/api-keys-02.png)

| 编号 | 说明 |
|---|---|
| 1 | Key Information — Key 名称（必填）及说明 |
| 2 | Roles & Permissions — 选择 Custom Role |
| 3 | System Roles — 双栏选择器（从左侧选取后点击箭头移至右侧的 "Selected Roles"） |

1. 点击 **"Add Key"** 按钮
2. 填写 **Key 名称**（必填）与说明（选填）
3. 设定此 Key 可使用的权限 — 从已创建的 **Custom Role** 中选择（参见[自定义角色](/documents/merchant/custom-roles)），和/或从左侧列表中选择系统 **Roles**，再点击箭头按钮移至右侧的"已选择"栏
4. 点击 **Save** 保存

![显示 Secret Key 的弹窗](/docs/merchant/api-keys/api-keys-03.png)

| 编号 | 说明 |
|---|---|
| 1 | Secret Key 的值（仅显示一次），附有复制按钮 |
| 2 | "Done & Return" 按钮 |

<div class="warning-box">
  <p class="warning-title">非常重要 — 关闭窗口前请务必阅读</p>
  <ul>
    <li>创建成功后，系统会在带有复制按钮的文本框中<strong>仅显示一次 Secret Key 的值</strong>。</li>
    <li>请<strong>立即复制并将此值妥善保存</strong>在安全的地方，例如密码管理工具 (password manager)，或仅限开发团队可访问的配置文件中。</li>
    <li>如果未复制就关闭了窗口，将<strong>无法再次查看该 Secret Key 的值</strong> — 届时只能重新创建一个新的 Key。</li>
  </ul>
</div>

### 编辑现有 Key

在列表中点击 Key 名称即可编辑其名称、说明，或更改绑定的 Custom Role/Roles — 编辑操作**不会显示或更改原有的 Secret Key 值**，只能修改信息与权限。

### 启用/停用 Key

使用每行的 Action 菜单可以在**不删除的情况下暂时停用**某个 Key（适合在怀疑 Key 可能泄露但尚未确认时，先暂停使用），或在准备好后**重新启用**。

### 删除 API Key

选择要删除的 Key 并点击删除，系统会明确提示**"使用此 Key 的服务将立即失去访问权限"** — 删除前请务必确认没有任何系统仍在实际使用此 Key。

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>如果忘记复制 Secret Key，不必尝试找回 — 直接创建一个新的 Key 并配置到您的系统中即可，随后再删除旧 Key。</li>
    <li>建议为每个使用的系统/服务分别创建独立的 Key，而不是所有地方共用同一个 Key，这样出现问题时可以只停用受影响的那一个。</li>
  </ul>
</div>

## 相关页面

- [自定义角色 (Custom Roles)](/documents/merchant/custom-roles) — 预先创建好权限组合，再绑定到 Key
- [商户信息 (Merchant Info)](/documents/merchant/merchant-info) — 使用此 Key 时所需搭配的 API URL
