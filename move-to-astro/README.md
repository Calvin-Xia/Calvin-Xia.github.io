# 网站迁移到 Astro — 实施规格文档

## 项目概述

将 Mr.Xia 个人网站从纯 HTML/CSS/vanilla JS 架构全面迁移到 [Astro](https://astro.build) 框架。

### 迁移决策

| 决策项 | 选择 |
|---|---|
| 迁移范围 | 全面迁移（所有页面） |
| 博客文章 | 使用源 Markdown 文件作为 Astro 内容集合 |
| 视觉风格 | 保持整体风格，允许小幅优化 |
| 第三方库 | 混合方案（核心库 npm，低频库 CDN+本地回退） |
| Python 管线 | 替换为 Astro 内容集合 |
| URL 格式 | 干净 URL（`/works/` 替代 `Works.html`） |

### 阶段概览

| Phase | 名称 | 目标 |
|---|---|---|
| Phase 0 | 环境搭建与验证 | Astro 项目初始化，全局样式迁入，BaseLayout 组件创建，GitHub Pages 部署配置 |
| Phase 1 | 低复杂度页面迁移 | 迁移 about、works、404、styleguide 页面；拆分 main.js 脚本模块 |
| Phase 2 | 内容体系迁移 | 建立 Astro 内容集合，迁移博客/作品/工具/更新日志，实现搜索和过滤 |
| Phase 2.5 | 文章体验增强 | 实现图片灯箱、文章平滑切换、标题锚点、阅读侧栏和 TeX 公式渲染 |
| Phase 3 | 工具页迁移 | 迁移 `/works/tools/`（计时器+随机选择器+Markdown 工具）和 markdown-tool 页面 |
| Phase 4 | 清理与收尾 | 删除旧文件，旧 URL 重定向，CI/CD 更新，GitHub Actions 自动构建部署，文档更新，全站验证 |
| Phase 5 | SEO 与评论系统 | RSS feed、sitemap 自动生成、giscus 评论区集成 |
| Phase 6 | 文章统计与归档 | 字数/阅读时间自动计算、文章归档页、文章列表↔详情过渡增强、Umami 浏览量 Worker 代理 |
| Phase 7 | 核心体验优化 | MiniSearch 懒加载搜索索引、Worker `/api/health` 健康检查 |
| Phase 7.5 | 辅助增强 | 本地图标 WebP 降级、`/works/tools/` scoped PWA |
| Phase 8 | 国际化 | UI 文字中英文切换，内容集合保持中文原文 |

### 执行状态

| Phase | 状态 | 说明 |
|---|---|---|
| Phase 0 | 已完成 | 已创建 Astro 根目录配置、BaseLayout、共享组件、首页验证页和 `src/styles/global.css`，并通过 `npm run build`、`npm run dev`、`npm run preview` 验证 |
| Phase 1 | 已完成 | 已迁移 about、works、404、styleguide 页面，完善首页脚本接线并完成脚本模块对象导出 |
| Phase 2 | 已完成 | 已建立 Astro 6 内容集合、迁移博客/作品/工具/更新日志，完成文章列表/详情、全站搜索、最近更新、新建文章工具与 Obsidian→R2 发布管线 |
| Phase 2.5 | 已完成 | 已完成图片灯箱、标题锚点、侧栏目录、阅读进度、Astro ClientRouter 渐进切换和 KaTeX 服务端渲染 |
| Phase 3 | 已完成 | 工具入口下沉到 `/works/` 入口卡片，完整工具台位于 `/works/tools/`，Markdown 工具保留独立 `/markdown-tool/` 页面 |
| Phase 4 | 已完成 | 依赖 Phase 1-3 完成 |
| Phase 5 | 已完成 | RSS feed、sitemap 自动生成、giscus 评论区（含 code review 修订），97 tests |
| Phase 6 | 已完成 | `npm test`、`npm run build` 和桌面/移动浏览器验证通过；生产 `UMAMI_API_KEY` secret 已注入 |
| Phase 7 | 已完成 | 搜索索引迁移到 `/search-index.json` + MiniSearch 懒加载；Worker 增加公开/详细健康检查 |
| Phase 7.5 | 已完成 | `OptimizedIcon` 提供 WebP/PNG 降级；工具页 PWA manifest 和 Service Worker 限定 `/works/tools/` |
| Phase 8 | 已完成 | 自定义 JSON i18n、Header 无刷新语言切换、`calvin-xia-lang` 持久化；内容集合和备案保持中文 |

### 目标目录结构（迁移后）

```
├── astro.config.mjs
├── package.json
├── wrangler.jsonc
├── public/
│   ├── storage/                  # 静态资源（不变）
│   ├── manifest.json             # 工具页 PWA manifest
│   ├── sw-tools.js               # 仅 /works/tools/ 的 Service Worker
│   ├── .well-known/              # 验证文件（不变）
│   └── libs/mammoth/             # mammoth 本地回退
├── src/
│   ├── content.config.ts         # Astro 6 内容集合 schema 与 loader
│   ├── content/
│   │   ├── blog/                 # Markdown 源文件（7 篇）
│   │   ├── works/                # 作品元数据 JSON（4 个）
│   │   ├── tools/                # 工具元数据 JSON（3 个）
│   │   └── updates/              # 更新日志元数据 JSON（1 个）
│   ├── i18n/
│   │   ├── zh-CN.json
│   │   └── en-US.json
│   ├── components/
│   │   ├── ArticleToc.astro
│   │   ├── GiscusComments.astro
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── OptimizedIcon.astro
│   │   ├── SkipLink.astro
│   │   ├── DynamicBackground.astro
│   │   ├── TransitionIndicator.astro
│   │   ├── PageIntro.astro
│   │   ├── NewPostForm.astro
│   │   ├── TimerWidget.astro
│   │   ├── RandomSelector.astro
│   │   ├── MarkdownToolWidget.astro
│   │   └── ToolsSection.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── article-enhancements/
│   │   │   ├── article-enhancements.js
│   │   │   ├── heading-index.js
│   │   │   ├── image-lightbox.js
│   │   │   ├── reading-progress.js
│   │   │   └── section-reveals.js
│   │   ├── archive.js
│   │   ├── article-image-captions.js
│   │   ├── content.ts
│   │   ├── health-check.js
│   │   ├── i18n.ts
│   │   ├── remark-blockquote-breaks.js
│   │   ├── shared-content.js
│   │   ├── shared-content.d.ts
│   │   ├── search-client.ts
│   │   ├── search-index-builder.ts
│   │   ├── site-seo.js
│   │   ├── site-seo.d.ts
│   │   ├── umami-view-counter.js
│   │   ├── word-count.js
│   │   └── word-count.d.ts
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── works.astro
│   │   ├── works/
│   │   │   └── tools.astro
│   │   ├── articles.astro
│   │   ├── articles/archive.astro
│   │   ├── articles/[...slug].astro
│   │   ├── updates/[...slug].astro
│   │   ├── rss.xml.ts
│   │   ├── robots.txt.ts
│   │   ├── search-index.json.ts
│   │   ├── new-post.astro
│   │   ├── markdown-tool.astro
│   │   ├── styleguide.astro
│   │   └── 404.astro
│   ├── scripts/
│   │   ├── article-runtime.js
│   │   ├── article-transitions.js
│   │   ├── view-counter.js
│   │   ├── local-cdn-proxy.js
│   │   ├── time-display.ts
│   │   ├── page-animations.ts
│   │   ├── email-protection.ts
│   │   ├── timer.ts
│   │   ├── random-selector.ts
│   │   └── markdown-renderer.ts
│   ├── styles/
│   │   └── global.css
│   └── worker.ts
├── scripts/
│   ├── content-types.js
│   ├── markdown-utils.js
│   ├── post-utils.js
│   ├── publish-post.js
│   └── slug.js
├── tools/
│   └── api-server.js
├── tests/
│   ├── api-server.test.js
│   ├── article-headings.test.js
│   ├── article-image-captions.test.js
│   ├── article-lightbox.test.js
│   ├── article-progress.test.js
│   ├── article-reveals.test.js
│   ├── article-transitions.test.js
│   ├── blockquote-breaks.test.js
│   ├── health-check.test.js
│   ├── i18n-function.test.js
│   ├── i18n.test.js
│   ├── phase-2-5-integration.test.js
│   ├── phase-2-content.test.js
│   ├── phase-3-tools.test.js
│   ├── phase-5-seo-comments.test.js
│   ├── phase-6-stats-archive.test.js
│   ├── phase-7-integration.test.js
│   ├── phase-7.5-integration.test.js
│   ├── phase-8-integration.test.js
│   ├── post-utils.test.js
│   ├── pwa-manifest.test.js
│   ├── publish-post.test.js
│   ├── search-client.test.js
│   ├── search-index.test.js
│   ├── shared-content.test.js
│   └── sw-tools.test.js
├── .github/workflows/
│   ├── deploy.yml
│   ├── content-check.yml
│   ├── phase-2-content-check.yml
│   └── astro-build-check.yml
├── .env.example
├── .dev.vars.example
└── .gitattributes
```

### 如何阅读本目录

每个 Phase 子目录包含一份 `spec.md`（详细需求规格），记录 Why / What / Impact / Requirements + Scenarios、架构方案和 Resolved Decisions。所有 Phase 已执行完毕，spec 作为设计决策存档保留。

### 关键文件参考

- 详细迁移计划：[`.trae/documents/astro-migration-feasibility-plan.md`](../.trae/documents/astro-migration-feasibility-plan.md)
- 现有项目架构分析：[`.trae/specs/project-architecture-analysis/spec.md`](../.trae/specs/project-architecture-analysis/spec.md)
