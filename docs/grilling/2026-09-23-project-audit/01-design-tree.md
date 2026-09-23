# 设计树：从审计结论到可执行决策（2026-09-23）

> 素材：本目录 [`reports/`](reports/)（四路探查 + 汇总层）。问答原文见 [`02-rounds.md`](02-rounds.md)，结论表见 [`03-decisions.md`](03-decisions.md)。
> 记号：✅ 已定（本轮两轮问答裁决）；⏳ 仍待裁决（C 类，需偏好判断，不在本轮）。

```
根：把 2026-09-23 审计结论变成可执行、可验证的整改决策
├── B1 范围 ────────────── Q1  ✅ A 类（纯文档）+ B 类（低风险代码）；先落 docs、一步一步走
│                            ⏳ C 类（需偏好裁决）本轮不做，但必须记录成清单
├── B2 落点 ────────────── Q2  ✅ docs/grilling/2026-09-23-project-audit/（编号文件 + reports/）
│                            取代 2026-09-12 的现状快照
├── B3 裁决原则 ────────── Q3  ✅ 分类规则：操作型文档以代码为准修正；
│                            目标型文档视为目标态，逐条标注「已实现 / 未实现（差异原因）」
├── B4 过期物处置 ──────── Q4  ✅ 历史快照只加「历史快照（日期）」/「后续状态」标注，不改写旧数字；
│                            零引用死文件删除（动手前逐条核实）
├── B5 批次切法 ────────── Q5  ✅ 风险递增三段：①文档与快照 ②无可见行为变化的代码 ③有用户可见影响的修复
├── B6 提交策略 ────────── Q6  ✅ 单分支 audit-2026-09-23-remediation + 一个 PR，内部可分多个 commit
├── B7 DoD ────────────── Q7  ✅ npm test + npm run build + npm run check + 补测试/CI 断言
│                            + 对影响浏览器行为的三项做实际页面核对
└── B8 taxonomy 与内容口径 ─ Q8  ✅ 白名单外标签「科技」两者都留（正文追加「人工智能」+ 收编进白名单）
                             Q9  ✅ 文件名日期（起稿日）≠ frontmatter date（发布日）属正常，只补规则不改文章
                             Q10 ✅ .dev.vars 键漂移只记录不改（并写准事实）
```

---

## B1 范围

**已定结果（Q1）**：本轮 = A 类（纯文档修正）+ B 类（低风险代码修复），**先落 docs**，一步一步走；C 类（需偏好裁决）不在本轮。

- A 类落点：`README.md`、`AGENTS.md`、`site-maintenance-guide.md`、`QUICKSTART.md`、`project.json`、历史快照标注 —— 内容是「文档说的和代码做的不一致」。
- B 类落点：不产生用户可见行为变化的代码/配置/CI 调整，以及明确低风险的修复。
- 依据：`reports/00-overview-synthesis.md` §8 把建议动作分成 A（零风险文档修正）、B（小改动换大收益）、C（需要决策后再动）三档，本次裁决直接采用该分档为范围边界。

**仍待裁决（C 类，本轮不动）**：见 B8/§C 清单与 [`03-decisions.md`](03-decisions.md) 的 C 类表 —— 镜像 canonical 策略、`/markdown-tool/` 孤儿路由去留、`DESIGN.md` 与实现的数值冲突、断点 767/768 合并、死代码与 45 组重复选择器清理。
**边界外但存在**：`CSP ↔ cdnjs`、`Umami 镜像流量污染`、`观测性全采样`、`改名文章历史浏览量`、`Worker_VERSION 去留` 等问题在 `reports/00-overview-synthesis.md` §7/§8 被标为「需要决策后再动」，但**不在本次 C 类清单里**——归属见 [`04-risks.md`](04-risks.md)「未定归属」段。

---

## B2 落点

**已定结果（Q2）**：新建 `docs/grilling/2026-09-23-project-audit/`，编号文件 + `reports/` 子目录；**取代** `docs/grilling/2026-09-12-roadmap/00-project-map.md` 的现状快照地位。

- 文件名与职责：`00-project-map.md`（现行地图与规模基线）、`01-design-tree.md`（本文件）、`02-rounds.md`、`03-decisions.md`、`04-risks.md`、`05-doc-drift.md`。
- 素材搬迁：`tmp/project-explore/**` → `reports/`（用移动，不留副本；搬完 `tmp/project-explore/` 为空并删除该目录）。
- 与旧目录的关系：`docs/grilling/2026-09-12-roadmap/` 的其余文件（`01-design-tree.md`、`02-rounds.md`、`03-decisions.md`、`04-phases-p14-p18.md`）是那一轮的历史产物，本轮不删不改（除 `00-project-map.md` 加历史快照标注，由批次①-b 执行）。

