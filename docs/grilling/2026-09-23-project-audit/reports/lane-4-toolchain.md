# Lane 4 探查报告：工具链 / 发布流水线 / 测试 / CI / 文档与历史

> 只读探查。除本文件外未修改、新建或删除任何仓库文件；未执行 `npm run build/publish/redirects/check/stats`、未联网、未 `git add/commit`。
> 所有结论都带 `相对路径:行号` 证据。仓库 cwd：`C:\Users\Calvin-Xia\mr.xia.github.io`。

## 0. 规模基线（本报告写作时实测）

| 项 | 值 | 证据 |
|---|---|---|
| Node 要求 | `>=22.12.0` | `package.json:8` |
| npm scripts | 17 条（11~27 行） | `package.json:11-27` |
| `scripts/` 文件 | 19 个，共 3638 行 | `wc -l scripts/*` |
| `tools/` | 1 个（`api-server.js`，269 行） | `wc -l tools/*` |
| 测试文件 | 55 个，8235 行，约 414 个 `test()/it()` 用例、85 个 `describe` | `ls tests/*.test.js \| wc -l`；`grep -c '^\s*\(test\|it\)('` |
| GitHub workflows | 6 个 | `.github/workflows/` 列出 |
| git 历史 | 237 个 commit | `git log --oneline \| wc -l` |
| blog 文章 | 14 篇 | `ls src/content/blog/*.md \| wc -l` |

---

## 1. `package.json`：scripts 与依赖

### 1.1 全部 scripts

`package.json:11-27`：

| script | 行 | 实现 | 是否写盘/联网 |
|---|---|---|---|
| `dev` | 11 | `astro dev`（`ASTRO_TELEMETRY_DISABLED=1`） | 写 `.astro/` 缓存，不写内容 |
| `build` | 12 | `astro build && generate-og-images.mjs && generate-redirects.mjs` | **写 `dist/`** |
| `og` | 13 | `node scripts/generate-og-images.mjs` | **写 `dist/og/`** |
| `redirects` | 14 | `node scripts/generate-redirects.mjs` | **写 `dist/`**（默认目录） |
| `preview` | 15 | `astro preview` | 无 |
| `astro` | 16 | `astro` 透传 | 视子命令 |
| `api` | 17 | `node tools/api-server.js` | **监听 127.0.0.1:4322**，POST 时写 `src/content/blog/` |
| `check` | 18 | `node scripts/check-posts.js` | **纯只读**（`--online` 才联网） |
| `edit-metadata` | 19 | `node scripts/edit-metadata.js` | **写目标 md**（原子替换） |
| `list-posts` | 20 | `node scripts/list-posts.js` | 纯只读 |
| `new-post` | 21 | `node scripts/new-post-cli.js` | **写 `src/content/blog/*.md`** |
| `publish` | 22 | `node scripts/publish-post.js` | **写 md + 写 hero + R2 上传** |
| `stats` | 23 | `node scripts/post-stats.js` | 纯只读 |
| `test` | 24 | `node --test tests/*.test.js` | 只写 `os.tmpdir()` |
| `test:coverage` | 25 | 同上 + `--experimental-test-coverage` | 同 |
| `lint` / `lint:fix` | 26-27 | `eslint src/ tests/` | 纯只读（`--fix` 则改文件） |

注意：**没有任何 script 覆盖 `scripts/backfill-image-dimensions.js`**（`scripts/backfill-image-dimensions.js:1-3` 只给出 `node scripts/backfill-image-dimensions.js` 用法），也没有 `astro check`/`tsc` 脚本。

### 1.2 依赖分类

`dependencies`（`package.json:29-43`，13 个）——运行时/构建期都要：

- 站点框架与内容：`astro`、`@astrojs/rss`、`@astrojs/sitemap`
- Markdown/渲染管线：`marked`、`katex`、`remark-math`、`rehype-katex`、`highlight.js`、`mermaid`、`dompurify`
- 搜索：`minisearch`、`jieba-wasm`
- 部署 CLI：`wrangler`（放在 dependencies 而非 devDependencies，见第 12 节）

`devDependencies`（`package.json:44+`，20 个）——构建脚本/测试/字体：

- 发布流水线：`@aws-sdk/client-s3`（R2 S3 API）、`sharp`（hero 压缩）、`gray-matter`（frontmatter）、`zod`（元数据 schema）、`dotenv`、`prompts`、`pinyin-pro`（slug 拼音）
- OG 卡：`satori`、`@resvg/resvg-js`、`qrcode`
- 字体：`@fontsource/inter`、`@fontsource/jetbrains-mono`、`@fontsource/noto-sans-sc`、`@fontsource/noto-serif-sc`
- 工具链：`eslint` + `@eslint/js` + `typescript-eslint`、`typescript`、`cross-env`

**没有专门的测试框架依赖**：`npm test` 用 Node 内置 `node:test`（`package.json:24`），55 个测试文件全部 `import { describe, test } from 'node:test'`（例外：`tests/scrollable-tables.test.js:2` 只 import `test`）。

---

## 2. `scripts/` 逐文件职责与关键实现

### 2.1 发布链路核心

**`scripts/publish-post.js`（515 行）** —— Obsidian → 仓库 markdown + R2：

