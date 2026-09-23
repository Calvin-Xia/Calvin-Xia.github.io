# Lane 1 探查报告：站点外壳 / 路由 / 组件 / SEO / 样式

> 只读探查。仓库 cwd = `C:\Users\Calvin-Xia\mr.xia.github.io`，HEAD = `b78e6a2 fix(comments): rerun giscus loader on client-side navigation`。
> 所有结论都带 `相对路径:行号`。构建产物引用来自已存在的 `dist/`（未重新构建）。

---

## 0. 结论速览（先看这 12 条）

1. `astro.config.mjs:40-85`：Astro 6 静态输出（**未设 `output`**，无 adapter）→ 全站预渲染；`site` 来自 `process.env.BASE_URL`，`outDir: ./dist`，`base: '/'`。
2. 路由共 **15 个页面/端点文件**，产出 22 个可索引 URL + 17 个构建期生成的 legacy 跳转页 + 3 个 Worker `/api/*` 路由。
3. SEO 链路**全部构建期**：`src/lib/site-seo.js` 被 `BaseLayout`、文章页、`rss.xml.ts`、`robots.txt.ts`、`sitemap` 集成、`generate-og-images.mjs` 六处消费；运行时无 SEO 逻辑。
4. OG 卡是 `npm run build` 的第二步（`scripts/generate-og-images.mjs`，satori + sharp + resvg），产出 `dist/og/default.png` + 每篇一卡。
5. giscus 两条硬约束都在 `src/components/GiscusComments.astro`：`data-astro-rerun` 在第 16 行（有注释解释），全仓库 **没有** `transition:persist`。
6. `TransitionIndicator.astro` + `#page-transition-indicator` CSS（`global.css:2484-2510`）是**死代码**：没有任何 JS 添加 `.active` / 更新 `aria-busy`。
7. `index.astro` / `about.astro` / `styleguide.astro` 的页面脚本**没有** `astro:page-load` 监听（对比 Header/ToolsSection 等），Astro 的 ClientRouter 会跳过已执行脚本 → 重复客户端导航不再初始化 PageAnimations / ripples / EmailProtection。
8. CSS 断点（900/767/768/480，另加组件内 980/640）与 `DESIGN.md:919-1021` 声明的 1024/700/420 **不一致**；排版也偏离 `DESIGN.md:163-176`（h1 固定 3.75rem / hero 固定 5.25rem，文档写的是 clamp）。
9. 死 CSS：`.spotlight-card`、`.stagger-reveal`、`.reveal.in-view`、`.btn-row`、`.auto-grid`、`.tool-panel` 无任何标记使用；死 token 10 个（`--text-primary`、`--surface-strong`、`--shadow-sm/md`、`--info*` 等）。
10. `/markdown-tool/` 是**孤儿路由**：无任何站内入链，却在 sitemap（priority 0.7）与 `/works/tools/` 内嵌 widget 之间重复。
11. `initArticleEnhancements` 以 `.markdown-content` 为总开关，而 `MarkdownToolWidget`/`NewPostForm` 也用该类 → 工具预览被打上文章增强（标题锚点/灯箱/选区工具条）。
12. `data-history="true"`（大量链接）与 `data-article-transition` **写得进、没人读**（无 JS/CSS 消费方）。

---

## 1. `astro.config.mjs`（85 行，全量读完）

| 项 | 位置 | 事实 |
|----|------|------|
| site | `astro.config.mjs:17-25,40` | `normalizeSiteUrl()` 读 `process.env.BASE_URL`，去尾斜杠，默认 `https://calvin-xia.cn`。注意与 Astro 自身的 `import.meta.env.BASE_URL`（=base路径 `/`）**同名不同义**。 |
| base/outDir | `:40-42` | `base: '/'`、`outDir: './dist'`；未声明 `output` → 默认 `static`。 |
| sitemap 集成 | `:43-54` | `@astrojs/sitemap`，`filter: shouldIncludeSitemapPage`、`serialize: serializeSitemapItem`，`namespaces` 全部关闭（news/xhtml/image/video = false）。 |
| markdown | `:55-65` | shiki 双主题 `github-light`/`github-dark` + `defaultColor:false`（→ 输出 CSS 变量 `--shiki-light/--shiki-dark`）；remark: `remarkBlockquoteBreaks`、`remarkMarkHighlight`、`remarkMath`；rehype: `rehypeImageDimensions`、`rehypeKatex`、`rehypeScrollableTables`。 |
| vite 插件 | `:22-38,67` | 自定义 `resolve-astro-prerender-entrypoint`（`enforce:'pre'`）把 `astro/entrypoints/prerender` 手工解析成绝对路径，注释说明是 Windows 下 Vite/Rollup 解析不到的兜底。 |
| 本地 CDN 代理 | `:68-84` | dev-only：`/__cdn/content → https://content.calvin-xia.cn`、`/__cdn/assets → https://assets.calvin-xia.cn`；`changeOrigin:true` + `headers.Referer = 'https://workers.calvin-xia.cn/'`（`:15`），`rewrite` 去掉前缀。与 `AGENTS.md` 的 referrer 约束一致。 |

