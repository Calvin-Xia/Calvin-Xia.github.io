# 项目整体认识（Herdr 四路 agent 并行探查 + 交叉核实）

> 生成方式：Herdr pane 网格（`w6:p1` 主管 + `w6:p2/p4/p3/p5` 四个 pi agent）四路并行只读探查，报告落盘后再由主管独立复核关键结论。
> 基准：`main` @ `b78e6a2`（工作树干净）。
> 证据标度：`[核实]` = 主管亲自复跑命令确认；`[报告]` = 分路 agent 结论（附 file:line，未二次复跑）。

---

## 0. 一句话定位与规模基线

一个**纯静态个人站**（Astro 6 预渲染）+ **极薄的 Cloudflare Worker 边车**（3 个 `/api/*`），内容与发布走一套**自研 Node 工具链**（Obsidian→R2→markdown），并配 **6 条 CI 门禁 + GitHub Pages 自动镜像**。没有数据库、没有 KV、没有定时任务，唯一的外部状态是自部署 Umami 与 R2 对象存储。

| 项 | 实测值 | 证据 |
|---|---|---|
| 受跟踪文件 | 263 | `[核实]` `git ls-files \| wc -l` |
| 文件类型 | js 108 / md 42 / astro 28 / json 26 / ts 21 / yml 6 | `[核实]` |
| 页面/端点 | 15 个 `src/pages/**` → 22 条 sitemap URL | `[核实]` `grep -o "<loc>" dist/sitemap-0.xml \| wc -l` = 22 |
| 组件 / 脚本 / lib | 15 / 17 / 32 | `[核实]` |
| 内容条目 | blog 14、works 15、tools 3、updates 1（52 条 timeline item） | `[核实]` blog=14；其余 `[报告]` lane2 §3 |
| 正文字数 | 约 36,518 字（汉字 32,171 + 英文 1,347） | `[报告]` lane2 §2 |
| 测试 | 55 文件 / 8,235 行 / 约 414 用例 | `[核实]` 文件数；`[报告]` 行数与用例数 |
| CI workflow | 6 个 | `[核实]` |
| git 历史 | 237 commit | `[报告]` lane4 §0 |
| 构建产物 | `dist/og` 15 张 PNG、`dist/articles` 19 目录、17 条跳转页 | `[核实]` 15 / 19 / 17 |
| Node 要求 | `>=22.12.0` | `[核实]` `package.json:8` |

---

## 1. 系统地图：三个平面 + 四条链路

```
┌─ 平面 A：构建期静态站（Astro 6，全预渲染，无 adapter） ──────────────┐
│  src/content/{blog,works,tools,updates}  ──schema──▶ src/content.config.ts
│        │ remark(3) + rehype(3) + shiki 双主题
│        ▼
│  src/pages/** (15) ── src/layouts/BaseLayout ── src/components/** (15)
│        │ 单一 SEO 源：src/lib/site-seo.js（6 处消费）
│        ▼
│  astro build → dist/  →（后处理）generate-og-images.mjs → generate-redirects.mjs
└──────────────────────────────────────────────────────────────────────┘
┌─ 平面 B：运行时 Worker（src/worker.ts，152 行） ─────────────────────┐
│  run_worker_first = ["/api/*"]；其余路径根本不进 Worker（ASSETS 直服）
│  /api/health  （可选 Bearer HEALTH_CHECK_TOKEN）→ 登录探针
│  /api/trending?limit=5  （无鉴权，Cache API 600s，近 30 天）
│  /api/views/<slug>      （无鉴权，全时段累计，max-age=300）
│         └── 唯一数据源：自部署 Umami（login → /api/websites/{id}/metrics）
│  安全头在 public/_headers（CSP 等），Worker 不重复设置
└──────────────────────────────────────────────────────────────────────┘
┌─ 平面 C：工具链 / 发布 / 门禁 ──────────────────────────────────────┐
│  scripts/**（19 个，3638 行）+ tools/api-server.js（269 行）
│    写入内核共用：scripts/post-utils.js (createPostFile / validatePostPayload)
│  测试：node:test（无第三方框架）；CI：6 workflow；部署：人工 wrangler + GHPages 镜像
└──────────────────────────────────────────────────────────────────────┘
```

### 1.1 四条端到端链路（最重要的认知）

