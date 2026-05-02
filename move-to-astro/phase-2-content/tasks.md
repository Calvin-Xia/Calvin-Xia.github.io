# Tasks

- [x] Task 2.1: 创建内容集合配置与 Schema
  - [x] SubTask 2.1.1: 创建 `src/content.config.ts`，使用 Astro 6 Content Layer loader、`defineCollection` 和 `z`
  - [x] SubTask 2.1.2: 定义 `blog` 集合 schema（zod）：`title`, `date`, `excerpt`, `category`, `tags`(array), `featured`(optional boolean), `author`(optional), `readTime`(optional), `status`(optional)
  - [x] SubTask 2.1.3: 定义 `works` 集合 schema：`title`, `date`, `excerpt`, `category`, `tags`(array), `filePath`, `externalUrl`(optional), `status`(optional), `featured`(optional boolean)
  - [x] SubTask 2.1.4: 定义 `tools` 集合 schema：`title`, `date`, `excerpt`, `category`, `tags`(array), `filePath`
  - [x] SubTask 2.1.5: 定义 `updates` 集合 schema：`title`, `date`, `excerpt`, `category`, `tags`(array), `filePath`
  - [x] SubTask 2.1.6: 验证 `npm run dev` 启动无类型错误
  - [x] SubTask 2.1.7: 将 blog loader pattern 收紧为 `[0-9]*.md`，避免 README 等非日期文章 Markdown 被误纳入内容集合

- [x] Task 2.2: 迁移博客 Markdown 源文件
  - [x] SubTask 2.2.1: 创建 `src/content/blog/` 目录
  - [x] SubTask 2.2.2: 将 6 篇 Markdown 源文件复制到此目录
  - [x] SubTask 2.2.3: 为每篇添加 frontmatter（从 `blog/blog-metadata.json` 提取字段）：
    - `20251231-2025年度总结.md`
    - `20260204-返校宣讲稿.md`
    - `20260312-返校宣讲回顾.md`
    - `20260315-两小时，环线，慢行.md`
    - `20260328-pre-reflection.md`
    - `20260411-ai-reliance.md`
  - [x] SubTask 2.2.4: 验证 frontmatter 格式正确（`date` 为 `YYYY-MM-DD`，`tags` 为数组）
  - [x] SubTask 2.2.5: 修正既有文章图片路径；`20251231-2025年度总结` 指向 `https://assets.calvin-xia.cn/` 根目录，其他既有文章指向 `https://content.calvin-xia.cn/<slug>/` 目录
  - [x] SubTask 2.2.6: 将 dev-only CDN 图片代理脚本抽取到 `src/scripts/local-cdn-proxy.js`，`BaseLayout` 仅按 dev 模式引用；页面无 CDN 图片时不创建 `MutationObserver`

- [x] Task 2.3: 迁移作品/工具/更新日志为内容集合 JSON
  - [x] SubTask 2.3.1: 将 `content/works-metadata.json` 拆为 4 个独立 JSON 文件放入 `src/content/works/`（fingerprint-app, favorites-collection, class1-map, button-block-designer）
  - [x] SubTask 2.3.2: 将 `content/tools-metadata.json` 拆为 3 个独立 JSON 文件放入 `src/content/tools/`（online-timer, random-selector, markdown-to-html）
  - [x] SubTask 2.3.3: 将 `content/update-logs-metadata.json` 拆为独立 JSON 文件放入 `src/content/updates/`（fingerprint-app-update-log）
  - [x] SubTask 2.3.4: JSON 文件仅包含元数据字段（不含正文），与 schema 定义一致

- [x] Task 2.4: 创建博客文章详情页 `articles/[...slug].astro`
  - [x] SubTask 2.4.1: 创建 `src/pages/articles/[...slug].astro`，使用 `getStaticPaths()` 从 `blog` 集合生成路径
  - [x] SubTask 2.4.2: 使用 Astro 的 `render()` 或 `<Content />` 渲染 Markdown 正文
  - [x] SubTask 2.4.3: 将正文包裹在 `.markdown-content` 容器中，应用 `global.css` 中的 Markdown 样式
  - [x] SubTask 2.4.4: 显示文章标题（h1）、日期、分类、标签
  - [x] SubTask 2.4.5: 显示 "← 返回文章列表" 链接
  - [x] SubTask 2.4.6: 渲染结果与当前 `blog/*.html` 对比验证
  - [x] SubTask 2.4.7: 保留引用块（`>`）内软换行，避免多行引文被合并为单行
  - [x] SubTask 2.4.8: 将图片非空 `alt` 渲染为图片下方灰色说明文字，并保持手写 HTML 并排图片宽度
  - [x] SubTask 2.4.9: 将手写图片宽度迁移为 `.markdown-image-figure--sized` + `--markdown-image-width` 控制，避免脚本写入普通 `style.width` 覆盖响应式 CSS

