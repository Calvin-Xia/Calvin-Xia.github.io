# 快速开始

这份文档用于第一次接手仓库时快速跑起 Astro 站点。Phase 12 已完成，所有内容管理通过 Astro 内容集合和 npm 脚本进行，站点同时包含增强中文搜索、Worker 健康检查与安全监控、工具页 PWA、UI 国际化、文章体验增强和单篇文章元数据编辑 CLI。

## 1. 安装与启动

```bash
npm install
npm run dev
```

打开：

- `http://localhost:4321/`
- `http://localhost:4321/articles/`
- `http://localhost:4321/works/`
- `http://localhost:4321/works/tools/`

## 2. 配置本地环境

复制 `.env.example` 为 `.env`。如需本地调试 Cloudflare Worker，复制 `.dev.vars.example` 为 `.dev.vars`。

关键字段：

- `BASE_URL=https://your-site.example`
- `OKP_VAULT=C:\path\to\your\ObsidianVault`
- `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL`
- `NEW_POST_SECRET`
- `NEW_POST_ALLOWED_ORIGINS`
- `HEALTH_CHECK_TOKEN`（Worker `/api/health` 详细响应使用，生产环境通过 Wrangler secret 注入）

`.env` 和 `.dev.vars` 不要提交。Worker 配置在 `wrangler.jsonc` 中，本地 Worker 调试用 `npx wrangler dev`。

## 3. 常用命令

```bash
npm run dev
npm run build
npm test
npm run test:coverage
npm run lint
npm run api
npm run edit-metadata -- <markdown-file>
npm run publish -- --dry-run <obsidian-post-dir>
npm run publish -- <obsidian-post-dir>
npx wrangler secret put UMAMI_API_KEY
npx wrangler secret put HEALTH_CHECK_TOKEN
```

## 4. 最常见修改场景

### 新增文章

推荐使用 Obsidian→R2 发布管线：

1. 在 Obsidian vault 中准备文章目录。
2. 先运行 `npm run publish -- --dry-run <dir>` 检查 Markdown 目标路径和 R2 key。
3. 确认后运行 `npm run publish -- <dir>`；标签提示直接回车时默认使用 `未分类`。
4. 运行 `npm test` 和 `npm run build`。

这条流程只修改仓库副本，不修改 Obsidian vault 原文。

### 编辑文章元数据

已有文章的标题、日期、摘要、分类和标签等 frontmatter 可用 CLI 交互式修改：

```bash
npm run edit-metadata -- src/content/blog/20260503-labors-day.md
```

默认会执行 Zod 验证并通过临时文件原子写入。只有在明确需要绕过 schema 时使用 `--skip-validation`。

### 本地快速新建文章

1. 运行 `npm run api`。
2. 另开终端运行 `npm run dev`。
3. 打开 `/new-post/`。
4. 用 `.env` 中的 `NEW_POST_SECRET` 提交表单。

### 修改作品、工具或更新日志

优先修改 Astro 内容集合：

- `src/content/works/*.json`
- `src/content/tools/*.json`
- `src/content/updates/*.json`

更新后运行：

```bash
npm test
npm run build
```

### 修改 UI 文案或语言切换

UI 国际化集中在：

- `src/i18n/zh-CN.json`
- `src/i18n/en-US.json`
- `src/lib/i18n.ts`
- Header 语言切换与 `data-i18n*` 属性

新增或修改 UI 文案时，两份 JSON 必须保持键一致。内容集合（文章标题、摘要、标签、正文）保持中文原文，不做英文翻译。更新后运行：

```bash
npm test
npm run build
```

### 检查搜索、健康检查或 PWA

- 搜索索引端点：`/search-index.json`
- 搜索增强：`jieba-wasm` 中文分词、结果高亮、防抖搜索、最近 10 条历史、分类/标签过滤
- Worker 健康检查：`/api/health`
- 详细健康检查：`Authorization: Bearer <HEALTH_CHECK_TOKEN>`
- Worker 安全监控：`src/lib/security-logger.js` 记录 API 频率、4xx/5xx 和高错误率告警信号
- 工具页 PWA：`/works/tools/`，manifest 和 Service Worker 分别位于 `public/manifest.json`、`public/sw-tools.js`

## 5. 提交前检查

至少运行：

```bash
npm test
npm run lint
npm run build
git diff --check
```

涉及发布脚本、本地 API、内容集合或审查补充测试时，也运行：

```bash
npm run test:coverage
```

首次部署或 Worker secret 变更后，确认生产环境已注入 `UMAMI_API_KEY`：

```bash
npx wrangler secret list
```

如果需要查看 `/api/health` 的详细响应，也确认 `HEALTH_CHECK_TOKEN` 已注入。

## 6. 接下来读什么

- 完整维护说明：[site-maintenance-guide.md](./site-maintenance-guide.md)
- 迁移计划总览：[move-to-astro/README.md](./move-to-astro/README.md)
- 仓库协作约定：[AGENTS.md](./AGENTS.md)
