---
title: 自定义角色 (Custom Roles)
summary: 自行创建权限组合，精细到"允许调用哪一个 API"的程度，再将其分配给用户或 API Key。
keywords: custom role, 角色, 权限, permission, api 权限
updatedAt: "{{BUILD_DATE}}"
---

# 自定义角色 (Custom Roles)

Custom Role 是一组由您自行命名的"权限组合"，例如"会计人员"或"开发团队"，由您自己决定被赋予此角色的人可以调用系统的哪些功能 (API)。设定完成后，即可将此角色直接绑定到[用户](/documents/merchant/users)或 [API Key](/documents/merchant/api-keys)，而不必逐一为每个人设置权限。

## 页面截图

![Custom Roles 列表页面](/docs/merchant/custom-roles/custom-roles-01.png)

| 编号 | 说明 |
|---|---|
| 1 | "Add Role" 按钮与多选删除按钮 |
| 2 | 栏位：角色名称、说明、标签 |
| 3 | 搜索框 |

## 您可以在此页面做什么

### 创建新角色

点击 "Add Role" 并填写以下内容：

![创建新角色页面](/docs/merchant/custom-roles/custom-roles-02.png)

| 编号 | 说明 |
|---|---|
| 1 | Role Information — 角色名称（必填）、说明、标签 |
| 2 | 权限搜索框 (Search permissions) |
| 3 | "已选择 / 总数" 计数器 |
| 4 | 权限分组列表（按系统的功能分组），可用复选框整组勾选或逐项勾选 |

1. **角色名称**（必填）— 取一个有意义的名称，例如"会计团队 - 仅查看"
2. **说明** 和 **标签**（选填）— 便于日后分类与查找
3. **选择权限** — 使用搜索框筛选出需要的功能，逐项勾选，或勾选分组标题一次性选择整组权限

<div class="warning-box">
  <p class="warning-title">设置角色前请先理解以下几点</p>
  <ul>
    <li>这里的角色是<strong>精细到每个功能 (API) 的清单</strong>，而不是像"管理员"/"员工"这类笼统的权限等级 — 您必须自行选择要开放哪些功能。如果某个功能没有被勾选，被赋予此角色的人将<strong>完全无法</strong>使用该功能。</li>
    <li>只选择工作实际需要的权限（"最小权限"原则），以降低安全风险。</li>
  </ul>
</div>

### 编辑现有角色

在列表中点击角色名称即可进入编辑。表单会自动加载并勾选之前选定的权限。修改后可立即保存（如果未保存就离开页面，系统一律会先弹出确认提示）。

### 删除角色

选择要删除的角色（可多选），然后点击删除 — 系统一律会再次要求确认，因为删除后无法恢复。

<div class="tip-box">
  <p class="tip-title">小贴士</p>
  <ul>
    <li>如果有用户或 API Key 正绑定着此角色，删除前请先确认不会影响他们的使用权限。</li>
  </ul>
</div>

## 相关页面

- [用户管理 (Users)](/documents/merchant/users) — 将此角色分配给员工
- [API Keys](/documents/merchant/api-keys) — 将此角色绑定到自动化系统所用的 API Key
