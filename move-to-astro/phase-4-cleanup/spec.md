# Phase 4：清理与收尾 Spec

## Why
Phase 0-3 已完成所有页面的 Astro 迁移。此阶段删除所有旧文件，配置旧 URL 重定向以确保外部链接和书签不失效，更新 CI/CD 和项目文档，并进行全站最终验证。

## What Changes
- 删除旧 HTML 文件：根目录 8 个页面 + `blog/*.html`（6 篇）+ `UpdateLog/` 目录
- 删除旧资源目录：`css/`、`js/`、`content/`、`scripts/`
- 清理 `libs/` 目录：删除 `marked/`、`highlight.js/`、`katex/`、`dompurify/`（已 npm），保留 `libs/mammoth/`
- 在 `public/` 下为所有旧 URL 创建 meta refresh 重定向 HTML
- 更新 `.github/workflows/content-check.yml`：PY → npm build
- 更新项目文档

## Impact
- Deleted files: 根目录 8 个 `.html`, `blog/*.html`(6), `blog/convert.py`, `blog/blog-files.json`, `blog/blog-metadata.json`, `css/style.css`, `js/main.js`, `js/navigation.js`, `js/content-hub.js`, `js/cdn-fallback.js`, `content/content-manifest.json`, `content/works-metadata.json`, `content/tools-metadata.json`, `content/update-logs-metadata.json`, `scripts/content_pipeline.py`, `UpdateLog/fingerprint-app-update-log.html`, `libs/marked/`, `libs/highlight.js/`, `libs/katex/`, `libs/dompurify/`
- New files: `public/about.html`(redirect), `public/Works.html`(redirect), `public/timetable.html`(redirect), `public/statement.html`(redirect), `public/markdown-to-html-tool.html`(redirect), `public/styleguide.html`(redirect), `public/blog/*.html`(6 redirects), `public/UpdateLog/fingerprint-app-update-log.html`(redirect)
- Modified files: `.github/workflows/content-check.yml`, `README.md`, `AGENTS.md`

## ADDED Requirements

### Requirement: 旧文件清理
所有已迁移的旧文件 SHALL 被删除。

#### Scenario: HTML 文件清理
- **WHEN** 清理完成后
- **THEN** 根目录不存在 `*.html` 文件（除重定向外），`blog/` 目录不存在 `*.html` 文章文件

#### Scenario: 资源目录清理
- **WHEN** 清理完成后
- **THEN** `css/`、`js/`、`content/`、`scripts/`、`UpdateLog/` 目录不存在

#### Scenario: libs 保留
- **WHEN** libs 清理完成后
- **THEN** `libs/` 目录仅保留 `mammoth/mammoth.browser.min.js`

#### Scenario: blog 说明文件保留
- **WHEN** 清理完成后
- **THEN** `blog/README.md`、`blog/移动端适配说明.md`、`blog/blog-files-example.json`、`blog/blog-metadata-example.json` 保留

### Requirement: 旧 URL 重定向
所有旧 `.html` 路径 SHALL 通过 meta refresh 重定向到新 URL。

#### Scenario: 页面重定向
- **WHEN** 访问 `/about.html`
- **THEN** 立即重定向到 `/about/`

#### Scenario: 文章重定向
- **WHEN** 访问 `/blog/20260411-ai-reliance.html`
- **THEN** 立即重定向到 `/articles/20260411-ai-reliance/`

#### Scenario: 规范链接
- **WHEN** 查看重定向页面源码
- **THEN** `<link rel="canonical">` 指向新 URL

### Requirement: CI/CD 更新
GitHub Actions SHALL 执行 `npm run build` 验证构建。

#### Scenario: 构建验证
- **WHEN** 推送代码到仓库
- **THEN** GitHub Actions 运行 `npm ci && npm run build`，构建失败时 workflow 失败

#### Scenario: Python 管线移除
- **WHEN** CI workflow 执行
- **THEN** 不包含任何 Python 脚本调用

### Requirement: 全站最终验证
迁移后的站点 SHALL 与原站功能和视觉一致。

#### Scenario: 所有页面可访问
- **WHEN** 遍历所有新 URL（`/`, `/about/`, `/works/`, `/tools/`, `/articles/`, `/articles/{slug}/`, `/updates/{slug}/`, `/markdown-tool/`, `/styleguide/`, 不存在的路径）
- **THEN** 每个页面返回 200（或 404 页返回 404），无 JS 错误

#### Scenario: 视觉一致性
- **WHEN** 逐页对比新旧版本
- **THEN** 布局、颜色、字体、间距、动画与原站一致（小幅优化除外）
