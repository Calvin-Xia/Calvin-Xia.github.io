# Phase 5：SEO 与评论系统 Spec

## Why

Phase 2 和 2.5 已完善内容集合、文章列表、详情页与阅读体验增强。当前网站缺少两个关键能力：

1. **可发现性**：没有 RSS feed（订阅源）和 sitemap（站点地图），搜索引擎爬虫和 RSS 阅读器无法高效索引/订阅站内文章。
2. **读者互动**：文章没有评论区，读者无法在文章页留言讨论。GitHub Issues/Discussions 通过 giscus 可以零后端成本接入评论区。

本阶段目标：在不引入后端服务、不破坏静态站点架构的前提下，补上 RSS、sitemap 和基于 giscus 的评论区。

## Status

- 状态：已完成
- 完成日期：2026-05-04
- Code Review 完成后修订日期：2026-05-04
- 验证：`npm test`（97 tests, 0 failures）、`npm run build` 均已通过
- 实现边界：RSS `src/pages/rss.xml.ts`、Sitemap `astro.config.mjs` integration、giscus `src/components/GiscusComments.astro`
- 影响文件：`src/pages/rss.xml.ts`、`astro.config.mjs`、`src/components/GiscusComments.astro`、`src/pages/articles/[...slug].astro`、`src/components/Footer.astro`、`src/layouts/BaseLayout.astro`、`src/styles/global.css`、`tests/phase-5-seo-comments.test.js`

## Scope

- RSS feed 生成：通过 `@astrojs/rss` 从 `blog` 集合自动生成 `/rss.xml`，排除草稿
- Sitemap 自动生成：通过 `@astrojs/sitemap` 集成，构建时自动生成 sitemap
- giscus 评论区：文章详情页底部嵌入基于 GitHub Discussions 的评论区，懒加载、与站点主题适配

## Non-Goals

- 不引入第三方评论后端（如 Disqus、Waline）
- 不在文章列表页或首页显示评论数
- 不自定义 giscus 的主题（跟随站点 `preferred_color_scheme`）
- 不对 RSS feed 做全文/摘要切换（默认全文）
- 不把 `new-post` 页面、404 页面放入 sitemap

## Feasibility Summary

| 功能 | 可行性 | 推荐方案 | 风险 |
|---|---|---|---|
| RSS feed | 高 | `@astrojs/rss` package，构建时生成静态 XML | 无 |
| Sitemap | 高 | `@astrojs/sitemap` 集成，构建时自动生成 | 需注意排除管理页面 |
| giscus 评论区 | 高 | 静态 HTML 组件注入 giscus `<script>`，`data-loading="lazy"` 懒加载 | giscus App 已在 repo 安装，需要正确配置 repo-id / category-id |

## Recommended Architecture

### RSS — `src/pages/rss.xml.ts`

使用 Astro 官方 `@astrojs/rss` 包的 `rss()` 函数，在 `src/pages/rss.xml.ts` 中调用 `getCollection('blog', ...)` 获取所有非草稿文章，输出 RSS 2.0 XML。构建时静态生成到 `/rss.xml`。

站点 title / description / site URL 从 `astro.config.mjs` 的 `site` 读取。每篇文章的 `pubDate` 使用 frontmatter 的 `date` 字段。

### Sitemap — `astro.config.mjs` integration

使用官方 `@astrojs/sitemap` 集成，添加到 `astro.config.mjs` 的 `integrations` 数组。构建时自动遍历所有静态路由，生成 `sitemap-index.xml` 和 `sitemap-0.xml`。

通过 `filter` 选项排除 `/new-post/`、`/404` 等非内容页面。使用 `customPages` 补齐动态路由（如 `/articles/*`、`/updates/*`、`/works/*`、`/tools/*`）——但 Astro 构建时会自动包含 `getStaticPaths` 返回的所有路径。

### giscus 评论区 — `src/components/GiscusComments.astro`

创建纯静态 Astro 组件，输出 giscus 所需的两部分：

1. `<div class="giscus">` — giscus 的挂载容器
2. `<script>` 标签 — 加载 `https://giscus.app/client.js`，携带所有 `data-*` 配置属性

**关键配置**（来自已安装的 giscus App）：

| 属性 | 值 | 说明 |
|---|---|---|
| `data-repo` | `Calvin-Xia/Calvin-Xia.github.io` | 仓库 |
| `data-repo-id` | `R_kgDOQimLyw` | 仓库 ID |
| `data-category` | `Show and tell` | 讨论分类 |
| `data-category-id` | `DIC_kwDOQimLy84C8XWc` | 分类 ID |
| `data-mapping` | `pathname` | 按路径映射讨论 |
| `data-strict` | `0` | 不严格匹配 |
| `data-reactions-enabled` | `1` | 启用心情回应 |
| `data-emit-metadata` | `0` | 不发送元数据 |
| `data-input-position` | `top` | 输入框在顶部 |
| `data-theme` | `preferred_color_scheme` | 跟随系统主题 |
| `data-lang` | `zh-CN` | 中文 |
| `data-loading` | `lazy` | 懒加载 |
| `crossorigin` | `anonymous` | 跨域 |

**为什么不需要 Astro island（`client:*` 指令）？**

