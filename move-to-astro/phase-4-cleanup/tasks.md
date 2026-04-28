# Tasks

- [ ] Task 4.1: 删除旧页面文件
  - [ ] SubTask 4.1.1: 删除根目录 HTML 文件：`index.html`, `about.html`, `Works.html`, `timetable.html`, `statement.html`, `404.html`, `styleguide.html`, `markdown-to-html-tool.html`
  - [ ] SubTask 4.1.2: 删除 `blog/` 目录中的旧 HTML 文件（6 篇 `*.html`）
  - [ ] SubTask 4.1.3: 删除 `blog/convert.py`
  - [ ] SubTask 4.1.4: 删除 `blog/blog-files.json` 和 `blog/blog-metadata.json`
  - [ ] SubTask 4.1.5: 保留 `blog/` 目录中的说明文件（`README.md`、`移动端适配说明.md`）和 `blog-files-example.json`、`blog-metadata-example.json`（作为参考）

- [ ] Task 4.2: 删除旧资源目录
  - [ ] SubTask 4.2.1: 删除 `css/` 目录（`style.css` 已迁移为 `src/styles/global.css`）
  - [ ] SubTask 4.2.2: 删除 `js/` 目录（`main.js`, `navigation.js`, `content-hub.js`, `cdn-fallback.js` 已拆分迁移）
  - [ ] SubTask 4.2.3: 删除 `content/` 目录（JSON 元数据已迁移为内容集合）
  - [ ] SubTask 4.2.4: 删除 `scripts/` 目录（`content_pipeline.py` 已由 Astro 内容集合替代）
  - [ ] SubTask 4.2.5: 删除 `UpdateLog/` 目录（内容已迁移到 `src/content/updates/` 和 `src/pages/updates/[...slug].astro`）
  - [ ] SubTask 4.2.6: 清理 `libs/` 目录：删除 `marked/`, `highlight.js/`, `katex/`, `dompurify/`子目录（已改为 npm），保留 `mammoth/` 子目录

- [ ] Task 4.3: 创建旧 URL 重定向文件
  - [ ] SubTask 4.3.1: 在 `public/` 下创建 `about.html`，内容为 `<meta http-equiv="refresh" content="0;url=/about/">`
  - [ ] SubTask 4.3.2: 创建 `public/Works.html` → `/works/`
  - [ ] SubTask 4.3.3: 创建 `public/timetable.html` → `/tools/`
  - [ ] SubTask 4.3.4: 创建 `public/statement.html` → `/articles/`
  - [ ] SubTask 4.3.5: 创建 `public/markdown-to-html-tool.html` → `/markdown-tool/`
  - [ ] SubTask 4.3.6: 创建 `public/styleguide.html` → `/styleguide/`
  - [ ] SubTask 4.3.7: 在 `public/blog/` 下为每篇旧文章创建重定向 HTML（6 个文件）
    - `public/blog/20251231-2025年度总结.html` → `/articles/20251231-2025年度总结/`
    - `public/blog/20260204-返校宣讲稿.html` → `/articles/20260204-返校宣讲稿/`
    - `public/blog/20260312-返校宣讲回顾.html` → `/articles/20260312-返校宣讲回顾/`
    - `public/blog/20260315-两小时，环线，慢行.html` → `/articles/20260315-两小时，环线，慢行/`
    - `public/blog/20260328-pre-reflection.html` → `/articles/20260328-pre-reflection/`
    - `public/blog/20260411-ai-reliance.html` → `/articles/20260411-ai-reliance/`
  - [ ] SubTask 4.3.8: 创建 `public/UpdateLog/fingerprint-app-update-log.html` → `/updates/fingerprint-app-update-log/`
  - [ ] SubTask 4.3.9: 每个重定向文件包含规范 `<link rel="canonical">` 指向新 URL

- [ ] Task 4.4: 更新 CI/CD
  - [ ] SubTask 4.4.1: 修改 `.github/workflows/content-check.yml`
  - [ ] SubTask 4.4.2: 移除 `python scripts/content_pipeline.py check` 步骤
  - [ ] SubTask 4.4.3: 添加 `npm ci` 和 `npm run build` 步骤
  - [ ] SubTask 4.4.4: 构建失败时 workflow 标记为 failed

- [ ] Task 4.5: 更新文档
  - [ ] SubTask 4.5.1: 更新 `README.md`：反映 Astro 工作流（`npm run dev` / `npm run build`）
  - [ ] SubTask 4.5.2: 更新 `QUICKSTART.md`（如存在）或删除（内容已过时）
  - [ ] SubTask 4.5.3: 更新 `site-maintenance-guide.md`（如存在）或删除
  - [ ] SubTask 4.5.4: 更新 `AGENTS.md` 文件（如 `project_rules.md` 需要同步）

- [ ] Task 4.6: 最终验证
  - [ ] SubTask 4.6.1: 执行 `npm run build`，确认零错误零警告
  - [ ] SubTask 4.6.2: 检查 `dist/` 目录文件结构完整
  - [ ] SubTask 4.6.3: 使用 `npm run preview` 本地遍历所有页面
  - [ ] SubTask 4.6.4: 逐页视觉对比（首页、关于、作品、工具、文章列表、文章详情、404、样式指南、Markdown工具）
  - [ ] SubTask 4.6.5: 验证所有内部链接指向正确的新 URL
  - [ ] SubTask 4.6.6: 检查浏览器控制台无 JS 错误
  - [ ] SubTask 4.6.7: Google Lighthouse 可访问性审计 ≥ 当前分数

# Task Dependencies
- [Task 4.1 ~ 4.3] 可与 [Task 4.6] 并行，但必须先完成 Phase 0-3
- [Task 4.4] depends on [Task 4.1, Task 4.2]
- [Task 4.5] depends on [Task 4.1, Task 4.2]
- [Task 4.6] depends on [Task 4.1 ~ 4.5]
