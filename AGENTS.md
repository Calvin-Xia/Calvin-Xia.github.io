# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-31
**Branch:** main

## OVERVIEW

Astro v6 static personal site (blog, works, tools, updates). Cloudflare Worker proxies article view counts via Umami. Deployed to GitHub Pages.

## STRUCTURE

```
Calvin-Xia.github.io/
├── src/
│   ├── components/       # Shared Astro components (13 files)
│   ├── content/          # blog/ works/ tools/ updates/ collections
│   ├── content.config.ts # Collection schemas (Zod)
│   ├── layouts/          # BaseLayout.astro (single layout for all pages)
│   ├── lib/              # Utilities, SEO, remark plugins, article enhancements
│   ├── pages/            # Astro routes + RSS + robots.txt
│   ├── scripts/          # Client-side JS/TS (article runtime, view counter)
│   ├── styles/           # global.css (design tokens + components)
│   └── worker.ts         # Cloudflare Worker entry (view counter API proxy)
├── scripts/              # Publish pipeline (Obsidian → R2)
├── tests/                # Node built-in test runner (18 test files)
├── tools/                # Local API server (new-post)
├── public/               # Static assets, CDN content, legacy redirects
├── .github/workflows/    # CI: deploy, content-check, astro-build-check
├── astro.config.mjs      # Astro config (site, markdown, Vite proxy)
├── wrangler.jsonc         # Cloudflare Worker config
├── DESIGN.md             # Visual/interaction spec (1028 lines)
└── AGENTS.md             # This file
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add/edit blog post | `src/content/blog/[0-9]*.md` | YYYYMMDD-slug.md format |
| Add/edit works/tools/updates | `src/content/{works,tools,updates}/*.json` | JSON collections |
| Modify page layout | `src/layouts/BaseLayout.astro` | Single layout for all pages |
| Add shared component | `src/components/*.astro` | PascalCase naming |
| Edit page routes | `src/pages/*.astro` | File-based routing |
| Client-side scripts | `src/scripts/` | article-runtime.js is main entry |
| Article enhancements | `src/lib/article-enhancements/` | Lightbox, TOC, progress, reveals |
| SEO/helpers | `src/lib/site-seo.js` | Sitemap, meta helpers |
| Remark plugins | `src/lib/remark-*.js` | Markdown build-time transforms |
| Content schema | `src/content.config.ts` | Zod validation |
| Global styles | `src/styles/global.css` | CSS variables, design tokens |
| Publish pipeline | `scripts/publish-post.js` | Obsidian → Astro + R2 |
| Tests | `tests/*.test.js` | Node built-in runner |
| CI workflows | `.github/workflows/` | 4 workflows |
| Worker entry | `src/worker.ts` | Umami view counter proxy |
| Design spec | `DESIGN.md` | Visual/interaction rules (1028 lines) |

## CONVENTIONS

**Language mix**: `src/lib/` and `src/scripts/` are ~60% JavaScript, ~40% TypeScript. New code should prefer `.ts`.

**Indentation**: 4 spaces everywhere.

**Naming**: `kebab-case` for files. PascalCase for `.astro` components.

**CSS**: Reuse existing CSS variables in `:root` before adding new ones. No hardcoded hex in component CSS.

**Content collections**: Blog uses `[0-9]*.md` glob. Works/tools/updates use `**/*.json`. Date format: `YYYY-MM-DD` string.

**Client scripts**: Loaded in `BaseLayout.astro`. Initialize on `DOMContentLoaded` AND `astro:page-load` (View Transitions support).

**Theme**: Boot before first render (inline `<script>` in `<head>`). Default light. Validate both themes.

**Fonts**: Noto Serif SC (headings), Noto Sans SC + Inter (body), JetBrains Mono (code). NEVER: Orbitron, Caveat, Playfair Display.

**Dependencies**: No GSAP, ScrollTrigger, Lenis, Three.js, custom cursor. CSS + vanilla JS + IntersectionObserver only.

**Accessibility**: Never hide focus rings. Touch targets ≥44px. Respect `prefers-reduced-motion`.

## ANTI-PATTERNS (THIS PROJECT)

**Forbidden:**
- Warm orange/pink/teal glassmorphism
- Full-bleed marketing hero sections
- Card-inside-card layouts
- Merge Markdown tool preview styles with article body styles
- Explanatory frontend copy that describes how the design works
- Store secrets in `/new-post`

**Missing but acceptable (no action needed):**
- No ESLint/Prettier config — style enforced via repo docs + strict TS
- No `src/env.d.ts` — tsconfig extends `astro/tsconfigs/strict`
- Single layout for all pages — intentional for this project size
- Node `--test` instead of Vitest — works fine, no migration needed

## COMMANDS

```bash
npm install              # Install dependencies
npm run dev              # Dev server at http://localhost:4321
npm run build            # Build to dist/
npm run preview          # Preview production build
npm test                 # Run tests (node --test tests/*.test.js)
npm run test:coverage    # Tests with coverage
npm run api              # Local new-post API at 127.0.0.1:4322
npm run publish -- <dir> # Publish Obsidian post to Astro + R2
npm run publish -- --dry-run <dir>  # Preview publish plan
npx wrangler dev         # Local Worker dev (uses .dev.vars)
npx wrangler secret put UMAMI_API_KEY  # Set Worker secret
```

## NOTES

**Dual deploy**: Static site → GitHub Pages (auto on push to main). Worker → Cloudflare (manual `npx wrangler deploy`).

**CDN proxy (dev)**: `/__cdn/content` and `/__cdn/assets` proxy to `content.calvin-xia.cn` and `assets.calvin-xia.cn`. Use `https://workers.calvin-xia.cn/` as Referer.

**Secrets**: `.env` and `.dev.vars` are gitignored. Use `.dev.vars.example` as template. Never commit real credentials.

**Legacy files**: `public/` contains pre-migration HTML files (about.html, Works.html, etc.). These bypass Astro — prefer Astro pages.

**Migration artifacts**: `move-to-astro/`, `blog/`, `UpdateLog/` at root are archives. No runtime purpose.

**Large files**: `articles.astro` (577 lines), `markdown-renderer.ts` (825 lines). Handle with care.

**Test patterns**: Source contract tests (read source, assert regex) are unique to this project. No shared test utilities — each file defines its own helpers.

**CI note**: `phase-2-content-check.yml` is the only workflow that runs tests. `content-check.yml` is redundant with `astro-build-check.yml`.

**Worker note**: Worker is not in CI. Deploys require manual `npx wrangler deploy`. If you update `src/worker.ts`, remember to deploy.

## UI & CONTENT

- Keep UI copy concise: short labels, tooltips, actionable text. No filler.
- Every visible string should serve a clear purpose.

## CI/CD REQUIREMENTS

When modifying file operation features (content pipelines, build scripts, data generators), add a corresponding CI workflow under `.github/workflows/`:
- Naming: `*-check.yml` or `*-ci.yml`
- Include: automated validation, success criteria, edge case tests
- Trigger: push/PR for affected branches

## COMMIT STYLE

Short, task-focused subjects (English or Chinese). Imperative mood. One logical change per commit.

## DOCUMENTATION

- Prefer smaller, focused documents over monolithic files (>200 lines → split)
- Use descriptive filenames reflecting scope (e.g. `phase-0-environment/spec.md`)
- After milestones: update affected specs, review AGENTS.md and README.md