**已定（补记 2026-09-23 批次①-a）**：旧目录 `2026-09-12-roadmap/` 剩余文件的快照标注 —— 除 `00-project-map.md` 与 `04-phases-p14-p18.md` 外，`01-design-tree.md`、`02-rounds.md`、`03-decisions.md`、`03-phase18-grilling.md` 四个文件已各加一行「历史快照（2026-09-12）」顶部引用块。至此该目录 6 个文件全部带标注。

---

## B3 文档与实现的裁决原则

**已定结果（Q3）**：按文档类型分档，不采用「一律以代码为准」或「一律以文档为准」。

| 文档类型 | 成员 | 裁决 |
|---|---|---|
| 操作型（描述系统怎么用/怎么跑） | `AGENTS.md`、`README.md`、`QUICKSTART.md`、`site-maintenance-guide.md` | **以代码为准修正文档** |
| 目标型（描述系统应该是什么样） | `DESIGN.md`、`prd-*`、`move-to-astro/*/spec.md` | **视为目标态**，逐条标注「已实现 / 未实现（差异原因）」，不据其改代码 |

- 该分档解决的问题：`DESIGN.md:919-926` 声明断点 1024/700/420，`src/styles/global.css` 实现 900/767/768/480；若一律以代码为准就会把设计目标改掉，若一律以文档为准就会立刻产生一次大范围样式重构。分类规则把「谁迁就谁」变成可判定问题。
- 应用结果：`05-doc-drift.md` 的「判定方向」列即按此规则生成。

**已定（补记 2026-09-23 批次①-a）**：目标型文档的「未实现」标注动作由**批次①-a 执行**。`DESIGN.md` 顶部已插入 `## 实现状态（2026-09-23）` 小节，逐条给出 `DESIGN.md:行` + 实现位置 `文件:行` + 状态，与 `05-doc-drift.md` §2 同源。规则不变：**只标注，不据其改代码、也不改写正文数值**；数值口径的取舍仍是 C3。

---

## B4 过期物处置

**已定结果（Q4）**：历史快照类文档只加标注，**不改写旧数字**；零引用死文件删除，且删除前逐条核实引用面。

- 加标注对象：`docs/grilling/2026-09-12-roadmap/00-project-map.md`（顶部写「历史快照（2026-09-12）」+ 指出已被本目录取代 + 点名哪几类数字已过期）、`docs/superpowers/**`（`plans/2026-06-03-publish-tag-defaults.md`、`specs/2026-06-03-publish-tag-defaults-design.md` 追加「后续状态（2026-09-23）：已合入 main」并保留原状态句）、`frontend-visual-reform/checklist.md`（加「历史快照（2026-05-22）：以下通过数与页面数为当时口径」）、`move-to-astro/README.md`（Phase 表后加「只覆盖 0–8」）。
- 删除对象：`project.json` —— 零自动化引用（全仓仅 `.trae/specs/project-architecture-analysis/spec.md` 提及，而 `.trae/` 已不在 `AGENTS.md` 的目录约定内），且内容与现状相反（`version 2.0.0`、仓库 URL 指向 `mr.xia`、目录结构写 `css/js/pages`、卖点含视觉重构已移除的「毛玻璃导航栏」）。`[复核]` `grep -rln project.json` 的仓库内命中只有 `.trae/specs/...`。
- 反例（**不删**）：根 `UpdateLog/` 是空目录，但 `scripts/legacy-redirects.js:20` 仍以 `/UpdateLog/fingerprint-app-update-log.html` 为跳转源，源路径的历史目录已删属预期；跳转项保留。

**已定（补记 2026-09-23 批次①-a）**：根 `storage/`（3 文件）与 `public/storage/`（5 文件）重复 → **归入批次②**，删除根目录副本。已核实：根 `storage/` 的 3 个文件**无任何代码读取**（全仓 `grep` 命中的都是 `/storage/*` URL，由 `public/storage/` 提供：`src/components/Footer.astro:38`、`src/layouts/BaseLayout.astro:66-67`、`src/content/works/fingerprint.json:18`、`public/sw-tools.js:6-9`）；根目录不在 `public/` 下故不部署；但两处副本都已 `git ls-files` 跟踪，所以删除动作是 `git rm`。

---

## B5 批次切法

**已定结果（Q5）**：风险递增三段；批次② 与批次③ 的**条目清单已由用户在计划确认环节批准**（不再待定），逐项如下。

