# Phase 2：内容体系迁移 Spec

## Why
当前网站的内容管理依赖 Python 脚本（`content_pipeline.py`、`blog/convert.py`）和客户端运行时 fetch（`content-hub.js`）。迁移到 Astro 内容集合（Content Collections）后，所有内容将在构建时结构化处理，无需 Python 管线，无需客户端运行时 fetch，搜索数据内嵌为静态 JSON。

用户拥有所有博客文章的 Markdown 源文件，可直接作为 Astro 内容集合的输入。

## What Changes
- 创建 `src/content.config.ts`：使用 Astro 6 Content Layer loader 定义 blog、works、tools、updates 四个集合的 Zod schema
- 将 6 篇 Markdown 源文件放入 `src/content/blog/`，添加 frontmatter
- 将 `content/works-metadata.json`、`content/tools-metadata.json`、`content/update-logs-metadata.json` 拆为独立 JSON 文件放入对应集合目录
- 创建 `articles/[...slug].astro`（博客文章详情页，构建时静态生成）
- 创建 `articles.astro`（文章列表页，含分类/标签过滤 + 全站搜索）
- 创建 `updates/[...slug].astro`（更新日志详情页）
- 首页最近更新区域改为静态生成（不再需要 `content-hub.js` 客户端 fetch）
- 更新日志时间线迁移到 `src/content/updates/*.json` 的结构化 `timeline` 数据，详情页不再构建时读取或正则解析 `UpdateLog/*.html`
- 文章详情页将图片 `alt` 渲染为图片下方灰色说明文字，保留原 `alt` 作为无障碍文本；手写宽度通过 figure 的 CSS class + 自定义属性接管，避免 `style.width` 覆盖响应式 CSS
- 新增文章可视化加载反馈：skeleton 骨架屏、新鲜度 `NEW` 徽章、交错入场动画、空状态
- 新增可视化博客编辑器：`/new-post/` 表单页面 + 本地 API 服务端，通过密钥鉴权创建 `.md` 文件；表单与提交脚本仅在 Astro dev 模式渲染，生产构建不暴露本地 API 地址，本地 API CORS 使用精确 origin 白名单而非 `*`，并通过 HTTP 集成测试覆盖 401 / 422 / 201 路径
- 新增 Obsidian→R2 文章发布管线：`npm run publish <dir-name>` 一键复制 `.md`、上传图片到 R2、替换图片路径；`npm run publish -- --dry-run <dir-name>` 仅打印发布计划，不写文件、不上传 R2
- 文章图片迁移遵循已上传资源位置：`20251231-2025年度总结` 使用 `https://assets.calvin-xia.cn/` 根目录；其他既有文章使用 `https://content.calvin-xia.cn/<slug>/` 目录；本地预览通过 `same-origin` referrer policy 和 dev-only CDN 代理避免 localhost Referer 被 Cloudflare 防盗链规则拦截
- dev-only CDN 代理脚本从 `BaseLayout.astro` 抽取到 `src/scripts/local-cdn-proxy.js`，并在页面无 CDN 图片时跳过 `MutationObserver`
- 发布管线支持更多图片/附件格式，并对 `file/` 目录名和扩展名做大小写不敏感处理（如 `File/`、`FILE/`、`.jpeg`、`.PNG`）
- 将内容类型映射、日期解析、排序和新鲜度判定抽取到 `src/lib/shared-content.js`，由服务端内容工具和 `/articles/` 客户端搜索脚本共用，避免排名逻辑和类型文案重复维护
- `/articles/` 搜索范围由构建时 payload 中的 `searchableTypes` 序列化传递给客户端，避免在内联脚本中硬编码排除类型
- 将文章发布相关脚本按关注点拆分：`scripts/slug.js` 负责 slug 与资源前缀，`scripts/markdown-utils.js` 负责 frontmatter/Markdown 与资源 URL 转换，`scripts/content-types.js` 负责 MIME 推断，`scripts/post-utils.js` 仅保留表单验证、文件创建和发布计划编排
- `.env.example` 仅保留通用占位路径和凭证模板，不包含真实本机用户名或 vault 路径
- Astro `site` 使用 `.env` / 环境变量中的 `BASE_URL` 作为单一 canonical 主域名，默认 `https://calvin-xia.cn`
- `.gitattributes` 统一源码类文件使用 LF，减少 Windows 开发环境下的 CRLF diff 噪声

