# 文档与实现不符明细（2026-09-23 审计）

> 来源：`reports/lane-4-toolchain.md` §11 的 15 条 + `reports/lane-1-shell.md` §8 的 `DESIGN.md` 冲突表 + 收尾时新增的回滚链路登记行（条目 16）。
> **行号口径**：所有「文档位置」写的是**审计基线 `b78e6a2` 的行号**。批次①-b 正在并发修改同一批文档，行号已发生位移；为可复核，下表在「状态」列给出批次①-a 观测到的**当前行号**与改后文本要点。
> **判定方向**（按 Q3 分类规则）：操作型文档（`AGENTS.md`/`README.md`/`QUICKSTART.md`/`site-maintenance-guide.md`）→「以代码为准修正」；目标型文档（`DESIGN.md`/`prd-*`/`move-to-astro/spec`）→「目标态，标注 已实现 / 未实现（差异原因）」。
> 状态取值：`①-b 已落地` / `①-b 清单未覆盖（待修）` / `待裁决（C3）` / `非漂移（反向确认）` / `已关闭（上级 agent 补齐）`。
> **截至 2026-09-23 收尾，所有操作型漂移行均已落地**：唯一曾「清单未覆盖」的条目 8 已由上级 agent 修复（`AGENTS.md:73-75`、`README.md:108`）；条目 2 的「文档领先代码」由批次③ 3-3 闭合。

---

## 1. 操作型文档漂移（lane-4 §11）

