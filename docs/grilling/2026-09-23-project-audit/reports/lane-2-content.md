# Lane 2 探查报告：内容模型 / 文章渲染管线 / 内容合规

- 仓库：`C:\Users\Calvin-Xia\mr.xia.github.io`（Astro 静态站，Worker + ASSETS）
- 探查时间基准：工作树当前状态（`src/content/blog` 共 **14** 篇 md）
- 只读约束遵守：未修改/新建/删除任何仓库文件（仅写入本报告），未执行 `build`/`publish`，统计脚本以 `node` 从 stdin/`/tmp` 运行且不写盘。
- 证据格式：`相对路径:行号`。

---

## 0. 结论速览

| 维度 | 结论 |
| --- | --- |
| 四 collection schema | 全部集中在单文件 `src/content.config.ts`，`category`/`tags` 仅约束为 `z.string()` / `z.array(z.string())`，**无词表校验** |
| blog 篇数 | 14 篇；`随笔` 8 / `总结` 3 / `日志` 3 |
| 合规违规（按 AGENTS.md） | **1 条**：`20260918-zcode-...md:7` 使用白名单外 tag `科技`；其余 category / tag 数量 / tag≠category / 逗号塞词 / ASCII slug 均**未发现违规** |
| 渲染管线 | 构建期 3 remark + 3 rehype，客户端 6 个增强模块 + Mermaid 懒加载；raw HTML `<img>` 绕过 rehype 尺寸注入 |
| 归档 | 按年分组、日期倒序，**无去重逻辑**（依赖 loader id 唯一） |
| 内容层问题 | 12 项（含 22 条孤立 `imageDimensions`、4 篇文件名日期与 frontmatter 日期不一致、`featured`/`externalUrl` 死字段等） |

---

## 1. `src/content.config.ts`：四个 collection 的 schema

`generateId: fileStem`（`src/content.config.ts:5`）= 去掉 `.md`/`.json` 后的文件茎，因此 **文件名直接决定 URL**（文章 `/articles/<stem>/`）。

### 1.1 共享字段 `commonMetadata`（`src/content.config.ts:7-13`）

| 字段 | 类型 | 可选 | 默认 |
| --- | --- | --- | --- |
| `title` | `string` | 否 | — |
| `date` | `string` 且 `^\d{4}-\d{2}-\d{2}$` | 否 | — |
| `excerpt` | `string` | 否 | — |
| `category` | `string`（**任意字符串**） | 否 | — |
| `tags` | `string[]`（**任意字符串数组**） | 否 | — |

### 1.2 `blog`（`src/content.config.ts:27-42`，loader `[0-9]*.md`）

| 字段 | 类型 | 可选 | 默认 |
| --- | --- | --- | --- |
| `featured` | `boolean` | 是 | — |
| `author` | `string` | 是 | — |
| `readTime` | `string` | 是 | — |
| `status` | `string` | 是 | — |
| `hero` | `string` | 是 | — |
| `imageDimensions` | `{path:string,width:number,height:number}[]` | 是 | — |

### 1.3 `works`（`src/content.config.ts:44-66`，loader `**/*.json`）

| 字段 | 类型 | 可选 | 默认 |
| --- | --- | --- | --- |
| `filePath` | `string` | 否 | — |
| `externalUrl` | `string().url()` | 是 | — |
| `status` | `string` | 是 | — |
| `featured` | `boolean` | 是 | — |
| `order` | `number` | 否 | — |
| `i18nPrefix` | `string` | 否 | — |
| `displayTags` | `{key?:string,text?:string}[]` | 是 | — |
| `actions` | `{key?:string,text?:string,href:string,variant:'primary'\|'outline',external:boolean}[]` | 否 | `variant='outline'`（`:62`）、`external=false`（`:63`） |

### 1.4 `tools`（`src/content.config.ts:68-76`）/ `updates`（`src/content.config.ts:78-87`）

- `tools`：`filePath`、`featured?`、`status?`（无 `order`/`i18nPrefix`/`actions`）。
- `updates`：`filePath`、`featured?`、`status?`、`timeline: updateTimelineVersion[]`（**默认 `[]`**，`:85`）。
- `updateTimelineItem.type` 为封闭枚举：`new|update|fix|optimize|cancel|note|bug|info`（`:16`）；`label?` 可选、`text` 必填。
- `updateTimelineVersion`：`version:string`、`updatedAt:string`、`items[]`（`:21-25`）。

> 注意：`updates.timeline` 的 `updatedAt` 是**自由字符串**（实际值形如 `"2024.10.1 22:45"`，见 `src/content/updates/fingerprint-app-update-log.json:11`），不做日期校验。

---

## 2. `src/content/blog/*.md` 逐篇清单与分布