## Impact
- New files: `src/content.config.ts`, 6 篇 `.md` 文件, 4 + 3 + 1 个内容 JSON 文件, `src/pages/articles/[...slug].astro`, `src/pages/articles.astro`, `src/pages/updates/[...slug].astro`, `src/pages/new-post.astro`, `src/lib/content.ts`, `src/lib/shared-content.js`, `src/lib/shared-content.d.ts`, `src/lib/article-image-captions.js`, `src/scripts/local-cdn-proxy.js`, `scripts/slug.js`, `scripts/markdown-utils.js`, `scripts/content-types.js`, `scripts/post-utils.js`, `scripts/publish-post.js`
- Modified files: `astro.config.mjs`（`BASE_URL` canonical 主域名配置）, `src/pages/index.astro`（静态生成最近更新）, `src/pages/works.astro`（更新日志新路由）, `src/pages/articles/[...slug].astro`（图片说明文字增强脚本）, `src/layouts/BaseLayout.astro`（referrer policy + dev-only CDN 代理脚本引用）, `src/styles/global.css`（新增 skeleton / NEW badge / empty state / 图片说明文字 / 新建文章样式）, `package.json`（新增 `api` / `publish` / `test` / `test:coverage` 脚本）, `.gitignore`（排除 `.env`）, `.gitattributes`（源码行尾规则）
- New dev/CI files: `tools/api-server.js`（本地 API 服务端）, `.env.example`（含 Obsidian vault 路径 + R2/S3 凭证模板）, `tests/*.test.js`, `.github/workflows/phase-2-content-check.yml`
- Preflight: `@aws-sdk/client-s3` + `dotenv` 已安装，R2 上传至 `assets-of-my-blogs` 桶验证通过
- 不影响旧文件（旧 blog/、content/、UpdateLog/、js/ 目录保留到 Phase 4 清理）

## ADDED Requirements

### Requirement: 站点 canonical URL 与行尾配置
项目 SHALL 通过环境变量配置 Astro 构建使用的主站 URL，并统一源码行尾规则。

#### Scenario: BASE_URL canonical 主域名
- **WHEN** 执行 `npm run build`
- **THEN** `astro.config.mjs` 中的 `site` 从 `process.env.BASE_URL` 读取
- **AND** 未设置 `BASE_URL` 时默认使用 `https://calvin-xia.cn`
- **AND** `BASE_URL` 仅表示单一 canonical 主域名，不承载多入口域名白名单

#### Scenario: 源码行尾规则
- **WHEN** Git 处理 `.mjs`、`.astro`、`.ts`、`.js`、`.json`、`.css`、`.md`、`.yml`、`.yaml` 等源码文件
- **THEN** `.gitattributes` 将它们统一为 LF 行尾
- **AND** 保留 `wrangler.jsonc` 与 `public/_headers` 的既有 LF 规则

### Requirement: 内容集合 Schema
项目 SHALL 使用 Astro Content Collections 管理所有内容类型。

#### Scenario: blog 集合
- **WHEN** 使用 `getCollection('blog')`
- **THEN** 返回所有 blog 条目，每个条目含 frontmatter 字段（title, date, excerpt, category, tags, featured, author, readTime）和 Markdown 正文
- **AND** blog loader 仅匹配日期开头的 Markdown 文件（`[0-9]*.md`），避免 `README.md` 等非内容文档被误收为文章

#### Scenario: works/tools/updates 集合
- **WHEN** 使用 `getCollection('works')` / `getCollection('tools')` / `getCollection('updates')`
- **THEN** 返回对应条目，每个条目含 title, date, excerpt, category, tags, filePath 等元数据
- **AND** updates 条目可包含结构化 `timeline` 数组，每个版本含 version、updatedAt 和 items

