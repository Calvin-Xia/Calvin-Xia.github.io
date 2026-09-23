# 现行项目地图与规模基线（2026-09-23）

> **本文件取代 `docs/grilling/2026-09-12-roadmap/00-project-map.md`。**
> 旧文件是 2026-09-12 的历史快照，其中的 commit 数、测试文件数与行数、workflow 数、`tools/api-server.js` 行数与鉴权方式、Worker 路由条数、SEO 覆盖结论均已过期；它现在只在顶部保留「历史快照」标注，不再作为现状依据。
>
> 审计基线：`main` @ `b78e6a2`（`fix(comments): rerun giscus loader on client-side navigation`）；四路探查执行时工作树干净。
> **写作时工作树已不再干净**：批次①-b 正在并发修改 `README.md`/`AGENTS.md`/`site-maintenance-guide.md`/`QUICKSTART.md` 等文档并删除 `project.json`。本目录中的 `src/**`、`scripts/**`、`tests/**`、`.github/**`、`wrangler.jsonc`、`src/content/**` 事实均在未受 ①-b 影响的文件上复跑，仍然成立；涉及文档行号的结论（主要在 [`05-doc-drift.md`](05-doc-drift.md)）另标了当前行号。
> 构建产物（`dist/**`）取自 2026-09-20 16:17 的一次既有构建，未重新构建。
> 证据标度：
> - `[核实]` —— 上级 agent 亲自复跑命令确认；
> - `[复核]` —— 批次①-a 在本次会话内复跑确认（涉及 `src/**`/`scripts/**`/`tests/**`/`.github/**`/`src/content/**`/`dist/**`，未受批次①-b 的文档改动影响）；
> - `[报告]` —— 分路 agent 结论，仅带 `file:line`，未由本次会话二次复跑。
>
> 原始报告见本目录 [`reports/`](reports/)（四路探查原文 + 汇总层 + 四份 lane prompt）。

---

## 1. 一句话定位

一个**纯静态个人站**（Astro 6 全预渲染，无 adapter）+ **极薄的 Cloudflare Worker 边车**（3 个 `/api/*` 端点）+ 自研 Node 工具链**（Obsidian → R2 → markdown 发布，17 条 npm script）；配 **5 条 CI 门禁 workflow + 1 条 GitHub Pages 镜像部署**（共 6 个 workflow 文件）。没有数据库、没有 KV/D1/R2 绑定、没有定时任务；唯一外部状态是自部署 Umami 与 R2 对象存储。

---

## 2. 三层结构

```
┌─ 平面 A：构建期静态站（Astro 6，全预渲染，无 adapter） ────────────────┐
│  src/content/{blog,works,tools,updates} ──schema──▶ src/content.config.ts
│        │ remark×3 + rehype×3 + shiki 双主题
│        ▼
│  src/pages/** (15) ── src/layouts/BaseLayout.astro ── src/components/** (15)
│        │ 单一 SEO 源：src/lib/site-seo.js（6 处消费）
│        ▼
│  astro build → dist/ →（后处理）generate-og-images.mjs → generate-redirects.mjs
└──────────────────────────────────────────────────────────────────────┘
┌─ 平面 B：运行时 Worker（src/worker.ts，152 行） ─────────────────────┐
│  run_worker_first = ["/api/*"]；其余路径根本不进 Worker（ASSETS 直服）
│  /api/health        （可选 Bearer HEALTH_CHECK_TOKEN）
│  /api/trending?limit=（无鉴权，Cache API 600s，近 30 天）
│  /api/views/<slug>  （无鉴权，全时段累计，max-age=300）
│         └── 唯一数据源：自部署 Umami（login → /api/websites/{id}/metrics）
│  安全头在 public/_headers；Worker 不重复设置，也不设 CORS 头
└──────────────────────────────────────────────────────────────────────┘
┌─ 平面 C：工具链 / 发布 / 门禁 ──────────────────────────────────────┐
│  scripts/** 18 文件 3369 行 + tools/api-server.js 269 行
│    写入内核共用：scripts/post-utils.js（validatePostPayload / createPostFile）
│  测试：node:test（无第三方框架）；CI：6 workflow；部署：人工 wrangler + GHPages 镜像
└──────────────────────────────────────────────────────────────────────┘
```