字数按 `src/lib/word-count.js` 的口径复算（汉字 + 英文词，`Han chars/300 + EN words/200` 取整）。`hero`/`dims`/`imgs` 为 frontmatter 声明与实际正文引用数。

| 文件（=slug） | date | category | tags | 汉字 | 英文词 | 合计 | 读时 | hero | dims | imgs |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| `20251231-year-in-review.md` | 2025-12-31 | 总结 | 武汉大学,高考,旅行,自我 | 2420 | 209 | 2629 | 10m | 有 | 27 | 28 |
| `20260204-school-talk.md` | 2026-02-04 | 随笔 | 武汉大学,高考 | 4750 | 32 | 4782 | 16m | — | 0 | 0 |
| `20260312-school-talk-review.md` | 2026-03-12 | 总结 | 武汉大学,高考,自我 | 1279 | 19 | 1298 | 5m | 有 | 3 | 3 |
| `20260315-two-hour-loop-ride.md` | 2026-03-15 | 随笔 | 旅行,铁路 | 1122 | 2 | 1124 | 4m | 有 | 14 | 14 |
| `20260328-pre-reflection.md` | 2026-03-28 | 总结 | 武汉大学,自我,语言文化 | 0 | 692 | 692 | 4m | — | 0 | 0 |
| `20260411-ai-reliance.md` | 2026-04-11 | 随笔 | 人工智能,自我 | 3701 | 114 | 3815 | 13m | 有 | 15 | 15 |
| `20260503-labors-day.md` | 2026-05-03 | 随笔 | 旅行,铁路,劳动,自我 | 2850 | 59 | 2909 | 10m | 有 | 6 | 6 |
| `20260607-gaokao-chinese-essay.md` | 2026-06-07 | 随笔 | 高考,语言文化 | 1983 | 24 | 2007 | 7m | — | 0 | 0 |
| `20260609-gaokao-chinese-essay.md` | **2026-07-04** | 随笔 | 高考,人工智能,自我 | 1816 | 11 | 1827 | 7m | 有 | 5 | 5 |
| `20260620-cultural-legacy.md` | **2026-07-01** | 随笔 | 故乡,旅行,自我 | 2328 | 2 | 2330 | 8m | 有 | 4 | 4 |
| `20260706-short-term-training-diary-1.md` | **2026-07-14** | 日志 | 测绘,自我 | 3235 | 11 | 3246 | 11m | 有 | 5 | 5 |
| `20260706-short-term-training-diary-2.md` | **2026-07-15** | 日志 | 测绘,自我 | 3633 | 17 | 3650 | 13m | 有 | 5 | 5 |
| `20260913-19th-birthday.md` | 2026-09-13 | 随笔 | 武汉大学,自我 | 1686 | 6 | 1692 | 6m | — | 0 | 0 |
| `20260918-zcode-silent-workspace-snapshot-upload-2.md` | 2026-09-18 | 日志 | **科技** | 4368 | 149 | 4517 | 16m | — | 0 | 0 |

合计正文字数约 **36,518**（汉字 32,171 + 英文词 1,347）。

### 2.1 category 分布

```
随笔: 8   总结: 3   日志: 3        （总计 14）
```

### 2.2 tag 分布

```
自我:10  武汉大学:5  高考:5  旅行:4  铁路:2  语言文化:2  人工智能:2  测绘:2  劳动:1  故乡:1  |  科技:1（白名单外）
```

覆盖最广 `自我`（14 篇中 10 篇）；冷项 `故乡`、`劳动` 各 1 篇 —— 与 `AGENTS.md` 的"覆盖度参考"一致（该节写"13 篇"，实际已 14 篇，文档数字滞后）。

### 2.3 其他 frontmatter 字段实际使用

- `featured: true`：5 篇（`20260204:9`、`20260312:10`、`20260315:9`、`20260328:10`、`20260411:9`）。
- `author: "Mr.Xia"`：3 篇（`20260204:10`、`20260312:11`、`20260315:10`）。
- `readTime`：3 篇（`20260204:11:"25分钟"`、`20260312:12:"7分钟"`、`20260315:11:"7分钟"`）。
- `status: "active"`：2 篇（`20260328:11`、`20260411:10`）。

---

## 3. `works` / `tools` / `updates` 条目清单与结构差异

### 3.1 `works`（15 条 JSON，`src/content/works/*.json`）

全部含 `title,excerpt,date,filePath,tags,category,status,order,i18nPrefix,displayTags,actions`；`externalUrl` 仅 5 条（`bridge-map:8`、`button-designer:8`、`class-map:8`、`message-board:8`、`personal-site:8`）；`featured:true` 仅 1 条（`fingerprint.json`）。

`order` 范围 1..15（1 = `personal-site.json`，15 = `fingerprint.json`）。`filePath` 一律为 `/works/#work-*` 页内锚点；`works.astro:22` 用 `filePath.split('#')[1]` 反推 `id`，因此锚点缺失会静默退化为 collection id。