- 环境校验 `validatePublishEnvs`（`:34-46`）：dry-run 只需 `OKP_VAULT` + `R2_PUBLIC_URL`；真发布追加 `R2_ENDPOINT`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET`。
- `uploadAssets`（`:93-146`）：串行 `PutObjectCommand`，单资产 3 次指数退避重试（`uploadAssetWithRetry` `:63-91`），全部失败后聚合为 `AggregateError`。
- `executePublishPlan`（`:163-195`）是**顺序契约的落点**：
  - `:167-170` dry-run 直接 return（不写、不传）；
  - `:172-179` 目标文件存在且无 `--force` → 抛错；有 `--force` 才覆盖；
  - `:181-186` **先上传、后写 md**（注释明写 "a failed upload must never leave markdown behind with dead R2 links"）。
- `parsePublishArgs`（`:197-208`）：仅识别 `--dry-run/--force/--version/--help`，未知 flag 收集后由 `main` 抛错（`:418-420`）。
- `promptForPostMetadata`（`:247-277`）：交互填 title/date/excerpt/category/tags，日期循环校验 `YYYY-MM-DD`，tags 空 → `未分类`。
- `promptForFileSelection`（`:279-315`）：多 md 用 `prompts` multiselect + 顺序确认。
- `collectImageDimensions`（`:317-345`）：只对 `isSupportedImage` 的本地资产探尺寸，失败仅 warn 不中断。
- `promptForHeroSelection`（`:347-366`）：`select` 列表含「（不设头图）」。
- `processHeroImage`（`:368-380`）：`sharp().rotate().resize({width:1600, withoutEnlargement:true}).webp({quality:82})`。
- `attachHeroAndDimensions`（`:382-410`）：写 `plan.metadata.imageDimensions`；选中头图则落到 `src/assets/hero/<md 名>.webp` 并写 `plan.metadata.hero`。
- `main`（`:412-503`）：单 md 与多 md 双路径；多 md 共享同一份 assets，**只上传一次**（`:471-474`），随后每个 plan 用 `uploadAssets: async () => {}` 空实现写 md。

**`scripts/post-utils.js`（200 行）** —— 校验 + plan 构建 + frontmatter 重写：

- `validatePostPayload`（`:37-68`）：title 非空、date 必须 `YYYY-MM-DD`，normalize tags。
- `createPostFile`（`:70-84`）：`entrySlug = ${YYYYMMDD}-${slugifyTitle(title)}`，`writeFile(..., { flag: 'wx' })` —— **已存在即拒绝**（`EEXIST`）。
- `buildPublishPlan`（`:117-170`）：读 vault 目录，单 md → `<dirName>.md`（`:154`），多 md → `<dirName>-1.md`、`-2.md`（`:165`，按文件名 zh-CN 排序 `:139`）；资产 key 前缀 = `deriveAssetSlug(dirName)`。
- `readTransformedMarkdown`（`:172-200`）：源 frontmatter 与用户输入合并（用户优先），body 走 `transformMarkdownAssetLinks`。

**`scripts/slug.js`（59 行）**：

- `slugifyTitle`（`:17-47`）用 `pinyin-pro` 的 `pattern:'first'`（取拼音首字母）+ `nonZh:'consecutive'`，所以 「成长」→`cz`、「两小时，环线，慢行」→ 拼音首字母串。
- `deriveAssetSlug`（`:55-59`）：去掉目录名开头的 `^\d{8}-?` 再 slugify。

**`scripts/markdown-utils.js`（78 行）**：

- `buildMarkdownDocument`（`:16-60`）：手写 YAML（不用 yaml 库），字段顺序 title/date/excerpt/category/tags，可选 hero、imageDimensions、featured、author、readTime、status。
- `transformMarkdownAssetLinks`（`:70-78`）：正则 `(!?\[[^\]]*]\()\s*(?:\.\/|\.)?file\/([^)]+)\)` → `${R2_PUBLIC_URL}/${assetSlug}/${encodeUrlPath(path)}`。
- `encodeUrlPath`（`:62-68`）：按 `/` 分段 `encodeURIComponent`。

**`scripts/content-types.js`（23 行）**：扩展名 → MIME 映射 + `application/octet-stream` 兜底（`:21-23`）。

**`scripts/blog-posts.js`（32 行）**：`listPostFiles`（`:5-20`，仅 `*.md`，zh-CN 排序）+ `readPostFile`（`:22-32`，gray-matter 解析）。被 check/stats/list/og/backfill/CI 共用。

**`scripts/readable-stats.js`（37 行）**：`stripReadableText`（`:7-27`）剥离 frontmatter/代码围栏/HTML/图片/链接语法；`computeReadingStats`（`:29-37`）中文 300 字/分 + 英文 200 词/分，`Math.ceil`。文件头注释（`:1-2`）说明这是 `src/lib/word-count.js` 的 CLI 镜像（后者 import `i18n.ts`，Node 直接跑不了）。

### 2.2 校验 / 统计 / 建稿 CLI

- **`scripts/check-posts.js`（320 行）**：见第 5 节。
- **`scripts/post-stats.js`（129 行）**：`countImages`（`:12-14`）、`buildStats`（`:16-54`）、`formatStatsTable`（`:56-64`）；支持 `--json`/`--dir`（`:80-99`）。
- **`scripts/list-posts.js`（121 行）**：`filterPosts`（`:9-22`，category/tag 大小写不敏感）、`collectPosts`（`:24-41`）、`--json/--category/--tag/--dir`。
- **`scripts/new-post-cli.js`（152 行）**：`todayLocalDate`（`:12-15`，本地时区修正）、`parseNewPostArgs`（`:17-40`，值缺失报错）、`runNewPost`（`:46-58`，把 `EEXIST` 翻译成友好中文）、`promptForNewPostMetadata`（`:66-88`）。`printUsage`（`:110-118`）自述 "entrySlug 为 YYYYMMDD-标题拼音缩写，同名拒绝写入"（`scripts/new-post-cli.js:115`）。
- **`scripts/edit-metadata.js`（422 行）**：Zod schema（`:8-18`）→ `normalizePostMetadata`（`:67-...`，空 tags→`未分类`，可选字段空串删除）→ `validatePostMetadata`（`:105`）→ `writePostMetadataAtomic`（`:185-230`，**临时文件 + rename**，先 `cleanupStaleTempFiles` 自愈崩溃残留，`:203`）。`--skip-validation`、`--help`（`:335-347`）。

### 2.3 图片尺寸

- **`scripts/image-dimensions.js`（149 行）**：零依赖头部解析 PNG / JPEG(SOF markers `:4-6`) / WebP(VP8/VP8L/VP8X) / GIF（`getImageDimensions:108-128`）；`isSupportedImage`（`:130-133`）白名单 `png/apng/jpg/jpeg/webp/gif`；`probeImageFile`（`:135-148`）只读前 256KB。
- **`scripts/backfill-image-dimensions.js`（180 行）**：一次性回填。`collectRemoteImageUrls`（`:18-37`）只收 `*.calvin-xia.cn` 图片；`probeRemoteImage`（`:75-86`）**必须带 `Referer: https://workers.calvin-xia.cn/`**（否则 CDN 403，见 `:75-76` 注释）；`backfillFile`（`:83-146`）用正则判断已有 `imageDimensions` 则 skip（`:85-88`），`--dry-run` 只打印（`:138-140`）。

### 2.4 legacy 跳转

- **`scripts/legacy-redirects.js`（380 行）**：单一事实源。
  - 映射表 `legacyRedirects`（`:11-34`）：**17 条** —— 7 条 pre-Astro 扁平页、6 条 `/blog/*.html`、4 条中文 slug 改名（`/articles/20251231-2025年度总结/` 等）。
  - `validateRedirects`（`:37-72`）：from/to 必须以 `/` 开头、to 必须以 `/` 结尾、不能自指、from 不重复、**to 不能再是 from（禁止二次跳转）**。
  - `destinationPathFor`（`:74-80`）：`/x/` → `x/index.html`；`/x.html` → `x.html`。
  - `renderRedirectPage`（`:304-344`）：内联设计 token（`:93-...` `pageStyles()`）、主题 boot 脚本（`calvin-xia-theme`，`:282-296`）、四重跳转信号（meta refresh + canonical + `location.replace` + 无 JS 兜底 `<a>`）。
  - `findPageIssues`（`:358-378`）：**把生成结果读回磁盘后逐条校验这四重信号**，供生成器自检。
- **`scripts/generate-redirects.mjs`（103 行）**：`writeRedirectPages`（`:33-69`）先 `validateRedirects`，再逐条写文件（`:42-46`），最后**读回每个文件**跑 `findPageIssues`（`:48-63`），失败抛错让 build 失败。`--out` 可换目录（`:23-31`，CI 用 `.redirect-check`）。

