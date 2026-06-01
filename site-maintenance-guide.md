# 站点维护与界面更新说明

这份文档描述 Astro 迁移完成后的站点维护方式。Phase 0-8 已完成，所有内容维护入口通过 Astro 内容集合、翻译 JSON 和 npm 脚本进行，旧 HTML/JSON/Python 管线已移除。Phase 5 补上了 RSS/sitemap/giscus 评论区，Phase 6 补上了字数字阅读时间、归档页和文章浏览量 Worker 代理，Phase 7 补上了 MiniSearch 懒加载搜索和 Worker 健康检查，Phase 7.5 补上了本地图标 WebP 降级和工具页 PWA，Phase 8 补上了 UI 国际化。Phase 2.5 的图片灯箱、标题锚点、目录、阅读进度、逐段渐显和 TeX 渲染仍集中维护在文章增强模块中。

## 当前内容结构

Astro 内容集合：

- 博客文章：`src/content/blog/*.md`
- 作品：`src/content/works/*.json`
- 工具：`src/content/tools/*.json`
- 更新日志：`src/content/updates/*.json`
- Schema：`src/content.config.ts`

国际化：

- 中文源语言：`src/i18n/zh-CN.json`
- 英文翻译：`src/i18n/en-US.json`
- 运行时与语言偏好：`src/lib/i18n.ts`

辅助脚本：

- `tools/api-server.js`：本地 `/new-post/` API
- `scripts/publish-post.js`：Obsidian→R2 发布管线
- `scripts/post-utils.js`、`scripts/markdown-utils.js`、`scripts/slug.js`、`scripts/content-types.js`：发布和文件操作工具

Worker：

- `src/worker.ts`：Cloudflare Worker 入口，代理 Umami API 实现文章浏览量
- `src/lib/umami-view-counter.js`：Umami API 代理核心逻辑
- `src/lib/health-check.js`：Worker `/api/health` 健康检查逻辑
- `wrangler.jsonc`：Wrangler 部署配置（Worker 入口、ASSETS binding）
- `.dev.vars.example`：本地 Worker secret 占位模板（`UMAMI_API_KEY`、`HEALTH_CHECK_TOKEN`）

文章增强辅助库（`src/lib/`）：

- `word-count.js`：字数统计与阅读时间自动计算
- `archive.js`：归档数据按年份分组
- `search-index-builder.ts`：构建 MiniSearch 序列化索引
- `search-client.ts`：客户端懒加载搜索索引并执行搜索
- `article-enhancements/`：图片灯箱、标题锚点、目录、阅读进度、逐段渐显
- `site-seo.js`：共享 SEO helpers（RSS/sitemap/OG 等）

工具页 PWA：

- `public/manifest.json`：工具页 PWA manifest，`start_url` 和 `scope` 均为 `/works/tools/`
- `public/sw-tools.js`：仅处理 `/works/tools/` 范围的 Service Worker，采用 Network First 策略
- `src/components/OptimizedIcon.astro`：本地图标 WebP + PNG 降级组件

## 页面联动

- 首页 `/`
  - 从 Astro 内容集合静态生成最近更新。
- 文章页 `/articles/`
  - 默认展示 blog 集合文章。
  - 每张卡片展示自动计算的字数（如 "约 3,500 字"）和阅读时间。
  - 搜索索引由 `/search-index.json` 提供，客户端首次搜索时懒加载 MiniSearch 索引。
  - 搜索范围由构建时 payload 的 `searchableTypes` 控制，目前包括 article、work、tool。
  - 搜索、分类和标签状态通过 URL 参数 `q`、`category`、`tag` 持久化。
  - 上方有 "文章归档" 入口链接到 `/articles/archive/`。
- 文章详情 `/articles/{slug}/`
  - 从 `src/content/blog/*.md` 静态生成。
  - meta 区域展示字数和阅读时间（frontmatter 手动 `readTime` 优先）。
  - 图片 `alt` 会渲染为灰色说明文字。
  - 图片灯箱、标题锚点、目录、阅读进度、逐段渐显和 TeX 公式渲染由 `src/lib/article-enhancements/` 运行时增强。
  - 底部显示 giscus 评论区（基于 GitHub Discussions，懒加载）。
  - 文章卡片底部显示 Umami 浏览量（Worker 代理）。
  - `/articles/` ↔ `/articles/{slug}/` 使用 Astro `ClientRouter`/View Transitions 方向性动画，返回时恢复滚动位置和搜索状态。
- 文章归档 `/articles/archive/`
  - 按年份分组展示所有非草稿文章时间线，入口在 `/articles/` 内部。
- 作品页 `/works/`
  - 使用 Astro 页面和内容集合入口。
  - 底部 "工具集" 入口卡片链接到 `/works/tools/`。
- 工具页 `/works/tools/`
  - 作为作品体系的一部分展示计时器、随机选择器和 Markdown 工具。
  - 支持限定 scope 的 PWA；Service Worker 只缓存和拦截 `/works/tools/`。
