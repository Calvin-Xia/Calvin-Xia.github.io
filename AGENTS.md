# Repository Guidelines

## Project Structure & Module Organization
This repository is a static website fully migrated to Astro from root-level HTML/CSS/vanilla JS.
- Astro config and source: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/`.
- Astro content collections: `src/content.config.ts`, `src/content/blog/`, `src/content/works/`, `src/content/tools/`, `src/content/updates/`.
- Astro styles: `src/styles/global.css`.
- Blog table scroll containers: `src/lib/rehype-scrollable-tables.js`; Mermaid fences: `src/scripts/article-mermaid.js` (self-hosted lazy import, theme-aware, source fallback).
- Astro client scripts: `src/scripts/` (article runtime, view counter, timer, random-selector, markdown-renderer, page-animations, CDN proxy, articles-index client modules, safe-init, etc.).
- Workers runtime: `src/worker.ts` and `src/lib/umami-view-counter.js` proxy article view counts through the self-hosted Umami API (`UMAMI_HOST`/`UMAMI_WEBSITE_ID` are public vars in `wrangler.jsonc`; `UMAMI_USERNAME`/`UMAMI_PASSWORD` are Worker secrets); the detailed `/api/health` response uses the `HEALTH_CHECK_TOKEN` Worker secret. `src/lib/umami-trending.js` powers `/api/trending` (home popularity card).
- Worker config: `wrangler.jsonc` (Worker entry, ASSETS binding), `.dev.vars.example` (local Worker secret template).
- Astro static assets: `public/` mirrors deployable static assets such as `storage/`, `.well-known/`, `libs/mammoth/`. Legacy redirect pages are **not** hand-written here; they are generated into `dist/` at build time from `scripts/legacy-redirects.js` (map + themed template) by `scripts/generate-redirects.mjs`. Never add a redirect HTML file under `public/`.
- Astro tool routes: `src/pages/works/tools.astro` (作品体系下的工具集), `src/pages/markdown-tool.astro` (Markdown 工具独立页), and `src/pages/articles/archive.astro` (文章归档).
- RSS and SEO: `src/lib/site-seo.js` (shared SEO helpers incl. `buildSocialMeta`), `src/pages/rss.xml.ts` (RSS 2.0 feed with full-text `content:encoded`), `src/pages/robots.txt.ts`, `astro.config.mjs` (`@astrojs/sitemap` integration); OG share cards generated at build time by `scripts/generate-og-images.mjs` + `scripts/og-card.js` into `dist/og/`.
- Comments: `src/components/GiscusComments.astro` (giscus + GitHub Discussions). 该组件只出现在文章详情页，有两条必须保留的约束：
    - giscus 加载器脚本带 `data-astro-rerun`。Astro ClientRouter 会记录并跳过已执行过的脚本，而 giscus 的 `client.js` 每次执行只扫描一次 `.giscus`；去掉该属性后，站内客户端跳转到第二篇文章会留下一个空容器，评论区要硬刷新才恢复。`tests/giscus-comments.test.js` 以构建产物断言拦截该回退（在 `astro-build-check.yml` 里构建之后运行）。
    - 不要给评论区加 `transition:persist`。giscus 的 iframe `src` 把当前路径烘焙进了 discussion 键值，保留旧容器会让新文章显示上一篇的评论。
- Article content: `src/lib/word-count.js` (字数 & 阅读时间), `src/lib/archive.js` (归档分组), `src/lib/article-enhancements/` (图片灯箱、标题锚点、目录、阅读进度、逐段渐显).
- Publishing and local authoring scripts: `scripts/publish-post.js`, `scripts/post-utils.js`, `tools/api-server.js`; authoring CLI: `scripts/check-posts.js`, `scripts/post-stats.js`, `scripts/new-post-cli.js`, `scripts/list-posts.js`.
- Fonts are self-hosted via `@fontsource/*` packages (imports in `src/layouts/BaseLayout.astro`); do not reintroduce Google Fonts `@import` or CSP origins.
- Other assets: `storage/`, `.well-known/`.
- CI/CD workflows: `.github/workflows/deploy.yml`, `astro-build-check.yml`, `phase-2-content-check.yml`, `metadata-editor-check.yml`, `cli-commands-check.yml`, `legacy-redirects-check.yml`.

When adding new files, keep them in the existing folder conventions and use relative links.

## Build, Test, and Development Commands
- `npm install`: Install Astro and npm-managed libraries.
- `npm run dev`: Start the Astro development server, usually at `http://localhost:4321`.
- `npm run build`: Build the Astro static output into `dist/`, then generate OG share cards and legacy redirect pages.
- `npm run preview`: Preview the Astro production build locally.
- `npm run redirects`: Regenerate the legacy redirect pages on their own (they are otherwise only produced by `npm run build`; `npm run dev` does not generate them).
- `npm test`: Run Node test suites for content migration, publishing, and local API behavior.
- `npm run test:coverage`: Run the same tests with Node's experimental coverage report.
- `npm run lint` / `npm run lint:fix`: Run ESLint checks or auto-fix.
- `npm run check`: Validate frontmatter, dates, tags, slug filenames, links and R2 asset consistency for all posts.
- `npm run stats`: Print word count and reading time for all posts.
- `npm run new-post`: Create a draft post interactively offline (shared validation with the publish pipeline).
- `npm run list-posts`: Overview of all blog posts.
- `npm run api`: Start the local new-post API server on `127.0.0.1:4322`.
- `npm run publish -- --dry-run <obsidian-post-dir>`: Preview an Obsidian→R2 publish plan without writing files or uploading.
- `npm run publish <obsidian-post-dir>`: Publish an Obsidian post copy into Astro content and upload assets to R2; requires `--force` to overwrite an existing post, probes image dimensions into `imageDimensions`, and offers hero image selection (`--version` prints the tool version).
- `npx wrangler secret put UMAMI_USERNAME` / `UMAMI_PASSWORD`: Configure the production Worker secrets for the self-hosted Umami API login used by article view counts.
- `npx wrangler secret put HEALTH_CHECK_TOKEN`: Configure the production Worker secret for the detailed `/api/health` response.
- `npx wrangler dev`: Start local Wrangler dev server to test the Worker API routes (uses `.dev.vars` for secrets).
- `npx wrangler deploy`: Build and deploy the production site `calvin-xia.cn` (Cloudflare Workers + ASSETS from `dist/`; run `npm run build` first). The GitHub Pages deployment from `deploy.yml` is an automatic mirror.

## Coding Style & Naming Conventions
- Languages: Astro components, TypeScript modules, CSS3, vanilla JavaScript (ES6+).
- Indentation: 4 spaces across all source files.
- Naming: prefer `kebab-case` for asset files; keep existing page naming patterns.
- Reuse CSS variables in `:root` before introducing one-off colors/spacings.
- Keep JS organized by feature modules in `src/scripts/`.

## Blog Taxonomy
`src/content/blog/*.md` frontmatter carries two independent dimensions. Keep them strictly separated:
- `category` — 栏目。每篇恰好一个，只能取 `随笔` / `总结` / `日志`。驱动文章列表的第一个筛选组与卡片角标。
- `tags` — 主题。跨栏目，每篇 1-4 个，只能取以下封闭白名单：`武汉大学`、`高考`、`旅行`、`铁路`、`人工智能`、`故乡`、`测绘`、`自我`、`劳动`、`语言文化`。

Rules:
- 白名单是封闭词表：新增词必须是一次显式决定，并同步更新本节列表；不要为单篇文章临时造词。
- `tags` 不得出现与该篇 `category` 相同的值（历史问题：`学业总结`、`生活总结`、`随笔`、`日志` 曾同时作为 category 和 tag 存在）。
- 每个 tag 必须写成独立的数组项。禁止用逗号把多个词塞进一个字符串（历史 bug：`- "思考，随笔，旅行，自我"`）。
- 覆盖度参考：`自我` 覆盖面最广（13 篇中 10 篇），`故乡`、`劳动` 目前各只落在 1 篇。它们是已知的偏冷项，写新文章时优先复用，而不是另造新词。
- 本约定目前仅由文档约束，没有自动校验，改动 frontmatter 时请自检。

## Blog Slugs
文章文件名决定 URL（`generateId: fileStem`），因此必须满足两条硬性要求：
- **只允许 ASCII**：文件名必须匹配 `^[A-Za-z0-9._-]+$`。中文文件名会让 URL 出现百分号转义。`npm run check` 会以 error 拦截。
- **英文语义名**：`<YYYYMMDD>-<english-semantic-slug>`，例如 `20260411-ai-reliance`、`20260706-short-term-training-diary-1`、`20260315-two-hour-loop-ride`。不要用拼音首字母——发布管线里的 `slugifyTitle()` 会产出 `fxxj-pjcz` 这类不可读结果，手写文件名时请覆盖它。

改名或删除已发布文章时，必须在 `scripts/legacy-redirects.js` 里补上旧 URL 的跳转项（同时覆盖 `/blog/<旧名>.html` 与 `/articles/<旧名>/` 两种历史形态），否则旧书签、RSS 条目和分享链接会 404。跳转页由 `npm run build` 生成，本地可用 `npm run redirects` 单独产出。

## Testing Guidelines
Before submitting changes:
- Run `npm test` for code, content, publishing, or local API changes.
- Run `npm run test:coverage` when modifying file operation features or review-driven test coverage.
- Run `npm run build` for Astro changes.
- Check layout and behavior on desktop and mobile widths.
- Validate navigation and interactive components (for example timer/tool interactions).
- Confirm browser console has no new errors.
- For Astro blog updates, ensure `src/content/blog/*.md` frontmatter is valid and that `category`/`tags` follow the Blog Taxonomy section above.

## CI/CD Requirements
When implementing or modifying file operation features (such as content pipelines, build scripts, data generators, or any logic that reads/writes project files), a corresponding CI/CD configuration and workflow must be provided alongside the implementation. These CI/CD components should:
- Include automated validation steps that exercise the file operation features (for example running the pipeline script, verifying output files exist, and checking JSON validity).
- Define clear success criteria in the workflow (exit code checks, file existence assertions, content format validation).
- Contain appropriate test cases that cover normal operation, edge cases (empty input, missing files), and error handling paths.
- Be placed under `.github/workflows/` and follow the naming convention `*-check.yml` or `*-ci.yml`.
- Run on relevant events (push, pull request) for the branches affected by the file operation changes.

## Commit & Pull Request Guidelines
Recent history shows short, task-focused commit subjects (English or Chinese). Follow that style:
- Use concise, imperative commit messages.
- Keep one logical change per commit.
- In PRs, include: summary of changes, affected files/pages, manual test notes, and screenshots for UI changes.
- Link related issues when applicable.

## UI & Content Guidelines
- Keep UI copy concise: prefer short labels, tooltips, and actionable text over lengthy descriptions. Avoid filler phrases and redundant explanatory paragraphs.
- Every visible string should serve a clear purpose — guide the user, explain a necessary constraint, or provide a call to action.

## Documentation Structure
- Prefer smaller, focused documents over monolithic files. A single large document (spec, plan, or README) may be split into topic-specific pieces when it exceeds roughly 200 lines or covers multiple unrelated concerns.
- Use descriptive filenames that reflect the document's scope (for example `phase-0-environment/spec.md` rather than `spec-phase0.md`).

## Documentation Synchronization
After completing a phased milestone or a significant feature:
- Update affected spec files to reflect the new state (mark completed items, remove stale entries, add follow-up work).
- Review `AGENTS.md` and `README.md` and update them if the project structure, build commands, or conventions have changed.
- For Astro blog or content changes, ensure `src/content/` entries match their collection schema and related phase docs are updated.

## Security & Configuration Tips
- Do not commit secrets or private credentials.
- Keep real Worker secrets out of `.env.example`, `.dev.vars.example`, `wrangler.jsonc`, client scripts, and docs. Use `.dev.vars` for local `wrangler dev`; it is gitignored.
- Modify `.well-known/` files only when domain/certificate verification requires it.
- Keep the site-wide referrer meta policy at `strict-origin-when-cross-origin`; do not change it to `same-origin` because CDN requests need an origin Referer.
- For local Astro dev CDN proxy routes (`/__cdn/content` and `/__cdn/assets`), use `https://workers.calvin-xia.cn/` as the proxy `Referer` so CDN assets remain accessible without leaking localhost.