### 3.2 `tools`（3 条）

| 文件 | filePath | 备注 |
| --- | --- | --- |
| `markdown-to-html.json` | `/markdown-to-html-tool.html` | 旧静态页路径，靠 legacy redirect 跳到 `/markdown-tool/`（`scripts/legacy-redirects.js:19`） |
| `online-timer.json` | `/timetable.html#timer` | 旧路径 + **hash 锚点**，跳转丢失锚点（见 `:18`） |
| `random-selector.json` | `/timetable.html#random-selector` | 同上 |

### 3.3 `updates`（1 条）

`fingerprint-app-update-log.json`：`timeline` 31 个版本段，`items` 每段 1~6 条（3,3,2,2,1,1,1,2,3,1,2,1,2,1,1,2,1,1,1,1,1,2,1,2,6,1,1,3,1,1,1），**合计 52 条 item**。`updatedAt` 为自由字符串（`:13` = `"2024.10.1 22:45"`）。`type` 实际用到 `note/new/bug/update/fix/optimize`。

> 渲染在 `src/pages/updates/[...slug].astro:16-29`：`updateTypeClasses` 处理 `new/update/fix/optimize/cancel/note`，`calloutItemClasses` 处理 `bug/info`。枚举 8 个值全部有落点，无遗漏。

### 3.4 结构差异小结

- 只有 `works` 有 `order` / `i18nPrefix` / `displayTags` / `actions`。
- `works.astro` 的卡片文案（标题/描述/kicker/meta）**全部来自 i18n key**（`src/pages/works.astro:31-40`），JSON 里的 `title/excerpt/category/tags/date` **不参与 /works/ 渲染**，仅通过 `dataEntryToItem`（`src/lib/content.ts:68-90`）进入搜索索引（`src/pages/search-index.json.ts:43-48`）。
- `tools` 三条数据同样不参与 `/works/tools/` 渲染（`ToolsSection.astro` 全硬编码 + i18n），仅进搜索索引。

---

## 4. 一篇 md 从文件到最终页面的完整管线

### 4.1 构建期（Astro markdown + 自研插件）

配置集中在 `astro.config.mjs:55-64`：

```js
55:  markdown: {
56:    shikiConfig: { themes: { light:'github-light', dark:'github-dark' }, defaultColor: false },
63:    remarkPlugins: [remarkBlockquoteBreaks, remarkMarkHighlight, remarkMath],
64:    rehypePlugins: [rehypeImageDimensions, rehypeKatex, rehypeScrollableTables],
```

执行顺序（remark 全部先于 rehype）：

1. **Astro 内建**：YAML frontmatter 解析 → GFM（表格/删除线/任务列表）→ mdast。
2. `remarkBlockquoteBreaks`（`src/lib/remark-blockquote-breaks.js:19-30`）：在 `blockquote > paragraph` 内把文本节点的 `\n` 拆成 `break` 节点，保住引用块内的软换行。
3. `remarkMarkHighlight`（`src/lib/remark-mark-highlight.js:1-6,40-44`）：把 `==高亮==` 转成 `markHighlight` 节点，经 `data.hName:'mark'` 落到 `<mark>`；跳过 `code/inlineCode/html/yaml`（`:2`）。
4. `remarkMath` → mdast math。
5. mdast → hast。
6. `rehypeImageDimensions`（`src/lib/rehype-image-dimensions.js`）：读 `file.data.astro.frontmatter.imageDimensions`，给 `<img>` 注入 `width/height/decoding=async/loading`。
7. `rehypeKatex`：公式渲染为 HTML+KaTeX CSS（`import 'katex/dist/katex.min.css'` 在 `src/pages/articles/[...slug].astro:3`）。
8. `rehypeScrollableTables`（`src/lib/rehype-scrollable-tables.js:2-22`）：每个 `<table>` 外包 `div.article-table-scroll`（`tabIndex:0`、`role="region"`、`ariaLabel:'表格（可横向滚动）'`）。
9. Shiki 双主题高亮（`github-light` / `github-dark`，`defaultColor:false`），产出带 `data-language` 的 `<pre class="astro-code ...">`；构建产物已验证（`dist/articles/20260918-.../index.html` 内有 `data-language="mermaid"`）。
10. 页面装配：`src/pages/articles/[...slug].astro:14-50` 的 `getStaticPaths` 过滤 `status !== 'draft'`，`render(post)`（`:33`）产出 `<Content />`，插入 `.markdown-content`（`:118`）。

> ⚠ **未启用 `rehype-raw`**，所以 md 里的原生 `<img>` 保持 raw 节点：
> - `rehype-image-dimensions.js:1-5` 注释明确说明"Raw HTML `<img>` tags stay untouched"；
> - 这直接导致 `20251231` 的 22 条 `imageDimensions` 成为孤儿（见 §6 / §9）。

