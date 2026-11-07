# 山窗夜话

以「整体画面.png」为准制作的可探索房间式个人网站。画面、热点、音乐和留言功能位于 `app/` 与 `public/art/`；`scripts/` 中保留了画面分层的生成工具。

## 本地运行

需要 Node.js 22.13 或更新版本。在本目录运行：

```powershell
npm ci
npm run dev
```

检查生产构建：

```powershell
npm run build
```

## 部署

网站使用 Cloudflare Workers；留言接口使用 D1，绑定名为 `DB`。从零部署到个人账号，请按 [部署到个人Cloudflare账号.md](部署到个人Cloudflare账号.md) 操作。`wrangler.jsonc` 中的数据库 ID 仍是占位值，填写真实 ID 后才能发布。

本项目位于外层 `personal-web` GitHub 仓库的 `sites/jianghu-room`。内层 `.git` 历史仍在，请从 `D:\personal-web` 提交并推送代码。
