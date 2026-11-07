# 将「山窗夜话」部署到自己的 Cloudflare 账号

这个项目的源代码位于 `personal-web/sites/jianghu-room`。GitHub 保存代码，Cloudflare Workers 运行网站，Cloudflare D1 保存「以茶会友」的留言。开始时使用免费的 `workers.dev` 网址，不需要先购买域名或服务器。

目前的 `chatgpt.site` 预览与这里的 Cloudflare 部署相互独立。不要把现有 `.openai/hosting.json` 中的项目编号当成你的 Cloudflare 数据库编号。

## 一、创建留言数据库

1. 登录 Cloudflare 控制台，打开 **Storage & databases → D1 SQL Database**，创建名为 `shanchuang-yehua-db` 的数据库。
2. 在该数据库的概览页复制 **Database ID**。它是一个 UUID，不是密码，也不是 API 令牌。
3. 打开 [`wrangler.jsonc`](wrangler.jsonc)，将 `database_id` 中的 `00000000-0000-4000-8000-000000000000` 换成实际 ID。保留 `binding` 的值 `DB`。
4. 在该数据库的 **Console** 中依次执行以下两条 SQL，以创建留言表和防重复提交索引：

```sql
CREATE TABLE `messages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `request_id` text NOT NULL,
  `name` text,
  `contact` text,
  `body` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `messages_request_id_unique` ON `messages` (`request_id`);
```

这两条语句与仓库中 [`drizzle/0000_curved_doctor_strange.sql`](drizzle/0000_curved_doctor_strange.sql) 的建表内容相同。只需执行一次。

## 二、把数据库编号提交到 GitHub

在 PowerShell 运行下面的命令。注意工作目录是外层 `personal-web`，因为 `jianghu-room` 目前还保留了原 Sites 项目的独立 Git 记录。

```powershell
cd D:\personal-web
git add sites/jianghu-room/wrangler.jsonc
git commit -m "Configure personal Cloudflare D1 database"
git push origin main
```

`database_id` 可以保存在 GitHub；请勿把 Cloudflare 密码、API 令牌或其他密钥提交到仓库。

## 三、连接 GitHub 并部署

在 Cloudflare 控制台打开 **Workers & Pages → Create application**，选择连接 GitHub 仓库 `Iridescent0914/personal-web`。构建设置填写：

| 设置 | 值 |
| --- | --- |
| Worker 名称 | `shan-chuang-ye-hua` |
| 生产分支 | `main` |
| Root directory | `sites/jianghu-room` |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |

Cloudflare 会使用仓库里的 `package-lock.json` 安装依赖。首次部署成功后，控制台会显示 `*.workers.dev` 网址。若界面提前提供预览构建开关，可以先保持关闭；数据库配置完成并确认生产站点正常后再启用。

## 四、验收

打开新的 `workers.dev` 网址，检查：画面能加载；点击书、剑、电脑与人物可进入对应界面；风铃音乐能开关；「以茶会友」提交留言显示成功，并能在 D1 控制台的 `messages` 表查到记录。

若首页正常但留言返回「暂时未送达」，优先核对 `wrangler.jsonc` 的数据库 ID、`DB` 绑定以及 `messages` 表是否已创建。

## 五、以后更新与可选域名

以后从外层 `D:\personal-web` 提交并推送到 GitHub 的 `main`，Cloudflare 会自动构建、部署新版本。想使用自选域名时，再购买域名，并到 Worker 的 **Settings → Domains & Routes → Add → Custom Domain** 添加；这一步可以在网站通过 `workers.dev` 验收之后再做。

本地检查可在 `sites/jianghu-room` 目录运行 `npm run build:cloudflare`。`npm run deploy:cloudflare` 会在真正上传前检查数据库 ID 和构建产物是否匹配。