### 4.2 客户端

统一入口 `src/layouts/BaseLayout.astro:125-126`，**站点所有页面**都加载：

```js
125: import '../scripts/article-runtime.js';
126: import '../scripts/view-counter.js';
```

`src/scripts/article-runtime.js:5-22`：

1. `initPageTransitions(document, window)` — 标记站内链接、文章列表↔详情方向、`sessionStorage` 滚动恢复。
2. `initArticleEnhancements(document)` — 6 个增强模块（下文 §7）。
3. `void renderArticleMermaid(document)` — Mermaid 懒渲染。
4. 触发点：`DOMContentLoaded`（若仍在 loading）、`astro:page-load`（ClientRouter 站内跳转）、`calvin-theme-change`（仅重跑 Mermaid）。

---

## 5. 图片链路：谁负责哪一段

| 环节 | 责任方（file:line） | 行为 |
| --- | --- | --- |
| hero 选择 | `scripts/publish-post.js:355-365`、`:395-409` | 交互式 `promptForHeroSelection`，选中资产复制为 `src/assets/hero/<md 文件茎>.webp`，写回 `hero` 字段 |
| hero 构建 | `src/pages/articles/[...slug].astro:37-38` | `import.meta.glob('../../assets/hero/*.webp')` 按**文件名**索引（非 slug 推导） |
| hero 渲染 | `[...slug].astro:72-83` | `<img src={heroImage.src} width={heroImage.width} height={heroImage.height} loading="eager" fetchpriority="high" decoding="async">` |
| 列表缩略图 | `src/pages/articles.astro:26-41` | `astro:assets` `getImage({width:480,height:270,fit:'cover',format:'webp'})`，`heroThumbs` 以 hero 文件名为 key；客户端复用见 `src/scripts/articles-index/payload.js:11-19` |
| OG 卡片 | `scripts/generate-og-images.mjs:28-32` | 有 hero 时读入其字节做卡片缩略图 |
| `imageDimensions` 生产 | `scripts/publish-post.js:320-342`、`:386-392` | 对每个上传资产 `probeImageFile`（`scripts/image-dimensions.js`），写入 manifest |
| `imageDimensions` 存量回填 | `scripts/backfill-image-dimensions.js:3,15-21` | 一次性脚本（`node scripts/backfill-image-dimensions.js [--dry-run]`），**同时扫 markdown 与原生 `<img>`**（`MARKDOWN_IMAGE_PATTERN` / `HTML_IMG_SRC_PATTERN`），`mergeDimensions` 去重排序（`:47-59`）；**未接入 package.json** |
| 尺寸注入 | `src/lib/rehype-image-dimensions.js:6-31,71-89` | 仅处理 markdown 语法图片；`src` 解码后须命中 `imageDimensions` 且主机名以 `.calvin-xia.cn` 结尾或为 `/__cdn/(content\|assets)/` |
| 懒加载 | `rehype-image-dimensions.js:87` | 第一个**命中 manifest** 的图 `loading="eager"`，其余 `lazy`；未命中 manifest 的图**不注入任何 loading/width/height** |
| CDN 域名 | `src/lib/cdn-hosts.js:4-7`、`.env.example:16` | `assets.calvin-xia.cn`（静态资产）、`content.calvin-xia.cn`（R2 发布，`R2_PUBLIC_URL`） |
| 本地 dev 代理 | `astro.config.mjs:69-79` + `src/scripts/local-cdn-proxy.js:4-6` | `/__cdn/content`、`/__cdn/assets` → 真 CDN，Referer 固定 `https://workers.calvin-xia.cn/` |
| 灯箱 | `src/lib/article-enhancements/image-lightbox.js:477`、`:75-109` | 只放行同源 + `trustedImageHosts`（`cdn-hosts.js:4-7`）的 `https`；其余源直接不打开 |

### 5.1 实际引用样例（3~5 例）

1. `src/content/blog/20260315-two-hour-loop-ride.md`（markdown 语法，走完尺寸注入链路）
   - 正文：`![崭新的水牌](https://content.calvin-xia.cn/slow-train/train-sign.JPG)`
   - frontmatter：`imageDimensions[0] = {path:"slow-train/27-bridge.JPG", width:3997, height:2998}`（该文件 frontmatter 第 13-15 行）
   - 14 条 manifest ↔ 14 张图，一一对应。
2. `src/content/blog/20260411-ai-reliance.md`：15 条 manifest ↔ 15 张 markdown 图，完全对齐（`ai-reliance/*.png|jpg|jpeg`）。
3. `src/content/blog/20251231-year-in-review.md:100-101`（**raw HTML**，绕过 rehype）
   - `<img src="https://assets.calvin-xia.cn/image_%E4%B8%AD%E7%A7%8B.JPG" alt="中秋月" style="width: 60%;">`
   - manifest 里的 `image_中秋.JPG`（frontmatter 第 87-89 行）**永远不会被注入**。