- [x] Task 2.5: 创建文章列表页 `articles.astro`
  - [x] SubTask 2.5.1: 创建 `src/pages/articles.astro`，使用 BaseLayout + PageIntro
  - [x] SubTask 2.5.2: 使用 `getCollection('blog')` 获取所有文章，按日期降序排列
  - [x] SubTask 2.5.3: 构建时提取所有分类（`category`）和标签（`tags`）的唯一值
  - [x] SubTask 2.5.4: 渲染分类过滤按钮和标签过滤按钮
  - [x] SubTask 2.5.5: 渲染文章卡片列表（标题、摘要、分类、标签、日期）
  - [x] SubTask 2.5.6: 实现客户端分类/标签过滤逻辑（保留 `content-hub.js` 的交互模式）
  - [x] SubTask 2.5.7: 迁移搜索 UI（搜索框 + SVG 图标 + 提示文本）

- [x] Task 2.6: 实现全站搜索功能
  - [x] SubTask 2.6.1: 构建时将所有可搜索内容（blog + works + tools，排除 updates）预序列化为内嵌 JSON
  - [x] SubTask 2.6.2: 实现客户端搜索脚本（保留现有 ranking 逻辑：title×6, tags×4, excerpt×3, category×2, type×1）
  - [x] SubTask 2.6.3: 实现搜索建议下拉（最多 6 条，保留 keyword highlighting）
  - [x] SubTask 2.6.4: 实现搜索结果渲染（mixed 模式卡片，含类型 badge）
  - [x] SubTask 2.6.5: 实现键盘导航（ArrowUp/Down/Enter/Escape）
  - [x] SubTask 2.6.6: 搜索模式下隐藏分类/标签过滤器
  - [x] SubTask 2.6.7: 验证搜索功能与原 `statement.html` 行为一致
  - [x] SubTask 2.6.8: 抽取 `src/lib/shared-content.js` 共享内容类型映射、严格日期解析、排序和 `NEW` 新鲜度判定；`src/lib/content.ts` 与 `/articles/` 客户端脚本共同 import，移除重复实现
  - [x] SubTask 2.6.9: 将搜索范围作为 `searchableTypes` 序列化进构建时 payload，客户端按 payload 过滤，移除硬编码 `update-log` 排除规则

- [x] Task 2.7: 创建更新日志详情页
  - [x] SubTask 2.7.1: 创建 `src/pages/updates/[...slug].astro`
  - [x] SubTask 2.7.2: 使用 `getStaticPaths()` 从 `updates` 集合生成路径
  - [x] SubTask 2.7.3: 页面展示更新日志标题和正文（将原 HTML 转换为 Markdown 或保留为内联 HTML）
  - [x] SubTask 2.7.4: 与原 `UpdateLog/fingerprint-app-update-log.html` 渲染对比
  - [x] SubTask 2.7.5: 将 `fingerprint-app-update-log` 时间线迁移为 `src/content/updates/fingerprint-app-update-log.json` 中的结构化 `timeline` 数据，页面不再读取或正则解析遗留 `UpdateLog/*.html`

- [x] Task 2.8: 连接首页最近更新
  - [x] SubTask 2.8.1: 在 `index.astro` 中使用 `getCollection()` 获取 blog/works/updates 内容
  - [x] SubTask 2.8.2: 按日期排序，选取优先级最高的 4 条（article > work > update-log > tool）
  - [x] SubTask 2.8.3: 渲染最近更新卡片列表（类型 badge + 日期 + 标题 + 摘要 + 操作链接）

