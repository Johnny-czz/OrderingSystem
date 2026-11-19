# CloudBase 接入步骤（照着做，约 10 分钟）

代码已同时支持两种环境：**PostgreSQL 模式（新版控制台默认，推荐）** 和 **文档型数据库（传统模式）**。
找不到「文档型数据库」选项也没关系，直接建 PostgreSQL 环境即可。

做完下面 5 步，把「环境 ID + Publishable Key + SecretId/SecretKey」发给我，剩下的（建表、导菜谱、部署、给链接）我全部代做。

---

## 第 1 步：注册并实名腾讯云

1. 打开 https://cloud.tencent.com/ ，微信扫码注册/登录
2. 完成**实名认证**（个人实名即可）：控制台右上角头像 → 账号信息 → 实名认证

## 第 2 步：开通云开发，创建环境

1. 打开 https://tcb.cloud.tencent.com/ →「新建环境」
2. 计费方式选「**免费体验版**」（0 元，3000 点/月资源点，家庭用量足够）
   - 需要「兑换码」：点页面上「关注公众号」→ 公众号内按提示领取免费兑换码 → 填入即可 0 元提交
3. 地域选「**上海**」（文档型与 PostgreSQL 都支持；新加坡只支持 PostgreSQL）
4. 数据库类型：**PostgreSQL 数据库**（新版控制台若只显示这一项，就选它）
5. 创建完成后记下**环境 ID**，形如 `family-7gabc123` 👉 发给我

## 第 3 步：开启匿名登录

环境内左侧菜单：**环境 → 登录授权 → 匿名登录 → 打开开关**

> 家人不用注册，靠匿名登录换取访问数据库的凭证。

## 第 4 步：建表 + 导入菜谱（我来跑，你也可以自己点几下）

两种方式任选：

**A. 交给我（推荐）**：把密钥给我，我执行
```bash
npm run seed:pg                                   # 生成 db/pg/seed-dishes.sql（70 道菜）
tcb db execute -e <envId> --file ./db/pg/schema.sql        # 建表 + 权限
tcb db execute -e <envId> --file ./db/pg/seed-dishes.sql   # 导入菜谱
```

**B. 自己在控制台点**：数据库 → SQL 编辑器 → 依次粘贴 `db/pg/schema.sql`、
`db/pg/seed-dishes.sql` 的内容执行。

> 建表脚本已包含 RLS 策略（anon/authenticated 可读写，家庭内部自用）。

## 第 5 步：拿到两个凭据发给我

1. **Publishable Key**（前端连库用，等价于 Supabase 的 anon key）
   控制台 → 环境 →「API 密钥 / 凭证」→ 复制 Publishable Key
2. **腾讯云 API 密钥**（仅我本机建表、部署用）
   https://console.cloud.tencent.com/cam/capi → 新建密钥 → SecretId / SecretKey

```
环境 ID：family-xxxxxxxx
Publishable Key：xxxxxxxx
SecretId：AKIDxxxxxxxx
SecretKey：xxxxxxxx
```

我会填进 `.env.local`（已 gitignore）：

```
VITE_TCB_ENV_ID=family-xxxxxxxx
VITE_TCB_MODE=pg
VITE_TCB_ACCESS_KEY=xxxxxxxx
```

然后 `npm run build` + `tcb hosting deploy ./dist -e <envId>`，把分享链接给你。

---

## 关于「免费」的真实规则（官方购买页，2026-10-26 更新）

- 自 2026-01-16 起，**每个账号用一次性兑换码可创建一个免费体验版环境**（3000 点/月资源点）
- **免费环境单次续费 6 个月，到期前 1 个月内可手动续费 6 个月，不支持自动续费**
  → 所以不是「到期再领兑换码」，而是**到期前 1 个月内点一下续费**（仍然免费），记得别错过窗口
- 免费环境**不支持**加购资源包 / 按量付费；可随时手动转成付费环境
- 体验版限制：云函数超时 3s、内存 256M 不可改（我们没用云函数，不受影响）

## 两种环境模式怎么选

| | PostgreSQL 模式（新版默认） | 文档型数据库（传统模式） |
| --- | --- | --- |
| 控制台还能建吗 | ✅ 能，新版控制台主推 | 上海地域仍支持，但入口越来越隐蔽 |
| 本项目支持 | ✅ `VITE_TCB_MODE=pg` | ✅ `VITE_TCB_MODE=doc` |
| 实时同步 | `app.realtime()` 的 Postgres CDC | `collection.watch()` |
| 导入菜谱 | `db/pg/*.sql` | `npm run seed` |

无论哪种，把结果告诉我即可，代码两边都跑得通。

## 隐私与安全

- SecretId/SecretKey 只存本机 `.env.local`，不入库、不提交 git、不进前端代码
- Publishable Key 是公开的 anon 级密钥，配合 RLS 使用，泄露风险可控
- 拿到链接后请**第一件事把管理员密码从 `123456` 改掉**；更严格就切成「账号密码登录」模式
