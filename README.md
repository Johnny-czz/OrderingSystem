# 家庭点餐

给自家用的手机端点餐小工具：**有菜谱、能点餐、家人点完你立刻能看到**。
不用上架应用商店，部署后把链接发给家人，微信/手机浏览器打开就能用。

## 当前线上环境（已部署）

| 项 | 值 |
| --- | --- |
| 访问地址 | https://eligible-heron-d2gqpn9c8e6230998-1422995022.tcloudbaseapp.com/ |
| 环境 ID | `eligible-heron-d2gqpn9c8e6230998` |
| 数据库 | PostgreSQL 模式（`VITE_TCB_MODE=pg`），已导入 70 道菜 |
| 登录方式 | 匿名登录（家人免注册，填昵称即用） |
| 到期时间 | 2027-04-30，需提前手动续期（仍免费） |

已知限制：

- 使用 CloudBase 测试域名，首次访问会有一页「**风险提醒**」，点「**确定访问**」即可进入；
  绑定已备案的自定义域名后该提示会消失
- 该环境的实时推送（WebSocket）返回 503，应用已自动降级为 **3 秒轮询 + 切回页面立即刷新**，
  家人点完最多 3 秒就能互相看到

## 功能

- **今日餐桌**：全家在同一张桌子上各自加菜，可填份数与「口味/忌口」备注，实时看到谁点了什么
- **菜谱库**：内置 202 道家常菜（荤菜 70 / 素菜 37 / 汤羹 29 / 主食 42 / 凉菜 24），每道含食材清单与文字版做法；
  其中 41 道收录自「村驴」「隋坡」两位老师的教程并带出处标签（菜品数据文件在 `db/seed/dishes-*.json`，可运行 `node scripts/sync-dishes.mjs` 同步到线上）
- **来源标注**：菜谱卡片、详情页显示出处角标，管理员后台可编辑「来源作者」
- **菜品详情**：食材用量 + 分步做法，点之前先看看怎么做
- **心愿菜**：家人提议想吃的菜并投票，管理员一键采纳进菜谱或驳回
- **常点清单 / 历史餐桌**：自动统计点得最多的菜，可一键再点
- **管理员后台**：菜谱增删改（支持上传菜品照片）、订单看板（按人/按菜汇总、标记已做好）、成员账号管理、访问模式切换
- **访问控制**：内置管理员账号，后台可切换「免登录填昵称」或「指定账号密码登录」（账号由管理员设置）

## 一、先本地看看效果（不需要任何配置）

```bash
npm install
npm run dev
```

打开 http://localhost:5173/ 即可体验。**未配置 CloudBase 时运行在「本机演示数据」模式**：
数据存在你自己浏览器里，方便先看界面和流程；要真正让家人之间互相看到，继续第二步。

## 二、接入腾讯云开发 CloudBase（家人之间实时同步）

### 1. 开通云开发

1. 打开 https://tcb.cloud.tencent.com/ ，用腾讯云账号登录（需实名认证）
2. 新建环境 → 选择「按量计费」或免费额度 → 记下 **环境 ID**（形如 `family-1a2b3c`）
3. 进入环境 → **登录授权** → 打开「**匿名登录**」

### 2. 建数据库集合

新版控制台只提供 **PostgreSQL** 环境也没关系，代码两种都支持：

- **PostgreSQL 模式**（新版默认）：执行 `db/pg/schema.sql` 建表（含 RLS 策略），
  再用 `npm run seed:pg` 生成的 `db/pg/seed-dishes.sql` 导入菜谱
- **文档型数据库**（传统模式）：按 `db/schema.md` 新建 6 个集合
  `dishes`、`members`、`settings`、`rounds`、`orders`、`wishes`，
  权限设为「**所有用户可读，所有用户可写**」（家庭内部使用，靠应用层控制）

逐步图文版见 `docs/CloudBase接入步骤.md`。

### 3. 填配置

把 `.env.local.example` 复制为 `.env.local`，填入：

```
VITE_TCB_ENV_ID=family-1a2b3c
TCB_ENV_ID=family-1a2b3c
VITE_TCB_MODE=pg                    # pg = PostgreSQL 模式；doc = 文档型数据库
VITE_TCB_ACCESS_KEY=你的PublishableKey  # PG 模式需要，控制台 → 环境 → API 密钥
TENCENTCLOUD_SECRETID=你的SecretId
TENCENTCLOUD_SECRETKEY=你的SecretKey
```

密钥获取：https://console.cloud.tencent.com/cam/capi
（`.env.local` 已在 `.gitignore` 中，不会被提交）

### 4. 灌入菜谱数据

```bash
npm run seed          # 先试试 npm run seed -- --dry-run 看看会写什么
```

脚本按菜名去重，可重复执行。也可以不跑：应用首次打开时会自动写入菜谱。

### 5. 部署静态托管

```bash
npm install -g @cloudbase/cli
tcb login
npm run build
tcb hosting deploy ./dist -e 你的环境ID
```

部署完成后会给出默认域名（形如 `xxx.tcloudbaseapp.com`），把这个链接发给家人即可。
`cloudbaserc.json` 里的 `envId` 改成你的环境 ID 后，也可以用 `tcb framework deploy`。

## 三、管理员怎么用

- **初始账号**：`admin` / 密码 `123456`
- 进入页右下角「管理员入口」登录；登录后首页右上角会出现「后台」快捷按钮
- **第一次登录会强制改密码**，之后可在「访问设置 → 修改管理员密码」再改
- 后台四个页签：
  - **订单看板**：按菜备菜 / 按人看，逐项标记「已做好」，可结束餐桌、开新桌
  - **菜谱管理**：新增/编辑/下架菜品，上传真实菜品照片替换渐变封面
  - **成员账号**：给家人建账号密码，或停用某个成员
  - **访问设置**：切换免登录 / 账号密码登录，改家庭名称与首页公告，复制分享链接

## 四、家人怎么用

- 打开你发的链接
- 「免登录」模式：填个昵称 → 进入今日餐桌 → 点菜（可填份数与备注）
- 「账号密码」模式：用管理员分配的账号密码登录
- 底部四个 Tab：今日餐桌 / 菜谱 / 心愿 / 我的

## 五、常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发预览 |
| `npm run build` | 构建到 `dist/` |
| `npm run seed` | 导入/更新菜谱种子数据到云数据库（文档型模式） |
| `npm run seed:pg` | 生成 PostgreSQL 模式的菜谱种子 SQL（`db/pg/seed-dishes.sql`） |
| `tcb hosting deploy ./dist -e <envId>` | 部署到静态托管 |

## 六、技术栈

React + TypeScript + Vite + Tailwind CSS + shadcn/ui，数据层是腾讯云开发 CloudBase
（云数据库 + 云存储 + 静态托管 + 实时数据推送）。

数据访问层做了双驱动：配了 `VITE_TCB_ENV_ID` 走云数据库（带实时订阅，失败自动降级为轮询），
没配则走 `localStorage` 本地驱动，方便离线预览。