### 2.5 OG 分享卡

- **`scripts/og-card.js`（353 行）**：1200×630（`:13-14`）；字体取 `@fontsource/noto-serif-sc` 的 **`.woff`（非 .woff2）**（`:18-42`，satori 不支持 woff2）；`selectTitleFontSize`（`:45-53`）三档 76/62/52；`renderThumbDataUri`（`:66-74`）先把 webp 缩略转 PNG（resvg 不认 webp data URI）。
- **`scripts/generate-og-images.mjs`（116 行）**：`selectPostsForCards`（`:18-52`）逐篇生成 payload（有 `hero` 且文件存在则嵌缩略图，读不到就静默降级），`main`（`:63-115`）写 `dist/og/<id>.png` + `default.png`，逐张 try/catch，有失败则 `process.exitCode = 1`（`:112-114`）。

---

## 3. `tools/api-server.js` 与 `scripts/new-post-cli.js` 的关系

两者**共用同一套写入内核** `post-utils.js`：

| 维度 | 本地 HTTP API | 离线 CLI |
|---|---|---|
| 入口 | `tools/api-server.js:200-263` `createNewPostServer` | `scripts/new-post-cli.js:123-138` `main` |
| 校验 | `validatePostPayload` | 同一个 `validatePostPayload`（`new-post-cli.js:47`） |
| 落盘 | `createPostFile`（`api-server.js:8` import，`:239` 调用） | `createPostFile`（`new-post-cli.js:5` import，`:54` 调用） |
| 冲突 | `EEXIST` → 409 `Post already exists`（`api-server.js:96-101, 236-241`） | `EEXIST` → 中文提示（`new-post-cli.js:55-57`） |
| 鉴权 | Bearer + `crypto.timingSafeEqual`（`api-server.js:186-198`，先 sha256 再比较 `:188-192`） | 无（本地进程） |
| CORS | 白名单 4 个生产 origin + localhost（`api-server.js:17-23, 56-67`） | N/A |
| 其他 | 1MB 上限（`:141-148`）、`GET /api/health`（`:225-232`）、`GET/POST` 之外 404（`:234-237`） | `--title/--date/...` 非交互（`:17-40`） |

所以「CLI 与 API 写入规则一致」是代码事实，不是文档口号：`new-post-cli.js:115` 的自述与实际共用 `createPostFile` 相符。

---

## 4. `tests/**`（55 文件）主题归类

运行方式统一：`node --test tests/*.test.js`（`package.json:24`），即 **Node 内置 test runner + `node:assert/strict`**。`astro-build-check.yml:30,33` 另外单独跑两个构建产物断言文件。

| 主题 | 文件 | 主要断言点（摘） |
|---|---|---|
| **发布流水线**（4） | `publish-post.test.js`(20)、`post-utils.test.js`(20)、`publish-hero.test.js`(10)、`backfill-dimensions.test.js`(7) | dry-run 不写不传；上传失败不留 md（`publish-post.test.js:144-175`）；无 `--force` 拒绝覆盖（`test: 'rejects publishing when the destination markdown already exists without --force'`）；R2 重试与聚合失败；多 md 序号/共享资产/顺序；`--version/--help/未知 flag` 退出码；hero 1600px webp 与 metadata 往返；backfill 幂等与 dry-run |
| **本地 API**（1） | `api-server.test.js`(9) | **真起 HTTP server**（`:50-52` `server.listen(0,'127.0.0.1')`）：CORS 白名单不给通配、超限请求移除 stream 监听（`:160-170`）、401/422/409/413、文件系统错误信息脱敏、`/api/health` 与未知路由 404 |
| **写作 CLI**（3） | `check-posts.test.js`(20)、`post-stats.test.js`(3)、`list-posts.test.js`(3)、`new-post-cli.test.js`(8) | frontmatter 类型/日期真实性；残留 `file/` 链接；无效 URL；内部 `/articles/x/` 指向不存在（`check-posts.test.js: 'reports broken frontmatter, leftover file links and missing internal targets'`）；非 ASCII 文件名 error；`every shipped blog filename is ASCII`；`--online` 4xx→error / 网络失败→warning；统计与筛选格式 |
| **元数据编辑**（1） | `edit-metadata.test.js`(10) | 无 frontmatter 拒绝、临时文件 + rename、rename 失败清理、崩溃残留自愈（`: 'removes stale temp files left by a previous crashed run before writing'`）、schema 校验、可清空可选字段 |
| **跳转与构建产物**（2） | `legacy-redirects.test.js`(22) | 映射自检通过（`:65-67`）、来源形状白名单正则（`:84-88`）、**每个目标解析到真实文章文件或真实 Astro 页面**（`:90-95`）、四个中文改名两族齐全（`:97-113`）、目标不得含非 ASCII（`:115-119`）、页面四重信号与转义/href（`:150-...`）、`writeRedirectPages` 写一个文件一条（`: 'writes one file per entry into the output dir'`） |
| **OG 卡与社交 meta**（3） | `og-card.test.js`(7)、`site-seo-social.test.js`(6)、`article-share.test.js`(3) | 字号分档、字体只加载一次、真 PNG 输出（含头图/默认卡/QR）、卡片数量 = 有标题文章数；canonical/og/twitter/JSON-LD 拼接 |
| **文章体验**（12） | `article-headings/progress/reveals/lightbox/lightbox-icons/image-captions/navigation/selection-toolbar/transitions/share`+`blockquote-breaks`+`markdown-mark-highlight`+`scrollable-tables`+`rehype-image-dimensions`+`article-hero` | 标题 id 去重与锚点；进度条用 `transform` 而非 `width`；reduced-motion 直接显示；灯箱缩放钳制 1x–4x、pinch 不漂移、CDN 白名单、焦点恢复；滚动表格 `tabindex/role/aria-label`（`scrollable-tables.test.js:5-11`）；Mermaid 源码转义 + `data-language`；rehype 注入 width/height 且首图 eager；hero 文件名不改 slug |
| **搜索**（3） | `search-index.test.js`(4)、`search-client.test.js`(8)、`phase-11-integration.test.js`(5) | 序列化索引字段、jieba 中文短词分词、懒加载复用实例、高亮转义、10 条历史、debounce |
| **Worker / 安全 / 健康**（4） | `umami-view-counter.test.js`(4)、`umami-trending.test.js`(5)、`health-check.test.js`(3)、`security-logger.test.js`(8) | slug 路径规范化与遍历拒绝、Umami 登录/401 重试一次/未配置→null、trending 分页与缓存降级、健康检查 healthy/degraded/not_configured、**环形缓冲与高错误率告警只触发一次** |
| **i18n / PWA / 视觉 / 共享模块**（7） | `i18n.test.js`(3)、`i18n-function.test.js`(8)、`pwa-manifest.test.js`(3)、`sw-tools.test.js`(5)、`phase-7.5-integration.test.js`(7)、`visual-reform.test.js`(6)、`shared-content.test.js`(5)、`phase-8-integration.test.js`(8) | 两份 JSON 键一致；`t()` 插值/回退；manifest scope=`/works/tools/`；SW 只拦工具页、Network First、install 预缓存；设计 token 与「无全局 header blur」；共享日期/排序/新鲜度 |
| **SEO/评论/Giscus（构建产物）**（3） | `giscus-comments.test.js`(10)、`phase-5-seo-comments.test.js`(21)、`phase-9-integration.test.js`(3) | `data-astro-rerun` 存在（源码 + **dist 产物双断言**）、无 `transition:persist`；CSP 白名单；RSS 全文；sitemap 过滤 |
| **阶段集成**（8） | `phase-2-content`(13)、`phase-2-5-integration`(13)、`phase-3-tools`(13)、`phase-6-stats-archive`(22)、`phase-7-integration`(2)、`phase-13`(7)、`phase-7.5`(7)、`phase-10`(5) | 多为**源码契约读取**（`readFileSync` + 正则/包含断言），锁定 `src/**` 结构与接线 |
| **内容/渲染管线**（1） | `scrollable-tables.test.js`(3) | 用 `@astrojs/markdown-remark` 真跑 markdown 渲染 |