构建脚本链（`package.json:12`）：
`astro build` → `node scripts/generate-og-images.mjs` → `node scripts/generate-redirects.mjs`。

---

## 2. 路由清单（`src/pages/**`，共 15 个文件）

| 源文件 | 产出 URL | 说明 |
|--------|----------|------|
| `src/pages/index.astro` | `/` | 首页；`currentPage="home"`，唯一注入 WebSite JSON-LD 的页面 |
| `src/pages/about.astro` | `/about/` | 许可/隐私/联系；`EmailProtection` |
| `src/pages/articles.astro` | `/articles/` | 列表 + 搜索 + 双重筛选（category/tag），内联 JSON payload |
| `src/pages/articles/[...slug].astro` | `/articles/<id>/` ×14 | `getStaticPaths` 用 blog collection（`:14-31`），`generateId: fileStem`（`content.config.ts:5,28`） |
| `src/pages/articles/archive.astro` | `/articles/archive/` | 按年分组时间线（`lib/archive.js:16-34`） |
| `src/pages/works.astro` | `/works/` | 作品卡（order 排序）+ 工具集入口卡 |
| `src/pages/works/tools.astro` | `/works/tools/` | 内嵌 `ToolsSection`（三个 tab widget） |
| `src/pages/markdown-tool.astro` | `/markdown-tool/` | 独立 Markdown 工具页（**孤儿**，见 §9） |
| `src/pages/updates/[...slug].astro` | `/updates/<id>/` ×1 | `fingerprint-app-update-log`；`currentPage="works"` |
| `src/pages/styleguide.astro` | `/styleguide/` | 设计样例页；**无** `currentPage`（header 不置 active） |
| `src/pages/new-post.astro` | `/new-post/` | dev-only 表单（`import.meta.env.DEV` 才挂 `NewPostForm`，`:11-13`） |
| `src/pages/404.astro` | `/404.html` | Cloudflare `not_found_handling: "404-page"`（`wrangler.jsonc:8`） |
| `src/pages/robots.txt.ts` | `/robots.txt` | `buildRobotsTxt(context.site)` |
| `src/pages/rss.xml.ts` | `/rss.xml` | `@astrojs/rss` + `AstroContainer.renderToString` 全文 |
| `src/pages/search-index.json.ts` | `/search-index.json` | 构建期 MiniSearch + jieba 索引，`Cache-Control: public, max-age=3600` |

静态产物另外还有：
- `dist/sitemap-index.xml` + `dist/sitemap-0.xml`（集成生成）——实测 **22 条 URL**，不含 `/styleguide`、`/new-post`、`/404`。
- `dist/og/default.png` + 14 张文章卡。
- 17 条 legacy 跳转（`scripts/legacy-redirects.js:12-35`）：7 条扁平页（`/about.html`、`/Works.html`、`/statement.html`、`/styleguide.html`、`/timetable.html`、`/markdown-to-html-tool.html`、`/UpdateLog/fingerprint-app-update-log.html`）+ 6 条 `/blog/<中文>.html` + 4 条 `/articles/<中文>/`。
- 运行时 Worker 路由（`src/worker.ts:141-148`）：`/api/health`、`/api/trending`，**其余所有 `/api/*` 落到 `/api/views/<slug>`**（`run_worker_first: ["/api/*"]`，`wrangler.jsonc:10`）。

### 导航结构
- Header（`src/components/Header.astro:11-15`）固定 3 项：`/articles/` 文章、`/works/` 作品、`/about/` 关于；logo → `/`。`aria-current="page"` 由 `currentPage` prop 驱动。
- 首页（`index.astro:37-59`）：hero 两个 CTA + 3 条 index-row（文章/作品/关于）；`index.astro:65-86` 搜索面板与「最近更新」都指向 `/articles/#content-search`。
- 跨栏目入口：`/works/` 末尾的工具集卡 → `/works/tools/`（`works.astro:78-89`）；工具页/更新页返回 `/works/`；文章页返回 `/articles/`。
- Footer（`src/components/Footer.astro:9-45`）：RSS 常驻；Sitemap 仅 `import.meta.env.PROD`；Umami 分享页；ICP + 公安备案。
- 顶层导航**没有**「工具」「更新日志」入口；`/updates/*` 只从首页 recent-updates 卡片进（`index.astro:92` 的 `item.filePath`）。

