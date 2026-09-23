# 决策表（2026-09-23 审计）

> 逐轮问答原文见 [`02-rounds.md`](02-rounds.md)。本文件是**结论层**：一条决策一行，含选择、理由、后续动作、状态。
> 状态标记：`已定` = 已裁决且已记录；`①-a 落地` / `①-b 落地` = 本批已落实到文件；`待裁决` = C 类；`未决事实` = 需要一次核实动作才能定。

---

## 1. 已定决策（Q1–Q10）

| # | 决策 | 选择 | 理由 | 后续动作 | 状态 |
|---|---|---|---|---|---|
| Q1 | 本轮范围 | A 类（纯文档修正）+ B 类（低风险代码修复）；**先落 docs**，一步一步走；C 类（需偏好裁决）不在本轮 | A 档不触碰运行时行为，可立即落地并立即被信任；B/C 混做会让单次变更难验证难回滚 | 批次① 只做文档与快照；批次② 的条目清单**已由用户批准（6 项）**、批次③ **已批准（4 项）**，逐项内容与手法见 [`01-design-tree.md`](01-design-tree.md) B5；其余条目归属见 [`04-risks.md`](04-risks.md) | 已定 |
| Q2 | 落点 | `docs/grilling/2026-09-23-project-audit/`，编号文件 + `reports/`，**取代** 2026-09-12 的现状快照 | 沿用仓库既有 `docs/grilling/<日期>-<主题>/` 约定；原始报告此前躺在被 gitignore 的 `tmp/` 下会丢 | 建目录、写 6 个编号文件、把 `tmp/project-explore/**` 移入 `reports/` | ①-a 落地（本批写 6 文件 + 搬迁 9 份素材，`tmp/project-explore/` 已清空删除） |
| Q3 | 文档与实现的裁决原则 | **分类规则**：操作型文档（`AGENTS.md`/`README.md`/`QUICKSTART.md`/`site-maintenance-guide.md`）以代码为准修正；目标型文档（`DESIGN.md`/`prd-*`/`move-to-astro/spec`）视为目标态，逐条标注「已实现 / 未实现（差异原因）」 | 两类文档写作意图不同（描述现状 vs 描述目标），一律以代码为准会删掉设计目标，一律以文档为准会触发大范围重构 | `05-doc-drift.md` 的「判定方向」列按此规则生成；`DESIGN.md` 的标注见下一列 | 已定；**`DESIGN.md` 本体的标注已由批次①-a 执行**（顶部新增「实现状态（2026-09-23）」小节）；数值口径取舍仍为 C3 |
| Q4 | 过期物处置 | 历史快照只加「历史快照（日期）」或「后续状态」标注、**不改写旧数字**；零引用死文件删除（**动手前逐条核实**） | 历史快照的价值就是「当时事实」，改写数字等于销毁证据；死文件会误导新接手者 | ①-b 标注 4 处快照 + `git rm project.json`；①-a 在 `00-project-map.md` 顶部写明取代关系 | ①-b 落地（工作树已改） |
| Q5 | 批次切法 | ① 文档与快照 ② 无可见行为变化的代码 ③ 有用户可见影响的修复（风险递增） | 以「是否改变可见行为」作唯一判据，可机械判定归属。**批次②/③ 的具体条目已由用户在计划确认环节批准：② 仅 6 项、③ 仅 4 项** | 条目清单见 [`01-design-tree.md`](01-design-tree.md) B5；不在那 10 项内的条目一律回到「未定/C 类」，见 [`04-risks.md`](04-risks.md) §5 | 已定 |
| Q6 | 提交策略 | 单分支 `audit-2026-09-23-remediation` + **一个 PR**，内部分多个 commit | 一次整改一个 PR，评审面完整；内部按批次提交保持逻辑原子性 | 子 agent 只写文件，不 `git add/commit/push`；提交由上级 agent 统一做 | 已定（分支已存在，基线 `b78e6a2`） |
| Q7 | 每批 DoD | `npm test` + `npm run build` + `npm run check` + 为改动补测试/CI 断言 + 对影响浏览器行为的三项做实际页面核对 | 前 3 条是仓库既有验证面；第 4 条防回归；第 5 条覆盖无自动化可守的浏览器行为 | 批次① 为纯文档，①-b 不跑 test/build，由上级 agent 统一验证；批次②/③ 的**条目清单见 [`01-design-tree.md`](01-design-tree.md) B5**（不是待定项） | 已定（「三项」的具体清单未成文 → 见 [`01-design-tree.md`](01-design-tree.md) B7） |
| Q8 | 白名单外标签 `科技` | **两者都留**：给 `src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md` 追加 `人工智能`，同时把 `科技` 收编进 `AGENTS.md` 白名单 | 收编是 `AGENTS.md` 原文要求的那次「显式决定」；同时给该文补上已有的近义词，使它与内容主题对齐 | ①-b 改 `AGENTS.md` 白名单与覆盖度数字；正文追加 `人工智能` 属内容变更 → 批次③ | ①-b 部分落地（白名单）；正文追加**未执行** |
| Q9 | 文件名日期 ≠ frontmatter `date` | 视为**正常**：文件名日期是 Obsidian 里的起稿日，`date` 是实际发布/完成日，允许不等 | 改文件名会变更 URL，按仓库契约必须补 legacy 跳转，代价远大于收益 | ①-b 在 `AGENTS.md` 的 Blog Slugs 段补语义规则；4 篇不改 | ①-b 落地 |
| Q10 | `.dev.vars` 键漂移 | **只记录不改**，且记录必须写准事实（本机 `.dev.vars` = `{HEALTH_CHECK_TOKEN, UMAMI_API_KEY}`；`.env` 无 `UMAMI_USERNAME`/`UMAMI_PASSWORD`；`wrangler dev` 只读 `.dev.vars`，故本地 `/api/views/*` 必 `views:null`、`/api/health` 必 `degraded/not_configured`；生产走 secret 注入不受影响） | 改本机密钥文件不产生仓库 diff；改代码要动 Worker 鉴权路径（属批次③ 行为变更），而现状可接受 | 在 `04-risks.md` 记为「只记录」条目；本地复现步骤见下 | ①-a 落地（记录），代码不改 |

