# Repository Guidelines

## Project Structure & Module Organization
This repository is a static website currently migrating from root-level HTML/CSS/vanilla JS to Astro. Keep legacy files and Astro files coexisting until the cleanup phase.
- Root pages: `index.html`, `about.html`, `Works.html`, `timetable.html`, `statement.html`, `404.html`.
- Styles: `css/style.css`.
- Scripts: `js/main.js`, `js/navigation.js`.
- Astro config and source: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/`.
- Astro content collections: `src/content.config.ts`, `src/content/blog/`, `src/content/works/`, `src/content/tools/`, `src/content/updates/`.
- Astro static assets: `public/` mirrors deployable static assets such as `storage/`, `.well-known/`, and selected local fallback libraries.
- Legacy blog content and metadata: `blog/` (including `blog-files.json` and `blog-metadata.json`) remain until cleanup.
- Publishing and local authoring scripts: `scripts/publish-post.js`, `scripts/post-utils.js`, `tools/api-server.js`.
- Other assets: `storage/`, `UpdateLog/`, `.well-known/`.

When adding new files, keep them in the existing folder conventions and use relative links.

## Build, Test, and Development Commands
Legacy pages can still be previewed without a build step; Astro pages require npm scripts.
- `npm install`: Install Astro and npm-managed libraries.
- `npm run dev`: Start the Astro development server, usually at `http://localhost:4321`.
- `npm run build`: Build the Astro static output into `dist/`.
- `npm run preview`: Preview the Astro production build locally.
- `npm test`: Run Node test suites for content migration, publishing, and local API behavior.
- `npm run test:coverage`: Run the same tests with Node's experimental coverage report.
- `npm run api`: Start the local new-post API server on `127.0.0.1:4322`.
- `npm run publish -- --dry-run <obsidian-post-dir>`: Preview an Obsidian→R2 publish plan without writing files or uploading.
- `npm run publish <obsidian-post-dir>`: Publish an Obsidian post copy into Astro content and upload assets to R2.
- `python -m http.server 8000`: Start a local static server for legacy HTML pages.
- `npx http-server`: Alternative local server for legacy static preview.

## Coding Style & Naming Conventions
- Languages: HTML5, CSS3, vanilla JavaScript (ES6+).
- Astro migration files use Astro components and TypeScript modules.
- Indentation: 4 spaces across HTML, CSS, and JS.
- Naming: prefer `kebab-case` for asset files; keep existing page naming patterns (for example `Works.html`).
- Reuse CSS variables in `:root` before introducing one-off colors/spacings.
- Keep JS organized by feature modules, matching `js/main.js` style.

## Testing Guidelines
Before submitting changes:
- Run `npm test` for code, content, publishing, or local API changes.
- Run `npm run test:coverage` when modifying file operation features or review-driven test coverage.
- Run `npm run build` for Astro changes.
- Check layout and behavior on desktop and mobile widths.
- Validate navigation and interactive components (for example timer/tool interactions).
- Confirm browser console has no new errors.
- For Astro blog updates, ensure `src/content/blog/*.md` frontmatter is valid.
- For legacy blog updates, ensure both `blog/blog-files.json` and `blog/blog-metadata.json` remain consistent.

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
- Update affected spec files, task lists, and checklists to reflect the new state (mark completed items, remove stale entries, add follow-up work).
- If a plan document exists (under `.trae/documents/`), update its status and progress summary.
- Review `AGENTS.md` and `README.md` and update them if the project structure, build commands, or conventions have changed.
- For Astro blog or content changes, ensure `src/content/` entries match their collection schema and related phase docs are updated.
- For legacy blog or content changes, ensure `blog/blog-files.json`, `blog/blog-metadata.json`, and `content/content-manifest.json` remain consistent.

## Security & Configuration Tips
- Do not commit secrets or private credentials.
- Modify `.well-known/` files only when domain/certificate verification requires it.