结构事实（含证据）：
- `astro.config.mjs:40-42`：`base:'/'`、`outDir:'./dist'`，未声明 `output` → 默认 `static`。`site` 读 `process.env.BASE_URL`（`astro.config.mjs:17-25`）。`[报告]` lane-1 §1
- `wrangler.jsonc:6-11`：`assets.directory=./dist`、`binding=ASSETS`、`not_found_handling=404-page`、`run_worker_first=["/api/*"]`。`[报告]` lane-3 §1
- `src/worker.ts:136-152`：if/elseif/else 三段式分派，`/api/health` → `/api/trending` → 其余一切 `/api/*` 落 `/api/views/<slug>`。`[报告]` lane-3 §2
- `package.json:12`：`build = astro build && generate-og-images.mjs && generate-redirects.mjs`（**不含 deploy**）。`[复核]`

---

## 3. 四条端到端链路

### L1 md → 页面（构建期 + 客户端） `[报告]` lane-2 §4
`frontmatter` → Astro 内建 GFM → `remarkBlockquoteBreaks` → `remarkMarkHighlight`（`==高亮==`）→ `remarkMath` → mdast→hast → `rehypeImageDimensions` → `rehypeKatex` → `rehypeScrollableTables` → shiki 双主题（`github-light`/`github-dark`，`defaultColor:false`）→ `src/pages/articles/[...slug].astro` 的 `<Content />` 注入 `.markdown-content`。
随后客户端 `article-runtime.js`（由 `BaseLayout.astro:125-126` **全站加载**）跑 6 个增强模块 + Mermaid 懒加载。
⚠ **未启用 `rehype-raw`**：正文里的原生 `<img>` 保持 raw 节点，尺寸注入/懒加载完全不覆盖它们（`src/lib/rehype-image-dimensions.js:1-5` 注释自述）。

### L2 构建 → 上线 `[报告]` lane-3 §8
`npm run build`（astro + OG 卡 + 跳转页，三步）→ **人工** `npx wrangler deploy`（Worker + `dist/` 作 ASSETS；自定义域在 Cloudflare 控制台绑定）。
GH Pages 是**另一条独立通道**：`deploy.yml` 在 push `main` / `workflow_dispatch` 时 `npm ci → npm run build → upload-pages-artifact → deploy-pages`；无 Worker、不消费 `_headers`、canonical 取决于 `vars.BASE_URL`（`deploy.yml:36-38`）。`[复核]`

### L3 阅读量 / 趋势 `[报告]` lane-3 §4、§6
浏览器 pageview 由 Umami 官方脚本上报（`BaseLayout.astro:82`，`data-website-id` 是公开值）→ Worker 登录 Umami 取 `type=url` metrics → 文章页 span 显示（4 种降级文案）、首页热门卡（容器默认 `hidden`，失败即隐藏）。
**无点赞、无服务端去重、无防刷、无限流**；去重完全依赖 Umami 自身（全仓 grep `点赞|like-button|data-like` 零命中）。页面渲染对 API **零硬依赖**。

### L4 Obsidian → R2 → 上线 `[报告]` lane-4 §6
`npm run publish -- --dry-run <dir>`（零写盘）→ `npm run publish -- <dir>`：校验 env → 交互填元数据 → 探测 `imageDimensions` → 选头图（`sharp` 1600px webp → `src/assets/hero/<md 名>.webp`）→ `--force` 检查 → **先上传 R2、后写 md**（`scripts/publish-post.js:181-186`，失败不留死链）→ 写 `src/content/blog/<dirName>[-N].md`。
`[报告]` lane-4 §6 另注：R2 上传是单向的，代码中**没有** `DeleteObjectCommand`，同名 key 只能靠 `--force` 覆盖。

---

## 4. 实测规模基线