**读构建产物的测试只有 2 个**：`giscus-comments.test.js:20-27` 用 `existsSync(dist/articles)` 做 skip 守卫（注释明写「run `npm run build` first」），`legacy-redirects.test.js` 只在断言里出现 `dist` 字面量、实际写到 `mkdtemp`。这让裸跑 `npm test` 在干净 clone 上仍然可用。

---

## 5. `.github/workflows/*`（6 个）

| workflow | 触发 | 关键步骤 / 成功判据 | 覆盖面 |
|---|---|---|---|
| `astro-build-check.yml` | push `main` + **所有 PR**（`:3-7`，无 paths 过滤） | `npm ci` → `npm run build` → 单独跑 `scrollable-tables` + `giscus-comments`（`:29-33`）→ 断言 `dist/index.html`、`dist/_headers` 含 `X-Content-Type-Options: nosniff`（`:36-40`）→ 社交 meta/JSON-LD/OG 卡数量 == 有标题文章数 + 1（`:42-63`）→ RSS 含 `content:encoded` 且 >20KB → `dist/articles/00010101-test-assignment` 必须不存在（`:65`） | 构建、静态产物、SEO/OG/giscus/表格回归 |
| `phase-2-content-check.yml` | push `main` + 所有 PR（`:3-7`） | `npm ci` → **`npm test`（全量 55 文件）** → `npm run test:coverage` → 内容结构 `test -f`（`content.config.ts` 等，`:32-36`）→ `npm run check` → `npm run build` | 兜底网：任何改动都可能被它拦住 |
| `cli-commands-check.yml` | push `main`/PR，**paths**：`scripts/**`、`tools/**`、`tests/**`、`package*.json`、自身（`:3-21`） | 跑 7 个 CLI 测试文件（`:41`）→ 逐个 `--help`（含 publish `--version`，`:43-51`）→ `npm run check` → `npm run stats`/`list-posts` → 临时目录跑 `new-post` 并断言重复创建必须失败（`:61-69`）→ 未知 publish flag 必须非零退出（`:71-75`） | 发布/写作 CLI 的行为契约 |
| `legacy-redirects-check.yml` | push `main`/PR，paths：`scripts/legacy-redirects.js`、`scripts/generate-redirects.mjs`、其测试、**`src/content/blog/**`**、`src/pages/**`、`package*.json`（`:3-25`） | 跑 `legacy-redirects.test.js` → `generate-redirects.mjs --out .redirect-check`（生成器自读回自检，见 `:47-49` 注释）→ 断言「映射条目数 == 生成 html 数」且 >0（`:53-59`）→ **`public/` 下不得有任何 `.html`**（`:61-67`） | 跳转表 + 重命名文章（改 `src/content/blog/**` 会触发） |
| `metadata-editor-check.yml` | push `main`/PR，paths：`scripts/edit-metadata.js`、其测试、`package*.json`、自身（`:3-19`） | `node --test tests/edit-metadata.test.js` → `npm run edit-metadata -- --help` | 元数据编辑原子写 |
| `deploy.yml` | push `main` + `workflow_dispatch`（`:3-7`） | `npm run build`（`BASE_URL` 默认 `https://calvin-xia.github.io`，`:36-38`）→ `upload-pages-artifact` → `deploy-pages` | GitHub Pages 镜像（生产站由人工 `npx wrangler deploy`） |

---

## 6. 必答：发布链路（Obsidian → 线上）

### 6.1 完整步骤与产物

1. **准备**：`.env` 填 `OKP_VAULT`、`R2_PUBLIC_URL`、`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`（README.md:88-95）。运行 `npm install`（约束：本次未执行）。
2. **预览**：`npm run publish -- --dry-run <dir>`
   - 校验只需 `OKP_VAULT` + `R2_PUBLIC_URL`（`publish-post.js:34-45`）；
   - 打印 `Source markdown` / `Destination markdown` / `Asset prefix` / 每个资产的 R2 key（`printPlan` `:148-161`）；
   - **产物：无**（`executePublishPlan:167-170` 直接 return；多 md 时也对每个 plan 只 print，`:441-448`）。
3. **发布**：`npm run publish -- <dir>`
   - `buildPublishPlan`（`post-utils.js:117-170`）产出 plan：目标 `<dirName>.md`（或 `-N.md`）、assetSlug、assets[]（key + publicUrl）；
   - 交互填元数据 → tags 空则 `未分类`（`publish-post.js:247-277`）；
   - `attachHeroAndDimensions`：探测 `imageDimensions`，选头图 → `sharp` 输出 `src/assets/hero/<md 名>.webp`（`:368-410`）；
   - `--force` 检查（`:172-179`）→ **R2 上传**（`PutObjectCommand` + MIME，`:93-146`）→ 写 `src/content/blog/<dirName>[-N].md`（`:188-191`）；
   - **产物**：仓库 md（含改写后的 CDN 链接 + `imageDimensions` + `hero`）、`src/assets/hero/*.webp`、R2 对象 `<assetSlug>/<相对路径>`。
4. **收尾**：`npm test`、`npm run build`（README.md:126-131）→ `npm run check` → `git commit/push`。生产上线需另行 `npm run build && npx wrangler deploy`（AGENTS.md:45）。

### 6.2 关键 guard

- **不做 dry-run 计划外写盘**：dry-run 分支在 hero/元数据提示之前就已返回（单 md 路径 `:489-492` 用 `if (!dryRun)` 包住交互；多 md 路径 `:441-448` 提前 return）。
- **失败原子性**：上传先于写 md（`:181-186`）；`--force` 在写盘前判定。
- **图片尺寸回填**有两条互补路径：发布时 `collectImageDimensions`（`:317-345`）与一次性 `backfill-image-dimensions.js`（`:83-146`，需带 Referer）。
- **可回滚性**：md 是普通文件，`git checkout` 即可回滚；`src/assets/hero/*.webp` 同理；**R2 对象没有删除逻辑**（代码里没有 `DeleteObjectCommand`），上传是单向的 —— 需要用 `--force` 重发才能覆盖同名 key。