---

## 3. `src/layouts/BaseLayout.astro`（156 行）

- 字体自托管：14 条 `@fontsource/*` CSS import（`:3-16`）。家族在 `global.css:74-76`：`--font-serif` Noto Serif SC、`--font-sans` Noto Sans SC/Inter、`--font-mono` JetBrains Mono。**无 Google Fonts `@import`**。
- SEO：`:49-56` 调 `buildSocialMeta({title,description,path,image,type,publishedTime})`；`:57` 仅 `currentPage==='home'` 时 `buildWebSiteJsonLd()`；`:75-79` 展开 `socialMeta.tags`（`property` → `meta property`，否则 `name`）。
- head 顺序（实测 `dist/index.html`）：charset → 两个 icon → manifest → viewport → **referrer `strict-origin-when-cross-origin`（`:70`）** → preconnect/dns-prefetch cdnjs（`:71-72`）→ description(+`data-i18n-content`) → keywords → author → canonical → og/twitter 12 条 → JSON-LD → RSS alternate → umami `defer`（`:82`）→ title(`data-i18n`) → 三个 `is:inline` 启动脚本 → `<ClientRouter fallback="swap" />`（`:113`）。
- 三个 inline 启动脚本：`:84-90` 按路径给 `<html>` 打 `data-anim-root`（仅 `/`、`/styleguide`）；`:92-100` 主题 boot（固定浅色默认，不读系统主题，与 `DESIGN.md:672-686` 完全一致）；`:102-110` 语言 boot（读 `calvin-xia-lang`）。
- body 装配（`:116-123`）：`SkipLink` → `DynamicBackground` → `Header` → `<main id="main-content" class="site-main" transition:name="site-main" transition:animate="fade">` → `Footer` → `TransitionIndicator`。
- 全局脚本（`:124-152`）：一个 Astro 打包 module，import `article-runtime.js` + `view-counter.js`；并注册 `/sw-tools.js`（scope `/works/tools/`，仅当路径命中，`:142`），同时挂 `astro:page-load` 重试。
- dev-only：`:154` `enableLocalCdnProxy && <script type="module" src={localCdnProxyScriptUrl}>`（`import ... ?url`，`:25`）。

---

## 4. 组件（15 个）职责与依赖图

| 组件 | 行数 | 职责 | 被谁引用 |
|------|------|------|----------|
| `Header.astro` | 173 | 导航/语言切换/主题切换/滚动态；脚本含 theme + i18n 初始化 | BaseLayout |
| `Footer.astro` | 47 | RSS/Sitemap(PROD)/Umami/备案 | BaseLayout |
| `SkipLink.astro` | 5 | 跳至 `#main-content` | BaseLayout |
| `DynamicBackground.astro` | 1 | 单 div `.site-background` | BaseLayout |
| `TransitionIndicator.astro` | 7 | 转场 spinner 容器 | BaseLayout（**消费方缺失，死代码**） |
| `GiscusComments.astro` | 145 | 评论 + 主题同步 + MutationObserver | 文章详情 |
| `ArticleToc.astro` | 107 | TOC 壳 + 移动端折叠 + 进度条容器 | 文章详情 |
| `LicenseBadge.astro` | 64 | CC BY-NC-SA 徽章（唯一带 scoped `<style>` 的小组件） | 文章列表、文章详情 |
| `PageIntro.astro` | 37 | kicker/title/subtitle 三件套 | 9 个页面 |
| `OptimizedIcon.astro` | 27 | `<picture>` + 自动 `.png→.webp` | Footer |
| `ToolsSection.astro` | 146 | tablist（timer/random/markdown）+ ARIA 键盘导航 | `/works/tools/` |
| `TimerWidget.astro` | 147 | 计时器 UI | ToolsSection |
| `RandomSelector.astro` | 74 | 随机抽取 UI | ToolsSection |
| `MarkdownToolWidget.astro` | 341 | Markdown→HTML/公众号；**自带 322 行 scoped CSS** | ToolsSection、`/markdown-tool/` |
| `NewPostForm.astro` | 219 | 本地发帖表单（marked+DOMPurify+hljs 懒加载） | `/new-post/`（仅 DEV） |

