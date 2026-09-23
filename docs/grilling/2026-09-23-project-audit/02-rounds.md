# 逐轮问答记录（2026-09-23 审计）

> 记录范围：两轮共 10 个问题。round 1 = Q1–Q4（内容上偏范围与规则），round 2 = Q5–Q10（内容上偏执行细节与个案口径）——圆括号内的概括是本次整理时的归类，不是当时的轮次命名。
>
> **留存说明（重要）**：本轮的问答原始逐字稿未随探查材料入库。「我的推荐与理由」一栏取自 `reports/00-overview-synthesis.md` §7「需要你决策的开放问题」与 §8「建议动作」中可对应的条目（该栏位逐条注明出处）；**没有对应条目的，写「未在探查材料中留存」而不是补写推测的推荐**。「用户的选择」一栏逐字保留审计任务书里已定决策的表述；未留存独立附加说明的，如实标注。

---

## Round 1 —— 范围与规则

### Q1 本轮整改的范围怎么划？

- **我的推荐与理由**：按 `reports/00-overview-synthesis.md` §8 把建议动作分成 A（零风险文档修正）、B（小改动换大收益）、C（需要决策后再动）三档，**先做 A 档**。理由：A 档不触碰任何运行时行为，可以立刻落地并立刻被下一个人信任；B/C 档都需要先确认行为影响或偏好取舍，混在一起会让单次变更难以验证、难以回滚。
- **用户的选择**：**本轮范围 = A 类（纯文档修正）+ B 类（低风险代码修复），先落 docs，一步一步走。C 类（需偏好裁决）不在本轮。**
- **用户的附加说明**：逐字关键句 —— 「**先落 docs**」「**一步一步走**」「**C 类（需偏好裁决）不在本轮**」。

### Q2 这些结论落在哪个目录、用什么形态？

- **我的推荐与理由**：沿用本仓库 2026-09-12 已建立的约定 `docs/grilling/<日期>-<主题>/`，用编号文件承载结论、用子目录承载证据。理由：仓库已有 `docs/grilling/2026-09-12-roadmap/`（`00-project-map.md` / `01-design-tree.md` / `02-rounds.md` / `03-decisions.md`），沿用同一形态可以让两轮审计直接对读；把四路原始报告一起入库，是因为它们此前躺在被 `.gitignore:22` 忽略的 `tmp/` 下，随时会丢。（出处：仓库既有目录约定 + `reports/00-overview-synthesis.md` §9「产物」段）
- **用户的选择**：**落点 = `docs/grilling/2026-09-23-project-audit/`，编号文件 + `reports/`，取代 2026-09-12 的现状快照。**
- **用户的附加说明**：逐字关键句 —— 「**取代 2026-09-12 的现状快照**」。

### Q3 文档与实现冲突时，默认听谁的？

- **我的推荐与理由**：不采用「一律以代码为准」。理由：`reports/00-overview-synthesis.md` §7 Q6 指出 `DESIGN.md` 与实现有三套数字（断点 1024/700/420 vs 900/767/768/480；h1/hero 的 clamp vs 固定值），`§6.18` 与 `§8.6` 又指出 `project.json`、`move-to-astro/README.md`、`frontend-visual-reform/checklist.md` 是历史快照 —— 这些文件的写作意图本身不同（一个描述目标态，一个描述当时事实），混为一类会误删设计目标或误改现状描述。故按「文档类型」分档。
- **用户的选择**：**文档与实现冲突的默认裁决 = 分类规则：操作型文档（`AGENTS.md`/`README.md`/`QUICKSTART.md`/`site-maintenance-guide.md`）以代码为准修正；目标型文档（`DESIGN.md`/`prd-*`/`move-to-astro/spec`）视为目标态，逐条标注「已实现 / 未实现（差异原因）」。**
- **用户的附加说明**：逐字关键句 —— 「**操作型文档…以代码为准修正**」「**目标型文档…视为目标态，逐条标注「已实现 / 未实现（差异原因）」**」。

### Q4 过期文档和死文件怎么处理？