> **批次②/③ 的内容不是待定项**：用户在计划确认环节已批准固定的条目清单 —— 批次② 仅 6 项、批次③ 仅 4 项，逐项含文件与手法，见 [`01-design-tree.md`](01-design-tree.md) B5。凡不在那 10 项内的风险条目，在 [`04-risks.md`](04-risks.md) 里一律记为「未定」或「C 类」，不要因为「看起来风险低」就自行归入批次②/③。

**Q10 的本地复现方式**（下一个人要复跑时用）：
1. 看键名（不打印值）：`grep -o '^[A-Za-z_][A-Za-z0-9_]*' .dev.vars | sort` → 应得到 `HEALTH_CHECK_TOKEN`、`UMAMI_API_KEY`；对 `.env` 同法应得到 9 个键，均不含 `UMAMI_USERNAME`/`UMAMI_PASSWORD`。
2. 代码侧只读 `UMAMI_USERNAME`/`UMAMI_PASSWORD`：`src/lib/umami-view-counter.js:48-63`。
3. 因此 `npx wrangler dev` 下 `GET /api/views/<slug>` 返回 `{slug, views:null}`、`GET /api/health` 返回 `degraded` + `dependencies.analytics.status='not_configured'`。

---

## 2. 待裁决的 C 类清单（本轮明确不做）

这些问题需要偏好判断，不属于「文档与代码不一致」，因此不进批次①/②/③。