依赖图（`import` 实链）：
```
BaseLayout ─┬─ SkipLink / DynamicBackground / Header(i18n,theme) / Footer(OptimizedIcon) / TransitionIndicator
            ├─ scripts: article-runtime → page-transitions + article-enhancements(×5) + article-mermaid
            │            view-counter
            └─ ClientRouter
articles/[...slug] ─┬─ BaseLayout
                    ├─ ArticleToc（markdown 增强脚本填内容）
                    ├─ GiscusComments
                    └─ LicenseBadge
articles.astro ─ BaseLayout + PageIntro + LicenseBadge（+ scripts/articles-index/*）
works/tools.astro ─ BaseLayout + PageIntro + ToolsSection ─┬─ TimerWidget → scripts/timer.ts
                                                            ├─ RandomSelector → scripts/random-selector.ts
                                                            └─ MarkdownToolWidget → scripts/markdown-renderer.ts
```
**孤儿组件：0 个**（15 个全部有 import 方）。但存在「单点孤儿路由」`/markdown-tool/`（见 §9）。

---

## 5. i18n 机制（`src/lib/i18n.ts` + `src/i18n/*.json`）

- 语言集 `['zh-CN','en-US']`（`:9`），存储键 `calvin-xia-lang`（`:4`），默认 zh-CN（`:5`）。
- 服务端：`t(key, vars)` → `translate(getCurrentLang(), …)`；`getCurrentLang()` 在构建期无 DOM，回落默认 zh-CN（`normalizeLang`，`:23-25`）→ **dist 里所有静态 HTML 都是中文**，没有 hreflang（全仓库 `grep -rn hreflang` 为空）。
- 客户端：`initI18n()`（`:169-176`）= `applyTranslations(document)` + `bindLanguageToggle(document)`；`applyTranslations` 遍历 `[data-i18n]` 覆写 `textContent`，并按 `i18nAttributeMap`（`:22-30`：`aria-label/alt/content/placeholder/title/value/data-title`）覆写属性。
- 插值 `{var}` 走 `escapeRegExp`（`lib/escape-regexp.js`）；`data-i18n-vars` 携带变量（如 `updates/[...slug].astro:59`）。
- 覆盖度量：**zh/en 各 435 个叶子键，28 个顶层命名空间，双向零差异**（`nav, header, footer, common, contentTypes, home, articles, works, tools, timer, random, markdownTool, time, viewCounter, about, error, articleDetail, archive, updates, skipLink, comments, license, toc, transition, articleEnhancements, newPost, styleguide, wordCount`）。`tests/i18n.test.js:38-44` 断言键集完全相等。
- 切换语言会派发 `calvin-lang-change`，被 view-counter（`view-counter.js:91-97`）、articles 列表（`articles.astro:531`）、TimeDisplay（`time-display.ts:54`）、EmailProtection（`email-protection.ts:37`）监听。
- **i18n 缺口（实测）**：`src/scripts/markdown-renderer.ts` 全部状态串硬编码中文（`:42-43` 预览占位、`:441/515/533/571/588/689/695/701/708` alert/状态/展开折叠），`src/scripts/article-mermaid.js:13,18,42,74` 也是硬编码（`Mermaid 源码`、`图表加载中…`）。对比：`random-selector.ts` / `timer.ts` 全量走 `t()`，说明这是遗漏而非约定。

---

## 6. SEO / OG / sitemap / RSS / robots 完整链路

单一事实源：`src/lib/site-seo.js`（225 行）+ 类型声明 `src/lib/site-seo.d.ts`。

消费方一览：

| 消费者 | 调用的 API | 时机 |
|--------|-----------|------|
| `BaseLayout.astro:49,57` | `buildSocialMeta`、`buildWebSiteJsonLd` | 构建期（每页） |
| `articles/[...slug].astro:41,44-50` | `buildBlogPostingJsonLd`（canonical/og 用 `new URL('/og/<id>.png', Astro.site)`） | 构建期 |
| `robots.txt.ts:2,5` | `buildRobotsTxt(context.site)` | 构建期（预渲染端点） |
| `rss.xml.ts:5,8,17,27` | `buildRssItems` / `createRssChannelCustomData` / `isPublishedStatus` | 构建期 |
| `astro.config.mjs:10,44-46` | `shouldIncludeSitemapPage` / `serializeSitemapItem` | 构建期（集成） |
| `scripts/generate-og-images.mjs:12,43` | `buildCanonicalUrl` | `npm run build` 第 2 步 |

