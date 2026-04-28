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
| Phase 3 | 工具页迁移 | 迁移 tools（计时器+随机选择器）和 markdown-tool 页面 |
| Phase 4 | 清理与收尾 | 删除旧文件，旧 URL 重定向，CI/CD 更新，文档更新，全站验证 |

### 目标目录结构（迁移后）

```
├── astro.config.mjs
├── package.json
├── public/
│   ├── storage/                  # 静态资源（不变）
│   ├── .well-known/              # 验证文件（不变）
│   └── libs/mammoth/             # mammoth 本地回退
├── src/
│   ├── content/
│   │   ├── blog/                 # Markdown 源文件（6 篇）
│   │   ├── works/                # 作品元数据 JSON（4 个）
│   │   ├── tools/                # 工具元数据 JSON（3 个）
│   │   ├── updates/              # 更新日志元数据 JSON（1 个）
│   │   └── config.ts             # Zod schema 定义
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── SkipLink.astro
│   │   ├── DynamicBackground.astro
│   │   ├── TransitionIndicator.astro
│   │   ├── PageIntro.astro
│   │   ├── TimerWidget.astro
│   │   └── RandomSelector.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── works.astro
│   │   ├── tools.astro
│   │   ├── articles.astro
│   │   ├── articles/[...slug].astro
│   │   ├── updates/[...slug].astro
│   │   ├── markdown-tool.astro
│   │   ├── styleguide.astro
│   │   └── 404.astro
│   ├── scripts/
│   │   ├── time-display.ts
│   │   ├── page-animations.ts
│   │   ├── email-protection.ts
│   │   ├── timer.ts
│   │   ├── random-selector.ts
│   │   └── markdown-renderer.ts
│   └── styles/
│       └── global.css
```

### 如何阅读本目录

每个 Phase 子目录包含三个文件：

| 文件 | 用途 |
|---|---|
| `spec.md` | 详细需求规格（Why / What / Impact / Requirements + Scenarios） |
| `tasks.md` | 可执行的任务清单（含 Subtask 和依赖关系），适合自动化代理执行 |
| `checklist.md` | 验收检查清单，人工或自动化验证 |

建议按 Phase 0 → 4 顺序执行，每个 Phase 的 `checklist.md` 全部通过后进入下一阶段。

### 关键文件参考

- 详细迁移计划：[`.trae/documents/astro-migration-feasibility-plan.md`](../.trae/documents/astro-migration-feasibility-plan.md)
- 现有项目架构分析：[`.trae/specs/project-architecture-analysis/spec.md`](../.trae/specs/project-architecture-analysis/spec.md)