### Requirement: 博客文章 Markdown 源文件
6 篇已有 Markdown 源文件 SHALL 作为 blog 集合的输入，每篇包含完整的 YAML frontmatter。

#### Scenario: frontmatter 完整性
- **WHEN** 读取任一篇 blog .md 文件
- **THEN** frontmatter 含 title、date（YYYY-MM-DD）、excerpt、category、tags（数组）

### Requirement: 文章详情页 `articles/[...slug].astro`
每篇博客文章 SHALL 有独立的静态详情页。

#### Scenario: 静态路径生成
- **WHEN** 执行 `npm run build`
- **THEN** 为每篇文章生成 `/articles/{slug}/index.html`，如 `/articles/20260411-ai-reliance/`

#### Scenario: Markdown 渲染
- **WHEN** 访问文章详情页
- **THEN** 正文以 Markdown 渲染为 HTML，应用 `.markdown-content` 样式类
- **AND** 引用块（`>`）内的源码软换行渲染为 `<br>`，保留诗歌、歌词、引文署名等块内换行

#### Scenario: 元数据展示
- **WHEN** 文章详情页渲染
- **THEN** 显示标题（h1）、日期、分类、标签

#### Scenario: 图片说明文字
- **WHEN** 文章正文中的图片带有非空 `alt`
- **THEN** 图片下方显示同内容的灰色说明文字
- **AND** 原图片 `alt` 属性保留，用于无障碍文本和图片加载失败兜底
- **AND** 对手写 HTML 中带内联宽度的图片，说明文字容器继承该宽度，不破坏原并排布局
- **AND** 图片宽度由 `.markdown-image-figure--sized` 与 `--markdown-image-width` 控制，脚本不向 figure 或 img 写入普通 `style.width`

### Requirement: 文章列表页 `articles.astro`
文章列表页 SHALL 显示所有文章，支持分类和标签过滤。

#### Scenario: 列表渲染
- **WHEN** 访问 `/articles/`
- **THEN** 按日期降序列出所有文章，每项含标题、摘要、分类 badge、标签、日期

#### Scenario: 分类过滤
- **WHEN** 点击分类按钮（如 "生活总结"）
- **THEN** 仅显示该分类的文章，按钮标记 active

#### Scenario: 组合过滤
- **WHEN** 同时选中分类和标签
- **THEN** 同时满足两个条件的文章显示

### Requirement: 全站搜索
文章列表页 SHALL 支持跨类型的全站搜索。

#### Scenario: 共享排名逻辑
- **WHEN** 服务端内容列表、首页最近更新和 `/articles/` 客户端搜索需要按日期与类型优先级排序
- **THEN** 它们 SHALL 共同使用 `src/lib/shared-content.js` 中的 `CONTENT_TYPES`、`parseDateValue`、`compareContentItems` 和 `isFreshDate`
- **AND** `articles.astro` 客户端脚本不得重新定义同名日期解析、排序、新鲜度或类型映射逻辑

#### Scenario: 搜索输入
- **WHEN** 在搜索框输入关键词
- **THEN** 显示最多 6 条建议，关键词高亮，按相关性排序（title×6 > tags×4 > excerpt×3 > category×2 > type×1）

#### Scenario: 搜索结果渲染
- **WHEN** 按 Enter 或点击搜索按钮
- **THEN** 显示所有匹配结果，含类型 badge（文章/作品/工具）
- **AND** 客户端根据构建时 payload 中的 `searchableTypes` 过滤可搜索内容，不在脚本中硬编码 `update-log` 排除规则

#### Scenario: 搜索模式切换
- **WHEN** 搜索有结果时
- **THEN** 分类/标签过滤器隐藏

#### Scenario: 键盘导航
- **WHEN** 搜索建议显示时按 ArrowDown/ArrowUp
- **THEN** 高亮移动，Enter 跳转到选中项，Escape 关闭