实现要点（带行号）：
- `buildSocialMeta`（`site-seo.js:104-139`）：canonical = `new URL(path, siteUrl)`；ogImage = `image || /og/default.png`（`:9`）；固定 12 条 og/twitter（og:site_name、og:type、og:title/description/url/image、og:locale=`zh-CN`、twitter:card=summary_large_image + 3），`publishedTime` 存在时追加 `article:published_time`（`:136-138`）。
- sitemap 过滤（`:56-64`）：排除 `/^\/(404|500)(\.html)?$/` 与根 `/new-post`、`/styleguide`（`:11`）；`serializeSitemapItem` 再给 per-URL 提示（`:66-122`）：`/` weekly/1.0、`/articles/` weekly/0.8、文章 monthly/0.7 + **`lastmod` 从 slug 的 `YYYYMMDD` 前缀推断**（`:205-215`）、`/works/` monthly/0.8、工具与 markdown-tool 0.7、updates 0.6、about yearly/0.5。
- robots（`:86-97`）：`Allow: /` + `Disallow: /new-post/`、`/styleguide/` + `Sitemap: <site>/sitemap-index.xml`。
- RSS（`rss.xml.ts:7-28`）：只取非 draft；对每篇 `render()` 后 `AstroContainer.renderToString(Content)` 得到**全文 `content:encoded`**；channel 额外 `<language>zh-CN</language>` + `<lastBuildDate>`（`site-seo.js:34-45`）。实测 `dist/rss.xml` = 195KB / 14 items。
- OG 卡（`scripts/generate-og-images.mjs:18-48,88,97-98`）：每篇有 title 的文章一张（hero 图当缩略图，用 sharp 转 PNG 后嵌入）+ `default.png`；渲染在 `scripts/og-card.js`（satori `:293,347` + `@resvg/resvg-js` + `@fontsource` woff 字体 + qrcode）。CI 断言「卡数 = 有标题文章数 + 1」（`.github/workflows/astro-build-check.yml:59-63`）。
- 页面元数据由 `[data-i18n-content]` 与 `title data-i18n` 在客户端随语言改写（`i18n.ts:139-160`），但**只在浏览器里**，爬虫拿到的是中文默认值。

构建时机总结：sitemap/robots/rss/search-index 由 Astro 预渲染产出；OG 卡与 legacy 跳转是 build 之后两个独立 Node 脚本；没有任何 SEO 相关运行时逻辑。

---

## 7. giscus 两条硬约束：代码位置与原因

约束 1（保留 `data-astro-rerun`）
- 位置：`src/components/GiscusComments.astro:11-16`，注释 + `<script is:inline data-astro-rerun src="https://giscus.app/client.js" ...>`；产物验证 `dist/articles/20260411-ai-reliance/index.html` 里该属性仍在。
- 原因（代码注释 `:11-13` + Astro 运行时源码）：`node_modules/astro/dist/transitions/swap-functions.js:5-20` 的 `detectScriptExecuted()` 用 `src`/`textContent` 做键记录「已执行」，`deselectScripts()` 给已执行脚本打 `astroExec=""`；`node_modules/astro/dist/transitions/router.js:76-97` 的 `runScripts()` 对 `astroExec === ""` 直接 `continue`。giscus 的 `client.js` 每次执行只扫描一次 `.giscus`，因此换文章后 mount 为空，必须靠 `data-astro-rerun` 强制重跑。
- 测试拦截：`tests/giscus-comments.test.js:38-45`（源码）与 `:47-58`（构建产物，每个文章页恰好 1 个 loader 且带 rerun）；CI 在 build 之后运行（`.github/workflows/astro-build-check.yml:32-33`）。

约束 2（不得加 `transition:persist`）
- 位置：全仓库 `grep -rn "transition:persist\|data-astro-transition-persist" src public` → **0 命中**；`tests/giscus-comments.test.js:60-67` 断言两者都不出现。
- 原因（注释 `:63-64`）：giscus 的 iframe `src` 把 `data-mapping="pathname"`（`:20`）解析出的 discussion 键值烘进 URL，持久化容器会把上一篇文章的 iframe 留在新文章页。

补充实现细节：容器类由 `:118-127` 的 MutationObserver 绑 frame；`:132-137` 在 `astro:page-load` 重新 arm loading 态并同步主题；CSS 侧 `global.css:2126-2160`（`min-height: 18rem`、`.is-loading:not(.is-ready) .giscus-placeholder{display:block}`、`.giscus-placeholder{display:none}`），对应 `giscus-comments.test.js:94-110`。

---

## 8. 样式体系 `src/styles/global.css`（3148 行，单一扁平文件）