- **我的推荐与理由**：历史快照类**只加标注、不改写旧数字**；零引用死文件删除前逐条核实引用面。出处：`reports/00-overview-synthesis.md` §8.6（建议给旧地图、`docs/superpowers/**`、`frontend-visual-reform/checklist.md` 加「历史快照」标注）、§8.5（建议删除或重写 `project.json`）、§6.18（`project.json` 与现状相反）。理由：历史快照的价值恰在「当时事实」，改写数字等于销毁证据；而死文件继续留在仓库会误导新接手者。
- **用户的选择**：**过期物处置 = 历史快照只加「历史快照（日期）」或「后续状态」标注、不改写旧数字；零引用死文件删除（动手前逐条核实）。**
- **用户的附加说明**：逐字关键句 —— 「**动手前逐条核实**」。

---

## Round 2 —— 执行细节与个案口径

### Q5 整改怎么分批？

- **我的推荐与理由**：按风险递增分三段，每段以「是否改变可见行为」为唯一判据。出处：`reports/00-overview-synthesis.md` §8 的 A/B/C 三档本质就是「零风险 / 有收益但需验证 / 需决策」，把它显式化成批次边界。
- **用户的选择**：**批次 = 风险递增三段：① 文档与快照 ② 无可见行为变化的代码 ③ 有用户可见影响的修复。**
- **用户的附加说明**：逐字关键句 —— 「**① 文档与快照**」「**② 无可见行为变化的代码**」「**③ 有用户可见影响的修复**」。

### Q6 分支与 PR 怎么组织？

- **我的推荐与理由**：未在探查材料中留存（`reports/00-overview-synthesis.md` §7/§8 未涉及交付形态）。可核对的仓库既有约定是 `AGENTS.md` 的 Commit & Pull Request Guidelines：「Keep one logical change per commit」「In PRs, include: summary of changes, affected files/pages, manual test notes, and screenshots for UI changes」。
- **用户的选择**：**单分支（`audit-2026-09-23-remediation`）+ 一个 PR，内部可分多个 commit。**
- **用户的附加说明**：逐字关键句 —— 「**一个 PR**」「**内部可分多个 commit**」。

### Q7 每批做到什么程度算完成？

- **我的推荐与理由**：直接采用 `AGENTS.md` 的 Testing Guidelines（`npm test`、`npm run build`、桌面/移动宽度核对、导航与交互组件核对、浏览器控制台无新增错误），再加上本仓库特有的 `npm run check`。出处：`AGENTS.md` Testing Guidelines 段。
- **用户的选择**：**每批 DoD = `npm test` + `npm run build` + `npm run check` + 为改动补测试/CI 断言 + 对影响浏览器行为的三项做实际页面核对。**
- **用户的附加说明**：逐字关键句 —— 「**为改动补测试/CI 断言**」「**对影响浏览器行为的三项做实际页面核对**」。

### Q8 白名单外标签 `科技` 怎么办？

- **我的推荐与理由**：出处 `reports/00-overview-synthesis.md` §7 Q1「`科技` 标签：收编进白名单（并同步 `AGENTS.md`），还是改写为已有词（如 `人工智能`）？」；`§6.10` 与 `reports/lane-2-content.md` §8.2 给出事实：`src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md:7` 是唯一违规，而 `npm run check` 报 0 错误（无自动拦截）。`AGENTS.md` 的 Blog Taxonomy 又要求「新增词必须是一次显式决定，并同步更新本节列表」。
- **用户的选择**：**两者都留：`src/content/blog/20260918-zcode-silent-workspace-snapshot-upload-2.md` 追加 `人工智能`，同时把 `科技` 正式收编进 `AGENTS.md` 白名单（这是 AGENTS.md 要求的那次显式决定）。**
- **用户的附加说明**：逐字关键句 —— 「**两者都留**」「**这是 AGENTS.md 要求的那次显式决定**」。

### Q9 文件名日期与 frontmatter `date` 不一致，算违规吗？