---

## 7. 必答：哪些脚本写盘/上传，哪些纯只读

| 脚本 | 分类 | 写入位置 | 回滚 |
|---|---|---|---|
| `publish-post.js` | **写盘 + 上传** | `src/content/blog/<dirName>[-N].md`、`src/assets/hero/*.webp`、R2 对象 | md/hero 可 git 回滚；R2 只能覆盖，不能撤销 |
| `new-post-cli.js` / `tools/api-server.js` | **写盘** | `src/content/blog/<YYYYMMDD>-<拼音>.md`，`flag:'wx'` 拒绝覆盖（`post-utils.js:76`） | 删文件 |
| `edit-metadata.js` | **写盘** | 目标 md，tmp + rename 原子替换（`edit-metadata.js:185-230`） | git / 重新编辑 |
| `backfill-image-dimensions.js` | **写盘 + 联网** | 目标 md frontmatter 追加 `imageDimensions`（`:138-144`） | git；幂等（已有则 skip） |
| `generate-og-images.mjs` | **写盘** | `dist/og/*.png` | 重建 |
| `generate-redirects.mjs` | **写盘** | `dist/**`（默认）或 `--out` | 重建 |
| `astro build` | **写盘** | `dist/`、`.astro/` | 重建 |
| `check-posts.js` | **只读**（`--online` 才联网 HEAD 探活，`check-posts.js:203-221`） | — | — |
| `post-stats.js` / `list-posts.js` | **只读** | — | — |
| `blog-posts.js` / `readable-stats.js` / `image-dimensions.js` / `slug.js` / `markdown-utils.js` / `content-types.js` | 纯函数库 | — | — |
| `og-card.js` / `legacy-redirects.js` | 纯渲染库 | — | — |

---

## 8. 必答：URL 与 legacy 跳转契约

**URL 生成契约**：`generateId: fileStem`（AGENTS.md:67）→ 文件名即 URL。两条硬约束：

1. 文件名纯 ASCII（`^[A-Za-z0-9._-]+$`，`check-posts.js:17`）；
2. 语义化 `<YYYYMMDD>-<english-slug>`。

**什么时候必须补 `scripts/legacy-redirects.js`**：任何让已发布文章 URL 变化的动作 —— 改名/删除 md、改 `generateId` 配置、迁移页面路由。需要同时覆盖两种历史形态 `/blog/<旧名>.html` 与 `/articles/<旧名>/`（AGENTS.md:71、README.md:165），并由 `tests/legacy-redirects.test.js:97-113` 对已知四个中文改名文件强制检查。

**`npm run check` 会拦截什么**（`check-posts.js:130-188`，逐条为 `level`）：

- `error`：title 空/非字符串；date 非 `YYYY-MM-DD` 或非真实日历日（`:36-44`）；`excerpt` 非字符串；`category` 空；`tags` 非非空字符串数组；`featured` 非布尔；`author/readTime/status` 非字符串；`hero` 空或扩展名不在 `webp|png|jpe?g|avif|gif`（`:72-79`）；`imageDimensions` 非数组或条目缺 path/宽高（`:81-92`）；`hero` 文件在 `src/assets/hero/` 不存在（`:138-146`）；正文残留 `file/` 链接（`:97-99, 148-154`）；无效 http 链接（`:115-124, 156-160`）；`/articles/x/` 指向不存在的文章（`:126-128, 162-169`）；**非 ASCII 文件名**（`:180-186`）。
- `warning`：`excerpt` 为空；文件名不以数字开头（content loader 的 `[0-9]*.md` 不收录，`:171-177`）；`--online` 下网络不可达（`:216-219`）。

**注意**：`check` **不**校验 Blog Taxonomy 白名单、不校验 category/tag 冲突、不校验 legacy 跳转覆盖、不校验 R2 资产一致性（见第 12 节）。退出码：有 error 则 `process.exitCode = 1`（`:313-315`）。

---

## 9. 必答：测试边界（守住了什么 / 没守住什么）

**已守住（有具体断言）**：

- 发布顺序契约：上传失败绝不留 md（`publish-post.test.js:144-175`）、`--force` 语义（同文件 overwrite 段）。
- CLI 退出码与「未知 flag 必须失败」（`cli-commands-check.yml:71-75` 用真实进程断言）。
- 跳转页四重信号 + 生成器读回自检 + `public/` 无手写 html。
- 本地 API 的分级错误码与 CORS 白名单不给通配。
- giscus `data-astro-rerun` 在源码与 **dist 产物**两处都断言（`giscus-comments.test.js`），这是唯一一条「构建产物级」的行为回归网。
- 图片尺寸解析的四种格式、rehype 注入、CLS 相关 eager/lazy。

**无测试覆盖 / 只有 mock 覆盖**：

1. **真实 R2 上传路径**：`uploadAssets` 全部用注入的假 client（`publish-post.test.js:231-275`），`createR2Client`/`requireEnv` 的真实凭证路径未测；`PutObjectCommand` 的 `ContentType` 只由 `content-types.test` 间接覆盖（`post-utils.test.js: 'content type detection treats image extensions case-insensitively'`）。
2. **`sharp` 真实图片管线**：`processHeroImage` 用 `sharpImpl` 注入断言调用参数（`publish-hero.test.js: 'runs the sharp pipeline with 1600px webp settings'`），未产出真 webp 校验尺寸。
3. **`backfill-image-dimensions.js` 的真实网络**：`probeRemoteImage`/`fetchImpl` 全 mock；Referer 头只在源码注释里（`:75-76`），没有断言它真的被发送。
4. **`generate-og-images.mjs` 的写盘循环**：只测 `og-card.js` 与 `selectPostsForCards`；文件层面的「卡数 == 有标题文章数 + 1」由 CI 的 Node 内联脚本兜（`astro-build-check.yml:47-63`），不在 `npm test` 里。
5. **`src/worker.ts` 真 fetch 路由**：没有独立的 worker 集成测试文件；`security-logger.test.js:108-115` 动态 `import('../src/worker.ts')` 是唯一触点（依赖 Node 24 的 TS 直跑），`/api/views/*`、`/api/trending` 的 Worker 层路由组合未端到端验证（只测了 `handleViewCounterRequest` 等库函数）。
6. **`npm run lint` 与类型检查**：没有任何 CI 步骤（见第 10 节），`eslint.config.js`/`tsconfig.json` 的规则从未在流水线中被执行过。
7. **`scripts/generate-redirects.mjs` 的 `--out` 相对路径/`BASE_URL` 组合**：`resolveSiteUrl` 只有单测（`legacy-redirects.test.js`），未验证真实 `dist/` 布局下 `_headers`/`_routes.json` 的共存。
8. **Taxonomy 守护**：`check-posts.js` 不查白名单，而 `src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md:7` 用了白名单外的 `"科技"` —— 没有任何自动化会报错（AGENTS.md:64 也承认「仅由文档约束」）。