结构（无分节注释、无索引）：
- `:root`（`:1-90`）：75 个 token——配色（bg/surface×5/border×4/text×4/accent×5/语义×7/code×9/`--*-rgb`×8）、形状（radius×5）、阴影/动效（`--shadow-subtle/raised`、`--focus-ring`、`--duration-fast/base/slow`、`--ease-out/standard`、`--swap-fade-duration`）、字体、宽度（`--site-max-width:1120px`、`--site-wide-width:1180px`、`--article-content-width:920px`、`--article-text-width:820px`、`--article-toc-min/max`、`--page-padding`），末尾还有 5 个旧别名（`--text-primary`、`--text-muted`、`--text-subtle`、`--surface-strong`、`--shadow-sm/md`）。
- `[data-theme="dark"]`（`:91-150`）：同构覆盖 + `color-scheme`。主题由 boot inline 脚本 + `Header.astro:99-124` 的 `calvin-theme-change` 事件驱动。
- 之后按历史顺序平铺：基础元素（`:151-263`）→ 外壳（header/footer/main）→ 卡片/按钮/表单 → 工具 → 搜索/列表 → 文章/TOC/灯箱 → keyframes（`:2512-2611`）→ 断点块。
- 响应式断点（实测）：`@media (min-width:901px)`（`:1064`）、`(max-width:900px)`（`:2624`）、`(max-width:767px)`（`:2654`）、`(max-width:768px)`（`:2798`）、`(max-width:768px) and (prefers-reduced-motion)`（`:2873`）、`(max-width:480px)`（`:2879`、`:3144`）、`(hover:hover) and (pointer:fine)`（`:2612`）、`(prefers-reduced-motion:reduce)`（`:2916`）。
- 组件级 CSS 只有两处：`LicenseBadge.astro:22-63`（scoped，全用 token）与 `MarkdownToolWidget.astro`（322 行 scoped，含自有断点 `:285 @media(max-width:980px)`、`:305 @media(max-width:640px)`）；`markdown-renderer.ts:857-900` 还有第三份「导出用」硬编码 hex 的 CSS。

与 `DESIGN.md` 的冲突（可核对）：

| 项 | `DESIGN.md` | 实现 | 结论 |
|----|-------------|------|------|
| 断点 | `:919-924` 1024 / 700 / 420 | global.css 900 / 767 / 768 / 480；MarkdownToolWidget 980 / 640 | **冲突** |
| Header 移动端高度 | `:957` `min-height:56px` @≤700 | `global.css:2668` `min-height:96px` @≤767（两行网格） | **冲突** |
| Page H1 | `:172` `clamp(2.25rem,5vw,4rem)` | `global.css:499` `.page-title{clamp(3rem,6vw,4.35rem)}`；`:242` `h1{3.75rem}` | **冲突** |
| Hero H1 | `:171` `clamp(3.25rem,8vw,6.25rem)` | `global.css:505` `5.25rem` 固定 | **冲突** |
| Section H2 | `:173` `clamp(1.75rem,3vw,2.75rem)` | `global.css:531` `.section-heading{2rem}`；`:247` `h2{2.15rem}` | **冲突** |
| 类名契约 | `:938-1010` 示例用 `.article-layout`、`.auto-grid`、`.layout-grid`、`.tool-panel`、`.btn-row` | `article-layout`/`layout-grid` 0 引用；`auto-grid`/`tool-panel`/`btn-row` 只有 CSS 无标记 | **文档与实现互相漂移** |
| 主题 boot | `:672-686` 固定浅色默认 | `BaseLayout.astro:92-100` 完全一致 | 一致 |
| 色彩 token | `:17-153` | `:1-150` 值逐项一致 | 一致 |

CSS 反应式/降级策略：`prefers-reduced-motion` 全局把动画/过渡压到 0.01ms 并强制 `opacity:1`（`:2916-2947`）；入场动画的「先隐藏再淡入」只对首页/styleguide 生效（`data-anim-root`，`:2477-2482`），无 JS 时根本不打标记 → 内容照常显示（注释 `:2477-2478` 明说）。

---

## 9. 客户端脚本装配策略

三种加载通道（实测 `dist/index.html`）：
1. **Astro 打包 module**（`<script>` 内 import）：`Header.astro`、`BaseLayout.astro`、`index.astro`×2、每页脚本 → 产物为 `<script type="module" src="/_astro/<Page>.astro_astro_type_script_index_N_lang.<hash>.js">`。受 ClientRouter 去重（同一 src 二次导航不执行）。
2. **`is:inline` 原样注入**：umami（`BaseLayout.astro:82`，`defer`）、3 个启动脚本（`:84-110`）、giscus loader（带 `data-astro-rerun`）、giscus 主题脚本、`TransitionIndicator`/`ArticleToc` 等内的局部脚本。
3. **dev-only module**：`local-cdn-proxy.js?url`（`BaseLayout.astro:154`）。

初始化兜底的**实际约定**（`grep -rn "astro:page-load" src` 共 13 处）：组件/全局脚本一律「立即执行一次 + 监听 `astro:page-load` 再执行」，并用 `dataset.xxxReady === 'true'` 防重复绑定（如 `Header.astro:158-171`、`ToolsSection.astro:76-82`、`RandomSelector.astro:63-73`、`GiscusComments.astro:132`、`article-runtime.js:11-21`、`view-counter.js:79-89`）。