| # | 条目 | 冲突/取舍 | 关键证据 | 建议的裁决方式 |
|---|---|---|---|---|
| C1 | 镜像站 canonical | GH Pages 镜像的 canonical 是自指 `calvin-xia.github.io`（`vars.BASE_URL` 未设时的兜底）还是应指向主域 `calvin-xia.cn`；取决于镜像定位（可索引副本 vs 纯备用） | `.github/workflows/deploy.yml:36-38`；`astro.config.mjs:17-25,40`；`reports/lane-3-runtime.md` §8.2、`reports/lane-1-shell.md` §11-6 | **已实测结案（2026-09-23）**：`vars.BASE_URL` 已设为 `https://calvin-xia.github.io`，但镜像**内容页**的 `rel=canonical`/`og:url` 仍指向 `https://calvin-xia.cn/...`（不自指）；只有 legacy 跳转页的 canonical 走 `BASE_URL`。详见 [`04-risks.md`](04-risks.md) §10 |
| C2 | `/markdown-tool/` 孤儿路由 | 补站内入口 vs 从 sitemap 摘掉但保留 URL 供外链 vs 直接下线；它与 `/works/tools/` 内嵌 widget 功能重复 | `src/lib/site-seo.js:200`（sitemap 给 0.7 优先级）；`[复核]` `grep -rn "markdown-tool"` 在 `src/**` 内除 `src/pages/markdown-tool.astro` 自身外**无任何 `href` 指向它**（其余命中是 CSS 类名、tab id、`site-seo` 的 sitemap 分支、`markdown-renderer.ts:45` 的 localStorage 键） | 确认是否已有外部链接引用该 URL；有 → 保留 URL 摘 sitemap；无 → 决定下线或补入口 |
| C3 | `DESIGN.md` 数值冲突 | 以文档为准改代码 vs 以代码为准改文档；共 4 组：断点、Header 移动端高度、Page/Hero/Section 标题字号、类名契约（`.article-layout`/`.auto-grid`/`.layout-grid`/`.tool-panel`/`.btn-row`） | 文档侧 `DESIGN.md:171-173`（Hero `clamp(3.25rem,8vw,6.25rem)` / Page `clamp(2.25rem,5vw,4rem)` / H2 `clamp(1.75rem,3vw,2.75rem)`）、`:919-926`（断点表 1024/700/420）、`:952`（`min-height:56px`）、`:289,589,595,601`（类名定义）；实现侧 `src/styles/global.css:243`（`h1{3.75rem}`）、`:499`（`.page-title{clamp(3rem,6vw,4.35rem)}`）、`:505`（`.hero-home .page-title{5.25rem}`）、`:531`（`.section-heading{2rem}`）、`:2666`（`min-height:96px`@≤767）、断点 `:1064,2624,2654,2798,2879,3144`；`[复核]` `.article-layout`/`.auto-grid`/`.layout-grid`/`.tool-panel`/`.btn-row` 在 `src/**` 内 **0 引用**（只存在于 `global.css` 与 `DESIGN.md`） | **标注已完成**（批次①-a 在 `DESIGN.md` 顶部加了「实现状态（2026-09-23）」小节 + `05-doc-drift.md` §2）；仍待裁决的是数值口径本身 |
| C4 | 断点 767/768 合并 | `@media (max-width:767px)` 与 `@media (max-width:768px)` 两块**同时命中** 768px 以下，对 `.article-toc-shell` 给出冲突定位（767 块写 `order:-1; position:static; max-height:none`，768 块写 `position:fixed`），导致 767 块的三条 `.article-toc*` 规则实际失效 | `src/styles/global.css:2654`、`:2798`（`[复核]` 两个 `@media` 块均存在）；`reports/lane-1-shell.md` §11-4 | 合并到哪一侧会改变 ≤767px 与 768px 两档的样式归属，需视觉确认后再定 |
| C5 | 死代码与 45 组重复选择器清理 | 清理范围与是否保留兼容类名属风格取舍；涉及无标记配合的死 CSS 6 组、未使用 token 10 个、重复定义块 45 组、`TransitionIndicator` 整条链路、`data-history`/`data-article-transition`/`featured`/`externalUrl` 等只写不读的字段 | `reports/lane-1-shell.md` §11-7～§11-13（含 `global.css:2617,2944`（`.spotlight-card`）、`:2472-2473,2933-2934`（`.stagger-reveal`/`.reveal.in-view`）、`:543,2890`（`.btn-row`）、`:2413`（`.auto-grid`）、`:694`（`.tool-panel`）、`:83-90`（未使用 token 别名））；`[复核]` `var(--text-primary)`/`var(--surface-strong)`/`var(--shadow-sm)`/`var(--shadow-md)`/`var(--info)`/`var(--warning)` 在 `global.css` 内 0 引用；`reports/lane-2-content.md` §9-7/8（`featured`/`externalUrl` 无消费方） | 按文件分批清理，每批附一次 `npm run build` + 页面核对 |

### 已从 C 类移出（2026-09-23 批次①-a 收尾补记）

下列条目曾在本目录的「仍待裁决」里，现已定案，不属 C 类。

| 条目 | 定案 | 核实依据 |
|---|---|---|
| 旧 grilling 目录其余文件的快照标注 | **已定：全部标注**。`01-design-tree.md`、`02-rounds.md`、`03-decisions.md`、`03-phase18-grilling.md` 已各加一行「历史快照（2026-09-12）」（加上已有的 `00-project-map.md`、`04-phases-p14-p18.md`，目录 6/6 已标注） | 本次改动；见 `04-phases-p14-p18.md` 的同一写法 |
| `DESIGN.md` 标注由谁/何时执行 | **已定：批次①-a 已执行**。`DESIGN.md` 首个标题后新增「实现状态（2026-09-23）」小节（只标注，不改正文数值）；数值口径取舍仍在 C3 | `DESIGN.md` 新增小节；本目录 [`05-doc-drift.md`](05-doc-drift.md) §2 |
| 根 `storage/` 重复副本 | **已定：归入批次②**（不再属 C 类）。删除根 `storage/` 的 3 个文件 | `[复核]` 根 `storage/` 无任何代码读取（全仓命中的都是 `/storage/*` URL，由 `public/storage/` 提供）：`src/components/Footer.astro:38`、`src/layouts/BaseLayout.astro:66-67`、`src/content/works/fingerprint.json:18`、`public/sw-tools.js:6-9`；两处副本均被 `git ls-files` 跟踪 → 删除用 `git rm` |

