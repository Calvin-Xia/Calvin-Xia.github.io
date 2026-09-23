# 分阶段实施规划 P14-P18(2026-09-12 定稿)

> **历史快照（2026-09-12）**：本文是当时的**计划**，不是现状描述。其中关于 `check-posts.js` 能力的一句（「标签规范、正文链接与 R2 资产引用校验、hero 与资产清单一致性」）与实际落地的实现不符——`npm run check` 不校验 R2 资产，标签白名单校验直到 2026-09-23 的整改（与文档同步同一 PR）才加入。现状见 `docs/grilling/2026-09-23-project-audit/00-project-map.md`。

> grilling 共识产物(R3-Q18 确认)。五个 Phase 按优先级 CLI→站点→新功能 排列,每个 Phase 独立可交付、可单独上线;约束见 [03-decisions.md](03-decisions.md)。

## 依赖关系

```
P14 CLI 工具集 ──► P15 发布链路增强 ──► P16 SEO 与分享卡
       └────────────► P17 文章体验(仅依赖 check 可用)
P18 站点清理与性能(无强依赖,收尾做,避免与前面 Phase 的文件冲突)
```

---

## Phase 14 · CLI 工具集

**状态(2026-09-12)**:已完成并部署(fda4551..9cd0b99),新增 `cli-commands-check.yml` 门禁。

**目标**:把散落的作者工具补成完整工具集,并修复三处防呆缺口。

### 改动清单
| 项 | 内容 | 涉及文件 |
|---|---|---|
| 新命令 `check` | 内容体检:frontmatter 必填字段/日期格式/标签规范、正文链接与 R2 资产引用校验、hero 与资产清单一致性;失败退出码非 0,可进 CI | `scripts/check-posts.js`(新)、复用 `post-utils.js`/content schema |
| 新命令 `stats` | 全站/单篇字数、阅读时长、资产数量报表,输出 markdown/json | `scripts/post-stats.js`(新)、复用 `src/lib/word-count.js` |
| 新命令 `new` | 离线交互建稿,复用 api-server 的校验与写盘逻辑(flag 'wx') | `scripts/new-post-cli.js`(新)、复用 `tools/api-server.js` 内的校验函数(抽到 `post-utils.js`) |
| 新命令 `list` | 全部文章标题/日期/分类/标签/字数概览 | `scripts/list-posts.js`(新) |
| publish 补强 | 目标 md 已存在→报错,`--force` 才覆盖;`--version`;未知 flag 由警告改报错退出 | `scripts/publish-post.js` |
| api 加固 | Bearer 改 `crypto.timingSafeEqual`;新增 `GET /api/health`(status/uptime/内容目录可写性) | `tools/api-server.js` |
| 共享 | 各命令统一 --help 风格与 env 校验(复用 `validatePublishEnvs` 模式) | `scripts/post-utils.js` |
| npm scripts | `check` / `stats` / `new-post` / `list-posts` 挂载 | `package.json` |

### 新增依赖
无(全部 Node 内置 + 现有 prompts/gray-matter/zod)。

### 验收标准
- `npm run check` 对当前 13 篇全部通过(修复已知问题后);故意注入坏数据时退出码非 0。
- 四个新命令 `--help` 可用;`publish --version` 输出版本;未知 flag 报错退出。
- `publish` 对已存在目标 md 报错,`--force` 覆盖并明确提示。
- api-server Bearer 比较 timing-safe;`GET /api/health` 返回 200。
- `npm test` 全绿(新增各命令单测,沿用 tmpdir 真实 IO 模式)。

### CI
新增 `.github/workflows/cli-commands-check.yml`:跑全部新命令 --help、`npm run check`(exit 0 断言)、`npm run stats` 冒烟、tmpdir 内 `new`/`publish --dry-run` fixture 冒烟、`npm test`。

---

## Phase 15 · 发布链路增强(头图 + 图片 CLS)

**状态(2026-09-12)**:已完成并部署上线(9cd0b99..f26ef1d,Cloudflare 版本 ebd92cca),9 篇头图入库、84 张存量图尺寸回填,实测 CLS 0.0229(残余字体 FOUT 由 P18 自托管解决)。

**目标**:发布一条龙产出"带头图、带尺寸元数据"的文章;存量 13 篇回填。