| 项 | 实测值 | 证据 |
|---|---|---|
| 受跟踪文件 | 263 | `[复核]` `git ls-files \| wc -l` |
| 主要文件类型 | js 108 / md 42 / astro 28 / json 26 / ts 21 / yml 6 | `[复核]` |
| 页面/端点 | 15 个 `src/pages/**` 文件 | `[复核]` `[核实]` |
| sitemap URL | 22 条（不含 `/styleguide`、`/new-post`、`/404`） | `[复核]` `dist/sitemap-0.xml` |
| 组件 / 客户端脚本 / lib | 15 / 17 / 32 | `[复核]` |
| 内容条目 | blog 14、works 15、tools 3、updates 1（52 条 timeline item） | `[复核]` 文件数；timeline 52 `[报告]` lane-2 §3.3 |
| 正文字数 | 约 36,518（汉字 32,171 + 英文词 1,347） | `[报告]` lane-2 §2 |
| 测试 | 55 文件 / 8,235 行 / 约 414 用例 / 85 describe | `[复核]` |
| CI workflow | 6 个 | `[复核]` |
| git 历史 | 237 commit | `[复核]` |
| `scripts/` | **18 文件 / 3,369 行** | `[复核]` `find scripts -type f`、`wc -l scripts/*` |
| `tools/` | 1 文件 / 269 行 | `[复核]` |
| 构建产物 | `dist/og` 15 张 PNG；`dist/articles` 19 目录（14 文章 + 4 中文旧路径 + `archive/`）；17 条跳转页 | `[复核]`（取自 2026-09-20 16:17 的既有 `dist/`，非重新构建） |
| `dist/rss.xml` / `dist/search-index.json` | 195,572 B / 97,064 B | `[复核]` |
| npm scripts | 17 条（`dev`/`build`/`og`/`redirects`/`preview`/`astro`/`api`/`check`/`edit-metadata`/`list-posts`/`new-post`/`publish`/`stats`/`test`/`test:coverage`/`lint`/`lint:fix`） | `[复核]` `node -e` 读 `package.json` |
| 依赖 | dependencies 13 / devDependencies 20（**无测试框架依赖**：`node:test`） | `[复核]` |
| Node 要求 | `>=22.12.0` | `[核实]` `package.json:8` |

**目录构成注**：`dist/articles` 的 19 个目录 = 14 篇文章页 + 4 条中文旧 slug 跳转页（`20251231-2025年度总结/`、`20260204-返校宣讲稿/`、`20260312-返校宣讲回顾/`、`20260315-两小时，环线，慢行/`）+ `archive/`。`[复核]` `ls -d dist/articles/*/`

---

## 5. 必须遵守的不变量（契约清单）

| 契约 | 内容 | 由什么守住 |
|---|---|---|
| 文件即 URL | `generateId: fileStem`（`src/content.config.ts:5,28`）；文件名只能 ASCII（`check-posts.js:180-186`） | `npm run check` error 级 + CI |
| 改名必补跳转 | 覆盖 `/blog/<旧名>.html` 与 `/articles/<旧名>/` 两种历史形态 | `tests/legacy-redirects.test.js:97-113` + `legacy-redirects-check.yml` |
| 跳转页不进 `public/` | 一律 build 期生成到 `dist/` | CI 断言 `public/` 无 `.html` |
| 跳转页四重信号 | meta refresh + canonical + `location.replace` + 无 JS 兜底 `<a>`；生成器写完读回磁盘自检，不合格即 build 失败 | `scripts/generate-redirects.mjs:48-63`、`legacy-redirects.js:358-378` |
| giscus 双约束 | 保留 `data-astro-rerun`（`GiscusComments.astro:16`）；全仓禁止 `transition:persist` | `tests/giscus-comments.test.js`（源码 + dist 双断言） |
| referrer 策略 | 站点保持 `strict-origin-when-cross-origin`（`BaseLayout.astro:70`）；本地 CDN 代理固定 `Referer: https://workers.calvin-xia.cn/`（`astro.config.mjs:14`） | 文档约束 + 代码 |
| 发布顺序 | 先上传 R2，后写 md | `scripts/publish-post.js:181-186` + 单测 |
| CLI/API 写入规则一致 | 同一套 `post-utils.js`（`validatePostPayload` + `createPostFile`，`flag:'wx'`） | `scripts/new-post-cli.js:5,47,54`、`tools/api-server.js:8,239` |
| 密钥不入仓 | `.env*` / `.dev.vars*` 忽略，只留 `.example` | `.gitignore:38-41` `[复核]` |
| Blog taxonomy | `category` 三选一、`tags` 封闭白名单、tag≠category、独立数组项 | **在审计基线上仅文档约束**：`check-posts.js` 不查白名单（`科技` 违规为现实反例）；批次①-b 已把文档改为「`check` 校验白名单」，代码校验属批次③ —— 详见 [`05-doc-drift.md`](05-doc-drift.md) §3 |