| 批次 | 判据 | 本批范围 |
|---|---|---|
| ① 文档与快照 | 不触碰任何运行时行为 | 由两个 agent 并行：①-a（本目录 + `DESIGN.md` 实现状态标注 + 旧 grilling 目录标注）、①-b（就地修文档 + 删 `project.json`） |
| ② 无可见行为变化的代码 | 产物与用户可见输出不变 | **已批准 6 项**（见下表），未开始 |
| ③ 有用户可见影响的修复 | 会改变浏览器行为或构建判定 | **已批准 4 项**（见下表），未开始 |

### 批次② —— 已批准，仅这 6 项

| # | 内容（含文件与手法） | 对应风险 |
|---|---|---|
| 2-1 | 四处出站 fetch 加超时：`src/lib/umami-view-counter.js`（`:75-79` 登录、`:108-110` metrics）/ `src/lib/umami-trending.js`（`:37-39`）/ `src/lib/health-check.js`（`:19`），统一 `AbortSignal.timeout(8000)` | P1-2 |
| 2-2 | 失败态不缓存：`jsonResponse()`（`umami-view-counter.js:8-14`）只在成功态给 `max-age=300`；400 `invalid slug` 与 `{views:null}` 降级态（`:140-151`）改 `no-store` | P1-3 |
| 2-3 | trending 空结果写 60s 短 TTL（`umami-trending.js:96-98` 的 `put` 条件） | P1-4 |
| 2-4 | `npm run lint` 加进 `.github/workflows/phase-2-content-check.yml` | P2-14（lint 部分） |
| 2-5 | `WORKER_VERSION`（`src/worker.ts:12,79`，wrangler 从未定义）改用 Workers 原生 `version_metadata` 绑定：动 `wrangler.jsonc` + `src/worker.ts` | P2-18（`WORKER_VERSION` 部分） |
| 2-6 | 删除根 `storage/` 的 3 个**无引用但被 git 跟踪**的文件（`git rm storage/…`；页面引用的是 `/storage/*` URL，由 `public/storage/` 提供） | P2-15（存储部分） |

### 批次③ —— 已批准，仅这 4 项

| # | 内容（含文件与手法） | 对应风险 |
|---|---|---|
| 3-1 | 三处补 `astro:page-load`：`src/pages/index.astro` 的 `initHomePage`（当前只挂 `DOMContentLoaded`，见 `:193`）、`src/pages/about.astro:71`、`src/pages/styleguide.astro:123` | P1-5 |
| 3-2 | CSP↔cdnjs：**去掉** `src/scripts/random-selector.ts:149-156` 的 CDN 分支（只留本地 `/libs/mammoth/`）+ 删 `src/layouts/BaseLayout.astro:71-72` 的 cdnjs preconnect/dns-prefetch；`src/scripts/markdown-renderer.ts` 里给「导出用独立 HTML」的那份**不动**；同步更新 `tests/phase-3-tools.test.js:134`（现锁定「代码里存在 cdnjs URL」） | P1-1 |
| 3-3 | taxonomy 校验落进 `scripts/check-posts.js`（白名单 / 每篇 1-4 个 / tag≠category 至少覆盖前两项）+ `src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md` 的 `tags` 追加 `人工智能`（`AGENTS.md` 白名单收编 `科技` 已在批次① 完成） | P1-10 |
| 3-4 | 文章增强作用域收紧：判据从全局 `.markdown-content` 收紧到文章详情容器（`src/lib/article-enhancements/article-enhancements.js:21` + `src/scripts/article-mermaid.js:36`） | P1-6 |

> **同一 PR 的硬约束**：3-3 必须与批次① 的文档改动落在同一个 PR（①-b 已把三处操作型文档改成「`npm run check` 校验 tags 白名单」，见 [`05-doc-drift.md`](05-doc-drift.md) §3）。

### 候选增补（**未经用户确认**）

以下条目在归属上都是「未定」，只是从可执行性看比较自然；**未获批准，不要自行开工**。

P3-21 路由表重构、P3-22 Worker 顶层 try/catch、P3-23 `/api/health?cache=N` 上限、P3-25 CDN 白名单收敛、P3-27 `/api/*` 集成断言、P3-29 `global.css` 格式化事故、P3-30 归档未消费字段、P3-34 `Beian.webp`、以及 [`04-risks.md`](04-risks.md) §4 的覆盖空洞（除 lint 一行）。

- ①-a / ①-b 的写入范围互斥且已声明：①-a 只写本目录 + 移动 `tmp/project-explore/**`（后续收尾又扩到 `DESIGN.md` 与旧 grilling 目录）；①-b 只写 `README.md`/`AGENTS.md`/`site-maintenance-guide.md`/`QUICKSTART.md`/`project.json`/`.trae/specs/...`/旧 grilling 地图/`docs/superpowers/**`/`frontend-visual-reform/checklist.md`/`move-to-astro/README.md`。

