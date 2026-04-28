# Phase 2：内容体系迁移 Spec

## Why
当前网站的内容管理依赖 Python 脚本（`content_pipeline.py`、`blog/convert.py`）和客户端运行时 fetch（`content-hub.js`）。迁移到 Astro 内容集合（Content Collections）后，所有内容将在构建时结构化处理，无需 Python 管线，无需客户端运行时 fetch，搜索数据内嵌为静态 JSON。

用户拥有所有博客文章的 Markdown 源文件，可直接作为 Astro 内容集合的输入。

## What Changes
- 创建 `src/content/config.ts`：定义 blog、works、tools、updates 四个集合的 Zod schema
- 将 6 篇 Markdown 源文件放入 `src/content/blog/`，添加 frontmatter
- 将 `content/works-metadata.json`、`content/tools-metadata.json`、`content/update-logs-metadata.json` 拆为独立 JSON 文件放入对应集合目录
- 创建 `articles/[...slug].astro`（博客文章详情页，构建时静态生成）
- 创建 `articles.astro`（文章列表页，含分类/标签过滤 + 全站搜索）
- 创建 `updates/[...slug].astro`（更新日志详情页）
- 首页最近更新区域改为静态生成（不再需要 `content-hub.js` 客户端 fetch）

## Impact
- New files: `src/content/config.ts`, 6 篇 `.md` 文件, 4 + 3 + 1 个内容 JSON 文件, `src/pages/articles/[...slug].astro`, `src/pages/articles.astro`, `src/pages/updates/[...slug].astro`
- Modified files: `src/pages/index.astro`（静态生成最近更新）
- 不影响旧文件（旧 blog/、content/、UpdateLog/、js/ 目录保留到 Phase 4 清理）

## ADDED Requirements

### Requirement: 内容集合 Schema
项目 SHALL 使用 Astro Content Collections 管理所有内容类型。

#### Scenario: blog 集合
- **WHEN** 使用 `getCollection('blog')`
- **THEN** 返回所有 blog 条目，每个条目含 frontmatter 字段（title, date, excerpt, category, tags, featured, author, readTime）和 Markdown 正文

#### Scenario: works/tools/updates 集合
- **WHEN** 使用 `getCollection('works')` / `getCollection('tools')` / `getCollection('updates')`
- **THEN** 返回对应条目，每个条目含 title, date, excerpt, category, tags, filePath 等元数据

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

#### Scenario: 元数据展示
- **WHEN** 文章详情页渲染
- **THEN** 显示标题（h1）、日期、分类、标签

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

#### Scenario: 搜索输入
- **WHEN** 在搜索框输入关键词
- **THEN** 显示最多 6 条建议，关键词高亮，按相关性排序（title×6 > tags×4 > excerpt×3 > category×2 > type×1）

#### Scenario: 搜索结果渲染
- **WHEN** 按 Enter 或点击搜索按钮
- **THEN** 显示所有匹配结果，含类型 badge（文章/作品/工具）

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