**L1 md → 页面**（`[报告]` lane2 §4）
`frontmatter` → Astro 内建 GFM → `remarkBlockquoteBreaks` → `remarkMarkHighlight`（`==高亮==`）→ `remarkMath` → mdast→hast → `rehypeImageDimensions` → `rehypeKatex` → `rehypeScrollableTables` → shiki 双主题 → `[...slug].astro` 的 `<Content />` 注入 `.markdown-content`；随后客户端 `article-runtime.js`（全局加载，`BaseLayout.astro:125-126`）跑 6 个增强模块 + Mermaid 懒加载。

**L2 构建 → 上线**（`[报告]` lane3 §8，`[核实]` 脚本定义）
`npm run build` = `astro build` + OG 卡 + 跳转页（**三步，不含 deploy**）→ 人工 `npx wrangler deploy`（Worker + `dist/` 作 ASSETS，自定义域控制台绑定）。**GH Pages 是另一条独立通道**（`deploy.yml` push main 自动跑），无 Worker、不消费 `_headers`、canonical 取决于 `vars.BASE_URL`。

**L3 阅读量 / 趋势**（`[报告]` lane3 §4、§6）
浏览器 `pageview` 由 Umami 官方脚本上报（`BaseLayout.astro:82`，website-id 是公开值）→ Worker 登录 Umami 取 `type=url` metrics → 文章页 span 显示（4 种降级文案）、首页热门卡（默认 `hidden`，失败即隐藏）。**无点赞、无去重、无防刷、无限流**，去重完全依赖 Umami 自身。

**L4 Obsidian → R2 → 上线**（`[报告]` lane4 §6）
`npm run publish -- --dry-run <dir>`（零写盘）→ `npm run publish -- <dir>`：校验 env → 交互填元数据 → 探测 `imageDimensions` → 选头图（`sharp` 1600px webp 落到 `src/assets/hero/<md名>.webp`）→ `--force` 检查 → **先上传 R2、后写 md**（失败不留死链）→ 写 `src/content/blog/<dirName>[-N].md`。

---

## 2. 平面 A：外壳、路由、样式（`[报告]` lane1）

- **路由形态**：目录式尾斜杠（`/articles/<slug>/`、`/works/tools/`、`/updates/<id>/`）+ 3 个静态端点（`robots.txt`、`rss.xml`、`search-index.json`）+ `404.html` + sitemap 2 文件 + `og/*.png` + 17 条跳转页。
- **导航**：Header 仅 3 项（文章/作品/关于），无二级菜单；`/works/tools/`、`/articles/archive/`、`/updates/*` 只能从页面内卡片进入；**顶层无"工具""更新日志"入口**。
- **SEO 全构建期**：`src/lib/site-seo.js` 单源，被 `BaseLayout`、文章页、`robots.txt.ts`、`rss.xml.ts`、sitemap 集成、`generate-og-images.mjs` 六处消费；运行时零 SEO 逻辑。RSS 是**全文** `content:encoded`（`dist/rss.xml` ≈195KB / 14 items）。
- **布局装配**：`BaseLayout` 三个 `is:inline` 启动脚本（动画根标记 / 主题 boot / 语言 boot）+ `<ClientRouter fallback="swap" />`；字体 14 条 `@fontsource` 自托管（无 Google Fonts）。
- **符号体系**：75 个 CSS token（`:root`）+ `[data-theme="dark"]` 同构覆盖；亮色默认（不读系统主题，与 `DESIGN.md:672-686` 一致）。
- **i18n**：`[[zh-CN, en-US]]` 各 435 叶子键、28 命名空间，双向零差异（`tests/i18n.test.js` 断言）；`applyTranslations` 遍历 `[data-i18n]` + 属性映射表；**服务端只出中文**（`getCurrentLang()` 构建期回落），无 `hreflang`。

**两条被文档明确要求保留的约束（已核实到位）**：`GiscusComments.astro:16` 的 `data-astro-rerun`（否则 ClientRouter 二次导航留空容器）+ 全仓零 `transition:persist`（否则新文章显示旧讨论）；`tests/giscus-comments.test.js` 在 **dist 产物**上双断言，CI 在 build 之后跑。

---

## 3. 平面 B：Worker、数据与密钥（`[报告]` lane3，关键项 `[核实]`）

