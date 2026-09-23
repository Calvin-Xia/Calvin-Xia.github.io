# 风险清单（2026-09-23 审计）

> 标度：
> - `[核实]` —— **上级 agent 亲自复跑确认**（`reports/00-overview-synthesis.md` §9 列出复核项）；
> - `[复核]` —— **批次①-a 在本次会话内复跑确认**，命令与结果写在本表「复跑证据」列；
> - `[报告]` —— 分路 agent 结论，仅带 `file:line`，本次未复跑。
>
> **归属的口径（重要）**：批次② 与批次③ 的归属**不是**本文件的推测，而是**用户在计划确认环节批准过的固定条目表** —— 批次② 仅 6 项、批次③ 仅 4 项，逐项内容见 [`01-design-tree.md`](01-design-tree.md) B5。凡不在那 10 项之内的条目，一律记为 `未定`（汇总层标为需裁决但未获批准）或 `C 类`（需偏好裁决，见 [`03-decisions.md`](03-decisions.md) §2），**不得因为「看起来像低风险改动」就自行归入批次②/③**。
> 分级沿用 `reports/00-overview-synthesis.md` §6 的 P1/P2/P3 去重结果，**未删任何 P2/P3 条目**；分路报告独有、汇总层未收录的条目单列在 §3.2 与 §4。

---

## 1. P1 —— 会影响线上行为或开发流程

| # | 风险 | 标度 | 复跑证据 / 出处 | 归属 |
|---|---|---|---|---|
| P1-1 | **CSP 与 mammoth 的 CDN 分支冲突**：`public/_headers` 的 `script-src` 不含 `cdnjs.cloudflare.com`，但 `random-selector.ts` 仍 CDN 优先、`BaseLayout.astro` 还 preconnect cdnjs → 生产必然先失败一次再回落 `/libs/mammoth/`，并产生 CSP 控制台报错 | `[核实]` CSP 内容；`[复核]` 同结论 | `public/_headers:2`（script-src = `'self' 'unsafe-inline' https://giscus.app https://umami.calvin-xia.cn https://static.cloudflareinsights.com`）；`src/scripts/random-selector.ts:21,149-156`；`src/layouts/BaseLayout.astro:71-72` | **批次③ 3-2**（已批准）：去掉 `random-selector.ts` 的 CDN 分支，只留本地 `/libs/mammoth/`；删 `BaseLayout.astro:71-72` 的 cdnjs preconnect/dns-prefetch；`markdown-renderer.ts` 里「导出用独立 HTML」那份**不动**；同步更新 `tests/phase-3-tools.test.js:134` |
| P1-2 | **出站 fetch 全无超时**：上游「半死」（连接不断、响应不发）时降级链（只在抛错时触发）永不触发，请求挂到平台超时 | `[报告]` | `src/lib/umami-view-counter.js:75-79,108-110`、`src/lib/umami-trending.js:37-39`、`src/lib/health-check.js:19`；`reports/lane-3-runtime.md` §10-P1-2 | **批次② 2-1**（已批准）：统一 `AbortSignal.timeout(8000)` |
| P1-3 | **失败态被缓存 5 分钟**：`jsonResponse()` 无条件写 `Cache-Control: public, max-age=300`，`{views:null}` 与 400 也带该头 → 一次瞬时故障在浏览器固化 5 分钟 | `[报告]` | `src/lib/umami-view-counter.js:8-14,140-151`；`reports/lane-3-runtime.md` §10-P1-3 | **批次② 2-2**（已批准）：只在成功态给 `max-age=300`，400 与 `{views:null}` 改 `no-store` |
| P1-4 | **trending 空结果不缓存**：只有 `trending.length > 0` 才 `cache.put` → 故障期每次首页访问都同步打上游（含登录重试） | `[报告]` | `src/lib/umami-trending.js:96-98`；`reports/lane-3-runtime.md` §10-P1-4 | **批次② 2-3**（已批准）：空结果写 60s 短 TTL |
| P1-5 | **三个页面脚本缺 `astro:page-load`**：`index.astro` 的 `initHomePage` 只挂 `DOMContentLoaded`（同页 `initTrendingSection` 却挂了 `astro:page-load`）；`about.astro`、`styleguide.astro` 同病 → **重复站内导航**后入场动画 / ripple / 邮箱链接 / 时钟失效 | `[核实]` hook 分布；`[复核]` 逐行确认 | `src/pages/index.astro:172`（`astro:page-load`）vs `:193`（`DOMContentLoaded`）；`src/pages/about.astro:71`；`src/pages/styleguide.astro:123`；全仓 `astro:page-load` 共 13 处 | **批次③ 3-1**（已批准）：三处补 `astro:page-load` |
| P1-6 | **文章增强全站生效并误伤工具页**：`article-runtime` 由 `BaseLayout` 全站加载，判据是 `.markdown-content`，而工具预览与发帖预览用了同一个类 → 工具预览被加标题锚点 / 灯箱 / 选区工具条 / 逐段渐显 | `[报告]` | `src/layouts/BaseLayout.astro:125-126`；`src/lib/article-enhancements/article-enhancements.js:21`；`src/scripts/article-mermaid.js:36`；`[复核]` `src/components/MarkdownToolWidget.astro:52`、`src/components/NewPostForm.astro:60` 均为 `class="markdown-content"` | **批次③ 3-4**（已批准）：判据从全局 `.markdown-content` 收紧到文章详情容器 |
| P1-7 | **图片尺寸链有洞**：`rehypeImageDimensions` 只处理 markdown 语法图片（未启用 `rehype-raw`），`20251231-year-in-review.md` 的 22 张 raw `<img>` 让 22 条 `imageDimensions` 成为孤儿（→ CLS）；未命中 manifest 的图**连 `loading` 都不注入** | `[报告]` | `src/lib/rehype-image-dimensions.js:1-5`（注释自述 raw HTML 不处理）、`:78-88`；`src/content/blog/20251231-year-in-review.md`（frontmatter 27 条 manifest vs 正文 22 张 raw `<img>`）；`reports/lane-2-content.md` §5.1、§9-2/3/4 | **未定**（不在已批准的 10 项内 —— 孤儿 manifest 部分可能还要配合数据清理） |
| P1-8 | **本地 `.dev.vars` 键漂移**：本机只有 `{HEALTH_CHECK_TOKEN, UMAMI_API_KEY}`，模板是 `{UMAMI_USERNAME, UMAMI_PASSWORD, HEALTH_CHECK_TOKEN}`，代码只读后两者 → 本地 `wrangler dev` 下浏览量 / health 必坏；`UMAMI_API_KEY` 全仓零引用 | `[核实]`；`[复核]` 键集合 | `[复核]` `grep -o '^[A-Za-z_][A-Za-z0-9_]*' .dev.vars` → `HEALTH_CHECK_TOKEN`、`UMAMI_API_KEY`；`.dev.vars.example:5-7`；`src/lib/umami-view-counter.js:48-63` | **只记录不改**（Q10）→ 记录已完成于 [`03-decisions.md`](03-decisions.md) §1；代码改动未获批准 |
| P1-9 | **部署文档误导 + 无新鲜度闸门**：`README.md` 的表述容易被读成 `wrangler deploy` 会自动构建，而 `build` 脚本不含 wrangler、`wrangler.jsonc` 无 build 配置 → 有过期 `dist/` 上线风险；且无 CI 校验 `dist` 与 HEAD 一致、无生产 smoke test | `[报告]`；`[核实]` 脚本定义 | `README.md:113`（①-b 已改为显式两步）；`package.json:12`；`reports/lane-3-runtime.md` §8.3、§10-P2-8 | 文档部分 **批次①**（①-b 已落地）；**CI 新鲜度闸门 → 未定**（不在已批准的批次② 6 项内） |
| P1-10 | **taxonomy 无自动化**：`check-posts.js` 对 `tags` 只断言「非空字符串数组」，白名单 / 数量 / tag≠category 全不查；现实已违规 —— `20260918-zcode-…-2.md:7` = `"科技"` | `[复核]` | `[复核]` `npm run check` → 「检查完成：14 篇文章，0 个错误，0 个警告」；`[复核]` `grep -n 科技 src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md` → `7:  - "科技"`；`scripts/check-posts.js` 的 tags 校验仅类型 | **批次③ 3-3**（已批准）：校验落进 `scripts/check-posts.js` + 该文 tags 追加 `人工智能`；`AGENTS.md` 白名单收编 `科技` 部分 **批次①**（①-b 已落地，见 [`05-doc-drift.md`](05-doc-drift.md) §3） |