4. `src/content/blog/20251231-year-in-review.md:209`：`![足迹地图...](https://assets.calvin-xia.cn/%E5%BA%95%E5%9B%BE.svg)` —— markdown 图，但 manifest 无 `底图.svg` → 无宽高（SVG 属可接受例外）。
5. `src/content/works/fingerprint.json:18`：`/storage/指纹验证-myapp...apk`（本地 `public/storage/`）与 `externalUrl`/CDN 无关，走 ASSETS 静态托管。

---

## 6. 增强功能的触发条件与降级行为

### 6.1 Mermaid（`src/scripts/article-mermaid.js`）

- **触发**：选择器 `.markdown-content pre[data-language="mermaid"], .markdown-content pre:has(code.language-mermaid)`（`:36`）。全仓仅 1 处：`src/content/blog/20260918-...md:53`。
- **懒加载**：`await import('mermaid')`（`:48`）——Vite 代码分割，无图表页面不下载 mermaid 包。
- **主题感知**：`data-theme` → `mermaid.initialize({theme: 'dark'|'default', securityLevel:'strict', startOnLoad:false, suppressErrorRendering:true})`（`:50-55`）；`state.theme` 缓存，同主题不重渲（`:39-41`）；`calvin-theme-change` 触发重渲（`article-runtime.js:22`）。
- **全局串行**：`renderQueue = renderQueue.then(...)`（`:46`）避免 mermaid 全局配置竞态。
- **DOM 改造**：`prepareDiagram`（`:5-29`）把 `pre` 移入 `<details open>`（`<summary>Mermaid 源码</summary>`），并**移除 `article-section-reveal`/`is-visible`**（注释：`:25`），避免源码被逐段渐显隐藏。
- **宽图处理**：按 `viewBox.baseVal.width` 设 `svg.style.width = "<n>px"; maxWidth:'none'`（`:62-66`），宁可横向滚动也不缩字。
- **降级**：catch 分支（`:72-76`）→ diagram 隐藏、source 展开、状态文案 `"图表未能渲染，请查看源码。"`，并 `state.theme = null` 允许下次重试。
- **无 JS 时**：仍是普通 `<pre>` 代码块，源码可读。

### 6.2 可滚动表格（`src/lib/rehype-scrollable-tables.js`）

- 纯构建期、纯 CSS（`src/styles/global.css:1874-1900`），**零 JS 依赖**，断网/禁用 JS 仍可横向滚动。
- 幂等：已含 `article-table-scroll` 的节点跳过（`:6`）。
- 现状：仅 `20260918-...md` 含表格（30 行以 `|` 开头），`dist` 产物中已包 5 处 `article-table-scroll`。

### 6.3 目录 / 阅读进度（`src/lib/article-enhancements/reading-progress.js` + `src/components/ArticleToc.astro`）

- **存在条件**：`ArticleToc.astro:5` 的 `<aside data-article-toc hidden>` **只挂在文章详情页**（`[...slug].astro:121`）。
- **渲染阈值**：`MIN_TOC_HEADINGS = 3`（`:4`），`shouldRenderToc`（`:18`）；不足则 `tocRoot.hidden = true`（`:207-213`）。
  - 依据 `buildHeadingIndex` 只认 `h2,h3,h4`（`heading-index.js:3`），本仓 14 篇里 **5 篇不显示目录**：`20260312`(2)、`20260607`(1)、`20260609`(2)、`20260620`(0)、`20260913`(0)。
- **锚点**：`buildHeadingIndex`（`heading-index.js:121-141`）给每个标题生成 id（NFKD 去重音符 + 非字母数字→`-`，`createHeadingId:39-51`），冲突时 `-2/-3` 递增（`claimUniqueId:29-37`）；追加 `<a class="heading-anchor">#</a>`（`:54-67`）。优先复用已有 `id`（`:127-128`）。
- **进度条公式**：`clamp((scrollY - articleTop) / max(1, articleHeight - viewportHeight) * 100, 0, 100)`（`:13-17`），写入 `[data-reading-progress-bar]` 的 `transform: scaleX()` 与 `[data-reading-progress-text]` 文本（`setProgress`）。
- **高亮**：`IntersectionObserver`，`rootMargin:'-20% 0px -65% 0px'`、`threshold:[0,1]`（`:243`）；降级（无 IntersectionObserver）时 `update()` 里的 `findCurrentHeadingId` 仍按 `rect.top <= 150` 计算（`:187-199`），只是精度降低。
- **移动端折叠**：`MOBILE_TOC_BREAKPOINT = 768`（`:3`），≤768 加 `is-collapsed` + FAB 开关（`ArticleToc.astro` 内联脚本）；点击目录项后自动收起并 `history.replaceState`（`:281-291`）。
- **无 JS 时**：`aside` 带 `hidden` 属性，直接不显示。