| 端点 | 鉴权 | 数据源 | 缓存 | 失败态 |
|---|---|---|---|---|
| `/api/health` | 可选 Bearer `HEALTH_CHECK_TOKEN` | Umami 登录探针 | `no-store` 或 `?cache=N` | 401 / 503（几乎不可达） |
| `/api/trending?limit=` | 无 | Umami metrics（近 30 天，`type=url`） | Cache API 600s（**仅非空结果**） | 200 `{trending:[]}` 永不 5xx |
| `/api/views/<slug>` | 无 | Umami metrics（`startAt=0` 全时段） | `max-age=300`（**失败态也带此头**） | 400 非法 slug / 200 `{views:null}` |

- **密钥边界**：public var = `UMAMI_HOST`、`UMAMI_WEBSITE_ID`（`wrangler.jsonc:12-15`）；secret = `UMAMI_USERNAME`、`UMAMI_PASSWORD`、`HEALTH_CHECK_TOKEN`。客户端脚本 grep 三个 secret 名**零命中** ✅。`WORKER_VERSION` **只在 `src/worker.ts:12,79` 出现，wrangler 从未定义** `[核实]` → `/api/health` 永远返回 `0.0.1`。
- **无绑定**：没有 KV / D1 / R2 / Queue / cron；`compatibility_date=2026-04-28`，无 flags；`wrangler.jsonc` 无 `routes`（域名在控制台绑）。
- **降级性良好**：热门卡默认 `hidden`、浏览量是纯文本 span、无 SSR 依赖 → **页面渲染对 API 零硬依赖**（GH Pages 镜像没有 API 也照常工作）。
- **观测性**：logs/traces `head_sampling_rate: 1` + `persist: true`（全采样）。

---

## 4. 平面 C：工具链、门禁与历史（`[报告]` lane4）

- **scripts/（19 个）分层**：纯函数库（`slug`/`markdown-utils`/`content-types`/`blog-posts`/`readable-stats`/`image-dimensions`/`og-card`/`legacy-redirects`）、只读 CLI（`check-posts`/`post-stats`/`list-posts`）、写盘 CLI（`new-post-cli`/`edit-metadata`/`backfill-image-dimensions`/`publish-post`）、构建后处理（`generate-og-images.mjs`/`generate-redirects.mjs`）。
- **共用写入内核**：`post-utils.js` 的 `validatePostPayload` + `createPostFile`（`flag:'wx'` 拒绝覆盖）同时服务离线 CLI 与 `tools/api-server.js` → "CLI 与 API 写入规则一致"是代码事实而非口号。
- **唯一的强一致性闸门**：`legacy-redirects.js` 映射表 → `generate-redirects.mjs` **写完读回磁盘校验四重跳转信号**（meta refresh / canonical / `location.replace` / 无 JS 兜底 `<a>`），不合格即 build 失败；CI 另有"`public/` 下不得有任何 `.html`"。
- **测试边界**：Node 内置 `node:test`，无第三方框架。守住的是**契约**（发布顺序、`--force` 语义、退出码、跳转四信号、CSP 白名单、giscus 产物断言、图片尺寸解析）；**mock 覆盖或完全没覆盖**的是：真实 R2 上传、`sharp` 真实产物、backfill 真实网络 Referer、OG 写盘循环、`src/worker.ts` 的路由集成。
- **CI 门禁矩阵**：`astro-build-check`（构建+产物断言）、`phase-2-content-check`（全量 `npm test` + `test:coverage` + `check` + `build`）无 paths 过滤；`cli-commands-check`、`legacy-redirects-check`、`metadata-editor-check` 有 paths；`deploy.yml` 镜像。**`npm run lint` / `astro check` / `tsc --noEmit` 全都不在 CI 里** `[核实]`；且 4 条 check 只 `push: [main]`，非 main 分支 push 零门禁。
- **历史主线**：根级 HTML → `move-to-astro/`（Phase 0-8）→ 视觉重构（`frontend-visual-reform/` + `DESIGN.md`）→ Phase 9-18（i18n/安全/文章体验/搜索/内容管理/CLI/发布/SEO-OG）→ 近 12 提交是"内容回归 + 文档/CI 同步"的维护节奏。

---

## 5. 必须遵守的契约（不变量清单）

