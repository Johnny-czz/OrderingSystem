# 数据库结构（CloudBase 文档型数据库）

在云开发控制台「数据库」里新建以下 **7 个集合**，权限建议先设为「**所有用户可读，仅创建者可写**」，
若家人反馈无法下单，可改为「**所有用户可读可写**」（家庭内部使用，靠应用层控制）。

| 集合 | 说明 | 主要字段 |
| --- | --- | --- |
| `dishes` | 菜谱库 | name, category, desc, coverUrl, ingredients[], steps[], tags[], spicyLevel(0-3), available, sort, createdAt |
| `members` | 家庭成员 | name, role('admin'\|'member'), username, passwordSalt, passwordHash, color, active, createdAt |
| `settings` | 全局设置（单条） | familyName, notice, authMode('guest'\|'password'), adminUsername, adminSalt, adminPasswordHash, adminMustChangePassword |
| `meal_rounds` | 餐桌/轮次 | date, title, status('open'\|'closed'), createdBy, createdAt, closedAt |
| `orders` | 点餐明细 | roundId, memberId, memberName, dishId, dishName, qty, note, status('pending'\|'done'), createdAt |
| `wishes` | 心愿菜 | name, reason, proposedBy, votes[], status('pending'\|'approved'\|'rejected'), createdAt |
| `users` | （预留） | — |

## 建议索引

- `dishes`：`category`（升序）、`sort`（升序）
- `orders`：`roundId`（升序）、`createdAt`（降序）
- `meal_rounds`：`status`、`createdAt`（降序）
- `wishes`：`status`、`createdAt`（降序）

## 安全规则示例（自定义安全规则 JSON）

```json
{
  "read": true,
  "write": true
}
```

> 这是最省事的配置，适合家庭内部使用。若想更严格，可把写操作改成走云函数校验管理员身份。

## 初始化数据

- 菜谱：`npm run seed`（读取 `db/seed/dishes.json`，按菜名去重，可重复执行）
- 设置、管理员：首次打开应用时自动创建（管理员 `admin` / 密码 `123456`，登录后请立即修改）