**边界外但同样需要裁决的条目**（汇总层 §7/§8 标为「需要决策后再动」，但**未进本 C 类清单**，归属见 [`04-risks.md`](04-risks.md)「未定归属」段）：`CSP ↔ cdnjs 分支`、`Umami 镜像流量污染`、`观测性采样率`、`改名文章历史浏览量丢失`、`WORKER_VERSION 去留`。

---

## 3. 未决事实

这些不是偏好问题，而是**需要一次核实动作**才能确定的事实。

| # | 未决事实 | 为什么重要 | 核实方式 |
|---|---|---|---|
| F1 | GitHub 仓库变量 `BASE_URL` 是否已设置 | 决定 GH Pages 镜像的 canonical/og:url/sitemap 是自指 `github.io` 还是指向主域 `calvin-xia.cn`（C1 的直接输入） | **已核实（2026-09-23）**：`gh api repos/.../actions/variables` 显示 `BASE_URL = https://calvin-xia.github.io`（与 `deploy.yml:38` 兜底值相同） |
| F2 | 自部署 Umami 实例是否支持 API key 鉴权 | 若支持，Worker 与本地 `wrangler dev` 可以不走 `login → token` 流程，Q10 的键漂移问题会变成「换个键」而不是「缺两个键」；若不支持，`.dev.vars` 里的 `UMAMI_API_KEY` 是历史残留 | 读 Umami 版本与文档，或对 `https://umami.calvin-xia.cn` 试 `GET /api/websites/{id}/metrics` 带 `x-umami-api-key` 头观察状态码 |
| F3 | 本机 `.dev.vars` 里的 `UMAMI_API_KEY` 是否曾被旧版代码使用 | 决定它是「等待启用的新方案」还是「可删的孤儿键」（全仓当前零引用） | `git log -S UMAMI_API_KEY --all` 查历史引用 |
| F4 | 生产 `dist/` 与 HEAD 是否一致（部署新鲜度） | 现状无任何闸门：`npm run build` 不含 deploy，`wrangler deploy` 不自动构建 | 对生产站抓一个含构建期生成物的指纹（如 `dist/og/` 某张卡或 `search-index.json` 的哈希），与本地 `npm run build` 产物比对 |
| F5 | Umami 报告的 `/articles/<slug>/` 里，镜像站（`calvin-xia.github.io`）流量占多少 | `reports/00-overview-synthesis.md` §6.12 断言镜像流量污染主站阅读量，但缺量化；C1/C2 之外，量化结果决定是否值得按 hostname 过滤 | 在 Umami 面板按 hostname 维度拆分查询，或对比同一路径的 referrer 分布 |
| F6 | 根 `storage/` 的 3 个文件为何仍被 git 跟踪（它们是何时、为何复制的） | 不阻塞批次② 的删除（已核实无代码读取），但影响删除 commit 的说明措辞 | `git log --follow -- storage/` 追溯引入 commit |

---

## 4. 决策与文档的对应关系（便于复核）

| 决策 | 落到哪个文件 |
|---|---|
| Q1 范围 | [`01-design-tree.md`](01-design-tree.md) B1、本文件 §2 C 类清单 |
| Q2 落点 | 本目录结构本身 + [`00-project-map.md`](00-project-map.md) §7 报告索引 |
| Q3 裁决原则 | [`05-doc-drift.md`](05-doc-drift.md) 的「判定方向」列；目标型文档的标注体现在 `DESIGN.md` 的「实现状态（2026-09-23）」小节 |
| Q4 过期物处置 | [`05-doc-drift.md`](05-doc-drift.md) 条目 9–13；[`00-project-map.md`](00-project-map.md) 顶部取代声明 |
| Q5/Q6/Q7 批次与交付 | [`01-design-tree.md`](01-design-tree.md) B5–B7；[`04-risks.md`](04-risks.md) 的「归属」列 |
| Q8/Q9 taxonomy 与日期口径 | [`04-risks.md`](04-risks.md) P1-10；[`05-doc-drift.md`](05-doc-drift.md) 条目 7 |
| Q10 `.dev.vars` | 本文件 §1 Q10 行 + [`04-risks.md`](04-risks.md) P1-8 |