### Requirement: 首页最近更新
首页最近更新区域 SHALL 在构建时从内容集合生成。

#### Scenario: 更新排序
- **WHEN** 首页构建
- **THEN** 显示 4 条最近内容，优先 article > work > update-log > tool

### Requirement: 更新日志详情页
更新日志条目 SHALL 有独立的静态详情页。

#### Scenario: 路径生成
- **WHEN** 执行 `npm run build`
- **THEN** 生成 `/updates/fingerprint-app-update-log/` 页面

#### Scenario: 时间线数据来源
- **WHEN** 构建更新日志详情页
- **THEN** 页面从 `src/content/updates/fingerprint-app-update-log.json` 的 `timeline` 字段渲染版本时间线
- **AND** 页面不读取 `UpdateLog/fingerprint-app-update-log.html`
- **AND** 页面不使用正则从遗留 HTML 中提取片段，也不使用 `set:html` 注入时间线

### Requirement: 文章可视化加载与新鲜度展示
文章列表页和首页最近更新区域 SHALL 提供视觉加载反馈和文章新鲜度标识。

#### Scenario: Skeleton 骨架屏加载态
- **WHEN** 文章列表页的搜索/过滤操作触发内容刷新
- **THEN** 列表区域显示 4 张 skeleton 骨架卡片，带脉动动画
- **AND** 搜索结果返回后骨架卡片消失，真实卡片以 staggered fade-in-up 动画入场

#### Scenario: 新文章标识
- **WHEN** 列表页或首页最近更新区域渲染文章卡片
- **THEN** 发布时间距当前 ≤ 7 天的文章卡片左上角显示脉冲 `NEW` 徽章
- **AND** 徽章使用 `--accent-color` 主色调，复用 `.content-type-badge` 圆角 pill 形态

#### Scenario: 空状态展示
- **WHEN** 搜索或过滤后无匹配结果
- **THEN** 显示 "没有找到匹配的文章" 文案，含 "重置筛选" 按钮
- **AND** 点击 "重置筛选" 清空搜索/过滤条件并恢复完整列表

#### Scenario: prefers-reduced-motion 适配
- **WHEN** 用户系统设置 `prefers-reduced-motion: reduce`
- **THEN** skeleton 脉动动画和交错入场动画跳过，直接静态展示卡片

### Requirement: 可视化新增博客文章
项目 SHALL 提供受密钥保护的 Web 表单页面，允许作者在浏览器中填写字段后直接生成 `.md` 文件到 `src/content/blog/` 目录。

#### Scenario: 表单页面渲染
- **WHEN** 浏览器访问 `/new-post/`
- **THEN** 使用 `BaseLayout` + `PageIntro` 包裹页面，标题区显示 "新建文章" 和引导文案
- **AND** 表单容器使用 `.card` 玻璃拟态面板样式，与站点其他卡片视觉一致
- **AND** 表单字段含：标题、日期（默认当天）、分类（dropdown 从已有分类中选）、标签（逗号分隔输入）、摘要（textarea）、Markdown 正文编辑区
- **AND** 正文编辑区旁提供实时预览面板，渲染结果应用 `.markdown-content` 样式类
- **AND** 预览面板支持完整 Markdown 语法：标题（H1-H6）加粗/斜体、行内代码与代码块（含语法高亮）、无序/有序列表、引用块、表格、图片、链接、分割线
- **AND** 表单控件（input / textarea / select / button）使用站点全局 CSS 变量（`--primary-color`、`--text-*`、`--radius-*` 等），与首页和其他页面风格统一

#### Scenario: 密钥鉴权
- **WHEN** 表单提交时
- **THEN** 请求携带 `Authorization: Bearer <NEW_POST_SECRET>` 头
- **AND** API 服务端校验密钥不匹配时返回 401，不创建文件

#### Scenario: 创建博客文件
- **WHEN** 鉴权通过且表单验证通过
- **THEN** API 服务端在 `src/content/blog/` 下创建 `YYYYMMDD-slug.md` 文件
- **AND** 文件名 slug 由标题自动生成（中文转拼音首字母 / 保留英文数字连字符）
- **AND** 文件内容包含完整 YAML frontmatter（title, date, excerpt, category, tags）后跟 Markdown 正文