| 契约 | 内容 | 由什么守住 |
|---|---|---|
| 文件即 URL | `generateId: fileStem`；文件名只能 ASCII，建议 `<YYYYMMDD>-<english-slug>` | `check-posts.js` error + CI |
| 改名必补跳转 | 覆盖 `/blog/<旧名>.html` 与 `/articles/<旧名>/` 两种历史形态 | `tests/legacy-redirects.test.js` + `legacy-redirects-check.yml` |
| 跳转页不进 `public/` | 一律 build 期生成到 `dist/` | CI 断言 `public/` 无 `.html` |
| giscus 双约束 | 保留 `data-astro-rerun`；禁止 `transition:persist` | `tests/giscus-comments.test.js`（源码 + dist） |
| referrer 策略 | 站点保持 `strict-origin-when-cross-origin`；本地 CDN 代理用固定 Referer | `BaseLayout.astro:70`、`astro.config.mjs:14` |
| CDN 资产防盗链 | 回填/下载必须带 `Referer: https://workers.calvin-xia.cn/` | `backfill-image-dimensions.js:75` |
| 密钥不入仓 | `.env*` / `.dev.vars*` 忽略，只留 `.example` | `.gitignore:38-41` `[核实]` |
| 发布顺序 | 先上传 R2，后写 md（失败不留死链） | `publish-post.js:181-186` + 单测 |
| Blog taxonomy | `category` 三选一、`tags` 封闭白名单、tag≠category、独立数组项 | **仅文档约束，无自动化** |

---

## 6. 风险清单（跨四路去重后按影响排序）

### P1 —— 会影响线上行为或开发流程

1. **CSP 与 mammoth 的 CDN 分支冲突**（三方独立命中）。`public/_headers:2` 的 `script-src` 无 `cdnjs.cloudflare.com`，但 `src/scripts/random-selector.ts:21,149-156` 仍 CDN 优先、`BaseLayout.astro:71-72` 还 preconnect cdnjs → 生产**必然先失败一次**再回落 `/libs/mammoth/`，并产生 CSP 控制台报错。`[核实]` CSP 内容。
2. **出站 fetch 全无超时**（`umami-view-counter.js:75,108`、`umami-trending.js:37`、`health-check.js:19`）→ 上游"半死"时降级链（抛错才触发）永不触发，请求挂到平台超时。
3. **失败态被缓存 5 分钟**：`jsonResponse()` 无条件写 `Cache-Control: public, max-age=300`，`{views:null}` 与 400 也带此头 → 一次瞬时故障在浏览器固化 5 分钟。
4. **trending 空结果不缓存**（`umami-trending.js:96-98`）→ 故障期每次首页访问都同步打上游（含登录重试）。
5. **三个页面脚本缺 `astro:page-load`**：`index.astro` 的 `initHomePage`（仅 `DOMContentLoaded`，同页 `initTrendingSection` 却挂了 `astro:page-load`）、`about.astro:71`、`styleguide.astro:123`（均仅 `DOMContentLoaded`）→ **重复站内导航**后入场动画/ripple/邮箱链接/时钟失效。`[核实]` hook 结构。
6. **文章增强全站生效并误伤工具页**：`article-runtime` 由 `BaseLayout` 全站加载，判据是 `.markdown-content`，而 `MarkdownToolWidget.astro:52` 与 `NewPostForm.astro:60` 用了同一个类 → 工具预览被加标题锚点/灯箱/选区工具条/逐段渐显。
7. **图片尺寸链有洞**：`rehypeImageDimensions` 只处理 markdown 语法图片，`20251231-year-in-review.md` 的 22 张 raw `<img>` 让 22 条 `imageDimensions` 成为孤儿（→ CLS）；未命中 manifest 的图**连 `loading` 都不注入**。
8. **本地 `.dev.vars` 键漂移** `[核实]`：实际只有 `{HEALTH_CHECK_TOKEN, UMAMI_API_KEY}`，模板是 `{UMAMI_USERNAME, UMAMI_PASSWORD, HEALTH_CHECK_TOKEN}`，代码只读后两者 → 本地 `wrangler dev` 下浏览量/health 必坏；`UMAMI_API_KEY` 全仓零引用。
9. **部署文档误导 + 无新鲜度闸门**：`README.md:107` 的表述（"`npx wrangler deploy` 先构建后…"）容易被读成 wrangler 会自动构建，而 `build` 脚本不含 wrangler、`wrangler.jsonc` 无 build 配置 → 有过期 `dist/` 上线风险，且无 CI 校验 dist 与 HEAD 一致、无生产 smoke test。
10. **taxonomy 无自动化** `[核实]`：`check-posts.js` 对 `tags` 只断言"非空字符串数组"，白名单/数量/category 交集全不查；现实已违规 —— `20260918-zcode-silent-workspace-snapshot-upload-2.md:7` = `"科技"`。