---

## 6. 本批次对基线数字的三处修正

1. **`scripts/` 是 18 文件 / 3,369 行**，不是汇总层写的「19 个 / 3638 行」。差额正好是 `tools/api-server.js`（1 文件 / 269 行）——即 19 − 1 = 18、3638 − 269 = 3369，汇总层显然把 `tools/*` 一并计入了 `scripts/*` 的 glob。`[复核]`
2. 汇总层「组件 / 脚本 / lib = 15 / 17 / 32」在递归计数下正确（`src/scripts` 含 `articles-index/` 4 个子文件、`src/lib` 含 `article-enhancements/` 6 个子文件），非递归 `ls` 会得到 14 / 26。`[复核]`
3. 汇总层 §0 写「配 6 条 CI 门禁 + GitHub Pages 自动镜像」，但 `.github/workflows/` 一共只有 **6 个文件**（`astro-build-check`、`phase-2-content-check`、`cli-commands-check`、`legacy-redirects-check`、`metadata-editor-check`、`deploy`），其中 `deploy.yml` 就是那条镜像部署。准确口径是 **5 条门禁 + 1 条部署**。`[复核]`

---

## 7. 报告索引（原始证据）

四份分路报告与汇总层已从临时目录 `tmp/project-explore/`（gitignore 覆盖）**移动**到本目录 `reports/`，内容逐字未改；报告内部出现的自述路径仍是搬迁前的 `tmp/project-explore/...`，那是写作当时的路径。

| 新路径 | 原路径 | 行数 | 内容 |
|---|---|---|---|
| `reports/00-overview-synthesis.md` | `tmp/project-explore/00-overview.md` | 202 | 上级 agent 的汇总层：系统地图、风险清单、核实标记、开放问题 |
| `reports/lane-1-shell.md` | `tmp/project-explore/lane-1-shell.md` | 261 | 站点外壳 / 路由 / 组件 / SEO / 样式 |
| `reports/lane-2-content.md` | `tmp/project-explore/lane-2-content.md` | 410 | 内容模型 / 渲染管线 / 内容合规 |
| `reports/lane-3-runtime.md` | `tmp/project-explore/lane-3-runtime.md` | 282 | Worker 运行时 / API / 数据 / 部署拓扑 |
| `reports/lane-4-toolchain.md` | `tmp/project-explore/lane-4-toolchain.md` | 458 | 工具链 / 发布流水线 / 测试 / CI / 文档与历史 |
| `reports/prompts/lane1.prompt.md` … `lane4.prompt.md` | 同名 | 28/30/26/27 | 四路探查的任务书（只读约束与必答问题） |

探查方法（`[核实]` 见 `reports/00-overview-synthesis.md` §9）：Herdr pane 网格 `w6:p1` 主管 + `w6:p2/p4/p3/p5` 四个 pi agent 四路并行只读探查；主管对分路结论抽样复跑。

---

## 8. 下游文档

- [`01-design-tree.md`](01-design-tree.md) —— 设计树：分支与已定/待裁决结果
- [`02-rounds.md`](02-rounds.md) —— 两轮问答记录（Q1–Q10）
- [`03-decisions.md`](03-decisions.md) —— 决策表、C 类待裁决清单、未决事实
- [`04-risks.md`](04-risks.md) —— P1/P2/P3 风险清单与批次归属
- [`05-doc-drift.md`](05-doc-drift.md) —— 文档与实现不符明细表