### 改动清单
| 项 | 内容 | 涉及文件 |
|---|---|---|
| 头图交互 | publish 元数据问答后 prompts select(列出该篇 `file/` 已引用图片,选空=无头图) | `scripts/publish-post.js`、`post-utils.js` |
| 头图处理 | sharp 降采样为 webp(长边约 1600px)→ `src/assets/hero/<slug>.webp`;frontmatter 记 `hero` 字段 | 新 dev 依赖 sharp;`scripts/publish-post.js` |
| 尺寸探测 | 上传 R2 时读图片头(PNG/JPEG/WebP,零依赖手写解析)取宽高,写入 frontmatter 资产清单 | `scripts/image-dimensions.js`(新)、`publish-post.js`、`markdown-utils.js` |
| 渲染注入 | rehype 插件按资产清单给对应 img 注入 `width/height/loading=lazy/decoding=async` | `src/lib/rehype-image-dimensions.js`(新)、`astro.config.mjs` |
| 页面 hero | 详情页顶部渲染头图(样式对齐 DESIGN.md 中性编辑风) | `src/pages/articles/[...slug].astro`、`global.css`、`content.config.ts`(schema 加 hero) |
| 存量回填 | 一次性脚本读 vault 原图(或 HEAD R2)补 13 篇宽高;头图按需人工补 | `scripts/backfill-image-dimensions.js`(新,跑一次) |

### 新增依赖
sharp(dev)。

### 验收标准
- 新发布一篇文章:hero webp 落盘、frontmatter 含 hero+资产清单、R2 上传成功、详情页 hero 展示正常(桌面+移动)。
- 文章页所有 img 带 width/height/lazy;Lighthouse 文章页 CLS ≈ 0。
- 13 篇存量文章全部带资产清单宽高;`npm run check`(P14 产物)校验一致性通过。
- 无头图文章 og/页面均正常降级。

### CI
扩展 `phase-2-content-check.yml`:断言全部 blog 文章含资产清单宽高、hero 字段合法(有值时指向存在的 `src/assets/hero/` 文件)。

---

## Phase 16 · SEO 与分享卡

**状态(2026-09-12)**:已完成并推送部署(a11d1b5 一轮 + bc47490 二轮统一品牌卡,Cloudflare 版本 07cc2e8f),CI 断言 OG 卡 ≥14。

**目标**:补齐全站缺失的社交/搜索引擎元数据,配逐篇 OG 卡。

### 改动清单
| 项 | 内容 | 涉及文件 |
|---|---|---|
| meta 补全 | og:/twitter:/canonical,由 `site-seo.js` 新 helper 统一产出;URL 基准 calvin-xia.cn(M6) | `src/lib/site-seo.js`、`src/layouts/BaseLayout.astro` |
| JSON-LD | 文章页 `BlogPosting`(headline/datePublished/author);全站 `WebSite` | `BaseLayout.astro`、`[...slug].astro` |
| OG 标题卡 | satori 构建时渲染 1200×630(标题+日期+分类,风格对齐 DESIGN.md)→ `dist/og/<slug>.png`;同时产出全站默认卡 | 新 dev 依赖 satori;`scripts/generate-og-images.mjs` 或 Astro integration |
| og:image 决策树 | 文章有头图→头图;无头图→satori 标题卡;非文章页→默认卡 | `site-seo.js`、`[...slug].astro` |

### 新增依赖
satori(dev)。

### 验收标准
- 构建产物每篇文章页 head 含完整 og:/twitter:/canonical;分享调试器出卡。
- 每篇文章有 og:image 且可 200 访问;无头图文章回退 satori 卡。
- JSON-LD 通过结构化数据校验。

### CI
扩展 `astro-build-check.yml`:断言 dist 首页与抽样文章页含 og: 标签、`dist/og/` 下图片数量与文章数一致。

---

## Phase 17 · 文章体验(导航 + RSS 全文 + 热门)

**状态(2026-09-12)**:已完成并推送部署(8e6809c 及同批 UI 修复,Cloudflare 版本 2578ec7b),线上 trending 真数据验证通过。

**目标**:文章页有"上下文",订阅者看全文,访客看到热点。

### 改动清单
| 项 | 内容 | 涉及文件 |
|---|---|---|
| prev/next | 按日期序的上/下一篇,getStaticPaths 内计算 | `src/pages/articles/[...slug].astro`、`src/lib/` 新 helper |
| 相关文章 | 4 篇:同分类优先、标签重合度加权、最新补位;构建时静态生成 | `src/lib/related-posts.js`(新)、`[...slug].astro`、`global.css` |
| RSS 全文 | `content:encoded` 输出构建时渲染 HTML(含 Shiki 高亮),保留 summary | `src/pages/rss.xml.ts`、`site-seo.js` |
| 热门 API | Worker 新路由 `GET /api/trending?limit=N`:复用 Umami 登录基建查 top pages 映射 slug,Cache API 缓存 10 分钟,返回 `[{slug,views}]`;失败降级空数组 | `src/worker.ts`、`src/lib/umami-trending.js`(新) |
| 首页热门卡 | 首页渲染热门文章(仅首页,详情页不加);fetch 失败整卡隐藏 | `src/pages/index.astro`、`global.css` |

