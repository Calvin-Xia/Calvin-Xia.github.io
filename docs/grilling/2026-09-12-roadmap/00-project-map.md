# 项目结构探查报告(2026-09-12)

> **历史快照（2026-09-12）**：本文已被 `docs/grilling/2026-09-23-project-audit/00-project-map.md` 取代，保留仅作当时事实的对照。其中的 commit 数、测试文件数与行数、workflow 数、`tools/api-server.js` 行数与鉴权方式（当时写 `===` 非 timing-safe，现为 `crypto.timingSafeEqual`）等数字与结论均已过期，请以新审计文档和当前代码为准。

> 本文档是 grilling 流程的事实基础,由 3 个并行探索代理产出,只含代码中可验证的事实。
> 后续文档:[01-design-tree.md](01-design-tree.md) · [02-rounds.md](02-rounds.md)

## 1. 项目概览

- **定位**:Mr.Xia 个人网站,Astro 6 静态博客 + Cloudflare Worker(API 层),从根级 HTML/CSS/vanilla JS 完成迁移。
- **规模**:198 个 commit(2025-12-04 起);36 个测试文件共 5917 行(node:test,上次记录 273/273 通过);2846 行 global.css;15 个路由;23 个 lib 模块;12 个客户端脚本。
- **内容**:blog 13 篇、works 4 条、tools 3 条、updates 1 条(glob loader,fileStem 为 id)。
- **Node 要求**:`>=22.12.0`。无 bin 字段、无 git hooks、无 Makefile/sh 脚本。

## 2. 部署与运行时架构

| 通道 | 说明 |
|---|---|
| Cloudflare Worker(主) | `wrangler.jsonc`:entry `src/worker.ts`,assets 绑定 `./dist`,`run_worker_first: ["/api/*"]`;vars 为公开的 Umami host/website-id;observability 全开;**无** routes/cron/KV/D1/R2 绑定 |
| GitHub Pages(并存) | `deploy.yml` 构建后 deploy-pages,BASE_URL 默认 calvin-xia.github.io —— **双发布通道并存** |

- Worker 路由仅两个:`GET /api/health`(可选 Bearer `HEALTH_CHECK_TOKEN`)、`GET /api/views/<slug>`(Umami 登录换 token→metrics,401/403 重试一次,缓存 300s;查询失败降级 `{views:null}` 200)。
- 其余请求全部 fallback 到 ASSETS。SecurityLogger 为内存环形 1000 条,**无持久化**。

## 3. CLI / 工具链面(npm scripts)

| 脚本 | 实体 | 要点 |
|---|---|---|
| `publish` | scripts/publish-post.js(384 行) | Obsidian 目录→R2 资产上传(S3 SDK,串行+3 次退避重试)→`file/` 链接改写→写 `src/content/blog/<dirName>.md`;`--dry-run`/`--help`;多 md 时 prompts 多选;**目标 md 普通写入,同名静默覆盖**(对比 api 路径用 `flag:'wx'`) |
| `edit-metadata` | scripts/edit-metadata.js(422 行) | 交互式编辑 frontmatter,zod 校验,tmp+rename 原子写,崩溃 .tmp 自愈;`--skip-validation` |
| `api` | tools/api-server.js(239 行) | `POST /api/new-post`(Bearer `NEW_POST_SECRET`,1MB 上限,422/409/413/403 分级),监听 127.0.0.1:4322;Bearer 用 `===` 非 timing-safe;无 GET/健康检查;无访问日志 |
| 测试 | `node --test tests/*.test.js` | node:test + `--experimental-test-coverage`,无阈值配置 |

- 上次 grilling 产出 `.trae/documents/cli-hardening-plan.md`(2026-09-01):13 条决策,8 条已实施,5 条**维持现状**:`../file/`链接与 HTML 标签不重写、未编码括号文件名截断、BOM 不容忍、readline/prompts 混用、上传串行无进度。
- env 契约:`.env`(OKP_VAULT、R2_*)与 `.dev.vars`(UMAMI_*、HEALTH_CHECK_TOKEN),均 gitignore。
- CI:4 个 workflow(astro-build-check / deploy / phase-2-content-check / metadata-editor-check),全部 Node 22。**publish 与 api-server 无专门 workflow**(由 phase-2-content-check 兜底跑全量测试)。

## 4. 站点功能面(src/)