- 更新日志 `/updates/{slug}/`
  - 从 `src/content/updates/*.json` 的结构化 `timeline` 渲染。
- RSS Feed `/rss.xml`
  - 构建时由 `@astrojs/rss` 自动生成，排除草稿文章。
  - `BaseLayout` `<head>` 中包含 auto-discovery `<link>`。
- Sitemap
  - 构建时由 `@astrojs/sitemap` 自动生成，排除 `/new-post/`、`/404` 等非内容页面。
  - Footer 中 sitemap 链接仅在生产构建时显示。
- giscus 评论区
  - `src/components/GiscusComments.astro` 纯静态组件，映射方式 `pathname`。
  - 主题跟随系统 `preferred_color_scheme`，JS 禁用时不显示。
- UI 国际化
  - Header 语言按钮在 `zh-CN` / `en-US` 间切换，不刷新页面。
  - 语言偏好保存在 `localStorage` 的 `calvin-xia-lang`。
  - `BaseLayout` 在首屏前读取语言偏好；页面 title/description、aria-label、placeholder、按钮和提示文案跟随 UI 语言。
  - 文章标题、摘要、标签、正文以及备案信息保持中文原文。

## 新增文章

推荐流程：

1. 在 Obsidian vault 中准备文章目录和 `file/` 资源。
2. 运行：

```bash
npm run publish -- --dry-run <obsidian-post-dir>
```

3. 检查目标 Markdown 路径、R2 object key 和公网 URL。
4. 确认后运行：

```bash
npm run publish -- <obsidian-post-dir>
```

5. 运行：

```bash
npm test
npm run build
```

发布脚本只修改仓库中的 Markdown 副本，不修改 Obsidian vault 原始内容。

## 本地快速创建文章

1. 运行本地 API：

```bash
npm run api
```

2. 运行 Astro dev server：

```bash
npm run dev
```

3. 打开 `/new-post/`，使用 `.env` 中的 `NEW_POST_SECRET` 提交。

生产构建不会暴露可提交表单或完整本地 API 地址。

## 更新作品、工具、更新日志

修改对应集合文件：

- `src/content/works/*.json`
- `src/content/tools/*.json`
- `src/content/updates/*.json`

然后运行：

```bash
npm test
npm run build
```

## 配置维护

- `BASE_URL`：Astro canonical 主域名，一次构建只配置一个。
- `R2_PUBLIC_URL`：文章资源公网 URL，不等同于站点主域名。
- `NEW_POST_ALLOWED_ORIGINS`：本地 API 允许的额外精确 origin。
- `.gitattributes`：源码文件统一 LF 行尾，减少 Windows/CI diff 噪声。
- `wrangler.jsonc`：Worker 入口脚本（`main`）、ASSETS binding 和必要 secret 声明。Worker 路由 `/api/views/*` 由 `src/worker.ts` fetch handler 分发，非 API 请求透传给内置静态资产引擎。
- `UMAMI_API_KEY`：生产环境通过 `npx wrangler secret put UMAMI_API_KEY` 注入，不写入仓库。本地调试时复制 `.dev.vars.example` 为 `.dev.vars` 并填入真实值，Wrangler dev 会自动读取。
- `HEALTH_CHECK_TOKEN`：生产环境通过 `npx wrangler secret put HEALTH_CHECK_TOKEN` 注入，用于 `/api/health` 详细响应的 Bearer Token。未传 token 的请求只返回公开状态。

不要提交 `.env`、`.dev.vars` 或任何真实凭证。

## 验证流程

常规提交前：

```bash
npm test
npm run build
git diff --check
```

涉及文件操作、发布脚本、本地 API 或审查补充测试：

```bash
npm run test:coverage
```

## 功能维护

### RSS/Sitemap（Phase 5）

无需主动维护。RSS feed 和 sitemap 在每次 `npm run build` 时自动生成。新增或修改文章后运行 build 即可。

### giscus 评论区（Phase 5）

无需主动维护。giscus 依赖 GitHub Discussions，评论数据存储在 `Calvin-Xia/Calvin-Xia.github.io` 仓库的 Discussions 中。如需调整配置（主题、语言等），修改 `src/components/GiscusComments.astro` 中的 `data-*` 属性。

### 字数字阅读时间（Phase 6）

无需主动维护。构建时从 Markdown body 自动计算。若文章 frontmatter 手动指定 `readTime`，自动计算会退让。排行算法：中文 ~300 字/分钟 + 英文 ~200 词/分钟。

### 归档页（Phase 6）

无需主动维护。`/articles/archive/` 在构建时从 `getCollection('blog')` 按年份分组生成，新增文章自动归入对应年份。

### 文章浏览量（Phase 6）

需要维护 `UMAMI_API_KEY` secret。浏览量数据来源为 Umami Cloud API（已集成分析），Worker 在服务端代理请求：