---

## 2. P2 —— 一致性 / 数据质量 / 成本

| # | 风险 | 标度 | 复跑证据 / 出处 | 归属 |
|---|---|---|---|---|
| P2-11 | **镜像站 canonical 自指**：`deploy.yml` 用 `vars.BASE_URL` 兜底 `https://calvin-xia.github.io` 当 `site` → 若仓库变量未设，GH Pages 的 canonical/og:url/sitemap 指向自己，与主域形成两份互指副本 | `[报告]`；`[复核]` 兜底值 | `[复核]` `.github/workflows/deploy.yml:37-38` = `BASE_URL: ${{ vars.BASE_URL \|\| 'https://calvin-xia.github.io' }}`；`astro.config.mjs:17-25,40` | **已实测排除（2026-09-23）**：镜像内容页的 canonical/og:url 实测指向 `https://calvin-xia.cn/...`，不自指；只有 legacy 跳转页的 canonical 走 `BASE_URL`（极低影响，不修）。见 §10 |
| P2-12 | **Umami 数据被镜像污染**：查询只按 `url` 路径不过滤 hostname，而镜像页同样上报同一 website（website-id 硬编码）→ 主站阅读量/趋势被镜像流量混入 | `[报告]` | `src/lib/umami-view-counter.js:103-104`、`src/lib/umami-trending.js:32-34`、`src/layouts/BaseLayout.astro:82`；`reports/lane-3-runtime.md` §10-P2-5 | **未定**（量化方式见 [`03-decisions.md`](03-decisions.md) F5） |
| P2-13 | **改名文章的历史浏览量丢失**：4 篇中文 slug 改名后计数器只查新路径，旧路径累计值从展示与趋势榜消失 | `[报告]`；`[复核]` 映射表 17 条含 4 条改名 | `[复核]` `scripts/legacy-redirects.js` 的 4 条 `/articles/<中文>/` → 新 slug；`src/lib/umami-view-counter.js:41-46`；`reports/lane-3-runtime.md` §10-P2-6 | **未定** |
| P2-14 | **CI 缺 lint / 类型检查**：`npm run lint`、`astro check`、`tsc --noEmit` 全都不在 CI 里；且 4 条 check 只 `push: [main]`，非 main 分支 push 零门禁；`src/worker.ts` 无专属 workflow | `[核实]` | `[复核]` `grep -rn "npm run lint\|astro check\|tsc --noEmit" .github/workflows/` → **0 命中**；`reports/lane-4-toolchain.md` §10 | **批次② 2-4**（已批准）：`npm run lint` 加进 `phase-2-content-check.yml`；`astro check`/`tsc`/非 main 门禁/worker 专属 workflow **未定** |
| P2-15 | **冗余副本与空目录**：根 `storage/`（3 文件，不在 `public/` 下故不部署）与 `public/storage/`（5 文件）重复；`UpdateLog/` 空但仍有跳转项指向它 | `[核实]`；`[复核]` | `[复核]` `ls storage/` = 3 项（**且被 `git ls-files` 跟踪 → 删除动作是 `git rm`**）、`ls public/storage/` = 5 项；`[复核]` `ls -la UpdateLog/` 只有 `.`/`..`；`scripts/legacy-redirects.js:20` | 根 `storage/` 删除 → **批次② 2-6**（已批准）；`UpdateLog/` 跳转项**保留**（源目录已删属预期） |
| P2-16 | **观测性全采样**：logs/traces `head_sampling_rate: 1` + `persist: true` 叠加高频 `/api/views/*`，长期放大日志成本 | `[报告]` | `wrangler.jsonc:16-30`；`reports/lane-3-runtime.md` §10-P2-9 | **未定** |
| P2-17 | **断点自相矛盾**：`max-width:767px` 块与 `max-width:768px` 块**同时命中**，对 `.article-toc-shell` 给出互相冲突的定位，767 块的三条 `.article-toc*` 规则实际失效 | `[报告]`；`[复核]` 块存在性 | `[复核]` `grep -n "@media" src/styles/global.css` → `:2654 (max-width:767px)`、`:2798 (max-width:768px)`；`reports/lane-1-shell.md` §11-4 | **C 类（C4）** |
| P2-18 | **死字段 / 死配置**：`WORKER_VERSION`（wrangler 从未定义，`/api/health` 永远报 `0.0.1`）；`featured`（5 篇 blog + works/tools/updates 全设，全仓无读取方）、`externalUrl`、`data-history`、`data-article-transition`、`TransitionIndicator` 整条链路、6 组无标记配合的死 CSS、10 个未使用 token、45 组重复选择器；`project.json`（已删） | `[核实]`（`WORKER_VERSION` / `TransitionIndicator` / `project.json`）；`[报告]`（其余） | `[复核]` `grep -rn WORKER_VERSION src/ wrangler.jsonc` → 仅 `src/worker.ts:12,79`；`[复核]` `TransitionIndicator` 只有组件自身 + `BaseLayout.astro:22,123` + CSS `:1304,2484,2500,2504,2508`，无 JS 添加 `.active`；`reports/lane-1-shell.md` §11-7～13 | **拆分**：`WORKER_VERSION` → **批次② 2-5**（已批准：改用 Workers 原生 `version_metadata` 绑定，动 `wrangler.jsonc` + `src/worker.ts`）；**其余死字段/死 CSS → C 类（C5）**；`project.json` → **批次①**（①-b 已删） |
| P2-19 | **4 篇 slug 日期与 frontmatter `date` 不一致**：URL 用文件名、排序/归档用 frontmatter，日期语义自相矛盾 | `[报告]` | `reports/lane-2-content.md` §8.4（4 篇逐条列出，含 `file:line`） | 批次①（Q9：只补规则，不改那 4 篇；①-b 已落地） |
| P2-20 | **`/markdown-tool/` 孤儿路由**：无任何站内 `href` 指向它，却进 sitemap（priority 0.7），与 `/works/tools/` 内嵌 widget 功能重复 | `[核实]`；`[复核]` 入链为 0 | `[复核]` `grep -rn "markdown-tool" src/**` 无 `href` 命中（仅 CSS 类名 / tab id / `site-seo.js:200` 的 sitemap 分支 / `markdown-renderer.ts:45` 的 storage 键）；`[复核]` sitemap 22 条含 `https://calvin-xia.cn/markdown-tool/` | **C 类（C2）** |

