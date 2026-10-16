# AI 换装画板

首版 Web 工程，位于 `apps/web`；异步处理 Worker 位于 `apps/worker`，共享领域规则、数据库模型和配置分别在 `packages/*`。

## 本地启动

```bash
cd /Users/maple/Desktop/clothes-design/product
pnpm install
cp .env.example .env.local
pnpm dev
```

打开 <http://localhost:3000>。不填写任何 key 时，页面仍可使用本地照片预览、拖拽、缩放、旋转、锁定、同品类替换和本地示例建议；上传 API、持久化衣物卡和真实 AI 处理会在配置服务后启用。

需要单独运行 Worker 时：

```bash
pnpm dev:worker
```

## 配置服务

把 `.env.example` 复制为 `.env.local` 后填写 Supabase、数据库和供应商变量。密钥只放在环境变量中，不提交到仓库。数据库迁移文件在 `supabase/migrations`，可用 Supabase CLI 应用到 staging。

## 验证

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

OpenSpec 的落地拆分和验收清单见 `openspec/changes/implement-ai-outfit-board`。
