# 站点维护与界面更新说明

这份文档描述 Astro 迁移完成后的站点维护方式。Phase 0-6 已完成，所有维护入口通过 Astro 内容集合进行，旧 HTML/JSON/Python 管线已移除。Phase 5 补上了 RSS/sitemap/giscus 评论区，Phase 6 补上了字数字阅读时间、归档页和文章浏览量 Worker 代理，Phase 2.5 补上了图片灯箱、标题锚点、目录、阅读进度、逐段渐显和 TeX 渲染。

## 当前内容结构

Astro 内容集合：

- 博客文章：`src/content/blog/*.md`
- 作品：`src/content/works/*.json`
- 工具：`src/content/tools/*.json`
- 更新日志：`src/content/updates/*.json`
- Schema：`src/content.config.ts`

辅助脚本：

- `tools/api-server.js`：本地 `/new-post/` API
- `scripts/publish-post.js`：Obsidian→R2 发布管线
- `scripts/post-utils.js`、`scripts/markdown-utils.js`、`scripts/slug.js`、`scripts/content-types.js`：发布和文件操作工具

Worker：

- `src/worker.ts`：Cloudflare Worker 入口，代理 Umami API 实现文章浏览量
- `src/lib/umami-view-counter.js`：Umami API 代理核心逻辑
- `wrangler.jsonc`：Wrangler 部署配置（Worker 入口、ASSETS binding）
- `.dev.vars.example`：本地 Worker secret 占位模板

文章增强辅助库（`src/lib/`）：

- `word-count.js`：字数统计与阅读时间自动计算
- `archive.js`：归档数据按年份分组
- `article-enhancements/`：图片灯箱、标题锚点、目录、阅读进度、逐段渐显
- `site-seo.js`：共享 SEO helpers（RSS/sitemap/OG 等）

## 页面联动

- 首页 `/`
  - 从 Astro 内容集合静态生成最近更新。
- 文章页 `/articles/`
  - 默认展示 blog 集合文章。
  - 每张卡片展示自动计算的字数（如 "约 3,500 字"）和阅读时间。
  - 搜索范围由构建时 payload 的 `searchableTypes` 控制，目前包括 article、work、tool。
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