| # | 文档位置（基线） | 代码证据 | 判定方向 | 状态 |
|---|---|---|---|---|
| 1 | `README.md:103`、`AGENTS.md:35`、`site-maintenance-guide.md:352`：称 `npm run check` 校验「**R2 资产一致性**」 | `scripts/check-posts.js:1-17` 只 import `listPostFiles`/`readPostFile`；全文无 R2/S3 引用（除 `--online` 的 HEAD 探活 `:203-221`）；`analyzePost`（`:130-188`）只做 frontmatter、`src/assets/hero/` 本地文件存在性、正文链接四类检查 | 以代码为准 | **①-b 已落地** —— 三处均改为「R2 资产不在校验范围内」（`README.md:106`、`AGENTS.md:38`、`site-maintenance-guide.md:352`） |
| 2 | 同上三处：称 `check` 校验「**标签**」 | `validateFrontmatter`（`check-posts.js:28-95`）对 `tags` 只断言「非空字符串数组」（`:50-55`），**不校验白名单、不校验 tag≠category** | 以代码为准 | **①-b 已落地，但方向反了** —— 改成了「tags 白名单（白名单以 `AGENTS.md` 的 Blog Taxonomy 为准）」，即**文档现在声称代码有能力，而代码还没有**。见 §3「新引入的窗口」 |
| 3 | `README.md:24`：目录树写 `public/ # Astro 静态资源 + 旧 URL 重定向` | 跳转页由 `scripts/generate-redirects.mjs:16`（`defaultOutputDir = dist`）写到 `dist/`；`legacy-redirects-check.yml:61-67` **禁止** `public/` 下出现任何 `.html`；`AGENTS.md:12` 同义 | 以代码为准 | **①-b 已落地** —— `README.md:24` 现写「…旧 URL 跳转页由 `npm run build` 生成到 `dist/`，不要放在这里」 |
| 4 | `README.md:25`：`.github/workflows/ # CI：构建验证 + 自动部署到 GitHub Pages` | 实际 6 个 workflow（`AGENTS.md:22` 已列全），另有 CLI、跳转表、元数据编辑三道专门门禁 | 以代码为准 | **①-b 已落地** —— `README.md:25` 现列 6 个 workflow 的职能 |
| 5 | `AGENTS.md:28-45` 命令清单缺 3 个 npm script：`edit-metadata`、`og`、`astro` | `package.json:13`（`og`）、`:16`（`astro`）、`:19`（`edit-metadata`） | 以代码为准 | **①-b 已落地** —— `AGENTS.md:39` 已补 `npm run edit-metadata -- <markdown-file>`（含 `--skip-validation`） |
| 6 | `AGENTS.md:19` 脚本清单不完整（`scripts/` 实为 18 文件） | 未列入的含 `edit-metadata.js`、`backfill-image-dimensions.js`（后者在 `README.md`/`QUICKSTART.md`/`site-maintenance-guide.md` 三处零提及）、`image-dimensions.js`、`slug.js`、`markdown-utils.js`、`content-types.js`、`blog-posts.js`、`readable-stats.js`；`reports/lane-4-toolchain.md` §11-6 | 以代码为准 | **①-b 已落地** —— `AGENTS.md:19` 补 `edit-metadata.js`，`:20` 新增「Shared script modules」行覆盖其余 6 个模块 |
| 7 | `AGENTS.md:63`：taxonomy 覆盖度写「**13 篇中 10 篇**」 | `[复核]` `ls src/content/blog/*.md \| wc -l` = 14；`"自我"` 出现 10 次 | 以代码为准 | **①-b 已落地** —— `AGENTS.md:67` 现写「14 篇中 10 篇」；同时 `:61` 白名单已收编 `科技`（Q8） |
| 8 | `AGENTS.md:69`：「不要用拼音首字母——`slugifyTitle()` 会产出 `fxxj-pjcz` 这类不可读结果，手写文件名时请覆盖它」 | `npm run new-post` 与 `POST /api/new-post` 走 `createPostFile` → `slugifyTitle`（`post-utils.js:71-73`），**没有任何手写覆盖入口**（`new-post-cli.js:115` 自述「entrySlug 为 YYYYMMDD-标题拼音缩写」）。该建议只对 `npm run publish`（目标名取 Obsidian 目录名，`post-utils.js:154`）成立 | 以代码为准（需区分两条路径） | **①-b 已落地（由上级 agent 完成）** —— `AGENTS.md:73-75` 改成两条并列说明：「`npm run publish <obsidian-post-dir>`：目标名取 Obsidian 目录名（`scripts/post-utils.js:154`），**在 Obsidian 里就把目录命名成 `<YYYYMMDD>-<english-slug>`**」、「`npm run new-post` / `POST /api/new-post`：…只会得到拼音首字母…**没有覆盖入口**，需建稿后手动重命名」；`README.md:108` 的 `npm run new-post` 条目同步加了「文件名 slug 取标题拼音首字母，需要语义 slug 时请手动重命名并补 legacy 跳转」 |
| 9 | `project.json:2-5`（`version 2.0.0`、仓库指向 `mr.xia`）、`:15-20`（目录结构 `css`/`js`/`pages`）、`:22-29`（卖点含「毛玻璃导航栏」） | 迁移后无根级 `css`/`js` 目录；`tests/visual-reform.test.js` 断言「avoids global header blur」；`DESIGN.md:153` 明写不使用毛玻璃堆叠。`[复核]` 全仓仅 `.trae/specs/project-architecture-analysis/spec.md` 引用它（`.trae/` 已不在 `AGENTS.md` 目录约定内） | 以代码为准（零引用死文件 → 删除） | **①-b 已落地** —— `[复核]` `ls project.json` → 不存在（已 `git rm`） |
| 10 | `docs/grilling/2026-09-12-roadmap/00-project-map.md:9`（198 commit / 36 测试文件 5917 行）、`:29`（api-server 239 行、Bearer 非 timing-safe、无 GET/health）、`:34`（4 个 workflow、publish/api-server 无专门 workflow）、`:60`（同 `:29` 的缺口表） | `[复核]` 237 commit、55 测试文件 8235 行；`tools/api-server.js` = 269 行、`:188-192` 用 `sha256 + timingSafeEqual`、`:225-232` 有 `GET /api/health`；`[复核]` 6 个 workflow，`cli-commands-check.yml:41` 直接跑 `tests/publish-post.test.js` 与 `tests/api-server.test.js` | 历史快照 → 加标注，**不改写旧数字**（Q4） | **①-b 已落地** —— 该文件顶部已加「历史快照（2026-09-12）…已被 `docs/grilling/2026-09-23-project-audit/00-project-map.md` 取代…」引用块 |
| 11 | `docs/superpowers/plans/2026-06-03-publish-tag-defaults.md:11`「已实施并验证，**尚未提交**」；`docs/superpowers/specs/2026-06-03-publish-tag-defaults-design.md:4`「已实施，未提交」 | `post-utils.js:20-23`（`tagsWithDefault`）与 `:174-179` 已落地且已进入 git | 历史快照 → 追加「后续状态」，**保留原状态句**（Q4） | **①-b 已落地** —— 两处已追加「后续状态（2026-09-23）：已合入 main…」（`plans:13`、`specs:6`） |
| 12 | `move-to-astro/README.md:22-32` 与 `:38-48`：Phase 表止于 **Phase 8** | `README.md`、`QUICKSTART.md`、`site-maintenance-guide.md` 都描述到 Phase 18；`docs/grilling/2026-09-12-roadmap/04-phases-p14-p18.md` 记录 P14–P18，产物在 `scripts/` | 历史快照 → 注明覆盖范围（Q4） | **①-b 已落地** —— `move-to-astro/README.md:50` 已加「Phase 9–18 见 `README.md` 与 `site-maintenance-guide.md`；本表只覆盖 0–8」 |
| 13 | `frontend-visual-reform/checklist.md:3`「`npm test` **151/151** 通过，`npm run build` 成功生成 **19 pages**」、`:13-14`「141/141」「19 pages built」 | `[复核]` 当前 55 个测试文件 / 约 414 用例；phase 目录已到 13 | 历史快照 → 加标注，**不改写旧数字**（Q4） | **①-b 已落地** —— 文件顶部已加「历史快照（2026-05-22）：以下通过数与页面数为当时口径」 |
| 14 | `QUICKSTART.md:33-49` 命令清单缺 `npm run redirects`（`og` 亦缺） | `package.json:13`（`og`）、`:14`（`redirects`）；`README.md:105` 有写 | 以代码为准 | **①-b 已落地** —— `[复核]` `QUICKSTART.md:47-48` 已含 `npm run redirects` 与 `npm run og` |
| 15 | （反向确认，**非漂移**）`README.md` 的「17 个 legacy 跳转页」、`site-maintenance-guide.md:46-63` 的 `src/lib/**` 路径清单、`AGENTS.md` 的 6 个 workflow 名 | `[复核]` `scripts/legacy-redirects.js` 的 `legacyRedirects` 长度 = **17**（7 平级 + 6 `/blog/*.html` + 4 `/articles/<中文>/`）；`[复核]` workflow 目录 = 6 个文件 | —— | **非漂移（反向确认）** —— lane-4 §11 把这一条写作「避免误伤供反向确认」，不是缺陷 |
| 16 | 基线全仓无 `rollback`/`回滚` 说明（`README.md`/`site-maintenance-guide.md` 只讲正向部署）→ 生产回滚依赖控制台经验 | `[复核]` `site-maintenance-guide.md:384-389` 新增「### 回滚」小节：Worker `npx wrangler deployments list` + `npx wrangler rollback [version-id] --name mr-xia-site --message "<原因>"`（并注明 Workers 版本含该次部署的静态资产，所以回滚同时把 `dist/` 退回那一版）；内容 `git revert` + 重新 `npm run build` + `npx wrangler deploy`；GH Pages 对历史 `deploy` run 选 Re-run；并写明两条限制 —— 「没有任何回滚逻辑」之外的「已推 R2 的资源没有删除逻辑（代码里没有 `DeleteObjectCommand`）」与「没有『构建产物是否与 HEAD 一致』的闸门，回滚前先确认本地 `dist/` 来自哪个 commit」 | 操作型文档补缺失内容（非「冲突」） | **已关闭（由上级 agent 补齐）** —— 该小节由上级 agent 直接写入 `site-maintenance-guide.md`，不在批次①-a 写入范围，此处仅登记；对应 [`04-risks.md`](04-risks.md) 的 P3-26 |