**已定（回填）**：批次②/③ 的条目切分**已定**（上两张表）；曾列入「仍待裁决」的 taxonomy 校验已明确归入批次③ 条目 3、CI 新鲜度闸门仍为 **未定**（不在批次② 的 6 项内）。

---

## B6 提交策略

**已定结果（Q6）**：单分支 `audit-2026-09-23-remediation` + **一个 PR**，内部分多个 commit。

- 分支已由上级 agent 创建（基线 `b78e6a2`）；子 agent 不切分支、不 commit、不 push，提交由上级 agent 统一做。
- 每个批次独立 commit；一个 commit 只承载一个逻辑变更。

**仍待裁决**：commit 粒度与信息措辞未定稿（`AGENTS.md` 要求简短的祈使句主题、一个 commit 一个逻辑变更）。

---

## B7 DoD（每批完成的定义）

**已定结果（Q7）**：

1. `npm test`
2. `npm run build`
3. `npm run check`
4. 为改动补测试/CI 断言
5. 对影响浏览器行为的改动，做实际页面核对（三项）

- 基线参考：`[复核]` `npm run check` 当前输出「检查完成：14 篇文章，0 个错误，0 个警告」，所以 `check` 通过不能作为合规性的证据（它不校验 taxonomy 白名单，见 [`04-risks.md`](04-risks.md) P1-10）。
- 批次① 是纯文档：①-b 的指令明确不跑 `npm test`/`npm run build`，由上级 agent 统一验证。

**仍待裁决**：「实际页面核对」的具体三项与记录形式未成文 —— 可执行的候选是：① 站内二次导航后首页入场动画/ripple 是否仍生效；② 工具页预览区是否被文章增强误伤；③ CSP 控制台是否仍有 cdnjs 报错。三者都对应批次③ 的改动，写成清单即可。

---

## B8 taxonomy 与内容口径

**已定结果**：

- **Q8（tag `科技`）**：**两者都留** —— 给 `src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md` 追加 `人工智能`，同时把 `科技` 正式收编进 `AGENTS.md` 的白名单。后者是 `AGENTS.md` 原文要求的那次「显式决定」。
- **Q9（日期口径）**：文件名里的 `<YYYYMMDD>` 是 Obsidian 里的**起稿日**，frontmatter `date` 是**实际发布/完成日**，两者**允许不相等**；硬性要求只有「仅 ASCII」与「英文语义名」。本轮**只补规则，不改那 4 篇**（`20260609-gaokao-chinese-essay`、`20260620-cultural-legacy`、`20260706-short-term-training-diary-1`/`-2`）。
- **Q10（`.dev.vars` 键漂移）**：**只记录不改**，且记录必须写准事实（见 [`03-decisions.md`](03-decisions.md) 未决事实表与 `[复核]` 结果）。

**仍待裁决**：白名单新增 `科技` 后总词表为 11 个词，而 `AGENTS.md` 的「覆盖度参考」仍写「冷项优先复用」的偏好 —— 新增词的收编标准未成文（什么时候该造新词、什么时候该复用冷项）。另：taxonomy 校验落到 `scripts/check-posts.js` 属批次③（按批次①-b 的既定口径），批次② 不含。

---

## C 类待裁决清单（本轮明确不做）

| # | 条目 | 为什么需要裁决 | 证据入口 |
|---|---|---|---|
| C1 | 镜像站 canonical 策略 | 是让 GH Pages 自指（现状兜底）还是指向主域，取决于镜像的定位（索引副本 vs 纯备用） | `deploy.yml:36-38`；`reports/lane-3-runtime.md` §8.2 |
| C2 | `/markdown-tool/` 孤儿路由 | 补站内入口 vs 从 sitemap 摘掉但保留 URL 供外链，取决于是否有外部链接与是否要保留独立页 | `src/lib/site-seo.js:200`；`[复核]` 全仓无 `href` 指向它 |
| C3 | `DESIGN.md` 数值冲突 | 以文档为准改代码 vs 以代码为准改文档，是产品/视觉取舍。**标注动作已完成**（`DESIGN.md` 的「实现状态（2026-09-23）」小节）；剩下的是数值口径本身的取舍 | `DESIGN.md:171-173,919-926,952`；`src/styles/global.css:243,499,505,531,2666`；`DESIGN.md` 实现状态小节 |
| C4 | 断点 767/768 合并 | 合并到哪一侧会改变 ≤767px 与 768px 两档的样式归属 | `src/styles/global.css:2654`、`:2798` |
| C5 | 死代码与 45 组重复选择器清理 | 清理范围与是否保留兼容类名属风格取舍 | `reports/lane-1-shell.md` §11-10/11 |