- **我的推荐与理由**：出处 `reports/lane-2-content.md` §8.4：4 篇的文件名日期与 frontmatter `date` 不一致（`20260609-gaokao-chinese-essay` 文件 20260609 / `date` 2026-07-04；`20260620-cultural-legacy` 20260620 / 2026-07-01；`20260706-short-term-training-diary-1` 20260706 / 2026-07-14；`…-diary-2` 20260706 / 2026-07-15），并指出「URL 用文件茎，排序/归档用 frontmatter `date`，两者不一致会让『日期语义』自相矛盾」。`reports/00-overview-synthesis.md` §6.19 把它列为 P2。推荐方向是补规则而非改文件名 —— 因为改文件名会触发 URL 变更，按仓库契约必须补 legacy 跳转，代价远大于收益。
- **用户的选择**：**文件名日期与 frontmatter `date` 不一致 = 正常：文件名日期是 Obsidian 里的起稿日，`date` 是实际发布/完成日，允许不等；本轮只补规则，不改那 4 篇。**
- **用户的附加说明**：逐字关键句 —— 「**文件名日期是 Obsidian 里的起稿日，`date` 是实际发布/完成日，允许不等**」「**本轮只补规则，不改那 4 篇**」。

### Q10 本地 `.dev.vars` 键漂移怎么处理？

- **我的推荐与理由**：出处 `reports/00-overview-synthesis.md` §6.8「本地 `.dev.vars` 键漂移 `[核实]`」与 §8.10「修本地 `.dev.vars`（补 `UMAMI_USERNAME`/`UMAMI_PASSWORD`）或让代码兼容 `UMAMI_API_KEY`」；`reports/lane-3-runtime.md` §3 与 §10-P1-1 给出同一事实与后果。核心权衡：改本机密钥文件不产生仓库 diff，改代码则要动 Worker 鉴权路径（属批次③ 行为变更）。
- **用户的选择**：**只记录不改。记录时必须写准确事实：本机 `.dev.vars` 键是 `{HEALTH_CHECK_TOKEN, UMAMI_API_KEY}`，`.env` 键是 `{CLOUDFLARE_API_TOKEN, NEW_POST_ALLOWED_SECRET 相关三项, OKP_VAULT, R2_*}` —— 两个文件都没有 `UMAMI_USERNAME`/`UMAMI_PASSWORD`；`wrangler dev` 只读 `.dev.vars`，不读 `.env`；因此本地 `/api/views/*` 必返回 `views:null`、`/api/health` 必为 `degraded/not_configured`。生产用 secret 注入，不受影响。**
- **用户的附加说明**：逐字关键句 —— 「**只记录不改**」「**两个文件都没有 `UMAMI_USERNAME`/`UMAMI_PASSWORD`**」「**生产用 secret 注入，不受影响**」。
- **落地时的实测核对（`[复核]`）**：本机 `.dev.vars` 实际键 = `HEALTH_CHECK_TOKEN`、`UMAMI_API_KEY`；`.env` 实际键 = `CLOUDFLARE_API_TOKEN`、`NEW_POST_SECRET`、`NEW_POST_ALLOWED_ORIGINS`、`OKP_VAULT`、`R2_ACCESS_KEY_ID`、`R2_BUCKET`、`R2_ENDPOINT`、`R2_PUBLIC_URL`、`R2_SECRET_ACCESS_KEY`（9 个）。决策原文里的「`NEW_POST_ALLOWED_SECRET` 相关三项」在文件里实际是 `NEW_POST_SECRET` + `NEW_POST_ALLOWED_ORIGINS` 两项加 `CLOUDFLARE_API_TOKEN`；`{UMAMI_USERNAME, UMAMI_PASSWORD}` 确实两个文件都没有。结论方向与决策一致。

---

## 附：两轮之间的一致性与未澄清处

- 两轮裁决无相互冲突：round 1 定「只看 A+B、C 类记录不动」，round 2 的 6 个问题全部落在 batch ① 或显式「只记录」的范围内（Q8 的正文追加属内容变更 → 批次③，Q9/Q10 只补规则与记录 → 批次①）。
- 未澄清：Q8 的「追加 `人工智能`」与「收编 `科技`」两件事的批次归属未在问答中说明，本目录按「已定批次口径」记为批次③（见 [`04-risks.md`](04-risks.md)）；Q10 提到的「`wrangler dev` 只读 `.dev.vars`」是机制陈述，未指派核实方，本次由批次①-a 以文件键集合实测间接确认（两个文件的键确实不同）。