### 路由(15 个)
- `index.astro`(139 行,hero+更新流)、`articles.astro`(**824 行,其中约 650 行内联 script**——搜索/筛选/骨架屏全在里面)、`articles/[...slug].astro`(详情)、`articles/archive.astro`(按年归档)。
- `works.astro`(205 行):**4 个项目卡片全部硬编码在模板里**,不消费 works 集合——同一项目信息两处维护。
- `works/tools.astro`、`markdown-tool.astro`、`new-post.astro`(仅 DEV)、`styleguide.astro`、`404.astro`(内联 onclick)。
- `rss.xml.ts`、`robots.txt.ts`、`search-index.json.ts`(4 集合合并 MiniSearch 索引,Cache-Control 3600s)。

### 组件/脚本/库
- 15 组件,最大 MarkdownToolWidget(341 行)、Header(173 行,内联主题/i18n 脚本)、GiscusComments(repo-id 硬编码)。
- 12 客户端脚本,最大 markdown-renderer.ts(951 行,公众号导出转换器);`article-transitions.js` 是 13 行纯 re-export 垫片(仅为旧测试保留)。
- 库:搜索全家桶(search-client 324 行 + jieba-wasm + n-gram 分词)、article-enhancements 五件套(灯箱/进度/划词/标题/渐显,共约 1200 行)、i18n(zh-CN/en-US 运行时 DOM 替换,无 /en/ 路由)。
- global.css:60+ CSS 变量 + 完整深色模式(data-theme)+ 4 个断点;**Google Fonts 用 @import(阻塞渲染)**。

### 可观察缺口(全部经 grep/读码证实)

| 类别 | 缺口 | 证据 |
|---|---|---|
| SEO | **全站无任何 og:/twitter: meta 标签**、无 canonical、无 JSON-LD | grep `og:` 0 命中 |
| 图片 | 无 astro:assets;文章图为 R2 CDN 直链 raw img,无 width/height(CLS 无防护) | src 无 astro:assets import |
| 导航 | 无 prev/next、无相关文章、无标签/分类落地页(仅列表页 ?query 筛选) | pages 无对应路由 |
| 数据一致性 | works 页硬编码 vs works 集合双轨;筛选 chips 只含 blog 的 cat/tag 而搜索索引含 4 集合;manifest theme_color `#1a1a2e` ≠ 主色 `#315d67`;**测试文章 `00010101-test-assignment.md` 在生产构建中发布** | 见 02 报告 |
| 代码健康 | `escapeRegExp` 3 份、`safeInit` 3 份内联、TOC 768px 断点 3 处、CDN 域名白名单 3 处(local-cdn-proxy/image-lightbox/astro.config)、≥8 处各自监听 astro:page-load | 见 02 报告 file:line |
| 性能 | Google Fonts @import;styleguide 颜色硬编码与变量重复 | global.css:3 起 |
| 安全 | api-server Bearer 非 timing-safe 比较 | tools/api-server.js:176 |

无 TODO/FIXME/HACK 残留(第一方代码 0 命中)。i18n `<html lang>` 初始值硬编码 zh-CN。

## 5. 文档体系与规划惯例

- **已入库**:`move-to-astro/`(Phase 0-8 规格)、`frontend-visual-reform/` 三件套(tasks 有 7 项未勾,checklist 注明多视口/键盘路径未完成)、`docs/superpowers/plans/YYYY-MM-DD-<topic>.md`(Phase 13 等)。
- **gitignore 忽略但存在**:`.trae/documents/`(24 个,含上次 grilling 的 cli-hardening-plan.md)、`prd-20260531/`、`prd-20260601/`、`.sisyphus/plans/`(含 Analytics Engine 迁移计划 52/52 全勾、multi-md-publish 计划 10/21 勾但功能已另行实现)。
- **文档滞后**:README 仍写"Phase 0-6 已完成",QUICKSTART/维护指南写 Phase 12,而 git 历史与 plans 已有 Phase 13;README 未记录 `edit-metadata`/`lint`/`lint:fix` 三个脚本。
- **命名惯例**(新文档若入库):`docs/superpowers/plans/YYYY-MM-DD-<topic>.md` 或 `move-to-astro/phase-N-<name>/spec.md`;本地惯例 `.trae/documents/<topic>-plan.md`。

## 6. 与本次 grilling 的关系

用户命题:**功能优化 / 新功能加入 / CLI 优化新增** 的整体规划。三轴对应本报告:
- CLI 轴 → 第 3 节(publish/edit-metadata/api 的已知缺口 + 上次 5 条遗留)
- 站点优化轴 → 第 4 节缺口表(SEO/图片/导航/一致性/代码健康)
- 新功能轴 → 现有基建可复用的方向(Umami 数据、Worker、构建时索引)