失败降级：
- `safeInit(name, fn)`（`scripts/safe-init.js:4-10`）用 try/catch 包住页面模块，单个模块炸不影响其它（首页/styleguide/about 三处使用）。
- `page-animations.ts` 全程尊重 `prefers-reduced-motion`（`:38-40`、`:59-62`），ripple 用 AbortController 清理（`:57,64,84`）。
- `page-transitions.js` 在不支持 `document.startViewTransition` 且非 reduced-motion 时用 `.site-main.is-swap-fade-in` 兜底（`:125-160`，对应 `global.css:2461-2463`），并用 CSS 变量 `--swap-fade-duration` 动态读时长（`:74-88`）。
- 无 JS：`GiscusComments.astro:139-143` 提供 `<noscript>` 回退；搜索/工具不可用但不影响读文章。

---

## 10. 必须回答的问题（直接答案）

1. **URL 路由形态**：静态目录式（全部带尾斜杠）+ 3 个静态文件端点（`robots.txt`/`rss.xml`/`search-index.json`）+ `404.html` + sitemap 2 文件 + `og/*.png` + 17 条 legacy 跳转 + `/api/{health,trending,views/:slug}`。
2. **导航结构**：Header 三层扁平（文章/作品/关于，无二级菜单）；栏目内入口靠页面内卡片（作品→工具集、工具→返回作品、首页→搜索锚点/最近更新）；`/updates` 与 `/articles/archive` 只能从首页/列表页进入。
3. **SEO/OG/sitemap/RSS/robots 链路**：全部构建期，单源 `src/lib/site-seo.js`，无运行时逻辑；OG 卡与跳转页在 `astro build` 之后由脚本补齐（§6）。
4. **giscus 两约束**：位置与原因见 §7，测试在 `tests/giscus-comments.test.js`，CI 在 `astro-build-check.yml:32-33`。
5. **依赖图/孤儿组件**：见 §4；组件零孤儿，唯一「路由孤儿」是 `/markdown-tool/`。
6. **CSS token/响应式**：75 token + 10 个未使用/别名残留；断点 900/767/768/480（+980/640），与 `DESIGN.md` 的 1024/700/420 冲突（§8 表格）。
7. **脚本加载策略**：见 §9；核心风险是 `index/about/styleguide` 三个页面脚本缺 `astro:page-load`。
8. **可疑点/技术债**：见下节。

---

## 11. 可疑点 / 技术债 / 死代码（全部带 file:line）

**A. 功能风险**
1. `src/pages/index.astro:175-196`：`initHomePage` 只挂 `DOMContentLoaded`，而同页另一段脚本（`:171-172`）挂了 `astro:page-load`。同理 `src/pages/about.astro:70-74`（EmailProtection）、`src/pages/styleguide.astro:122-126`。结合 §7 引用的 Astro `runScripts()` 去重逻辑：**首次**客户端导航进入这些页面脚本会执行，但**再次**进入（home→articles→home 之类）不会 → 入场动画、按钮 ripple、`/about/` 的 `[data-email-placeholder]` 邮箱链接、styleguide 的时钟会失效/为空（TimeDisplay 的 interval 侥幸在全局存活会自愈）。修法：补 `document.addEventListener('astro:page-load', initX)`。
2. `src/lib/article-enhancements/article-enhancements.js:21` 与 `src/scripts/article-mermaid.js:36` 以 `.markdown-content` 为唯一开关；但 `MarkdownToolWidget.astro:52`（`#markdown-output`）与 `NewPostForm.astro:60`（`#post-preview`）同样用该类，且 `article-runtime` 由 `BaseLayout.astro:125` **全站加载** → 工具预览与发帖预览会被加上标题锚点、灯箱、选区工具条、段落渐显（`article-mermaid` 也会尝试渲染工具里的 mermaid 代码块）。建议加 `.article-detail` 作用域判定。
3. `src/components/TransitionIndicator.astro:5-7` + `global.css:2484-2510`：`.active` 从未被添加、`aria-busy` 从未更新 → 转场指示器永远 `display:none`，纯死代码（`grep -rn "page-transition-indicator" src --include=*.ts --include=*.js` 仅命中组件自身）。
4. `src/styles/global.css:2654-2796`（≤767）与 `:2798-2871`（≤768）**同时命中**，对 `.article-toc-shell` 给出互相矛盾的定位：767 块写 `order:-1; position:static; max-height:none`，768 块写 `position:fixed`。结果是 `order:-1` 残留但元素已脱离文档流 → 767 块里三条 `.article-toc*` 规则实际无效。两个断点只差 1px，应合并。
5. `src/scripts/random-selector.ts:144-157`：`loadMammoth()` 先拉 `https://cdnjs.cloudflare.com/.../mammoth.browser.min.js`（`:21`），但 `public/_headers:2` 的 CSP `script-src` **不含 cdnjs** → 生产环境首次尝试必失败并打 warning，再回落本地 `/libs/mammoth/mammoth.browser.min.js`。`BaseLayout.astro:71-72` 的 cdnjs preconnect/dns-prefetch 因此基本白费。要么把 cdnjs 加进 CSP，要么去掉 CDN 分支。
6. `dist` 双站 canonical：`.github/workflows/deploy.yml:36-38` 给镜像构建传 `BASE_URL=https://calvin-xia.github.io`，而 `astro.config.mjs:40` 用它当 `site` → GitHub Pages 镜像的 canonical/og:url/sitemap **自我指向 github.io**，与主域 `calvin-xia.cn` 形成两份互相 canonical 的副本。需确认这是有意为之。