---

## 3. P3 —— 文档漂移与结构性问题

### 3.1 文档漂移（lane-4 §11 的 15 条 → 见 [`05-doc-drift.md`](05-doc-drift.md)）

明细表连同 `DESIGN.md` 的 8 项对照已单独整理为 [`05-doc-drift.md`](05-doc-drift.md)，每行给出文档位置、代码证据、判定方向与状态。本文件不再重复。

### 3.2 分路报告独有的结构性问题（汇总层未单列）

> **以下条目除 P3-26 外全部为「未定」**：它们不在用户批准的批次②/③ 条目表内。§4 列出了其中较自然的候选增补，但**未经用户确认**。

| # | 风险 | 标度 | 出处 | 归属 |
|---|---|---|---|---|
| P3-21 | Worker 路由是 if/elseif/else 三段式，新增路由必须插在 `else` 之前；「ASSETS 兜底」藏在浏览量模块内（抽象错位） | `[报告]` | `src/worker.ts:141-147`；`src/lib/umami-view-counter.js:134-138` | **未定**（候选增补，未确认） |
| P3-22 | Worker 顶层 `fetch` 无 try/catch：异常直接变平台 500（非 JSON） | `[报告]` | `src/worker.ts:137-151` | **未定**（候选增补，未确认） |
| P3-23 | `/api/health?cache=N` 的 `N` 无上限，任意正整数都会写进 `Cache-Control` | `[报告]` | `src/worker.ts:49-58` | **未定**（候选增补，未确认） |
| P3-24 | 安全日志与告警计数是 isolate 内存态（`logs.shift()` 为 O(n)，`maxSize=1000`；每 100 次按 isolate 计数）→ 告警阈值与统计口径不稳定、无持久化 | `[报告]` | `src/lib/security-logger.js:3-12`；`src/worker.ts:33-34,102-107` | **未定**（要改就改告警语义，需裁决） |
| P3-25 | CDN 域名白名单三处维护：`cdn-hosts.js`（权威）、`local-cdn-proxy.js`（选择器手写）、`astro.config.mjs`（代理 target 手写） | `[报告]` | `src/lib/cdn-hosts.js:3-11`；`src/scripts/local-cdn-proxy.js:3-6`；`astro.config.mjs:70-83` | **未定**（候选增补，未确认） |
| P3-26 | 回滚链路空白：基线全仓无 `rollback`/`回滚` 说明，生产回滚完全依赖控制台操作经验 | `[报告]`；`[复核]` 已修复 | `site-maintenance-guide.md:384-389` 新增「### 回滚」小节（Worker `wrangler deployments list` + `wrangler rollback [version-id] --name mr-xia-site`、控制台 Deployments 回滚、内容 `git revert` + 重建重部、GH Pages re-run，并写明「R2 无删除逻辑」与「无 `dist` 新鲜度闸门」两条限制） | **已关闭**：由上级 agent 直接补齐文档（不在批次①-a 写入范围，仅登记） |
| P3-27 | `/api/*` 兜底行为的单测与生产接线不同：测试断言「ASSETS 不可用时 404」，而生产里非 `/api/*` 路径根本不进 Worker；`worker.ts` 无路由表集成测试 | `[报告]` | `tests/umami-view-counter.test.js:30-38`；`wrangler.jsonc:10`；`reports/lane-3-runtime.md` §10-P3-18 | **未定**（候选增补，未确认） |
| P3-28 | i18n 硬编码中文：`markdown-renderer.ts` 的全部状态串与 `article-mermaid.js` 的 4 处文案未走 `t()`，而 `random-selector.ts`/`timer.ts` 全量走 —— 属遗漏而非约定 | `[报告]` | `src/scripts/markdown-renderer.ts:42-43,441,515,533,571,588,689,695,701,708`；`src/scripts/article-mermaid.js:13,18,42,74`；`reports/lane-1-shell.md` §5 | **未定** |
| P3-29 | `global.css:2952` 格式化事故：`}` 与 `.article-cover img {` 粘在同一行，是唯一一处（像补丁合并留下的痕迹） | `[报告]` | `src/styles/global.css:2952` | **未定**（候选增补，未确认） |
| P3-30 | 归档条目写了 `tags` 但渲染层只用 `monthDay / title / category` → 未消费字段 | `[报告]` | `src/lib/archive.js:3-14`；`src/pages/articles/archive.astro:27-31` | **未定**（候选增补，未确认） |
| P3-31 | `readTime` 人工值与自动统计冲突：自动 16/5/4 分钟，frontmatter 写 25/7/7 分钟；展示层用人工值覆盖，`wordCountDisplay` 仍是自动值 → 同一页可能给出两套读时 | `[报告]` | `src/content/blog/20260204-school-talk.md:11`、`20260312-school-talk-review.md:12`、`20260315-two-hour-loop-ride.md:11`；`src/pages/articles/[...slug].astro:35`；`src/lib/content.ts:35-36` | **未定** |
| P3-32 | `tools.filePath` 指向旧路径且跳转丢 hash：`/timetable.html#timer`、`/timetable.html#random-selector` 经 meta-refresh 跳到 `/works/tools/` 后落在页首，搜索索引点进去到不了对应工具 | `[报告]` | `src/content/tools/online-timer.json:5`、`random-selector.json:5`、`markdown-to-html.json:5`；`scripts/legacy-redirects.js:18-19` | **未定** |
| P3-33 | 内容里的 H1 产出重复 `<h1>` 且不进目录：文章页已有 `<h1 class="page-title">`，而正文还有 4 个 `#`；`buildHeadingIndex` 只认 `h2,h3,h4` → 同页多 H1、内容 H1 不在目录中 | `[报告]` | `src/content/blog/20251231-year-in-review.md:104,228,292`、`20260918-…-2.md:10`；`src/lib/article-enhancements/heading-index.js:3`；`src/pages/articles/[...slug].astro:87` | **未定** |
| P3-34 | `public/storage/Beian.webp` 未被任何页面引用（页面用 `/storage/Beian.png`），只出现在 SW 预缓存列表 | `[报告]` | `src/components/Footer.astro:38`；`public/sw-tools.js:9` | **未定**（候选增补，未确认） |
| P3-35 | 无 `hreflang`、服务端只出中文：`getCurrentLang()` 构建期回落 zh-CN，英文页面对爬虫不存在；`<meta description>` 的客户端改写对 SEO 无效 | `[报告]` | `src/lib/i18n.ts:23-25`；`reports/lane-1-shell.md` §11-17 | **未定**（要不要做多语言 SEO 是产品决策） |

