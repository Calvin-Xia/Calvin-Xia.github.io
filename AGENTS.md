# Repository Guidelines

## Project Structure & Module Organization
This repository is a static website with page files at the root and shared assets in dedicated folders.
- Root pages: `index.html`, `about.html`, `Works.html`, `timetable.html`, `statement.html`, `404.html`.
- Styles: `css/style.css`.
- Scripts: `js/main.js`, `js/navigation.js`.
- Blog content and metadata: `blog/` (including `blog-files.json` and `blog-metadata.json`).
- Other assets: `storage/`, `UpdateLog/`, `.well-known/`.

When adding new files, keep them in the existing folder conventions and use relative links.

## Build, Test, and Development Commands
No build step is required; this is plain HTML/CSS/JS.
- `python -m http.server 8000`: Start a local static server.
- `npx http-server`: Alternative local server for Node users.
- Open `http://localhost:8000` and verify pages manually.

## Coding Style & Naming Conventions
- Languages: HTML5, CSS3, vanilla JavaScript (ES6+).
- Indentation: 4 spaces across HTML, CSS, and JS.
- Naming: prefer `kebab-case` for asset files; keep existing page naming patterns (for example `Works.html`).
- Reuse CSS variables in `:root` before introducing one-off colors/spacings.
- Keep JS organized by feature modules, matching `js/main.js` style.

## Testing Guidelines
There is no automated test framework configured in this repository.
Before submitting changes:
- Check layout and behavior on desktop and mobile widths.
- Validate navigation and interactive components (for example timer/tool interactions).
- Confirm browser console has no new errors.
- For blog updates, ensure both `blog/blog-files.json` and `blog/blog-metadata.json` are updated consistently.

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
- For blog or content changes, ensure `blog/blog-files.json` and `blog/blog-metadata.json` remain consistent with the actual content files.

## Security & Configuration Tips
- Do not commit secrets or private credentials.
- Modify `.well-known/` files only when domain/certificate verification requires it.