**B. 死代码 / 未使用**
7. `src/pages/works.astro:10-12`：`actionHref()` 三元两个分支都返回 `action.href` —— 无意义函数。
8. `data-history="true"` 被大量写在链接上（仅 `index.astro`+`articles.astro` 就有 8 处），但 `grep -rn "data-history" src --include=*.js --include=*.ts` 与 `global.css` 均无消费方；同排的 `data-title` 反而被 i18n 消费（`i18n.ts:29`）。
9. `src/scripts/page-transitions.js:107` 写入的 `data-article-transition` 无任何 CSS/JS 读取方（`getArticleTransitionDirection` 走的是 CSS `html[data-astro-transition='forward'|'back']`，`global.css:2445-2457`）→ 只写不读。
10. 无标记配合的死 CSS：`.spotlight-card`（`global.css:2617,2944`）、`.stagger-reveal.in-view > *`（`:2473,2934`）、`.reveal.in-view`（`:2472,2933`）、`.btn-row`（`:543,2890`）、`.auto-grid`（`:2413`）、`.tool-panel`（`:694`）。
11. `global.css` 重复定义块 45 组（同一选择器出现 ≥2 次），典型：`.home-repo-link`（`:982` 与 `:1028`）、`.time-input-wrapper`（`:1129` 与 `:1134`）、`.hero-home .page-title`（`:503` + 3 处断点）、`#page-transition-indicator .spinner`（`:1304` 与 `:2504`）。
12. `global.css:2952` 存在格式化事故：`}` 与 `.article-cover img {` 粘在同一行（`}.article-cover img {`），是唯一一处（`:2934-2990` 其余规则换行正常），像是一次补丁合并留下的痕迹。
13. 未使用 token（`var()` 全仓库零引用）：`--warning`/`--warning-soft`/`--warning-rgb`（仅 MarkdownToolWidget 用）、`--info`、`--info-soft`、`--text-primary`、`--text-subtle`、`--surface-strong`、`--shadow-sm`、`--shadow-md`（定义在 `global.css:83-90`），且这批别名在 `DESIGN.md` 里也不存在。
14. `src/components/GiscusComments.astro` 之外没有任何 `transition:persist`（这是优点，但意味着 `<main transition:name>` 的 view-transition 是唯一跨页动效来源）。

**C. 一致性与可维护性**
15. 样式表无分节注释/索引（3148 行扁平文件），`MarkdownToolWidget.astro` 却内嵌 322 行 scoped CSS，`markdown-renderer.ts:857-900` 再复制一份含硬编码 hex 的导出 CSS（违反 `DESIGN.md:151-155`「组件 CSS 不硬编码 hex」）。
16. 断点体系分散在三处且与设计文档三套数字（900/767/768/480 + 980/640 vs 1024/700/420），无集中常量；JS 侧又另有一套（`ArticleToc.astro:31` 与 `reading-progress.js:3` 都是 768，恰好一致，但 `initArticleEnhancements` 的 `MOBILE_TOC_BREAKPOINT` 与 CSS 768 是双份事实源）。
17. `i18n` 服务端只出中文、无 hreflang：英文页面对爬虫不存在；同时 `data-i18n-content` 的 `<meta description>` 客户端改写对 SEO 无效。
18. `tests/` 对上述多数债务**无覆盖**：`visual-reform.test.js:13-34` 只断言 token 值存在、`i18n.test.js` 只断言键集相等，没有任何测试覆盖断点、`astro:page-load` 完整性、死 CSS 或 CSP↔CDN 一致性。