- [x] Task 2.9: 实现文章可视化加载与新鲜度展示
  - [x] SubTask 2.9.1: 在 `global.css` 添加 `.skeleton-card` 样式（脉动动画 `@keyframes pulse`，匹配 `.card` 尺寸与圆角）
  - [x] SubTask 2.9.2: 在 `global.css` 添加 `.content-type-badge--new` 样式变体（`--accent-color` 主题，脉冲呼吸动画）
  - [x] SubTask 2.9.3: 在 `articles.astro` 列表区域嵌入 4 张 `.skeleton-card` 占位 HTML，搜索/过滤触发时显示、结果就绪后隐藏
  - [x] SubTask 2.9.4: 在 `articles.astro` 文章卡片中实现新鲜度判定（`date` 距 `new Date()` ≤ 7 天）并渲染 `NEW` 徽章
  - [x] SubTask 2.9.5: 在 `articles.astro` 搜索/过滤结果为空时显示 `.no-results` 空状态（"没有找到匹配的文章" + "重置筛选" 按钮）
  - [x] SubTask 2.9.6: 首页最近更新卡片复用 freshness badge 判定逻辑（≤ 7 天显示 `NEW` 徽章）

- [x] Task 2.10: 实现可视化新增博客文章工具
  - [x] SubTask 2.10.1: 创建 `tools/api-server.js` — 本地 Node.js HTTP 服务（端口 4322），使用 `fs` 和 `dotenv` 读取密钥
  - [x] SubTask 2.10.2: 实现 `POST /api/new-post` 端点：校验 `Authorization: Bearer <secret>`，解析请求体，生成 `.md` 文件写入 `src/content/blog/`
  - [x] SubTask 2.10.3: 实现 slug 自动生成逻辑（中文→拼音首字母，保留英文数字连字符，降级用日期）
  - [x] SubTask 2.10.4: 创建 `.env.example` 文件（含 `NEW_POST_SECRET=your-secret-here-change-me`），更新 `.gitignore` 排除 `.env`
  - [x] SubTask 2.10.5: 在 `package.json` 添加 `api` 脚本（`node tools/api-server.js`），添加 `dotenv` 为 devDependency
  - [x] SubTask 2.10.6: 创建 `src/pages/new-post.astro` 表单页面，使用 `BaseLayout` + `PageIntro`（标题："新建文章"），表单容器用 `.card` 玻璃拟态面板，表单控件复用站点 CSS 变量
  - [x] SubTask 2.10.7: 添加 Markdown 输入与实时预览双栏布局，预览面板应用 `.markdown-content` 样式类，支持完整语法（标题/加粗斜体/代码块含高亮/列表/引用/表格/图片/链接/分割线）
  - [x] SubTask 2.10.8: 实现前端表单验证（必填字段检查）+ 提交逻辑；表单仅 dev 模式渲染，提交地址通过 `data-api-base` 注入，生产构建不暴露完整 `localhost:4322/api/new-post` 地址
  - [x] SubTask 2.10.9: 提交成功后显示文件路径和文章预览链接（`/articles/{slug}/`）
  - [x] SubTask 2.10.10: 收紧本地 API CORS：移除 `Access-Control-Allow-Origin: *`，默认允许 localhost / 127.0.0.1 与 `calvin-xia.cn`、`www.calvin-xia.cn`、`origin.calvin-xia.cn`、`mr-xia-site.calvin-xia.workers.dev`，其他 Workers 链接通过 `NEW_POST_ALLOWED_ORIGINS` 精确配置；未列入 origin 返回 403
  - [x] SubTask 2.10.11: 修复请求体超限处理：超过 1 MB 时立即拒绝、清理请求流监听器并销毁请求，避免超限后继续累计 body
  - [x] SubTask 2.10.12: 脱敏新建文章 API 错误响应：文件已存在返回通用 409，非预期服务端错误返回通用 500，详细错误仅写服务端日志，不向客户端暴露本地路径
  - [ ] SubTask 2.10.13: 验证完整流程：`npm run api` + `npm run dev`，访问 `/new-post/`，填写并提交 → `.md` 文件出现在 `src/content/blog/` → dev server 热更新可见（未执行真实成功提交；已用单元测试覆盖创建逻辑，并手动验证预览与 401 鉴权错误路径）