---

## 2. 目标型文档：`DESIGN.md` 与实现（lane-1 §8）

| 项 | `DESIGN.md`（目标态，基线行号） | 实现（当前代码） | 判定 | 状态 |
|---|---|---|---|---|
| 断点 | `:919-926` 表声明 Desktop `>1024px` / Tablet `700–1024px` / Mobile `<700px` / Small `<420px`；`:934,945,998` 三个 media query 用 1024/700/420 | `src/styles/global.css` 用 `min-width:901px`（`:1064`）、`max-width:900px`（`:2624`）、`max-width:767px`（`:2654`）、`max-width:768px`（`:2798`）、`max-width:480px`（`:2879`/`:3144`）；`MarkdownToolWidget.astro` 另用 980/640 | **未实现（差异原因：实现选了另一套断点，且 767/768 两块重叠）** | **批次① 已标注**（见 `DESIGN.md`「实现状态（2026-09-23）」小节）；数值口径仍为 C3，767/768 合并见 C4 |
| Header 移动端高度 | `:952` 声明移动端 `.site-header-inner { min-height: 56px }` | `src/styles/global.css:2666` 在 `@media (max-width:767px)` 内为 `min-height: 96px`（两行网格） | **未实现（差异原因：移动端 header 实为两行布局）** | **批次① 已标注**（见 `DESIGN.md`「实现状态（2026-09-23）」小节）；数值口径仍为 C3 |
| Page H1 | `:172` 声明 `clamp(2.25rem, 5vw, 4rem)` | `src/styles/global.css:243` `h1 { font-size: 3.75rem }`；`:499` `.page-title { font-size: clamp(3rem, 6vw, 4.35rem) }` | **未实现（差异原因：实现值整体更大）** | **批次① 已标注**（见 `DESIGN.md`「实现状态（2026-09-23）」小节）；数值口径仍为 C3 |
| Hero H1 | `:171` 声明 `clamp(3.25rem, 8vw, 6.25rem)` | `src/styles/global.css:505` `.hero-home .page-title { font-size: 5.25rem }`（固定值，非 clamp） | **未实现（差异原因：实现为固定值）** | **批次① 已标注**（见 `DESIGN.md`「实现状态（2026-09-23）」小节）；数值口径仍为 C3 |
| Section H2 | `:173` 声明 `clamp(1.75rem, 3vw, 2.75rem)` | `src/styles/global.css:247` `h2 { font-size: 2.15rem }`；`:531` `.section-heading { font-size: 2rem }` | **未实现（差异原因：实现为固定值）** | **批次① 已标注**（见 `DESIGN.md`「实现状态（2026-09-23）」小节）；数值口径仍为 C3 |
| 类名契约 | `:289,589,595,601`（`.tool-panel`/`.layout-grid`/`.auto-grid`/`.article-layout`）与 `:934-1015` 的 media query 示例用这五个类名 | `[复核]` `.article-layout`/`.layout-grid`/`.auto-grid`/`.tool-panel`/`.btn-row` 在 `src/**` 内 **0 引用**（既无标记也无 JS 消费方），只存在于 `global.css` 与 `DESIGN.md` | **双向漂移（文档给了契约，实现两处都没用）** | **批次① 已标注**（见 `DESIGN.md`「实现状态（2026-09-23）」小节）；清理范围仍为 C3 / C5 |
| 主题 boot（一致项） | `:672-686` 固定浅色默认、不读系统主题 | `src/layouts/BaseLayout.astro:92-100` 与之一致 | **已实现** | 非漂移 |
| 色彩 token（一致项） | `:17-153` | `src/styles/global.css:1-150` 值逐项一致 | **已实现** | 非漂移 |