- 前端 (`src/scripts/view-counter.js`) 请求 `/api/views/{slug}`
- Worker (`src/worker.ts`) 拦截 `/api/views/*`，携带 `UMAMI_API_KEY` 调用 Umami
- 非 API 请求透传给内置静态资产引擎（`env.ASSETS.fetch`）
- 缓存 5 分钟（`Cache-Control: public, max-age=300`）
- Umami 不可用时返回 `views: null`，前端自动隐藏浏览量

若浏览量不显示，检查 `npx wrangler secret list` 确认 `UMAMI_API_KEY` 已注入。

### 搜索索引（Phase 7）

文章页搜索由构建时 MiniSearch 索引驱动：

- `src/pages/search-index.json.ts` 生成 `/search-index.json`
- `src/lib/search-index-builder.ts` 定义索引字段、存储字段和权重
- `src/lib/search-client.ts` 首次搜索时懒加载索引，后续复用同一个 MiniSearch 实例
- `src/pages/articles.astro` 负责筛选 UI、建议下拉、URL 参数同步和结果渲染

新增可搜索内容类型时，需同时更新共享内容映射、索引构建逻辑、客户端过滤逻辑和测试。

### Worker 健康检查（Phase 7）

Worker 暴露 `/api/health`：

- 公开响应：`GET /api/health` 返回 `status` 和 `timestamp`
- 详细响应：`GET /api/health` 加 `Authorization: Bearer <HEALTH_CHECK_TOKEN>` 返回版本、运行时间和依赖状态
- 缓存：`GET /api/health?cache=30` 返回 `Cache-Control: public, max-age=30`
- 降级：Umami 不可用或未配置 key 时返回 `degraded`，HTTP 仍为 200；代码异常才返回 503

本地调试 Worker 时，`.dev.vars` 可同时配置 `UMAMI_API_KEY` 和 `HEALTH_CHECK_TOKEN`。

### 图标优化与工具页 PWA（Phase 7.5）

本地图标同时保留 PNG 与 WebP：

- `public/storage/icon.png` / `icon.webp`
- `public/storage/Beian.png` / `Beian.webp`
- `src/components/OptimizedIcon.astro` 输出 `<picture>`，优先 WebP，回退 PNG

工具页 PWA 的维护边界很窄：

- `public/manifest.json` 的 `scope` 和 `start_url` 必须保持 `/works/tools/`
- `public/sw-tools.js` 不应拦截非工具页路由
- `BaseLayout.astro` 只在当前路径以 `/works/tools/` 开头时注册 `sw-tools.js`

修改 Service Worker 后，建议在浏览器 DevTools Application 面板清理旧缓存再手动验证。

### 国际化（Phase 8）

UI 国际化使用自定义轻量实现，不引入路由级 `/en`：

- 翻译文件在 `src/i18n/zh-CN.json` 和 `src/i18n/en-US.json`
- `src/lib/i18n.ts` 负责 `t()` 查找、变量插值、DOM `data-i18n*` 应用、Header 按钮绑定和 `calvin-xia-lang` 持久化
- `BaseLayout.astro` 负责首屏前设置 `document.documentElement.lang` 和 `data-lang`
- 动态客户端状态通过 `calvin-lang-change` 事件重新写入文案

维护规则：

- 新增 UI 文案必须同时补齐中英文 JSON 键，`tests/i18n.test.js` 会检查键一致性。
- 内容集合不翻译；文章标题、摘要、标签、正文保留原文。
- 备案文字和公安备案图标 alt 保持中文，不挂 `data-i18n`。
- Header 移动端要保留 44px 触达目标，并避免英文导航与语言/主题按钮重叠。

### 文章体验增强（Phase 2.5）

集中维护在 `src/lib/article-enhancements/`，运行时入口为 `src/scripts/article-runtime.js`：

- 图片灯箱：`image-lightbox.js`，原生 `<dialog>` 实现，支持切换、缩放、键盘和手势
- 标题锚点：`heading-index.js`，构建期生成稳定 id 和 `#` 锚点
- 目录与进度：`reading-progress.js`，`IntersectionObserver` 高亮当前章节
- 逐段渐显：`section-reveals.js`，段落和图片滚动进入视口时淡入
- 样式在 `src/styles/global.css`，目录容器在 `src/components/ArticleToc.astro`

修改增强行为时，需同时运行 `npm test`（含 `phase-2-5-integration.test.js`）并在桌面/移动端验证。

## CI

- `deploy.yml`：push main 时自动构建 Astro 并通过 GitHub Actions 部署到 GitHub Pages
- `content-check.yml`：push/PR 时运行 `npm ci && npm run build` 验证构建
- `astro-build-check.yml`：安装依赖、构建 Astro、验证关键静态输出
- `phase-2-content-check.yml`：运行 `npm test`、`npm run test:coverage`、内容结构检查和 Astro build