### 6.4 逐段渐显（`src/lib/article-enhancements/section-reveals.js`）

- **触发集合**：`h2/h3/h4/figure/blockquote/pre/table`（`:1-9`），且**必须是 `.markdown-content` 的直接子元素**（`:33-34`）。
- **IntersectionObserver**：`rootMargin:'0px 0px -80px 0px'`、`threshold:0.08`（`:69`），进入即 `is-visible` 并 `unobserve`。
- **降级 1**：`prefers-reduced-motion: reduce` 或无 IntersectionObserver → `revealImmediately`（`:48-51`）。
- **降级 2（CSS）**：初始 `.article-section-reveal:not(.is-visible){opacity:0; transform:translateY(14px)}`（`global.css:2005-2008`）；媒体查询里再兜底 `opacity:1 !important`（`global.css:2936-2942`）。
- **并发安全**：`MAX_REVEAL_STAGGER_INDEX = 12`（`:11`）限制 `--section-reveal-index` 上限。

### 6.5 其他两个模块

- **图片说明/图注**（`src/lib/article-image-captions.js:61-81`）：`img[alt]` 非空、未被 `figure` 包裹且未 `data-captioned` 时，包成 `figure.markdown-image-figure` + `figcaption`（`wrapImage:38-59`）；若父节点是"只含该图的 `<p>`"则整段替换（`isImageOnlyParagraph:13-18`、调用点 `:48-54`）；inline width 转 `--markdown-image-width`（`applyFigureWidth:21-34`，CSS `global.css:1967-1973`）。
- **选中文本工具条**（`src/lib/article-enhancements/selection-toolbar.js`）：选区落在 `.markdown-content` 内才显示「复制/分享」浮动条。

---

## 7. 归档（`src/lib/archive.js`）

调用点：`src/pages/articles/archive.astro:8-9`。

```js
16: export function createArchiveGroups(entries = []) {
19:     .filter((entry) => entry?.data?.status !== 'draft')
20:     .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry?.data?.date || ''))
21:     .map(toArchiveItem)
22:     .sort(compareContentItems);
```

- **过滤**：丢掉 `status === 'draft'`（`:19`）与日期格式不合法的条目（`:20`）——注意这是**静默丢弃**，不会报错。
- **归一**：`toArchiveItem`（`:3-14`）产出 `{id,type:'article',title,date,monthDay(date.slice(5,10)),href:`/articles/${id}/`,category,tags}`。
- **排序**：`compareContentItems`（`src/lib/shared-content.js:49-62`）三级比较 —— ① `date` 倒序；② `TYPE_PRIORITY`（`:20-25`，article=0，归档里全等）；③ `title.localeCompare(...,'zh-CN')`。日期用 `parseDateValue`（`shared-content.js:28-47`）做真实日历校验，非法返回 `-Infinity`。
- **分组**：按 `date.slice(0,4)` 分年（`:26-28`）。
- **年份排序**：`rightYear.localeCompare(leftYear)`（`:30-31`）→ 降序。
- **去重**：**没有显式去重**。全文件无 `Set`/`Map` 按 title/date 去重逻辑，仅依赖 collection loader 的 id 唯一性。若两篇标题与日期完全相同，归档会出现两条。
- **附带**：`toArchiveItem` 写了 `tags`，但 `archive.astro:27-31` 只渲染 `monthDay / title / category`，`tags` 是**未消费字段**。

---

## 8. 合规核查（AGENTS.md「Blog Taxonomy」+「Blog Slugs」）

核查方式：解析 14 篇 md 的 frontmatter 与文件名，逐条比对白名单，并交叉验证 `npm run check` 的输出。

### 8.1 category 是否恰好 ∈ {随笔, 总结, 日志}

**未发现违规。** 14 篇全部命中：随笔 8 / 总结 3 / 日志 3。

### 8.2 tags ⊆ 白名单，每篇 1~4 个，且不含自己的 category

- 白名单：`武汉大学、高考、旅行、铁路、人工智能、故乡、测绘、自我、劳动、语言文化`。
- **违规 1 条**：

| 位置 | 实际值 | 问题 |
| --- | --- | --- |
| `src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md:7` | `  - "科技"` | `科技` 不在封闭白名单内 |

- 数量：14 篇均为 1~4 个，**未发现违规**。
- tag ≠ category：**未发现违规**（无任何 tag 取值为 `随笔/总结/日志`）。

### 8.3 每个 tag 是否为独立数组项（无逗号塞词）

**未发现违规。** 所有多 tag 文章都是逐行 `- "x"`，例如：

```
src/content/blog/20260503-labors-day.md:6-10
tags:
  - "旅行"
  - "铁路"
  - "劳动"
  - "自我"
```