### P2 —— 一致性 / 数据质量 / 成本

11. **镜像站 canonical 自指**：`deploy.yml:36-38` 用 `vars.BASE_URL` 兜底 `https://calvin-xia.github.io` 当 `site` → 若仓库变量未设，GH Pages 的 canonical/og:url/sitemap 指向自己，与主域形成两份互指副本。**需确认仓库变量是否已设**。
12. **Umami 数据被镜像污染**：查询只按 `url` 路径不过滤 hostname，而镜像页同样上报同一 website（`BaseLayout.astro:82` 硬编码域名）→ 主站阅读量/趋势被镜像流量混入。
13. **改名文章的历史浏览量丢失**：4 篇中文 slug 改名后计数器只查新路径，旧路径累计值从展示与趋势榜消失。
14. **CI 缺 lint/类型检查** `[核实]`（`grep "npm run lint\|astro check\|tsc --noEmit" .github/workflows/` = 0 命中）；非 main push 无门禁；`src/worker.ts` 无专属 workflow（仅靠全量 `npm test` 薄覆盖）。
15. **`scratch/` 类冗余** `[核实]`：根 `storage/`（3 文件，不部署）与 `public/storage/`（5 文件）重复；`UpdateLog/` 目录为空但仍有跳转项指向它。
16. **观测性全采样**（`head_sampling_rate: 1` + `persist: true`）叠加高频 `/api/views/*`，长期放大日志成本。
17. **断点自相矛盾**：`global.css` 的 `max-width:767` 块与 `max-width:768` 块**同时命中**，对 `.article-toc-shell` 给出互相冲突的定位（767 的三条规则实际失效）。
18. **死字段/死配置**：`featured`（5 篇 blog + works/tools/updates 都设了，全仓无读取方）、`externalUrl`、`data-history`、`data-article-transition`、`TransitionIndicator`（`[核实]` 全仓仅自身一处引用）、6 组无标记配合的死 CSS、10 个未使用 token、45 组重复选择器、`WORKER_VERSION`（`[核实]`）、`project.json`（`[核实]` 与现状相反的死文件）。
19. **4 篇 slug 日期与 frontmatter `date` 不一致**（文件 20260609/20260620/20260706×2 vs 2026-07-04/07-01/07-14/07-15）→ URL 用文件名、排序用 frontmatter，日期语义自相矛盾。
20. **`/markdown-tool/` 孤儿路由** `[核实]`：无任何站内 `href` 指向它，却进 sitemap（priority 0.7），与 `/works/tools/` 内嵌 widget 功能重复。

### P3 —— 文档漂移（15 项，详见 `lane-4-toolchain.md` §11）

高价值几条：`README.md:103` 与 `AGENTS.md:35` 宣称 `check` 会校验"标签"与"**R2 资产一致性**"（代码里既无 R2 也无白名单）；`README.md:24` 把跳转页说成在 `public/`（实际在 `dist/`，且 CI 禁止 `public/*.html`）；`AGENTS.md:63` 的 taxonomy 覆盖度数字（"13 篇"）已过期（14 篇）；`AGENTS.md:19,28-45` 缺 `edit-metadata`/`og`/`astro` 与多个脚本条目；`AGENTS.md:69` 的"手写覆盖拼音 slug"建议只对 `publish` 成立（`new-post`/API 无覆盖入口）；`project.json` 整体过期；`docs/grilling/2026-09-12-roadmap/00-project-map.md` 的 commit/测试/workflow/行数数字全过期；`docs/superpowers/**` 状态句仍写"未提交"；`move-to-astro/README.md` Phase 表止于 8（实际到 18）；`frontend-visual-reform/checklist.md` 的 151/151、19 pages 是历史快照无标注。

---

## 7. 需要你决策的开放问题