---

## 4. 覆盖空洞（无测试 / 无 CI 守护的地方）

这些不是「已知缺陷」而是「缺网」。**除 `npm run lint` 那一行外，全部为未定**（不在已批准条目内；其中数条列在 [`01-design-tree.md`](01-design-tree.md) B5 的「候选增补（未经用户确认）」里）。

| 空洞 | 标度 | 出处 | 归属 |
|---|---|---|---|
| `npm run lint` 从未在流水线执行过 | `[复核]` | `[复核]` `grep -rn "npm run lint\|astro check\|tsc --noEmit" .github/workflows/` → 0 | **批次② 2-4**（已批准；`astro check`/`tsc` 部分未定） |
| 真实 R2 上传路径（`uploadAssets` 全用注入的假 client）、`createR2Client`/`requireEnv` 的真实凭证路径未测；R2 上传不可撤销、代码无 `DeleteObjectCommand` | `[报告]` | `tests/publish-post.test.js:231-275`；`reports/lane-4-toolchain.md` §9、§13-6 | 未定（候选增补，未确认） |
| `sharp` 真实产物未校验尺寸（只断言调用参数） | `[报告]` | `tests/publish-hero.test.js`；`reports/lane-4-toolchain.md` §9-2 | 未定（候选增补，未确认） |
| `backfill-image-dimensions.js` 的真实网络与 `Referer` 头（只在源码注释里，无断言真正发送） | `[报告]` | `scripts/backfill-image-dimensions.js:75-76`；`reports/lane-4-toolchain.md` §9-3 | 未定（候选增补，未确认） |
| `generate-og-images.mjs` 的写盘循环不在 `npm test` 内，只由 CI 内联脚本兜底 | `[报告]` | `.github/workflows/astro-build-check.yml:47-63`；`reports/lane-4-toolchain.md` §9-4 | 未定（候选增补，未确认） |
| `src/worker.ts` 真 fetch 路由无端到端测试（`security-logger.test.js` 的动态 import 是唯一触点） | `[报告]` | `reports/lane-4-toolchain.md` §9-5；`reports/lane-3-runtime.md` §10-P3-18 | 未定（候选增补，未确认） |
| 发布流水线无端到端 workflow（`cli-commands-check` 只跑单测 + `--help`/`--version`/未知 flag + 临时目录 `new-post`） | `[报告]` | `.github/workflows/cli-commands-check.yml:41-75` | 未定（候选增补，未确认） |
| 无测试覆盖断点完整性、`astro:page-load` 完整性、死 CSS、CSP↔CDN 一致性、taxonomy 白名单 | `[报告]` | `reports/lane-1-shell.md` §11-18；`reports/lane-4-toolchain.md` §9-8 | 部分将在批次②/③ 的批准条目内顺带补齐（P1-5 的 hook、P1-1 的 CSP 断言、P1-10 的 taxonomy），其余未定 |
| `check` 不校验 legacy 跳转覆盖（改名文章漏补跳转不会被 `npm run check` 拦住，靠 `legacy-redirects-check.yml` 的 paths 触发） | `[报告]` | `reports/lane-4-toolchain.md` §8 | 未定（候选增补，未确认） |
| `astro-build-check.yml` 用中文字符串 `Calvin Xia` 做品牌断言 → 改品牌名要同步改 CI | `[报告]` | `.github/workflows/astro-build-check.yml:39`；`reports/lane-4-toolchain.md` §10-7 | 未定（候选增补，未确认） |

