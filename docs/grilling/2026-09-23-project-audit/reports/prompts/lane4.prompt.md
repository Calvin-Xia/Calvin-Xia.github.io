# Lane 4 探查任务：工具链 / 发布流水线 / 测试 / CI / 文档与历史

你在 Herdr 面板里运行，仓库 cwd = `C:\Users\Calvin-Xia\mr.xia.github.io`。

## 硬性约束
- **只读**：除最终报告文件外，不得修改、新建、删除仓库内任何文件；不得 `git add/commit/push`；不得 `npm install`；不得执行 `npm run build/publish/redirects/check/stats`（会写盘或联网）。允许：读文件、`git log/show/diff`、`ls`、`grep`，以及 `node --version` 这类无害命令。
- 报告写入（覆盖写）：`C:\Users\Calvin-Xia\mr.xia.github.io\tmp\project-explore\lane-4-toolchain.md`
- 报告：中文 Markdown，**必须带证据**（`相对路径:行号` + 关键片段）。目标 250~450 行。
- 完成后**只回复**：报告绝对路径 + 8 行以内要点摘要。

## 探查范围
1. `package.json`：全部 scripts（含 dev/build/preview/test/check/stats/publish/api/redirects/lint）与依赖清单分类（运行时/构建/测试）
2. `scripts/` 逐个文件的职责与关键实现（`publish-post.js`、`post-utils.js`、`slug.js`、`legacy-redirects.js`、`generate-redirects.mjs`、`generate-og-images.mjs`、`og-card.js`、`check-posts.js`、`post-stats.js`、`new-post-cli.js`、`list-posts.js`、`edit-metadata.js`、`backfill-image-dimensions.js`、`image-dimensions.js`、`markdown-utils.js`、`blog-posts.js`、`content-types.js`、`readable-stats.js`）
3. `tools/api-server.js`（本地新建文章 API）与 `scripts/new-post-cli.js` 的关系
4. `tests/**` 55 个文件：按主题归类（内容迁移/发布流水线/本地 API/构建产物断言/…），说明各自断言了什么、靠什么运行（node:test?）
5. `.github/workflows/*.yml` 6 个工作流：触发条件、执行步骤、成功判据、覆盖哪些改动面
6. 文档地图与一致性：`README.md`、`AGENTS.md`、`QUICKSTART.md`、`DESIGN.md`、`site-maintenance-guide.md`、`project.json`、`docs/**`（10 个）、`UpdateLog/**`、`move-to-astro/**`、`frontend-visual-reform/**`、`prd-20260531`、`prd-20260601`
7. `git log --oneline` 近 30~40 条提交：演进主线与节奏

## 必须回答的问题
- **发布链路**：从 Obsidian 目录到线上文章的完整步骤、命令、每步产物与校验（含 `--dry-run`、`--force`、hero 选择、R2 上传、图片尺寸回填）？
- 哪些脚本会**写盘/上传**（写到哪里、可否回滚），哪些是纯只读校验？
- 博客 URL 与 legacy 跳转的生成契约：什么改动会导致必须补 `legacy-redirects.js`？`npm run check` 会拦截什么？
- 测试边界：自动化到底守住了哪些回归（列具体断言点），哪些关键路径**无测试覆盖**？
- CI 边界：每个 workflow 拦截哪类改动；有改动面（如 Worker/`src/worker.ts`）没有 CI 覆盖吗？
- **文档与代码不符/过期点**：逐条给出 `文档文件:行` 与对应代码证据，并说明应该改成什么。
- 历史脉络：从根级 HTML 迁移到 Astro 的主线、之后的视觉/功能迭代阶段（用提交与目录名做证据）。