- [x] Task 2.11: 实现 Obsidian→R2 文章发布管线
  - [x] SubTask 2.11.1: 创建 `.env.example` 模板文件，包含 `OKP_VAULT`（Obsidian vault 绝对路径）、`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_PUBLIC_URL`（`content.calvin-xia.cn`）
  - [x] SubTask 2.11.2: 创建 `scripts/publish-post.js`：交互式三步管线脚本（复制 `.md` → S3 API 上传图片 → 替换路径）
  - [x] SubTask 2.11.3: 实现目录扫描：读取 Obsidian 文章目录，列出 `.md` 文件和大小写不敏感 `file/` 下所有图片/附件
  - [x] SubTask 2.11.4: 实现文件名转换规则：`yyyymmdd-x-y-z-a` → R2 key `x-y-z-a/`，`.md` 中大小写不敏感 `](./file/` → `](https://content.calvin-xia.cn/x-y-z-a/`
  - [x] SubTask 2.11.5: 实现 S3 兼容 API 上传（`@aws-sdk/client-s3`），读取 `.env` 凭证；上传到 `R2_BUCKET` 指定桶，key 使用 `assetSlug/relativePath`，每张图片上传后打印进度；扩展名/Content-Type 大小写不敏感
  - [x] SubTask 2.11.6: 实现 `.md` 路径替换：将复制的 `.md` 文件中所有 `](./file/xxx)` 替换为 `](https://content.calvin-xia.cn/slug/xxx)`，仅修改仓库副本，不修改 Obsidian vault
  - [x] SubTask 2.11.7: 在 `package.json` 添加 `publish` 脚本（`node scripts/publish-post.js`）
  - [x] SubTask 2.11.8: 为 R2 上传增加最多 3 次指数退避重试；单个资源最终失败时继续尝试后续资源，最后汇总所有失败项
  - [x] SubTask 2.11.9: 按关注点拆分发布工具模块：`scripts/slug.js`（slug / asset slug）、`scripts/markdown-utils.js`（frontmatter / 资源链接替换）、`scripts/content-types.js`（Content-Type 推断），`scripts/post-utils.js` 仅保留验证、文件创建、vault 扫描和发布计划编排
  - [ ] SubTask 2.11.10: 验证完整流程：Obsidian vault 新建测试文章目录 → `npm run publish 目录名` → `.md` 入 `src/content/blog/` → 图片在 R2 可公网访问 → `npm run build` 构建成功（未新建 vault 测试文章，避免修改 Obsidian；已用单元测试验证只读计划、路径替换、大小写与格式处理）
  - [x] SubTask 2.11.11: 将 `.env.example` 的 `OKP_VAULT` 改为通用占位路径，避免示例文件暴露真实 Windows 用户名或本机 vault 路径

- [x] Task 2.12: 处理 Additional Suggestions 审查跟进
  - [x] SubTask 2.12.1: 将 `astro.config.mjs` 的 `site` 改为从 `BASE_URL` 读取，默认 `https://calvin-xia.cn`，并去除末尾斜杠
  - [x] SubTask 2.12.2: 在 `.env.example` 增加 `BASE_URL=https://calvin-xia.cn`，明确其为单一 canonical 主域名配置
  - [x] SubTask 2.12.3: 为 `tools/api-server.js` 增加 `createNewPostServer` 工厂，支持注入 `secret` / `contentDir`，并补充 HTTP 集成测试覆盖 401 / 422 / 201
  - [x] SubTask 2.12.4: 为 `scripts/publish-post.js` 增加 `--dry-run` 参数与 `executePublishPlan` 测试入口，dry-run 仅打印计划，不写 Markdown、不上传 R2
  - [x] SubTask 2.12.5: 扩展 `.gitattributes`，统一源码类文件 LF 行尾，保留既有 `wrangler.jsonc` 与 `public/_headers` 规则

> **Preflight 已完成：** `@aws-sdk/client-s3` 和 `dotenv` 已安装为 devDependencies，使用 `.env` 凭证成功向 `assets-of-my-blogs` 桶上传了 `Beian.png` (1.4 KB) 和 `icon.png` (1376.7 KB)。R2 S3 端点及凭证均验证通过。

# Task Dependencies
- [Task 2.2 ~ 2.3] depend on [Task 2.1]
- [Task 2.4] depends on [Task 2.2]
- [Task 2.5 ~ 2.6] depend on [Task 2.1]
- [Task 2.6] depends on [Task 2.5]
- [Task 2.7] depends on [Task 2.3]
- [Task 2.8] depends on [Task 2.2]
- [Task 2.9] depends on [Task 2.5]
- [Task 2.10] depends on [Task 2.1]
- [Task 2.11] depends on [Task 2.2]
- [Task 2.12] depends on [Task 2.10, Task 2.11]