### 新增依赖
无。

### 验收标准
- 全部文章底部 prev/next 与相关文章正确渲染;相关文章算法有单测。
- RSS 通过 W3C feed 校验,阅读器内全文可读。
- `/api/trending` 返回真实数据(Umami 可达时),缓存生效;不可达时返回 200 空数组、首页卡片隐藏,不影响页面。

### CI
相关文章/RSS 用 node:test 单测;Worker trending 走现有 worker 测试模式(mock Umami);并入 `phase-2-content-check.yml`。

---

## Phase 18 · 站点清理与性能(收尾)

**目标**:消除数据双轨与重复代码,字体自托管,文档对齐现实。

**状态(2026-09-12)**:已实施完成,commits `3a3224d`(works 数据化+删测试文章)、`7d08c8b`(字体自托管+manifest+收紧 CSP)、`94a9290`(articles 拆分+共享模块去重)。落实时按 grilling 定案与规划有两处偏差:测试文章直接删除(未归档 fixture);articles 客户端模块落位 `src/scripts/articles-index/`(payload/cards/filters/search),共享模块为 `src/lib/escape-regexp.js` 与 `src/lib/cdn-hosts.js`。字体按 fontsource 按权重 CSS(非 variable),CSP 的 `fonts.googleapis.com`/`fonts.gstatic.com` 来源同步移除,phase-2/5/11 源码契约测试随实现更新。

### 改动清单
| 项 | 内容 | 涉及文件 |
|---|---|---|
| works 单一来源 | `works.astro` 改为消费 works 集合;硬编码数据搬入 JSON,schema 按渲染需要扩展;样式值换 CSS 变量 | `src/pages/works.astro`、`src/content/works/*.json`、`content.config.ts` |
| 测试文章迁移 | `00010101-test-assignment.md` 移出 blog 集合,归档为 tests fixture | `src/content/blog/` → `tests/fixtures/` |
| articles 拆分 | 824 行内联 script 迁 `src/lib/articles-page/`(搜索/筛选/骨架屏分模块) | `src/pages/articles.astro`、`src/lib/articles-page/`(新) |
| 三处去重 | `escapeRegExp`→共享模块;`safeInit`→共享;CDN 白名单单一来源(astro.config/local-cdn-proxy/image-lightbox 三处引用) | `src/lib/regexp-utils.ts`、`src/lib/cdn-hosts.ts`(新)等 |
| 字体自托管 | @fontsource 4 族(noto-serif-sc/noto-sans-sc/inter/jetbrains-mono,variable 优先),删 @import,font-display: swap | 新 dev 依赖 @fontsource/*、`global.css`、`BaseLayout.astro` |
| 一致性修正 | manifest theme_color `#1a1a2e` → 主色 `#315d67` | `public/manifest.json` |
| 文档同步 | README 补记 edit-metadata/lint/lint:fix + 新命令;Phase 状态更新;AGENTS.md 复查 | `README.md`、`AGENTS.md`、`QUICKSTART.md` |

### 新增依赖
@fontsource/*(dev)。

### 验收标准
- works 页数据只来自集合(改 JSON 即生效);重复实现 grep 清零。
- 生产构建不再产出测试文章路由。
- 文章列表行为(搜索/筛选/历史)与拆分前一致(现有测试锁定)。
- 断网/弱网下字体走本地;真机验证 CJK 分片按需加载(D9 验收项)。
- `npm test`、`npm run build`、`npm run lint` 全绿;桌面/移动布局复查。

### CI
无新 workflow;`astro-build-check.yml` 断言 dist 无测试文章路由;现有测试覆盖拆分回归。

---

## 排期与执行惯例

- 每个 Phase 一条分支 + PR(沿用既有 codex 分支惯例),PR 内附手动测试说明与截图(UI 改动)。
- Phase 内按改动清单逐 commit,一逻辑一提交。
- 实施顺序建议严格按 P14→P18;P18 如需提前,须先 rebase 避免与 P15/P16 的文件冲突(均动 `content.config.ts`/`[...slug].astro`)。