> `DESIGN.md` 属目标型文档，按 Q3 应「逐条标注 已实现 / 未实现（差异原因）」。**该标注已由批次①-a 执行**：`DESIGN.md` 首个标题之后已插入 `## 实现状态（2026-09-23）` 小节（只标注，不改写正文数值），与本表 §2 同源。数值口径本身的取舍仍是 C3。

---

## 3. 批次① 新引入的「文档领先代码」窗口（必须在同一 PR 内闭合）

条目 2 的修法把 `check` 的能力描述改成了**代码还没有的能力**，四处同时如此：

| 位置（当前行号） | 现文本要点 |
|---|---|
| `README.md:106` | 「…文件名 ASCII 与 **tags 白名单（白名单以 `AGENTS.md` 的 Blog Taxonomy 为准）**；不校验 R2 资产」 |
| `AGENTS.md:38` | 「…ASCII filenames and **the `tags` taxonomy whitelist (see Blog Taxonomy below)** for every post. R2 assets are not checked.」 |
| `AGENTS.md:68` | 「**白名单校验由 `scripts/check-posts.js` 承担（随 2026-09-23 这批文档同步落地）**：改动 frontmatter 后跑 `npm run check` 即可。该校验合并前进仓库时仍需人工自检本节词表。」 |
| `site-maintenance-guide.md:352` | 「…**`tags` 白名单对照 AGENTS.md 的 Blog Taxonomy**，R2 资产不在校验范围内」 |