---

## 10. 必答：CI 边界

**拦截矩阵**：

- 写出盘/构建类：`astro-build-check` + `phase-2-content-check`（无 paths 过滤，覆盖任何 PR）。
- 写作/发布 CLI：`cli-commands-check`（仅 `scripts/**`、`tools/**`、`tests/**`、`package*.json` 变化时）。
- 跳转：`legacy-redirects-check`（含 `src/content/blog/**`、`src/pages/**`）。
- 元数据编辑：`metadata-editor-check`。
- 部署镜像：`deploy.yml`。

**缺口**：

1. **`npm run lint`、`npx astro check`、`npx tsc --noEmit` 都不在 CI 里**。`grep -rn "lint\|tsc\|astro check" .github/workflows/` 无命中。历史上曾有 `ci: generate Astro types before TypeScript check`（commit `ea994f6`），现在没有任何 workflow 承载它。
2. **push 到非 `main` 分支不触发任何检查**：`astro-build-check.yml:3-7` 与 `phase-2-content-check.yml:3-7` 都是 `push: branches: [main]`，其余 4 个也是 push `main`。只有开了 PR 才有全量门禁。
3. **发布流水线没有专门的「端到端」workflow**：`cli-commands-check.yml` 只跑单测 + `--help`/`--version`/未知 flag + 临时目录 `new-post`；`npm run publish` 的真实 R2 上传路径没有任何 workflow（必然，因为需要凭证）。
4. **`src/worker.ts` 没有专属 workflow**，靠 `phase-2-content-check` 的全量 `npm test` 兜底，而该测试对 worker 的覆盖很薄（第 9 节 #5）。
5. **`scripts/backfill-image-dimensions.js` 无专属 workflow**，只在全量 `npm test` 里被 `backfill-dimensions.test.js` 覆盖。
6. **`deploy.yml` 的命名不符合 AGENTS.md:88 的自定约定**（要求 `*-check.yml` / `*-ci.yml`）。
7. `astro-build-check.yml:39` 用中文字符串 `Calvin Xia` 做品牌断言 —— 与 `e7eb9d8 fix(ci): update astro-build-check home page marker to current brand` 同类脆弱点：改品牌名要同步改 CI。

---

## 11. 必答：文档与代码不符 / 过期点（逐条）

### 1) `npm run check` 被描述成会校验「R2 资产一致性」

