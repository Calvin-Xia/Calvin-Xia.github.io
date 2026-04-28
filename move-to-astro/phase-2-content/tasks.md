# Tasks

- [ ] Task 2.1: 创建内容集合配置与 Schema
  - [ ] SubTask 2.1.1: 创建 `src/content/config.ts`，导入 `defineCollection` 和 `z` from `astro:content`
  - [ ] SubTask 2.1.2: 定义 `blog` 集合 schema（zod）：`title`, `date`, `excerpt`, `category`, `tags`(array), `featured`(optional boolean), `author`(optional), `readTime`(optional), `status`(optional)
  - [ ] SubTask 2.1.3: 定义 `works` 集合 schema：`title`, `date`, `excerpt`, `category`, `tags`(array), `filePath`, `externalUrl`(optional), `status`(optional), `featured`(optional boolean)
  - [ ] SubTask 2.1.4: 定义 `tools` 集合 schema：`title`, `date`, `excerpt`, `category`, `tags`(array), `filePath`
  - [ ] SubTask 2.1.5: 定义 `updates` 集合 schema：`title`, `date`, `excerpt`, `category`, `tags`(array), `filePath`
  - [ ] SubTask 2.1.6: 验证 `npm run dev` 启动无类型错误

- [ ] Task 2.2: 迁移博客 Markdown 源文件
  - [ ] SubTask 2.2.1: 创建 `src/content/blog/` 目录
  - [ ] SubTask 2.2.2: 将 6 篇 Markdown 源文件复制到此目录
  - [ ] SubTask 2.2.3: 为每篇添加 frontmatter（从 `blog/blog-metadata.json` 提取字段）：
    - `20251231-2025年度总结.md`
    - `20260204-返校宣讲稿.md`
    - `20260312-返校宣讲回顾.md`
    - `20260315-两小时，环线，慢行.md`
    - `20260328-pre-reflection.md`
    - `20260411-ai-reliance.md`
  - [ ] SubTask 2.2.4: 验证 frontmatter 格式正确（`date` 为 `YYYY-MM-DD`，`tags` 为数组）

- [ ] Task 2.3: 迁移作品/工具/更新日志为内容集合 JSON
  - [ ] SubTask 2.3.1: 将 `content/works-metadata.json` 拆为 4 个独立 JSON 文件放入 `src/content/works/`（fingerprint-app, favorites-collection, class1-map, button-block-designer）
  - [ ] SubTask 2.3.2: 将 `content/tools-metadata.json` 拆为 3 个独立 JSON 文件放入 `src/content/tools/`（online-timer, random-selector, markdown-to-html）
  - [ ] SubTask 2.3.3: 将 `content/update-logs-metadata.json` 拆为独立 JSON 文件放入 `src/content/updates/`（fingerprint-app-update-log）
  - [ ] SubTask 2.3.4: JSON 文件仅包含元数据字段（不含正文），与 schema 定义一致

- [ ] Task 2.4: 创建博客文章详情页 `articles/[...slug].astro`
  - [ ] SubTask 2.4.1: 创建 `src/pages/articles/[...slug].astro`，使用 `getStaticPaths()` 从 `blog` 集合生成路径
  - [ ] SubTask 2.4.2: 使用 Astro 的 `render()` 或 `<Content />` 渲染 Markdown 正文
  - [ ] SubTask 2.4.3: 将正文包裹在 `.markdown-content` 容器中，应用 `global.css` 中的 Markdown 样式
  - [ ] SubTask 2.4.4: 显示文章标题（h1）、日期、分类、标签
  - [ ] SubTask 2.4.5: 显示 "← 返回文章列表" 链接
  - [ ] SubTask 2.4.6: 渲染结果与当前 `blog/*.html` 对比验证

- [ ] Task 2.5: 创建文章列表页 `articles.astro`
  - [ ] SubTask 2.5.1: 创建 `src/pages/articles.astro`，使用 BaseLayout + PageIntro
  - [ ] SubTask 2.5.2: 使用 `getCollection('blog')` 获取所有文章，按日期降序排列
  - [ ] SubTask 2.5.3: 构建时提取所有分类（`category`）和标签（`tags`）的唯一值
  - [ ] SubTask 2.5.4: 渲染分类过滤按钮和标签过滤按钮
  - [ ] SubTask 2.5.5: 渲染文章卡片列表（标题、摘要、分类、标签、日期）
  - [ ] SubTask 2.5.6: 实现客户端分类/标签过滤逻辑（保留 `content-hub.js` 的交互模式）
  - [ ] SubTask 2.5.7: 迁移搜索 UI（搜索框 + SVG 图标 + 提示文本）

- [ ] Task 2.6: 实现全站搜索功能
  - [ ] SubTask 2.6.1: 构建时将所有可搜索内容（blog + works + tools，排除 updates）预序列化为内嵌 JSON
  - [ ] SubTask 2.6.2: 实现客户端搜索脚本（保留现有 ranking 逻辑：title×6, tags×4, excerpt×3, category×2, type×1）
  - [ ] SubTask 2.6.3: 实现搜索建议下拉（最多 6 条，保留 keyword highlighting）
  - [ ] SubTask 2.6.4: 实现搜索结果渲染（mixed 模式卡片，含类型 badge）
  - [ ] SubTask 2.6.5: 实现键盘导航（ArrowUp/Down/Enter/Escape）
  - [ ] SubTask 2.6.6: 搜索模式下隐藏分类/标签过滤器
  - [ ] SubTask 2.6.7: 验证搜索功能与原 `statement.html` 行为一致

- [ ] Task 2.7: 创建更新日志详情页
  - [ ] SubTask 2.7.1: 创建 `src/pages/updates/[...slug].astro`
  - [ ] SubTask 2.7.2: 使用 `getStaticPaths()` 从 `updates` 集合生成路径
  - [ ] SubTask 2.7.3: 页面展示更新日志标题和正文（将原 HTML 转换为 Markdown 或保留为内联 HTML）
  - [ ] SubTask 2.7.4: 与原 `UpdateLog/fingerprint-app-update-log.html` 渲染对比

- [ ] Task 2.8: 连接首页最近更新
  - [ ] SubTask 2.8.1: 在 `index.astro` 中使用 `getCollection()` 获取 blog/works/updates 内容
  - [ ] SubTask 2.8.2: 按日期排序，选取优先级最高的 4 条（article > work > update-log > tool）
  - [ ] SubTask 2.8.3: 渲染最近更新卡片列表（类型 badge + 日期 + 标题 + 摘要 + 操作链接）

# Task Dependencies
- [Task 2.2 ~ 2.3] depend on [Task 2.1]
- [Task 2.4] depends on [Task 2.2]
- [Task 2.5 ~ 2.6] depend on [Task 2.1]
- [Task 2.6] depends on [Task 2.5]
- [Task 2.7] depends on [Task 2.3]
- [Task 2.8] depends on [Task 2.2]