giscus 的 `client.js` 脚本通过 `<script src="...">` 标签在浏览器中加载和执行。Astro 将其作为普通 HTML 输出到构建产物即可，不需要 Astro 的水合机制。giscus 自身的 `data-loading="lazy"` 已经实现了懒加载。

**样式隔离**：通过 `.giscus` 容器和 `giscus-comments` wrapper class 控制评论区的上下间距，避免与正文样式冲突。giscus 自身通过 Shadow DOM 隔离样式，不会污染站点 CSS。

### 在文章页集成

在 `articles/[...slug].astro` 的 `</article>` 之前插入 `<GiscusComments />`，使其位于文章正文和阅读布局之后、页面 footer 之前。

### Progressive Enhancement

所有功能都应在无 JS 时优雅降级：

- RSS feed 是静态 XML，不依赖 JS
- Sitemap 是静态 XML，不依赖 JS
- 评论区在 JS 禁用时完全不显示，不影响正文阅读
- giscus 加载失败时仅评论区空白，不阻塞页面其余功能

## Requirements

### Requirement: RSS Feed

#### Scenario: Feed 生成
- **WHEN** 执行 `npm run build`
- **THEN** `/rss.xml` 文件生成，包含所有非草稿文章
- **AND** XML 符合 RSS 2.0 规范
- **AND** 每篇文章包含 title、link、description（excerpt）、pubDate

#### Scenario: 草稿排除
- **WHEN** 文章 frontmatter 含 `status: "draft"`
- **THEN** 该文章不出现在 RSS feed 中

#### Scenario: 开发预览
- **WHEN** 执行 `npm run dev`
- **THEN** `http://localhost:4321/rss.xml` 可访问并返回正确 XML

### Requirement: Sitemap

#### Scenario: 构建生成
- **WHEN** 执行 `npm run build`
- **THEN** `dist/sitemap-index.xml` 和 `dist/sitemap-0.xml` 生成
- **AND** 包含所有文章、作品、工具、更新日志等公开页面
- **AND** 不包含 `/new-post/`、`/404` 等管理/错误页面

#### Scenario: 文章路由覆盖
- **WHEN** 构建完成
- **THEN** sitemap 包含每个通过 `getStaticPaths` 生成的文章详情页 URL
- **AND** URL 使用 `astro.config.mjs` 中配置的 canonical `site`

### Requirement: giscus 评论区

#### Scenario: 评论区渲染
- **WHEN** 用户访问文章详情页
- **THEN** 文章正文下方显示 giscus 评论区（懒加载，滚动到附近时加载）
- **AND** 评论区跟随系统 `prefers-color-scheme` 自动切换亮/暗主题

#### Scenario: 不同文章独立讨论
- **WHEN** 用户在两篇不同文章下留言
- **THEN** 两条留言分别归属于各自文章对应的 GitHub Discussion
- **AND** 使用 `pathname` 映射确保同一路径共享同一讨论

#### Scenario: 新建讨论
- **WHEN** 某篇文章尚不存在对应讨论
- **THEN** giscus 在首次评论/回应时自动创建 GitHub Discussion
- **AND** 创建需要用户已授权 giscus App 访问 GitHub

#### Scenario: 无 JS 降级
- **WHEN** 浏览器禁用 JavaScript
- **THEN** 评论区不显示，文章正文和其他内容不受影响
- **AND** 不产生布局偏移或空白占位

#### Scenario: 样式适配
- **WHEN** 评论区加载完成
- **THEN** 其外观与站点整体设计风格协调
- **AND** 不与文章正文、TOC 侧栏重叠
- **AND** 在移动端宽度下完整显示，不溢出

## Resolved Decisions

- **RSS 格式**：RSS 2.0（`@astrojs/rss` 默认），不额外提供 Atom/JSON Feed
- **Sitemap 方案**：使用 `@astrojs/sitemap` 官方集成，不手写 XML 生成脚本
- **评论区方案**：giscus + GitHub Discussions，已确认 giscus App 安装在 `Calvin-Xia/Calvin-Xia.github.io`
- **giscus 组件类型**：纯静态 Astro 组件（非 island），利用 giscus 自身的 `data-loading="lazy"` 懒加载
- **giscus 主题**：`preferred_color_scheme`（自动跟随系统），不锁定为单一主题
- **giscus 映射方式**：`pathname`（按路径映射讨论），每篇文章对应独立讨论
- **giscus `is:inline`**：脚本标签使用 `is:inline` 指令，防止 Astro 构建时处理 `data-*` 属性或 hoist 到 `<head>`
- **giscus `<noscript>`**：JS 禁用时显示"请启用 JavaScript 以加载评论功能"降级提示
- **RSS auto-discovery**：`BaseLayout.astro` `<head>` 中添加 `<link rel="alternate" type="application/rss+xml">`，支持浏览器和 RSS 阅读器自动发现
- **Sitemap filter**：使用 `endsWith('/404')` 而非 `includes('/404')` 做精确路径匹配，避免误排除包含 "404" 的正常页面
- **Footer sitemap 链接**：使用 `import.meta.env.PROD` 条件渲染，dev 模式下隐藏（sitemap 仅 build 时生成）
- **评论区间距**：使用 `width: min(100%, var(--article-content-width))` 与正文对齐，底部 2rem 留白与页脚拉开距离，移动端 1rem 水平 padding