1. **`科技` 标签**：收编进白名单（并同步 `AGENTS.md`），还是改写为已有词（如 `人工智能`）？
2. **镜像站 canonical**：GitHub 仓库变量 `BASE_URL` 是否已设？若未设，镜像是否仍要有意保留自指 canonical？
3. **`/markdown-tool/` 孤儿页**：补站内入口，还是从 sitemap 摘掉（保留 URL 供外链）？
4. **taxonomy 要不要自动化**：把白名单校验加进 `check-posts.js`（约 10 行，可顺带守住 tag≠category）？
5. **CSP ↔ mammoth**：把 `cdnjs.cloudflare.com` 加进 `script-src`，还是删掉 CDN 分支只留本地 `/libs/`？
6. **`DESIGN.md` 与实现的三套数字**（断点 1024/700/420 vs 900/767/768/480；h1/hero clamp vs 固定值）：以文档为准改代码，还是以代码为准改文档？

---

## 8. 建议动作（按风险收益排序，均未执行）

**A. 零风险文档修正（不改行为）**
1. `README.md:103`、`AGENTS.md:35`、`site-maintenance-guide.md:352`：删掉 `check` 的"R2 资产一致性"，把"标签"降级为"类型校验"。
2. `README.md:24-25`：目录树与 CI 描述改为 Astro 现状（跳转页在 `dist/`，6 条 workflow）。
3. `AGENTS.md:19,28-45`：补 `npm run edit-metadata/og/astro` 与 `edit-metadata.js`、`backfill-image-dimensions.js`（后者在 README/QUICKSTART/site-maintenance-guide 三处零提及）。
4. `AGENTS.md:63`：13 篇 → 14 篇。
5. `project.json`：删除或重写（当前零引用且内容与现状相反）。
6. 给 `docs/grilling/2026-09-12-roadmap/00-project-map.md`、`docs/superpowers/**`、`frontend-visual-reform/checklist.md` 加"历史快照（日期）"标注。

**B. 小改动换大收益**
7. `index.astro`/`about.astro`/`styleguide.astro` 补 `astro:page-load` 监听（与既有 13 处约定一致）。
8. 给 4 处出站 fetch 加 `AbortSignal.timeout(...)`；失败态改用 `no-store`。
9. `check-posts.js` 加 taxonomy 白名单校验（可复用 `AGENTS.md` 词表常量）。
10. 修本地 `.dev.vars`（补 `UMAMI_USERNAME`/`UMAMI_PASSWORD`）或让代码兼容 `UMAMI_API_KEY`。
11. trending 空结果也写短 TTL 缓存（例如 60s），避免故障期放大。
12. `phase-2-content-check.yml` 加 `npm run lint`（可选 `astro check`）。
13. 把 `article-runtime` 的判据从 `.markdown-content` 收紧到文章详情作用域（解决工具页误伤）。
14. 删根 `storage/` 冗余副本；删除 `WORKER_VERSION` 或在 `wrangler.jsonc` 里真正注入。

**C. 需要决策后再动**
15. `科技` 标签处理、`/markdown-tool/` 去留、CSP↔cdnjs、`DESIGN.md` 与实现口径统一、镜像 canonical 策略、observability 采样率。

---

## 9. 探查方法与可复现性

- **Herdr 布局**：`w6:t1` 内 3 列 × 2 行 —— `w6:p1`（主管）、`w6:p2`+`w6:p4`（左中列上下）、`w6:p3`+`w6:p5`（右列上下），每个 agent pane 约 51×25。
- **分工**：`explore-shell`（外壳/路由/组件/SEO/样式）、`explore-content`（内容模型/渲染管线/合规）、`explore-runtime`（Worker/API/数据/部署）、`explore-toolchain`（工具链/发布/测试/CI/文档/历史）。四个 prompt 与四份报告同目录，均只读、只允许写自己的报告文件。
- **主管复核**：对分路结论抽样复跑（sitemap 22 条、og 15 张、17 条跳转、`科技` 违规、`.dev.vars` 键名、`astro:page-load` hook 分布、CSP 无 cdnjs、CI 无 lint、`WORKER_VERSION` 仅一处、无 `DeleteObject`、`TransitionIndicator` 无消费方、`/markdown-tool/` 无入链、根 `storage/` 重复、`UpdateLog/` 空）。
- **产物**：`tmp/project-explore/{lane-1-shell,lane-2-content,lane-3-runtime,lane-4-toolchain}.md`（本文件为其汇总层）。
