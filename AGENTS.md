# Repository Guidelines

## Project Structure & Module Organization
This repository is a static website fully migrated to Astro from root-level HTML/CSS/vanilla JS.
- Astro config and source: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/`.
- Astro content collections: `src/content.config.ts`, `src/content/blog/`, `src/content/works/`, `src/content/tools/`, `src/content/updates/`.
- Astro styles: `src/styles/global.css`.
- Astro client scripts: `src/scripts/` (article runtime, view counter, timer, random-selector, markdown-renderer, page-animations, CDN proxy, etc.).
- Workers runtime: `src/worker.ts` and `src/lib/umami-view-counter.js` proxy article view counts through Umami; configure the real key as the `UMAMI_API_KEY` Worker secret.
- Worker config: `wrangler.jsonc` (Worker entry, ASSETS binding), `.dev.vars.example` (local Worker secret template).
- Astro static assets: `public/` mirrors deployable static assets such as `storage/`, `.well-known/`, `libs/mammoth/`, and old-URL redirect files.
- Astro tool routes: `src/pages/works/tools.astro` (作品体系下的工具集), `src/pages/markdown-tool.astro` (Markdown 工具独立页), and `src/pages/articles/archive.astro` (文章归档).
- RSS and SEO: `src/lib/site-seo.js` (shared SEO helpers), `src/pages/rss.xml.ts` (RSS 2.0 feed), `src/pages/robots.txt.ts`, `astro.config.mjs` (`@astrojs/sitemap` integration).
- Comments: `src/components/GiscusComments.astro` (giscus + GitHub Discussions).
- Article content: `src/lib/word-count.js` (字数 & 阅读时间), `src/lib/archive.js` (归档分组), `src/lib/remark-mark-highlight.js` (Astro 构建时 `==text==` → `<mark>` 插件), `src/lib/article-enhancements/` (图片灯箱、标题锚点、目录、阅读进度、逐段渐显).
- Blog reference files: `blog/` (README.md, 移动端适配说明.md, example JSON files).
- Publishing and local authoring scripts: `scripts/publish-post.js`, `scripts/post-utils.js`, `tools/api-server.js`.
- Other assets: `storage/`, `.well-known/`.
- CI/CD workflows: `.github/workflows/deploy.yml`, `content-check.yml`, `astro-build-check.yml`, `phase-2-content-check.yml`.

When adding new files, keep them in the existing folder conventions and use relative links.

## Build, Test, and Development Commands
- `npm install`: Install Astro and npm-managed libraries.
- `npm run dev`: Start the Astro development server, usually at `http://localhost:4321`.
- `npm run build`: Build the Astro static output into `dist/`.
- `npm run preview`: Preview the Astro production build locally.
- `npm test`: Run Node test suites for content migration, publishing, and local API behavior.
- `npm run test:coverage`: Run the same tests with Node's experimental coverage report.
- `npm run api`: Start the local new-post API server on `127.0.0.1:4322`.
- `npm run publish -- --dry-run <obsidian-post-dir>`: Preview an Obsidian→R2 publish plan without writing files or uploading.
- `npm run publish <obsidian-post-dir>`: Publish an Obsidian post copy into Astro content and upload assets to R2.
- `npx wrangler secret put UMAMI_API_KEY`: Configure the production Worker secret for article view counts.
- `npx wrangler dev`: Start local Wrangler dev server to test the Worker API routes (uses `.dev.vars` for secrets).

## Coding Style & Naming Conventions
- Languages: Astro components, TypeScript modules, CSS3, vanilla JavaScript (ES6+).
- Indentation: 4 spaces across all source files.
- Naming: prefer `kebab-case` for asset files; keep existing page naming patterns.
- Reuse CSS variables in `:root` before introducing one-off colors/spacings.
- Keep JS organized by feature modules in `src/scripts/`.

## Testing Guidelines
Before submitting changes:
- Run `npm test` for code, content, publishing, or local API changes.
- Run `npm run test:coverage` when modifying file operation features or review-driven test coverage.
- Run `npm run build` for Astro changes.
- Check layout and behavior on desktop and mobile widths.
- Validate navigation and interactive components (for example timer/tool interactions).
- Confirm browser console has no new errors.
- For Astro blog updates, ensure `src/content/blog/*.md` frontmatter is valid.

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
- If a plan document exists (under `.trae/documents/`), update its status and progress summary.
- Review `AGENTS.md` and `README.md` and update them if the project structure, build commands, or conventions have changed.
- For Astro blog or content changes, ensure `src/content/` entries match their collection schema and related phase docs are updated.

## Security & Configuration Tips
- Do not commit secrets or private credentials.
- Keep real Worker secrets out of `.env.example`, `.dev.vars.example`, `wrangler.jsonc`, client scripts, and docs. Use `.dev.vars` for local `wrangler dev`; it is gitignored.
- Modify `.well-known/` files only when domain/certificate verification requires it.
- Keep the site-wide referrer meta policy at `strict-origin-when-cross-origin`; do not change it to `same-origin` because CDN requests need an origin Referer.
- For local Astro dev CDN proxy routes (`/__cdn/content` and `/__cdn/assets`), use `https://workers.calvin-xia.cn/` as the proxy `Referer` so CDN assets remain accessible without leaking localhost.