#### Scenario: 本地 API 服务端
- **WHEN** 执行 `npm run api`
- **THEN** 启动本地 HTTP 服务（默认端口 4322），监听 POST `/api/new-post`
- **AND** 读取 `.env` 文件中的 `NEW_POST_SECRET` 作为鉴权密钥
- **AND** 请求体超过 1 MB 时立即拒绝，移除 `data` / `end` / `error` 监听并销毁请求，避免超限后继续累计内存
- **AND** 服务端通过 `createNewPostServer` 支持注入测试用 `secret` 与 `contentDir`，HTTP 集成测试覆盖 401、422 和 201 响应

#### Scenario: 本地 API CORS 白名单
- **WHEN** 浏览器向本地 API 发起带 `Origin` 的跨域请求
- **THEN** API 仅为 localhost / 127.0.0.1、`https://calvin-xia.cn`、`https://www.calvin-xia.cn`、`https://origin.calvin-xia.cn`、`https://mr-xia-site.calvin-xia.workers.dev` 或 `.env` 中 `NEW_POST_ALLOWED_ORIGINS` 精确列出的 origin 返回 `Access-Control-Allow-Origin`
- **AND** API 不返回 `Access-Control-Allow-Origin: *`
- **AND** 未列入白名单的 origin 请求返回 403，不进入文章创建逻辑

#### Scenario: 密钥安全
- **WHEN** 项目首次配置
- **THEN** 开发者复制 `.env.example` 为 `.env`，修改其中 `NEW_POST_SECRET` 为自定义值
- **AND** `.env` 已在 `.gitignore` 中排除，不会被提交
- **AND** `.env.example` 包含占位值 `your-secret-here-change-me` 和 `NEW_POST_ALLOWED_ORIGINS` 示例，提交到仓库供参考

#### Scenario: 生成后提示
- **WHEN** `.md` 文件创建成功
- **THEN** 前端显示成功提示，含文件路径和新文章的预览链接（`/articles/{slug}/`）
- **AND** Astro dev server 检测到 `src/content/` 变更后自动热更新，新文章立即可见

#### Scenario: 表单验证
- **WHEN** 必填字段（标题、日期）为空
- **THEN** 前端阻止提交并显示验证错误提示
- **AND** API 服务端再次验证，返回 422 及具体错误字段

#### Scenario: 生产构建隐藏本地端点
- **WHEN** 执行 `npm run build`
- **THEN** `/new-post/` 静态页面仅显示本地开发环境提示，不渲染可提交表单
- **AND** 生产 HTML 中不包含 `localhost:4322` 或完整 `/api/new-post` 本地 API 地址

### Requirement: 本地 CDN 图片代理脚本
本地开发环境 SHALL 通过独立脚本代理 CDN 图片请求，避免 Cloudflare 防盗链规则因 localhost Referer 阻断图片预览。

#### Scenario: 脚本挂载
- **WHEN** `import.meta.env.DEV` 为 true
- **THEN** `BaseLayout` 引用 `src/scripts/local-cdn-proxy.js` 的打包 URL
- **AND** `BaseLayout.astro` 不内联维护 CDN 代理实现细节

#### Scenario: 无 CDN 图片早退
- **WHEN** 页面不存在 `content.calvin-xia.cn` 或 `assets.calvin-xia.cn` 图片
- **THEN** `local-cdn-proxy.js` 不创建 `MutationObserver`
- **AND** 存在匹配图片时，将图片 `src` 改写到 `/__cdn/content` 或 `/__cdn/assets`

#### Scenario: 错误响应脱敏
- **WHEN** 本地 API 创建文章时遇到文件已存在错误
- **THEN** API 返回 409 和通用错误 `Post already exists`，不返回本机文件系统路径
- **WHEN** 创建文章时遇到非预期服务端错误（如权限、磁盘空间、未知文件系统错误）
- **THEN** API 返回 500 和通用错误 `Internal server error`
- **AND** 详细错误仅记录到服务端日志，不透传给客户端