全仓未出现 `- "思考，随笔，旅行，自我"` 这类历史 bug 形态。

### 8.4 slug 是否 `^[A-Za-z0-9._-]+$` 且形如 `<YYYYMMDD>-<english-semantic-slug>`

- ASCII：14/14 通过 `^[A-Za-z0-9._-]+$`，**未发现违规**。
- 形态：14/14 命中 `^\d{8}-[a-z0-9-]+\.md$`，**未发现违规**。
- **但 4 篇的文件名日期与 frontmatter `date` 不一致**（语义前缀失真）：

| 文件 | 文件名日期 | frontmatter date | 位置 |
| --- | --- | --- | --- |
| `20260609-gaokao-chinese-essay.md` | 20260609 | 2026-07-04 | `:3` |
| `20260620-cultural-legacy.md` | 20260620 | 2026-07-01 | `:3` |
| `20260706-short-term-training-diary-1.md` | 20260706 | 2026-07-14 | `:3` |
| `20260706-short-term-training-diary-2.md` | 20260706 | 2026-07-15 | `:3` |

影响：URL 用文件茎，排序/归档用 frontmatter `date`，两者不一致会让"日期语义"自相矛盾（AGENTS.md 要求 `<YYYYMMDD>-` 前缀）。

### 8.5 工具链现状：合规约束**没有自动化**

`npm run check`（`scripts/check-posts.js`）实测输出：

```
检查完成：14 篇文章，0 个错误，0 个警告。
```

它实际只校验（`check-posts.js` 帮助文案 `:256-257`）：

- `category` 为非空字符串（`:47-49`）—— **不查白名单**；
- `tags` 为非空字符串数组（`:52-56`）—— **不查白名单、不查数量上限、不查与 category 交集**；
- `featured/author/readTime/status/hero/imageDimensions` 的类型（`:59-92`）；
- hero 文件存在（`:135-144`）、`imageDimensions` 条目合法（`:77-92`）、非法 URL（`:159-161`）、内部链接指向存在的文章（`:163-172`）、未转换的 `file/` 链接（`:146-156`）；
- 文件名 ASCII（`:178-184`，error 级）。

结论：**Blog Slugs 的 ASCII 规则有 CI 拦截，Blog Taxonomy 的白名单完全靠人工自检** —— 与 AGENTS.md「本约定目前仅由文档约束，没有自动校验」一致，但也解释了 `科技` 为何能一路合入。CI 侧入口：`.github/workflows/phase-2-content-check.yml`（`npm test` → `npm run check` → `npm run build`）。

---

## 9. 内容层发现的问题（带 file:line）

### P1 合规
1. **白名单外 tag**：`src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md:7` = `"科技"`。`npm run check` 报 0 错误，属未被拦截项。

### P2 资源/尺寸（造成 CLS 或死数据）
2. **22 条 `imageDimensions` 孤儿**：`src/content/blog/20251231-year-in-review.md` 声明 27 条（frontmatter 第 11-92 行），但正文 22 张图是 raw HTML `<img>`（`:99-101,159-162,171-174,185-188,200-203,214-218`），从不经过 `rehypeImageDimensions`。仅 5 条被真正使用。同一问题在 `scripts/backfill-image-dimensions.js:17` 有覆盖（回填脚本扫 HTML `<img>`），但运行时插件不扫 —— **生产/回填口径不一致**。
3. **markdown 图缺尺寸**：`src/content/blog/20251231-year-in-review.md:209` 的 `底图.svg` 无 manifest 条目（SVG 可接受，但会走 `properties.width` 缺失分支，`loading/decoding` 也不注入）。
4. **未命中 manifest 的图完全没有 `loading` 属性**：`src/lib/rehype-image-dimensions.js:78-88`，`entry` 不存在时 `return`，连懒加载都不设。若第一篇图无尺寸，`imageSeen` 仍为 false，后续第一张"有尺寸"的图会被误判为 LCP 反而 eager。
5. **`public/storage/` 与仓库根 `storage/` 重复**：`storage/Beian.png`、`storage/icon.png`、`storage/指纹验证-...apk` 三份文件在 `public/storage/` 均有同名副本；根目录 `storage/` 不在 `public/` 下，**不会被部署**，是纯冗余。
6. **`Beian.webp` 未被页面引用**：`src/components/Footer.astro:38` 用的是 `/storage/Beian.png`；`.webp` 只出现在 `public/sw-tools.js:9` 的预缓存列表。（`icon.webp` 有被用，见 `src/layouts/BaseLayout.astro:66`。）