---

## 5. 归属统计

**已批准的批次②（6 项）** —— 详细手法见 [`01-design-tree.md`](01-design-tree.md) B5：

| 条目 | 对应风险 |
|---|---|
| 1. 四处出站 fetch 加 `AbortSignal.timeout(8000)` | P1-2 |
| 2. 失败态改 `no-store`（400 与 `{views:null}`） | P1-3 |
| 3. trending 空结果写 60s 短 TTL | P1-4 |
| 4. `npm run lint` 加进 `phase-2-content-check.yml` | P2-14（lint 部分）、§4 的 lint 行 |
| 5. `WORKER_VERSION` 改用 Workers 原生 `version_metadata` 绑定 | P2-18（`WORKER_VERSION` 部分） |
| 6. 删除根 `storage/` 的 3 个无引用跟踪文件（`git rm`） | P2-15（存储部分） |

上表编号 1–6 在本文件内记作 **2-1…2-6**，与 [`01-design-tree.md`](01-design-tree.md) B5 的表号一致。

**已批准的批次③（4 项）**：

| 条目 | 对应风险 |
|---|---|
| 1. 三处补 `astro:page-load`（`index.astro` 的 `initHomePage`、`about.astro`、`styleguide.astro`） | P1-5 |
| 2. CSP↔cdnjs：去掉 `random-selector.ts` 的 CDN 分支 + 删 cdnjs preconnect；同步更新 `tests/phase-3-tools.test.js:134` | P1-1 |
| 3. taxonomy 校验落进 `scripts/check-posts.js` + `20260918-zcode-…-2.md` 追加 `人工智能` | P1-10（校验与内容部分） |
| 4. 文章增强作用域收紧到文章详情容器 | P1-6 |

上表编号 1–4 在本文件内记作 **3-1…3-4**，与 [`01-design-tree.md`](01-design-tree.md) B5 的表号一致。

**其余归属**：

| 归属 | 条目 |
|---|---|
| 批次①（文档与快照，已基本收口） | P1-9（文档部分，①-b 已落地）、P1-10（白名单收编，①-b 已落地）、P2-18（`project.json` 已删）、P2-19、[`05-doc-drift.md`](05-doc-drift.md) 的 11 条操作型漂移 + 4 条快照标注（另有 1 条反向确认行）、`DESIGN.md` 的实现状态标注 |
| 只记录不改（Q10） | P1-8 |
| 已关闭（上级 agent 直接补齐） | P3-26（回滚链路） |
| C 类（需偏好裁决） | C1 ← P2-11；C2 ← P2-20；C3 ← `05-doc-drift.md` 的 `DESIGN.md` 数值口径（标注已完成，口径未定）；C4 ← P2-17；C5 ← P2-18（除 `WORKER_VERSION` 外的死字段/死 CSS） |
| **未定**（不在已批准的 10 项内，需再裁决或加批） | P1-7、P2-12、P2-13、P2-16、P3-21～P3-35（除已关闭的 P3-26）、§4 的覆盖空洞（除 lint 一行） |

---

## 6. 批次② 落地记录（2026-09-23）

六项已批准条目全部落地，逐项实测与原规划的差异如下：