**代码现状**：`[复核]` `grep -n "科技\|WHITELIST\|白名单\|taxonomy" scripts/check-posts.js` → **0 命中**。即 `scripts/check-posts.js` 目前**没有**任何白名单校验。

**结论与要求**：
- 这是**有意的领先**（批次①-b 的指令写明「批次③ 会落地该校验，同一 PR 内完成」），不是错误；但它把「文档与实现一致」这个本批目标临时置为不成立。
- 因此 [`01-design-tree.md`](01-design-tree.md) 的 Q7 DoD 对该 PR 多一条硬要求：**`scripts/check-posts.js` 的 taxonomy 校验必须落在同一 PR 的批次③ commit 里**；若该 PR 在批次③ 之前合并，四处文档会变成新的漂移源。
- **该要求已记入 [`01-design-tree.md`](01-design-tree.md) B5 的批次③ 条目 3**（taxonomy 校验落进 `scripts/check-posts.js` + `20260918-zcode-…-2.md` 追加 `人工智能`），并在 [`04-risks.md`](04-risks.md) 里记作 P1-10 → 批次③ 3-3。
- 顺带需要同 PR 处理的一致性：`src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md:7` 目前仍是 `tags: ["科技"]`（`[复核]` 第 7 行），Q8 要求的「追加 `人工智能`」尚未执行；`AGENTS.md:61` 的白名单已含 `科技`，所以该校验一落地必须能通过 —— 白名单收编已完成，正文追加属内容变更。

### 窗口已闭合（2026-09-23，批次③ 3-3）

- `scripts/check-posts.js` 已加入 category 三选一、tags 白名单、1–4 数量、tag ≠ category 四类校验（白名单常量 `TAG_WHITELIST` 就写在文件顶部，注释指向 `AGENTS.md` 的 Blog Taxonomy）。
- `src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md` 的 tags 已追加 `人工智能`（保留 `科技`），因此新校验一落地就能过。
- 实测：`npm run check` 输出「检查完成：14 篇文章，0 个错误，0 个警告」；新增反例断言见 `tests/check-posts.test.js`。
- 因此本 PR 合入时，§3 那条「文档领先代码」不再成立，四处文档描述与代码一致。

---

## 4. 判定方向速查（Q3 规则的落地形态）

| 文档 | 类型 | 该做什么 | 本批状态 |
|---|---|---|---|
| `AGENTS.md`、`README.md`、`QUICKSTART.md`、`site-maintenance-guide.md` | 操作型 | 以代码为准修正 | §1 的 11 条操作型漂移（条目 1–9、14，加上收尾新增的条目 16）**已全部落地**；其中条目 2 方向反了（见 §3），**已由批次③ 3-3 接住并闭合** |
| `DESIGN.md` | 目标型 | 逐条标注「已实现 / 未实现（差异原因）」 | **批次①-a 已执行** —— 顶部新增「实现状态（2026-09-23）」小节；数值取舍属 C3 |
| `prd-*`、`move-to-astro/*/spec.md` | 目标型 | 同上 | 本批未系统过一遍；`move-to-astro/README.md` 只加了 Phase 覆盖范围说明 |
| 旧审计/计划文档（`docs/grilling/2026-09-12-roadmap/`、`docs/superpowers/**`、`frontend-visual-reform/checklist.md`） | 历史快照 | 只加日期或后续状态标注，不改写旧数字 | §1 的 4 条快照行（条目 10–13）已落地；`2026-09-12-roadmap/` 目录 6/6 文件均带标注 |