- 文档：`README.md:103`「校验全站文章 frontmatter、日期、标签、slug 文件名（必须为 ASCII）、站内链接与 **R2 资产一致性**」；`AGENTS.md:35`「…links and **R2 asset consistency** for all posts」；`site-maintenance-guide.md:352`「`check-posts.js`（frontmatter/日期/标签/链接/**R2 资产校验**）」。
- 代码：`scripts/check-posts.js:1-17` 只 `import { listPostFiles, readPostFile }`，全文没有任何 R2 / S3 / `fetch` 引用（除 `--online` 的 HEAD 探活 `:203-221`）；`analyzePost`（`:130-188`）只做 frontmatter、`src/assets/hero/` 本地文件存在性、正文链接四类检查。
- 应改为：删掉「R2 资产一致性」，替换为「hero 本地文件存在性 + 正文链接有效性」；README/AGENTS 同步。

### 2) `npm run check` 被描述成会校验「标签」

- 文档：`README.md:103`、`AGENTS.md:35`、`site-maintenance-guide.md:352`。
- 代码：`validateFrontmatter`（`check-posts.js:28-95`）对 `tags` 只断言「非空字符串数组」（`:50-55`），**不校验 taxonomy 白名单、不校验 category/tag 同名**。
- 证据反驳：`src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md:7` 的 `-"科技"` 不在 `AGENTS.md:57-58` 的白名单里，而 `npm run check` 不会报错。
- 应改为：明确写「tags 只做类型校验，白名单靠人工（AGENTS.md:64 已注明）」。

### 3) `README.md` 的目录树把跳转页说成在 `public/`

- 文档：`README.md:24`「`public/ # Astro 静态资源 + 旧 URL 重定向`」。
- 代码：跳转页由 `scripts/generate-redirects.mjs` 写到 `dist/`（`generate-redirects.mjs:16` `defaultOutputDir = dist`），且 `legacy-redirects-check.yml:61-67` **禁止** `public/` 下出现任何 `.html`；`AGENTS.md:12` 也明写「Never add a redirect HTML file under `public/`」。
- 应改为：「`public/ # Astro 静态资源（storage/、.well-known/、libs/）；跳转页由 build 生成到 dist/，不要放这里」」。

### 4) `README.md:25` 的 CI 描述过期

- 文档：「`.github/workflows/ # CI：构建验证 + 自动部署到 GitHub Pages`」。
- 代码：实际 6 个 workflow（`AGENTS.md:22` 已列全），另有 CLI、跳转表、元数据编辑三道专门门禁。
- 应改为：列出或概括为「构建/内容/CLI/跳转/元数据五道 check + GitHub Pages 镜像部署」。

### 5) `AGENTS.md` 的命令清单缺 3 个 npm script

- 文档：`AGENTS.md:28-45` 列举的命令里没有 `edit-metadata`、`og`、`astro`。
- 代码：`package.json:13`（`og`）、`:16`（`astro`）、`:19`（`edit-metadata`）；`AGENTS.md:22` 甚至已经列出了 `metadata-editor-check.yml`，但没写它守护的命令。
- 应改为：补 `npm run edit-metadata -- <markdown-file>`（含 `--skip-validation`）、`npm run og`、`npm run astro`。

### 6) `AGENTS.md:19` 的脚本清单不完整

- 文档：「Publishing and local authoring scripts: `publish-post.js`, `post-utils.js`, `tools/api-server.js`; authoring CLI: `check-posts.js`, `post-stats.js`, `new-post-cli.js`, `list-posts.js`」。
- 代码：`scripts/` 共 19 个文件，未被列入的包括 `slug.js`、`markdown-utils.js`、`content-types.js`、`blog-posts.js`、`readable-stats.js`、`image-dimensions.js`、`backfill-image-dimensions.js`、`edit-metadata.js`（`generated-og-images.mjs`/`og-card.js` 在 `:14` 提到，`legacy-redirects.js`/`generate-redirects.mjs` 在 `:12` 提到）。
- 特别值得补的是 **`edit-metadata.js`** 与 **`backfill-image-dimensions.js`**，后者在 `README.md`/`QUICKSTART.md`/`site-maintenance-guide.md` 三处都零提及（`grep -c backfill-image-dimensions` 全为 0）。

### 7) `AGENTS.md:63` 的 taxonomy 覆盖度数字过期

- 文档：「`自我` 覆盖面最广（**13 篇中 10 篇**）」。
- 代码：`ls src/content/blog/*.md | wc -l` = **14**；`grep -h '^  - ' src/content/blog/*.md` 统计 `"自我"` 出现 10 次。
- 应改为：「14 篇中 10 篇」；并顺带记录 `"科技"` 这一白名单外标签（`20260918-zcode-silent-workspace-snapshot-upload-2.md:7`），要么收编要么改写。

### 8) `AGENTS.md:69` 的 slug 建议与自带 CLI 行为相反

- 文档：「不要用拼音首字母——发布管线里的 `slugifyTitle()` 会产出 `fxxj-pjcz` 这类不可读结果，**手写文件名时请覆盖它**」。
- 代码：`npm run new-post` / `POST /api/new-post` 走 `createPostFile` → `slugifyTitle`（`post-utils.js:71-73`），**没有任何手写覆盖入口**，产物就是拼音首字母名（`new-post-cli.js:115` 自述「entrySlug 为 YYYYMMDD-标题拼音缩写」）。这条建议只对 `npm run publish`（目标名取 Obsidian 目录名，`post-utils.js:154`）成立。
- 应改为：明确区分「publish 路径：目录名即 slug，可语义化；new-post/API 路径：只能得到拼音首字母，写文章请用 publish 或手动重命名 + 补跳转」。

### 9) `project.json` 整体过期

- 文档：`project.json:2-5` `"version": "2.0.0"`、`"repository": ".../mr.xia"`、`"homepage": ".../mr.xia"`；`project.json:15-20` 声明目录结构 `css`/`js`/`pages`（根目录 HTML 时代）；`project.json:22-29` 卖点含「渐变动画背景」「**毛玻璃导航栏**」「悬浮卡片动效」。
- 代码：迁移后没有根级 css/js 目录（`ls` 根目录无 `css/`、`js/`）；`tests/visual-reform.test.js` 断言视觉外壳「avoids global header blur」；`DESIGN.md:153` 明写「不使用大面积渐变球、毛玻璃堆叠或高饱和光效」。
- 应改为：删除或重写为 Astro 现状（版本、仓库 URL `Calvin-Xia/mr.xia.github.io`、结构 `src/`+`dist/`）；当前 `project.json` 对任何自动化都无引用（`grep -rn project.json --include=*.js/yml/md` 仅命中无关文档），属于纯死文件。

### 10) `docs/grilling/2026-09-12-roadmap/00-project-map.md` 的三处事实已过期

- `:9`「198 个 commit；**36 个测试文件共 5917 行**」→ 实测 237 commit、55 个测试文件 8235 行。
- `:29`「tools/api-server.js(**239 行**)…Bearer 用 `===` **非 timing-safe**；**无 GET/健康检查**」→ 实测 269 行、`:188-192` 用 `sha256 + timingSafeEqual`、`:225-232` 有 `GET /api/health`。
- `:34`「CI:**4 个 workflow**…**publish 与 api-server 无专门 workflow**」→ 实测 6 个，`cli-commands-check.yml:41` 直接跑 `tests/publish-post.test.js` 与 `tests/api-server.test.js`。
- `:60` 缺口表「api-server Bearer 非 timing-safe 比较」同理已修复。
- 处理建议：该文件自述「只含代码中可验证的事实」，要么标注为「2026-09-12 快照，勿作现状依据」，要么删掉会腐烂的数字。

### 11) `docs/superpowers/plans/2026-06-03-publish-tag-defaults.md` 的状态句过期

- 文档：`:11`「**Status (2026-06-03):** 已实施并验证，尚未提交。」；`docs/superpowers/specs/2026-06-03-publish-tag-defaults-design.md:4`「**状态**：已实施，未提交」。
- 代码：`post-utils.js:20-23` (`tagsWithDefault`) 与 `:174-179` 已落地，且已进入 git（`git log` 中相关提交存在）。
- 应改为：「已合入 main」或加 `[done]` 标记。

### 12) `move-to-astro/README.md` 的 Phase 表只到 Phase 8

- 文档：`move-to-astro/README.md:22-32` 阶段概览与 `:38-48` 执行状态都止于 Phase 8。
- 代码/其余文档：`README.md:3`、`QUICKSTART.md:3`、`site-maintenance-guide.md:3` 都描述到 **Phase 18**，`docs/grilling/2026-09-12-roadmap/04-phases-p14-p18.md` 记录 P14–P18（`scripts/` 里 `check-posts.js`/`post-stats.js`/`new-post-cli.js`/`list-posts.js`/`publish-post.js` 的 `--force`/`og-card.js`/`legacy-redirects.js` 都是 Phase 14–18 产物）。
- 应改为：补 Phase 9–18 两行表项，或注明「Phase 9+ 见 README / site-maintenance-guide」。

### 13) `frontend-visual-reform/checklist.md` 的测试数过期

- 文档：`:3`「`npm test` **151/151** 通过，`npm run build` 成功生成 **19 pages**」；`:13-14`「141/141 通过」「19 pages built」。
- 代码：当前 55 个测试文件、约 414 个用例；phase 目录已到 13。这些是历史快照数字，但文件没有任何「快照」标注，容易被误读为现状。
- 应改为：加 `> 历史快照（2026-05-22）` 前缀，或删除具体数字。

### 14) `QUICKSTART.md` 命令清单缺 `redirects` / `og`

- 文档：`QUICKSTART.md:33-49` 列了 dev/build/test/lint/check/stats/list-posts/api/edit-metadata/publish + wrangler secret，没有 `npm run redirects`（`package.json:14`）。
- 影响较小（README.md:105 有写），但首次接手时容易漏。

### 15) 一致的部分（避免误伤，供反向确认）

- `README.md:105`「17 个 legacy 跳转页」与 `scripts/legacy-redirects.js:11-34`（7+6+4=17）**一致**。
- `site-maintenance-guide.md:46-63` 列的 `src/lib/**` 与 `src/scripts/articles-index/` 路径逐个存在（实测 20/20 OK）。
- `AGENTS.md:22` 六个 workflow 文件名与 `.github/workflows/` 实际完全一致。

---

## 12. 必答：历史脉络（根级 HTML → Astro → 视觉/功能迭代）

`git log --oneline --reverse` 早期（2025-12 起）是纯静态站：`Initial commit` → `Add files via upload` → `重构网站结构并添加新功能模块` → `重启时间轴`（`Update Works.html`、`Add tabbed interface with timer and random selector`、`使用cloudflare r2存储桶加速图片渲染`）。

**迁移主线（有明确阶段提交）**：

- `87fd223 feat: 添加迁移到Astro的规划文档和任务清单` → 产出 `move-to-astro/` 目录（`move-to-astro/README.md` 的阶段 0-8 表）。
- `14dd141 feat: 完成 Astro 迁移 Phase 0 基础环境搭建` → `87fd223` 计划落地。
- `ec0e85a feat: 完成 Phase 1 低复杂度页面迁移`、`614a5c2 Merge pull request #1 from Calvin-Xia/codex-phase-2-content`、`0942e2c Merge pull request #2 from ... phase-2-5-animation-optimization`、`c363e8c Phase 3: 工具页迁移至 /works/tools/ 子路由` → `move-to-astro/phase-{1-pages,2-content,phase2.5,3-tools,4-cleanup,5-seo-comments,6-stats-archive}/spec.md` 一一对应。
- 之后 PR #7–#12 形成 Phase 7 → 13 的固定节奏（`Merge pull request #7 ... phase-7-5-auxiliary-enhancements`、`#8 ... phase-8-i18n`、`#9 ... phase-9-security-devops`、`#10 ... phase-10-article-experience`、`#11 ... phase-11-search-enhancement`、`#12 ... phase-12-content-management`），每个都配一份 `test: add Phase N integration tests` 提交 → 对应 `tests/phase-N-integration.test.js`。这一段是「一个 Phase = 一个 `prd-20260601/phase-N-*/` 目录 + 一份 integration test」的流水线化时期。

**视觉重构阶段**：

- `move-to-astro/visual-style-refactor-feasibility.md` → `visual-style-refactor-complete-report.md` → 独立目录 `frontend-visual-reform/{spec,tasks,checklist}.md`（`checklist.md:1-14` 记录了「重构前 141/141 → 重构后 151/151、19 pages」的验收口径）。`DESIGN.md` 是该阶段的最终视觉口径（`DESIGN.md:1-20`）。
- 对应测试 `tests/visual-reform.test.js` 与 `tests/page-transitions.test.js`。

**迁移后的功能迭代（Phase 14–18，`docs/grilling/2026-09-12-roadmap/04-phases-p14-p18.md:1-14`）**：

- P14 CLI 工具集：`fda4551 feat(cli): add check/stats/new-post/list-posts authoring commands`、`0ba83b0 fix(api): timing-safe bearer comparison and health endpoint`、`9cd0b99 ci(cli): add cli-commands-check workflow for authoring scripts`。
- P15 发布链路：`fb2f722 feat(publish): probe image dimensions and offer hero image during publish`、`9a523de feat(cli): add one-off image dimension backfill script`、`efbd946 chore(content): backfill image dimensions for existing posts`、`ffad4dd feat(publish): require --force to overwrite, add --version, reject unknown flags`。
- P16 SEO/OG：`a11d1b5 feat(seo): social meta, JSON-LD and satori OG share cards`、`bc47490 feat(seo): qr codes and hero thumbnails on all og share cards`。
- P17 文章体验：`1617c38`/`40fd6e7`/`4daed4f`（分享按钮三级降级）、`8e6809c feat(article): prev/next and related posts, full-text rss, trending api with home card`。
- P18 清理/性能：`3a3224d refactor(works): data-driven works page`、`94a9290 refactor(article): split articles page into payload/cards/filters/search modules`、`7d08c8b feat(perf): self-host fonts via fontsource, fix pwa theme color, tighten csp`、`33834cf docs: align all surfaces with phase 14-18 reality`。

**最近的维护节奏**（`git log --oneline -12`）：`8764f19 docs(agents): drop the stale .trae/documents plan-doc rule` → `01e8e84`/`c6064a0`/`3fd47f5` works 扩展 → `e59c88e` CSP beacon → `1a874b2 docs: document production deploy flow and CSP beacon allowance` → `89a473d refactor(blog): normalize blog taxonomy and slugs` → `df737e6 feat(blog): generate themed legacy redirects and guard slug regressions` → `1991c4d fix(articles): resolve list thumbnails from the declared hero, not the slug` → `5a75937 articles: add article zcode-...-upload` → `9fd78fd fix(blog): contain mobile tables and render Mermaid diagrams` → `b78e6a2 fix(comments): rerun giscus loader on client-side navigation`。主线是「文档与 CI 随功能同步」+「内容/视觉回归修复」。

**未完成/游离的历史产物**：

- `UpdateLog/` 目录**为空**（`ls -la UpdateLog` 只有 `.`/`..`），但 `scripts/legacy-redirects.js:20` 仍把 `/UpdateLog/fingerprint-app-update-log.html` 映射到 `/updates/fingerprint-app-update-log/`（跳转目标有效，源路径的历史目录已删；这是预期，不是 bug）。
- `.trae/` 保留了大量截图与 `specs/*`（含 `project-architecture-analysis/spec.md` 引用了 `project.json`）；`AGENTS.md` 已不再引用 `.trae`（commit `8764f19`），但目录与其中的过期规范仍在仓库里。

---

## 13. 风险清单（按影响排序）

1. **`npm run lint` / 类型检查在 CI 中完全缺位**（第 10 节 #1）。历史上存在过（`ea994f6`），现在只剩单测与 build。
2. **push 到非 main 分支无任何门禁**（4 个 check workflow 都只在 push main / PR 触发）。
3. **文档把 `check` 的能力说大了两处（R2 一致性、标签白名单）**，会让人误以为 taxonomy 有自动守护；实际白名单已被 `"科技"` 标签现实违反。
4. **taxonomy 白名单无校验**：`AGENTS.md:64` 自认「仅由文档约束」。
5. **拼音 slug 与「不要用拼音首字母」的规则冲突**，而 `new-post`/API 是唯一内置建稿入口。
6. **R2 上传不可撤销**：代码里没有删除命令，`--force` 覆盖是唯一修正手段。
7. **OG 卡与 `sharp`/`satori` 的真实产物只在 CI 里被间接验证**（`npm test` 内是 mock/单张 PNG 断言）。
8. **`project.json` 是零引用的死文件**且内容与现状相反，容易误导新接手者。

---

## 14. 建议的动作（不改代码即可执行）

| # | 动作 | 涉及文件 |
|---|---|---|
| 1 | 修正 `check` 能力描述（去掉 R2 一致性，弱化「标签」） | `README.md:103`、`AGENTS.md:35`、`site-maintenance-guide.md:352` |
| 2 | 修正目录树与 CI 描述 | `README.md:24-25` |
| 3 | 补 `edit-metadata`/`og`/`astro` 命令与 `edit-metadata.js`/`backfill-image-dimensions.js` 的脚本条目 | `AGENTS.md:19,28-45` |
| 4 | 更新 taxonomy 覆盖度数字并处理 `"科技"` 标签 | `AGENTS.md:63`、`src/content/blog/20260918-...-2.md:7` |
| 5 | 处理 `project.json`：删除或重写为 Astro 现状 | `project.json` |
| 6 | 给 grilling / superpowers / frontend-visual-reform 的过期快照加日期标注 | `docs/grilling/2026-09-12-roadmap/00-project-map.md:9,29,34,60`、`docs/superpowers/**`、`frontend-visual-reform/checklist.md:3` |
| 7 | 考虑把 `npm run lint`（并可选的 `astro check`）加入 `phase-2-content-check.yml` | `.github/workflows/phase-2-content-check.yml:26-42` |