| 编号 | 落地情况 | 与规划的差异 / 需要知道的取舍 |
|---|---|---|
| 2-1 | 四处出站调用统一 `AbortSignal.timeout(8000)`（常量 `UPSTREAM_FETCH_TIMEOUT_MS`） | `health-check.js` 本身不发请求，它复用 `requestUmamiToken`，所以超时在 `umami-view-counter.js` 内部生效 —— 无需在 health 侧重复加 signal |
| 2-2 | `jsonResponse()` 的默认缓存头改为 `no-store`，只有拿到真实数字的成功态显式传 `max-age=300` | 默认值反转让“忘记传参”的失败面变安全；调用点已逐一显式传值 |
| 2-3 | 空结果与故障降级都写入边缘缓存，TTL 60s；成功态仍 600s | **取舍（已被上级 agent 接受并在此备案）**：故障响应发给浏览器的头由 `no-store` 变为 `public, max-age=60`。若要让浏览器侧仍 `no-store`，需要把「边缘缓存副本」与「返回给客户端的响应」拆成两个对象；当前选择是用最多 60s 的陈旧空结果换取「故障期不再每次首页访问都打上游（含登录重试）」。首页热门卡默认 `hidden`，因此用户可见影响是“恢复后最多 60s 内卡片仍不出现”。 |
| 2-4 | `npm run lint` 加在 `phase-2-content-check.yml` 的 `npm test` 之前 | 未加 `--max-warnings 0`（现有 warning 不属本批），触发条件不变 |
| 2-5 | `wrangler.jsonc` 增 `version_metadata.binding = CF_VERSION_METADATA`；`worker.ts` 的 `Env` 删 `WORKER_VERSION`、health 版本取 `env.CF_VERSION_METADATA?.id ?? 'dev'`；`checkHealth(env)` 不再接第二参数 | 顺带清掉 `tests/phase-7-integration.test.js` 里遗留的死参数（`{ analyticsEngine, version: '1.0.0' }` → `CF_VERSION_METADATA`），该文件原不在批次② 清单内但属于同一逻辑变更 |
| 2-6 | 根 `storage/` 的 3 个跟踪文件已 `git rm`，`public/storage/` 5 个文件未动 | 删除前复跑引用面：页面用的是 `/storage/*` URL（由 `public/storage/` 应答），无任何代码读取根目录路径 |

验证口径：`npm test` 433/433（改动前 414，+19 断言）、`npm run lint` 0 error、`npm run check` 0 错误、`npm run build` 成功。`wrangler.jsonc` 的合法性由 `npx wrangler deploy --dry-run` 实际验证（无需登录/联网），输出确认已识别 `CF_VERSION_METADATA — Worker Version Metadata`。

---

## 7. 批次③ 落地记录（2026-09-23）

四项已批准条目全部落地：

| 编号 | 落地情况 |
|---|---|
| 3-1 | `index.astro` / `about.astro` / `styleguide.astro` 按仓库既有约定补 `astro:page-load` 注册（`Header.astro` 是同一写法）。四个被调用的 init 全部幂等（`TimeDisplay` 先 `clearInterval`、ripples 先 `abort`、`EmailProtection` 有 `existingLink` 早退、`PageAnimations` 只重设类名/样式且不建 observer），因此「首次加载立即执行 + `load` 时的 `astro:page-load`」不会产生重复副作用。新增 `tests/page-hooks.test.js` |
| 3-2 | `random-selector.ts` 去掉 `MAMMOTH_CDN_URL` 与 CDN 优先分支，只留 `/libs/mammoth/`；`BaseLayout.astro` 删 cdnjs preconnect / dns-prefetch；`tests/phase-3-tools.test.js` 的断言反转为「源码内不得再出现站内 cdnjs 引用」。`markdown-renderer.ts` 里给导出用独立 HTML 的那份按计划未动 |
| 3-3 | `scripts/check-posts.js` 加入 category 三选一 / tags 白名单 / 1–4 数量 / tag ≠ category 四类校验（白名单常量在文件顶部，注释指向 AGENTS.md）；文章 tags 追加 `人工智能`（保留 `科技`）。`npm run check` → 14 篇 0 错误 |
| 3-4 | 新增 `src/lib/article-enhancements/article-scope.js`（容器判据 `[data-article-content]`）；文章页正文容器加该属性；`article-runtime.js` / `article-mermaid.js` / `article-enhancements.js` 改为先解析容器、找不到就整体跳过（不影响页面过渡与浏览量）。新增 `tests/article-scope.test.js` |

### 真实浏览器核对（Playwright CLI + `npm run preview`，`127.0.0.1:4321`）

| 场景 | 结果 |
|---|---|
| 首页首次整页加载 | `main > section.fade-in-up` = 5，时钟在走 |
| 首页 → 文章 → 首页（客户端导航二次进入） | `fade-in-up` = **5**、时钟在走 → 3-1 生效 |
| **反向控制**：临时 `git stash` 掉 3-1 的三处改动并重建 | 同一路径下 `fade-in-up` = **0** → 这个信号确实能抓到原 bug（时钟仍在走，因为它读的是上次残留的 interval） |
| 关于页二次进入 | `.email-link` = 1 |
| styleguide 二次进入（注入链接走 ClientRouter） | `.card` 5 个，其中带 `animation-delay` 的 **5 个**，时钟在走 |
| 工具页 Markdown 预览（含 `## 标题` 与图片） | 预览渲染出 `h2`，但 `.heading-anchor` = 0、`figure.markdown-image-figure` = 0、`[data-captioned]` = 0，且页面无 `[data-article-content]` → 3-4 生效 |
| 文章页（回归守卫） | 容器存在、`.heading-anchor` = 4、图注 figure = 13、进度条存在、目录可见 → 增强未被打坏 |
| 控制台 | 0 error，无 CSP / cdnjs 相关条目 |
| 构建产物 | `dist/**/*.html` 中 cdnjs 命中数 = 0 |

核对脚本与原始输出留在 `tmp/verify.sh`、`tmp/g.js`（`tmp/` 被 gitignore，不入库）。唯一需注意的环境细节：`astro preview` 默认只监听 IPv6 `[::1]`，需 `npm run preview -- --host 127.0.0.1` 才能被 curl / Playwright 访问。