### Requirement: Obsidian→R2 文章发布管线
项目 SHALL 提供 `npm run publish <dir-name>` 命令，一键将 Obsidian 工作区中的文章及图片发布到网站。

#### Scenario: 路径映射规则
- **WHEN** Obsidian 文章目录名为 `20260429-my-new-post`，内含 `file/abc.png`
- **THEN** `.md` 复制到 `src/content/blog/20260429-my-new-post.md`
- **AND** 图片 `file/abc.png` 上传到 `.env` 中 `R2_BUCKET` 指定的桶，R2 object key 为 `my-new-post/abc.png`
- **AND** `.md` 中所有 `](./file/` 替换为 `${R2_PUBLIC_URL}/my-new-post/` 对应公网路径，和上传 object key 的 `my-new-post/` 前缀保持一致
- **AND** `file/`、`File/`、`FILE/` 等目录大小写变体均被识别，`.jpg`、`.jpeg`、`.png`、`.PNG`、`.webp`、`.gif`、`.svg`、`.heic`、`.tiff` 等常见扩展名按大小写不敏感方式推断 Content-Type

#### Scenario: Vault 只读
- **WHEN** 执行发布管线
- **THEN** Obsidian vault 中的原始 `.md` 和图片文件不被修改
- **AND** 路径替换仅发生在复制到 `src/content/blog/` 的副本中

#### Scenario: 交互式发布流程
- **WHEN** 执行 `npm run publish`
- **THEN** 脚本输出欢迎语 "Obsidian Post Publisher"
- **AND** 提示输入 Obsidian 文章目录名（如 `yyyymmdd-x-y-z-a`）
- **AND** 确认：展开文章目录列出 `.md` 文件和 `file/` 下的图片清单，显示目标 R2 key
- **AND** 询问确认后执行三步：复制 `.md` → 上传图片 → 替换路径

#### Scenario: 直接发布模式
- **WHEN** 执行 `npm run publish 20260429-my-new-post`
- **THEN** 跳过交互确认，直接执行三步管线

#### Scenario: Dry-run 发布预检
- **WHEN** 执行 `npm run publish -- --dry-run 20260429-my-new-post`
- **THEN** 脚本生成并打印发布计划
- **AND** 不创建或覆盖 `src/content/blog/*.md`
- **AND** 不调用 R2 上传

#### Scenario: R2 上传凭证
- **WHEN** 脚本上传图片到 R2
- **THEN** 使用 S3 兼容 API（Cloudflare R2 的 S3 端点）
- **AND** 凭证从 `.env` 读取：`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_PUBLIC_URL`
- **AND** 每个资源最多重试 3 次，按指数退避等待后重试
- **AND** 某个资源最终失败时，继续尝试后续资源，并在全部尝试后汇总失败清单抛错

#### Scenario: 发布脚本职责边界
- **WHEN** 维护文章创建或 Obsidian→R2 发布管线
- **THEN** slug 生成与资产目录名派生 SHALL 位于 `scripts/slug.js`
- **AND** Markdown frontmatter 构建与本地资源链接替换 SHALL 位于 `scripts/markdown-utils.js`
- **AND** 上传 Content-Type 推断 SHALL 位于 `scripts/content-types.js`
- **AND** `scripts/post-utils.js` SHALL 只编排 payload 验证、博客文件创建、vault 扫描和发布计划生成，不重新定义上述纯工具逻辑

#### Scenario: 安全配置
- **WHEN** 项目首次配置
- **THEN** 复制 `.env.example` 为 `.env`，填入 Obsidian vault 路径及 R2/S3 凭证的实际值
- **AND** `.env` 已在 `.gitignore` 中排除
- **AND** `.env.example` 包含完整字段模板（不含真实值），提交到仓库
- **AND** `.env.example` 中的 `OKP_VAULT` 使用通用占位符，不暴露真实 Windows 用户名或本机路径
