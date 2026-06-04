# Calvin Xia 个人主页

这是一个基于 [Astro](https://astro.build) 的静态个人站点，已从根目录 HTML/CSS/vanilla JS 全面迁移完成。Phase 0-13 已完成：博客、作品、工具和更新日志由 Astro 内容集合驱动，RSS feed、sitemap、giscus 评论区、文章字数/阅读时间、归档页、文章浏览量 Worker 代理、工具页 PWA、UI 国际化、安全监控、CI 质量检查、增强文章体验、中文搜索增强、单篇文章元数据编辑 CLI 和全站页面过渡动画均已落地。Phase 4 清理已执行，旧管线文件已移除。

## 当前结构

```text
Calvin-Xia.github.io/
├── astro.config.mjs              # Astro 站点配置，site 来自 BASE_URL
├── package.json                  # npm 脚本与依赖
├── src/
│   ├── content.config.ts         # Astro 内容集合 schema 与 loader
│   ├── content/                  # blog / works / tools / updates 内容集合
│   ├── components/               # Astro 共享组件
│   ├── i18n/                     # zh-CN / en-US UI 翻译文件
│   ├── layouts/                  # BaseLayout 等布局
│   ├── lib/                      # 内容转换、排序、SEO、搜索、i18n、Worker 与文章增强工具
│   ├── pages/                    # Astro 页面、动态路由、RSS、robots.txt 与 search-index
│   ├── scripts/                  # Astro 客户端脚本、文章运行时和工具脚本
│   ├── styles/global.css         # Astro 全局样式
│   └── worker.ts                 # Cloudflare Worker 入口，代理浏览量 API 与健康检查
├── scripts/                      # 发布、元数据编辑、slug、Markdown、Content-Type 工具
├── tools/api-server.js           # 本地 new-post API
├── tests/                        # Node test suites
├── public/                       # Astro 静态资源、PWA manifest/SW、旧 URL 重定向
├── .github/workflows/            # CI：构建、测试、质量检查、文件操作校验 + GitHub Pages 部署
├── .env.example                  # 本地配置模板，不含真实凭证
├── wrangler.jsonc                # Cloudflare Wrangler 配置（Worker 入口、ASSETS binding）
├── .dev.vars.example             # Wrangler 本地 Worker secret 模板，不含真实凭证
├── .gitattributes                # LF 行尾规则
├── blog/                         # 旧 blog 说明文件（示例参考）
└── move-to-astro/                # 迁移设计决策存档（按 Phase 分目录，每目录一份 spec.md）
```

## 本地开发

```bash
npm install
npm run dev
```

默认访问 `http://localhost:4321/`。常用 Astro 路由：

- `/`
- `/articles/`
- `/articles/archive/`
- `/articles/20260411-ai-reliance/`
- `/rss.xml`
- `/robots.txt`
- `/search-index.json`
- `/works/`
- `/works/tools/`
- `/markdown-tool/`
- `/new-post/`（仅 dev 模式启用可提交表单）

## 环境配置

复制 `.env.example` 为 `.env`，填入本机配置和 R2 凭证。

- `BASE_URL`：Astro 构建使用的单一 canonical 主域名，例如 `https://your-site.example`
- `OKP_VAULT`：Obsidian vault 路径
- `R2_*`：Cloudflare R2 S3 兼容上传配置
- `NEW_POST_SECRET`：`/new-post/` 本地 API 鉴权密钥
- `NEW_POST_ALLOWED_ORIGINS`：额外允许调用本地 API 的精确 origin
- `HEALTH_CHECK_TOKEN`：Worker `/api/health` 详细响应的 Bearer Token（通过 Wrangler secret 注入）

`.env` 已被 `.gitignore` 排除，不要提交真实凭证。

文章浏览量使用 Cloudflare Worker 服务端代理 Umami Cloud API。生产环境不要把真实 API Key 写入 `.env`、`wrangler.jsonc` 或示例文件；部署前运行：

```bash
npx wrangler secret put UMAMI_API_KEY
```

本地调试 Worker 时，复制 `.dev.vars.example` 为 `.dev.vars` 并填入真实值。`.dev.vars*` 已被 `.gitignore` 排除；如果同时存在 `.dev.vars` 和 `.env`，Wrangler 本地开发会优先使用 `.dev.vars`。

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm test
npm run test:coverage
npm run lint
npm run api
npm run edit-metadata -- <markdown-file>
npx wrangler secret put UMAMI_API_KEY
npx wrangler secret put HEALTH_CHECK_TOKEN
npm run publish -- --dry-run <obsidian-post-dir>
npm run publish -- <obsidian-post-dir>
```

- `npm run api` 启动本地 new-post API，默认监听 `127.0.0.1:4322`
- `npx wrangler secret put UMAMI_API_KEY` 把 Umami API Key 作为 Cloudflare Worker Secret 注入生产环境
- `npx wrangler secret put HEALTH_CHECK_TOKEN` 为 `/api/health` 详细响应启用 Bearer Token 鉴权；公开响应不需要 token
- `npm run publish -- --dry-run <dir>` 只打印 Obsidian→R2 发布计划，不写文件、不上传
- `npm run publish -- <dir>` 复制 Obsidian Markdown 到 `src/content/blog/`，上传 `file/` 资源到 R2，并替换副本中的资源 URL；标签提示为空时默认写入 `未分类`
- `npm run edit-metadata -- <markdown-file>` 交互式编辑单篇文章 frontmatter，使用 Zod 验证并通过临时文件原子写入
- 文章阅读体验增强由 `src/scripts/article-runtime.js` 统一初始化，并在 Astro `ClientRouter` 页面切换后重新绑定；`src/scripts/page-transitions.js` 处理全站页面过渡动画

## 内容维护

### 新增 Astro 文章

推荐路径：

1. 在 Obsidian 中准备文章目录与 `file/` 资源。
2. 运行 `npm run publish -- --dry-run <dir>` 预览目标 Markdown 和 R2 key。
3. 确认后运行 `npm run publish -- <dir>`。
4. 运行 `npm test` 和 `npm run build`。

`<dir>` 是 `.env` 中 `OKP_VAULT` 目录下的文章文件夹名，不是完整路径。推荐目录名保持 `YYYYMMDD-slug`：

```text
OKP_VAULT=C:\path\to\obsidian-posts

<OKP_VAULT>\20260429-my-new-post\
  draft.md
  file\cover.png
  file\a b.png
```

此时 `<dir>` 写 `20260429-my-new-post`：

```bash
npm run publish -- --dry-run 20260429-my-new-post
npm run publish -- 20260429-my-new-post
```

发布脚本会把资源前缀推导为去掉日期后的 `my-new-post/`，并只修改仓库副本，不修改 Obsidian 原文。例如：

```md
![封面](./file/cover.png)
![带空格](./File/a b.png)
![已有 CDN](https://cdn.example.com/old-post/image.png)
```

会在仓库副本中变为：

```md
![封面](https://cdn.example.com/my-new-post/cover.png)
![带空格](https://cdn.example.com/my-new-post/a%20b.png)
![已有 CDN](https://cdn.example.com/old-post/image.png)
```

`/new-post/` 表单只负责把正文写成 `src/content/blog/*.md`，不会上传本地图片，也不会转换 `./file/...` 路径；带本地附件的文章优先走 `npm run publish`。

临时本地写作也可以同时运行 `npm run api` 和 `npm run dev`，打开 `/new-post/` 后用 `NEW_POST_SECRET` 提交表单，生成 `src/content/blog/*.md`。

### 编辑文章元数据

单篇文章的 frontmatter 可通过 CLI 修改：

```bash
npm run edit-metadata -- src/content/blog/20260503-labors-day.md
```

该工具会读取现有 frontmatter，交互式编辑标题、日期、摘要、分类、标签、精选状态、作者、阅读时间和状态。保存前默认执行 Zod 验证，写入时使用同目录临时文件再 rename，避免半写入破坏文章。确需绕过 schema 时可加：

```bash
npm run edit-metadata -- --skip-validation src/content/blog/20260503-labors-day.md
```

### 文章阅读体验维护

Phase 2.5 和 Phase 10 的文章页增强集中在 `src/lib/article-enhancements/`，入口是 `src/scripts/article-runtime.js`，目录容器是 `src/components/ArticleToc.astro`，样式在 `src/styles/global.css`。

- 图片：正文图片会按 `alt` 生成灰色说明文字，点击后打开原生 `<dialog>` 灯箱，支持切换、1x–4x 缩放、滚轮、移动端双指缩放、键盘快捷键和多种关闭方式。
- 标题：`.markdown-content h2/h3/h4` 会生成稳定 id、去重 hash 和可访问 `#` 锚点；标题少于 3 个时目录隐藏。
- 目录：桌面端显示右侧目录和阅读进度，移动端保持右侧 wiki 侧边栏姿态并通过浮动按钮开合；滚动时高亮当前章节，重复初始化通过 cleanup 防止事件堆叠。
- 公式：文章 Markdown 支持 `$...$` 与 `$$...$$`，由 `remark-math` + `rehype-katex` 在构建时渲染，文章页引入 KaTeX CSS。
- 高亮：文章和 Markdown 工具均支持 `==文本==` 语法，构建时由 `remark-mark-highlight.js` 渲染为 `<mark>`，客户端由 `marked` 的 `markExtension` 渲染。
- 统计：文章列表和详情页在构建时从 Markdown body 自动计算字数与阅读时间；已有 frontmatter `readTime` 会优先显示。
- 归档：`/articles/archive/` 按年份展示非草稿文章时间线，入口位于文章首页。
- 浏览量：详情页通过 `src/scripts/view-counter.js` 请求 `/api/views/{slug}`；Cloudflare Worker 在服务端携带 `UMAMI_API_KEY` 调用 Umami，失败时前端自动隐藏浏览量。
- 渐显：文章正文段落和图片在滚动进入视口时逐段淡入渐显（`section-reveals`），`prefers-reduced-motion: reduce` 时跳过动画直接显示。
- 切换：所有站内链接使用 Astro `ClientRouter`/View Transitions 渐进增强；文章列表↔详情使用方向性动画，返回列表时恢复滚动位置和 URL 参数中的搜索/筛选状态；其他页面使用默认 fade 过渡；`prefers-reduced-motion: reduce` 会关闭相关动画。
- 选择工具栏：选中文本后显示复制/分享工具栏，复制失败时也会安全收起，不阻断阅读。
- CDN：项目配置的 CDN 图片会被灯箱信任；本地 dev 下 CDN 图片会临时代理到 `/__cdn/...`，代理请求使用配置的 worker origin 作为 Referer。

### 搜索、健康检查与工具页 PWA

Phase 7 和 Phase 11 后，文章页搜索不再内联完整搜索数组。`/search-index.json` 在构建时由 `src/lib/search-index-builder.ts` 生成 MiniSearch 序列化索引，并通过 `jieba-wasm` 增强中文分词；客户端首次搜索时由 `src/lib/search-client.ts` 懒加载。搜索结果支持标题、日期、片段和关键词高亮，输入停止后防抖执行，最近 10 条搜索历史保存在 localStorage。搜索状态继续写入 URL 参数（`q`、`category`、`tag`），并可按分类和标签过滤，便于返回文章列表时恢复。

Worker 暴露 `/api/health`：

- 无鉴权请求返回公开状态：`status`、`timestamp`
- `Authorization: Bearer <HEALTH_CHECK_TOKEN>` 返回版本、运行时间和 Umami 依赖状态
- `?cache=30` 可设置公开缓存窗口
- Umami 不可用时返回 `degraded`，不影响静态站点访问

Phase 9 后，Worker 还会通过 `src/lib/security-logger.js` 记录 API 调用统计、4xx/5xx 响应和高错误率告警信号。日志不记录真实 secret。

Phase 7.5 后，`/works/tools/` 支持独立 PWA：

- `public/manifest.json` 的 `start_url` 和 `scope` 均限制在 `/works/tools/`
- `public/sw-tools.js` 仅拦截工具页范围，采用 Network First 策略
- `src/layouts/BaseLayout.astro` 只在 `/works/tools/` 下注册该 Service Worker
- `src/components/OptimizedIcon.astro` 为本地图标提供 WebP + PNG 降级

### 国际化维护

Phase 8 后，UI 文字使用自定义轻量 i18n：

- 翻译文件：`src/i18n/zh-CN.json`、`src/i18n/en-US.json`
- 运行时：`src/lib/i18n.ts`，提供 `t()`、`setLang()`、`initI18n()` 和 `calvin-xia-lang` 偏好存储
- Header 语言切换不刷新页面；`BaseLayout` 会在首屏前读取语言偏好，避免明显闪烁
- 只翻译 UI、按钮、placeholder、aria-label、页面 title/description 等界面文字；文章标题、摘要、标签、正文、备案信息保持原文中文
- 新增 UI 文案时必须同时补齐两份 JSON，并运行 `npm test`

### 更新作品、工具或更新日志

Astro 内容集合文件位于：

- `src/content/works/*.json`
- `src/content/tools/*.json`
- `src/content/updates/*.json`

更新后运行：

```bash
npm test
npm run build
```

## 推荐验证流程

在提交或发布前建议运行：

```bash
npm test
npm run test:coverage
npm run lint
npm run build
git diff --check
```

文章体验相关改动还应在桌面、平板和手机宽度检查：灯箱按钮不溢出、图片不遮挡正文、目录不与页脚重叠、浏览器控制台无新增运行时错误。

## CI/CD

当前 CI 包括：

- `deploy.yml`：push main 时自动构建 Astro 并通过 GitHub Actions 部署到 GitHub Pages
- `astro-build-check.yml`：安装依赖，运行测试、覆盖率、内容结构检查、ESLint、Astro 类型生成、TypeScript 检查、构建和关键静态输出验证
- `phase-2-content-check.yml`：运行 `npm test`、`npm run test:coverage`、内容结构检查和 Astro build
- `metadata-editor-check.yml`：当元数据编辑 CLI、测试或依赖变更时，运行 `tests/edit-metadata.test.js` 并验证 CLI help 入口

## 许可证

本项目采用双重许可结构：

| 组件 | 许可证 | 范围 |
|------|--------|------|
| 源代码 | [MIT License](./LICENSE) | `src/`、`scripts/`、`tools/`、`tests/`、配置文件 |
| 博客文章 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) | `src/content/blog/*.md` |

- **代码**：可自由使用、修改、分发，包括商业用途
- **博客文章**：可分享和改编，但须署名、非商业使用、相同方式共享

详见 [LICENSE](./LICENSE) 文件。

## 相关说明文档

- [QUICKSTART.md](./QUICKSTART.md)
- [site-maintenance-guide.md](./site-maintenance-guide.md)
- [move-to-astro/README.md](./move-to-astro/README.md)
- [AGENTS.md](./AGENTS.md)
- [blog/README.md](./blog/README.md)