验证口径：`npm test` **456/456**（批次② 后为 433，本批 +23）、`npm run lint` 0 error、`npm run check` 0 错误、`npm run build` 成功（15 张 OG 卡 + 17 条跳转页）。

至此批次①/②/③ 全部落地，PR 内不再存在「文档领先代码」的窗口（见 [`05-doc-drift.md`](05-doc-drift.md) §3）。

---

## 8. 自动审查驱动的第 4 项修复（2026-09-23，批次③ 收尾）

PR #15 上 `chatgpt-codex-connector[bot]` 提了 1 条 P2 inline 意见，指向批次③ 3-4 引入的早退：

| 项 | 内容 |
|---|---|
| 意见 | `article-runtime.js:17`：从文章页跳到非文章页时提前 `return`，跳过了 `initArticleEnhancements`；而上一篇的清理就发生在它入口处（`enhancementCleanups` 以持久的 document 为键），于是旧监听器与 observer 留了下来 |
| 复核 | 另开只读 agent（`xiaomi/mimo-v2.6-pro`）独立复核：**成立**，报告见 [`reports/codex-review-p2-verification.md`](reports/codex-review-p2-verification.md)；主管逐条核验（含它新发现的「`tests/article-scope.test.js:74-76` 用正则钉死了旧形状」） |
| 残留具体项 | `window` scroll ×2（`reading-progress.js:253`、`selection-toolbar.js:231`）、`window` resize ×1（`reading-progress.js:254`）、`document` keydown ×1（`selection-toolbar.js:230`）、两个 IntersectionObserver（`reading-progress.js:235-245`、`section-reveals.js:58-72`）；吊住的还有整篇已脱离 DOM 的正文 + 目录。绑在**元素**上的监听器、灯箱 dialog 与复制反馈条不算（随节点/body 一起被丢弃） |
| 严重性 | 有界（任意时刻只滞留一篇的量，进下一篇时被覆盖清理），无用户可见故障；代价是离开文章页后每次滚动都在量已脱离 DOM 的正文，并保留一整篇正文 DOM |
| 修复 | `initArticleEnhancements(articleContent \|\| document)`：找不到容器仍然进增强入口（内部先清理、再因无容器整体跳过）；mermaid 仍只对文章跑。2 行改动，不新增公共 API |
| 测试 | 新增 `tests/article-enhancements-cleanup.test.js`（fake DOM；断言监听器归零、observer 已 disconnect、清理幂等）；`tests/article-scope.test.js` 的源码断言改为 `initArticleEnhancements(articleContent \|\| document)` 并加 `doesNotMatch(initArticleEnhancements(articleContent))` 拦住旧形状 |
| 反向控制 | ① 测试自身：把 `article-runtime.js` 换回有 bug 版本 → 源码断言 fail（10 pass / 1 fail），换回修复版本 → 11 pass / 0 fail。② 真实浏览器：基线（直接进首页滚动）= **0** 次 `getBoundingClientRect`；修复前（文章→首页→滚动）= **7** 次；修复后 = **0** 次；文章→工具页 = 0 次 |
| 回归 | 文章增强仍正常：标题锚点 4、图注 figure 13、目录可见 |
| 门禁 | `npm run lint` 0 error、`npm test` **459/459**、`npm run check` 0 错误、`npm run build` 成功 |

根因写法（供以后避免）：把「找到容器就做增强」写成了「找不到容器就 `return`」，而同一个入口还兼着「先清理上一次」的职责 —— 早退把清理一起绝了。判断这类早退是否安全，看它是否跨过了已有的生命周期副作用，而不是看它跳过的那个功能本身。

---

## 9. 同源新发现：站内导航后再进文章页，图片灯箱静默失效（**已修**）

排查上一条时顺手发现的**用户可见功能缺陷**，与批次③ / 本次修复无关（批次③ 前后行为一致），基线里也没有记过。

**现象**（真实浏览器，`npm run preview`，产物为本 PR 构建）：

| 步骤 | `dialog.article-lightbox` 在 DOM / connected / open |
|---|---|
| 首次进文章页 → 点图片 | 1 / 1 / 1 ✅ |
| 站内跳到首页 | 0 / 0 / 0（dialog 随 body 一起被换掉） |
| 再进文章页（站内导航）→ 点图片 | 0 / 0 / 0 ❌ 点下去没有任何反应 |

**机制**：`sharedControllers` 是以**持久的 document** 为键的 WeakMap（`src/lib/article-enhancements/image-lightbox.js:458-466`），而 `state.dialog` 只在 `ensureDialog()` 里赋值一次（`:408`）、从不重置；`ensureDialog()` 开头是 `if (state.dialog) return state.dialog`（`:306-308`）。ClientRouter 导航会整体替换 `document.body`，于是缓存里的 dialog 变成脱离节点，第二次进文章页时 `open()` → `ensureDialog()` 返回这个脱离节点，`showModal()` 打在不存在的节点上 → 无弹层、无报错。

**影响**：任何一次站内导航之后再打开的文章页，图片灯箱（含缩略图/键盘 Enter）都是死的；硬刷新一次即恢复。线上同样成立。图注、标题锚点、目录、进度条不受影响（它们不缓存跨页节点）。

**修复**（用户当场批准，进同一个 PR）：`ensureDialog()` 开头加失效判定 —— `if (state.dialog && state.dialog.isConnected === false) { state.dialog = null; }`，让它落到下面的重建分支，把新 dialog 挂到**当前** body 上。仅当环境明确报告 `isConnected === false` 时才重建，因此同一 body 内仍然复用旧 dialog（`sharedControllers` 的本意不变）。