### P3 内容模型
7. **`featured` 是死字段**：`src/content/blog/*.md` 有 5 篇 `featured: true`，`works/fingerprint.json`、`tools/*`（`markdown-to-html.json`、`online-timer.json`）、`updates/*` 也设了；`src/lib/content.ts:47,81` 把它写进 `ContentItem`，但全仓（`src/`、`src/scripts/`、`dist/_astro/*.js`）**没有任何读取方**。`search-index-builder` 也不含该字段。
8. **`externalUrl` 是死字段**：`src/content.config.ts:49`、`src/lib/content.ts:84-85` 只做搬运，5 条数据设了值，无消费方（页面用的是 `actions[].href`，见 `src/content/works/bridge-map.json`）。
9. **`updates` 的 `tags`/`excerpt` 只服务搜索**：`updates/[...slug].astro:31-50` 只用 `title/excerpt/category/timeline`，`tags` 无消费。
10. **`status: "active"` 无语义**：schema 是 `z.string().optional()`（`src/content.config.ts:34`），代码只判 `!== 'draft'`（`archive.js:19`、`[...slug].astro:16`、`articles.astro:17-19`、`works.astro:7` 等）。`"active"` 与缺省等价，属噪音值（2 篇 blog 写 `active`，另 19 个 works/tools/updates JSON 全部写 `"active"`）。
11. **`readTime` 人工值与自动统计冲突**：自动值为 16/5/4 分钟，frontmatter 写 25/7/7 分钟（`20260204-school-talk.md:11`、`20260312-school-talk-review.md:12`、`20260315-two-hour-loop-ride.md:11`）；展示层直接用人工值覆盖（`[...slug].astro:35`、`src/lib/content.ts:35-36`），列表卡片与详情页因此可能给人两套读时（列表用 `readingStats.readTimeDisplay`，已统一覆盖，但 `wordCountDisplay` 仍是自动值）。
12. **`tools.filePath` 指向旧路径 + hash 丢失**：`src/content/tools/online-timer.json:5` = `/timetable.html#timer`、`src/content/tools/random-selector.json:5` = `/timetable.html#random-selector`；`scripts/legacy-redirects.js:18` 把 `/timetable.html` 跳到 `/works/tools/`，meta-refresh 模板不保留 fragment → 搜索索引点进去落在页首而非对应工具。`markdown-to-html.json:5` 的 `/markdown-to-html-tool.html` 同样绕一层重定向（`:19`）。

### P4 渲染/运行时
13. **内容里的 H1 产出重复 `<h1>` 且不进目录**：`src/content/blog/20251231-year-in-review.md:104,228,292` 共 3 个 `#`，`src/content/blog/20260918-...md:10` 有 1 个；文章页已有 `<h1 class="page-title">`（`[...slug].astro:87`），而 `buildHeadingIndex` 只认 `h2,h3,h4`（`heading-index.js:3`）→ 内容 H1 既造成同页多 H1，也不出现在目录中。
14. **文章增强脚本全站生效，且命中 Markdown 工具页**：`src/layouts/BaseLayout.astro:125` 在所有页面加载；`src/components/MarkdownToolWidget.astro:52` 的预览容器 `<div id="markdown-output" class="markdown-content">` 与文章正文同名，于是图片图注包裹、标题锚点、灯箱、选区工具条、逐段渐显都会在预览区生效。又因 `MarkdownRenderer.showExpanded` 是整体 `innerHTML` 替换（`src/scripts/markdown-renderer.ts` 的 `showExpanded`），动态渲染出的节点既无锚点也未被 observer 观察。
15. **Mermaid 只在极少数页面命中**：全仓唯一公式/图表型 fence 是 `20260918-...md:53`；但 `article-mermaid.js` 的选择器与 `article-runtime.js` 的监听在每个页面都会执行一次 `querySelectorAll`（成本可忽略，属信息记录）。

### P5 文档同步
16. `AGENTS.md` 的 Blog Taxonomy「覆盖度参考」写"13 篇中 10 篇"，实际已是 **14 篇**；`故乡`/`劳动` 仍各 1 篇的结论不变，但数字需更新。
17. `AGENTS.md` 把 `src/scripts/markdown-renderer.js` 记为 `.js`，实际实现是 **`src/scripts/markdown-renderer.ts`**（`src/components/MarkdownToolWidget.astro:325` 导入 `.ts`）。
18. `AGENTS.md` 未提及 `src/lib/article-enhancements/selection-toolbar.js` 与 `src/lib/article-image-captions.js`（两者属文章增强链路，且都有独立测试 `tests/article-selection-toolbar.test.js`、`tests/article-image-captions.test.js`）。

---

## 10. 附：本次探查用到的可复现命令（均为只读）

```bash
# frontmatter / 合规 / 字数统计（不写盘）
node /tmp/lane2-scan.mjs
# works/tools/updates 结构对比
node /tmp/lane2-collections.mjs
# 图片引用 vs imageDimensions 对齐
node /tmp/lane2-images.mjs
# 标题层级与目录阈值
node /tmp/lane2-head.mjs
# 官方内容校验（离线）
npm run check
```