| 验证 | 结果 |
|---|---|
| 新增 `tests/article-lightbox.test.js` 用例 | `reuses the cached dialog while it is still connected`（保证不过度重建）+ `rebuilds the dialog after the cached one was detached by a body swap`（回归守卫） |
| 反向控制 | 撤掉判定后 `rebuilds ...` 条 fail（12 pass / 1 fail），恢复后 13 pass / 0 fail |
| 真实浏览器（同一脚本、修复前后各跑一次） | `afterSecondClick`：修复前 `inDom/connected/open = 0/0/0`（点图片无反应）→ 修复后 `1/1/1` ✅；`afterFirstClick` 两边都是 `1/1/1`；导航离开后 dialog 随 body 一起消失（预期） |

说明：现修法会在每次 `open()` 时读一次 `isConnected`（几乎零成本），代价可忽略；备选的「按当前 body 作为共享键」需要改 `sharedControllers` 的语义与相关测试，收益不明显。

---

## 10. 上线与生产验证（2026-09-23）

合并（`317dc4d`，merge commit）→ GitHub Pages 部署 → 镜像实测 → `ff-only` 收 main → 生产 `npm run build` + `npx wrangler deploy`（version `c9554cf7-287d-4f87-8ad3-2afc9eab9829`）。

### GitHub Pages 镜像（`https://calvin-xia.github.io/`）

- 静态层：首页/文章/关于/工具/样式页/RSS/sitemap/OG 均 200；sitemap **22** 条 URL；6 条 legacy 跳转页均 200 且 meta refresh + canonical 指向本域；未知路径 404。
- 浏览器：首页入场动画 5/5 + 时钟、站内导航二次进首页仍 5/5、文章页增强（锚点 4 / 图注 13 / 目录 / 进度条）、灯箱首点与站内绕一圈后重点都是 `1/1/1`、工具页预览 `0` 锚点 `0` 图注、390px 宽无横向溢出。
- 控制台只有 2 条预期噪音：`/api/trending` 与 `/api/views/<slug>` 的 404（镜像无 Worker，脚本优雅降级、不抛异常）。

### 生产 `calvin-xia.cn`

| 检查 | 结果 |
|---|---|
| `/api/health`（无 token） | `{"status":"healthy",...}`，不泄露 version ✓（`worker.ts:85-90` 的刻恷设计） |
| `/api/health`（带 token） | `version = c9554cf7-…` —— **与 `wrangler deploy` 刚打印的版本 id 一字不差**，批次② 2-5（`version_metadata`）在生产真生效（此前恒为写死的 `0.0.1`）；`dependencies.analytics.status = healthy` |
| `/api/health`（错 token） | 401 ✓ |
| `/api/trending?limit=3` | 200 + 真实数据（52/33/17 阅读），`Cache-Control: public, max-age=600` ✓ 成功态用长 TTL |
| `/api/views/20260411-ai-reliance` | 200 `views: 3`，`max-age=300` ✓；文章页计数显示「3 次阅读」 |
| `/api/views/%2e%2e%2fetc`（非法） | **400 + `no-store`** ✓ 批次② 2-2 生效 |
| `/api/views/BAD_SLUG` | 200 `views:0` + `max-age=300` —— **不是 bug**：`isValidArticleSlug` 只拦空/`..`/斜线（`umami-view-counter.js:35-41`），大写与下划线合法；上游无此页面故为 0 |
| 首页 | 入场动画 5/5 + 时钟 + 热门卡真实数据 |
| 站内导航两次 | `pageLoads` 0→1→2、回首页 `fade-in-up` 5/5 —— 3-1 在生产生效 |
| 文章页 | 锚点 4 / 图注 13 / 目录 / 进度条 |
| 灯箱（站内绕一圈后重点） | `dialogs 1, open 1` —— dc1f1f7 在生产生效 |
| 泄漏修复 | 离开文章页后滚动对脱离正文的 `getBoundingClientRect` 调用 = **0**（修复前为 7） |
| 控制台 | 0 message / 0 error |

### 顺带解答两条悬案

- **`vars.BASE_URL` 已设**：值就是 `https://calvin-xia.github.io`（`deploy.yml:38` 的默认值一致）；之前记的「未决事实」可销。
- **镜像 canonical 不会跟生产抢收录**（之前的 C 类项）：镜像文章页的 `rel=canonical` 与 `og:url` 都是 `https://calvin-xia.cn/...`，即镜像不自指。唯一不一致：legacy 跳转页的 canonical 走 `BASE_URL`（镜像上为 `calvin-xia.github.io`），而内容页走固定的生产域名。影响极低（跳转页本身是 meta refresh 中转页），不修。
- 新的小观察（未修，价值低）：未知 `/api/*` 路径（如 `/api/nope`）由 assets 层直接 404（`max-age=0, must-revalidate`），不会进 Worker，也就不经过 `logSecurityRequest`。

### 验证方法上的一条教训（下次别再犯）

第一次在生产上跑探针时报了 **两个假失败**（首页二次进入 `fade-in-up: 0`、灯箱 `0/0/0`）。原因不是站点，是探针自己：远端站点（RTT + 交换动画）下 1.1~1.6s 的等待不够，第二次点击落在了 `body` 互换的中途。改成「每步断言当前路径 + 用 `window` 标记判是否整页重载、并记 `astro:page-load` 次数」后，生产与镜像逐帧一致且全部正确。**教训：跨源/远端探针不能隐式假定导航已完成，每步都要断言“我在哪一页”。**

**同源背景**：此条是在排查上一条 Codex 意见时顺手发现的；它与批次③ / 本次修复无关（批次③ 前后行为一致），属于既有缺陷，也不在文档先前记录的清单里。
