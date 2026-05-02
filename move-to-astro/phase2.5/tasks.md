# Tasks

- [ ] Task 2.5.1: 图片悬浮放大方案实现
  - [ ] SubTask 2.5.1.1: 创建 `src/lib/article-enhancements/image-lightbox.js`
  - [ ] SubTask 2.5.1.2: 为 `.markdown-content .markdown-image-figure img` 和普通 `.markdown-content img` 绑定点击打开行为
  - [ ] SubTask 2.5.1.3: 使用单例 `<dialog class="article-lightbox">` 渲染图片、说明文字、关闭、放大、缩小、重置按钮
  - [ ] SubTask 2.5.1.4: 支持 Escape 关闭、点击遮罩关闭、关闭后焦点回到原图片
  - [ ] SubTask 2.5.1.5: 支持 1x–4x 缩放范围，避免图片拖动/缩放时触发正文滚动
  - [ ] SubTask 2.5.1.6: 为移动端设置安全尺寸，图片不溢出视口
  - [ ] SubTask 2.5.1.7: 添加单元测试覆盖打开、关闭、缩放边界和重复初始化

- [ ] Task 2.5.2: 文章平滑切换方案实现
  - [ ] SubTask 2.5.2.1: 评估并接入 Astro `ClientRouter`/View Transitions，确认与当前静态构建兼容
  - [ ] SubTask 2.5.2.2: 仅对站内文章列表、文章详情、更新日志等低风险链接启用渐进增强
  - [ ] SubTask 2.5.2.3: 为 `BaseLayout` 或文章页主容器添加稳定 transition name/class
  - [ ] SubTask 2.5.2.4: 在页面切换完成后统一调用 `initArticleEnhancements()`
  - [ ] SubTask 2.5.2.5: 保留 `prefers-reduced-motion: reduce` 兜底，跳过动画
  - [ ] SubTask 2.5.2.6: 验证浏览器不支持 View Transitions 时仍是普通链接跳转

- [ ] Task 2.5.3: 标题层级排版与悬浮锚点
  - [ ] SubTask 2.5.3.1: 创建 `src/lib/article-enhancements/heading-index.js`
  - [ ] SubTask 2.5.3.2: 从 `.markdown-content h2,h3,h4` 提取标题，生成稳定 id 和层级数据
  - [ ] SubTask 2.5.3.3: 为标题追加可访问锚点链接，hover/focus 时显示 `#`
  - [ ] SubTask 2.5.3.4: 调整 `.markdown-content h1-h4` 的上外边距、字号、字重和轻微正字距
  - [ ] SubTask 2.5.3.5: 为重复标题添加稳定去重后缀，避免 hash 冲突
  - [ ] SubTask 2.5.3.6: 添加测试覆盖中文标题、英文标题、重复标题和已有 id 的场景

- [ ] Task 2.5.4: 侧栏目录与阅读进度
  - [ ] SubTask 2.5.4.1: 创建 `src/components/ArticleToc.astro` 或客户端挂载容器
  - [ ] SubTask 2.5.4.2: 桌面端在文章右侧显示目录，`h3/h4` 按层级缩进
  - [ ] SubTask 2.5.4.3: 移动端折叠为文章顶部目录区或浮动按钮，默认不遮挡正文
  - [ ] SubTask 2.5.4.4: 使用 IntersectionObserver 高亮当前章节
  - [ ] SubTask 2.5.4.5: 添加阅读进度条，按正文滚动范围计算 0–100%
  - [ ] SubTask 2.5.4.6: 点击目录项平滑滚动到标题，并更新 URL hash
  - [ ] SubTask 2.5.4.7: 对标题少于 3 个的短文章隐藏侧栏目录，只保留正文

- [ ] Task 2.5.5: 集成、验证与文档
  - [ ] SubTask 2.5.5.1: 创建 `src/lib/article-enhancements/article-enhancements.js` 统一初始化入口
  - [ ] SubTask 2.5.5.2: 在 `src/pages/articles/[...slug].astro` 调用统一初始化入口
  - [ ] SubTask 2.5.5.3: 更新 `src/styles/global.css` 的灯箱、标题锚点、侧栏和进度条样式
  - [ ] SubTask 2.5.5.4: 添加 `tests/article-lightbox.test.js`、`tests/article-headings.test.js`、`tests/article-progress.test.js`
  - [ ] SubTask 2.5.5.5: 使用浏览器验证桌面和移动端文章页，不出现文字重叠、图片溢出或侧栏遮挡
  - [ ] SubTask 2.5.5.6: 运行 `npm test`、`npm run test:coverage`、`npm run build`
  - [ ] SubTask 2.5.5.7: 更新 Phase 2.5 checklist 和迁移 README 状态

# Task Dependencies

- [Task 2.5.3] should run before [Task 2.5.4]
- [Task 2.5.1] and [Task 2.5.3] can be implemented independently
- [Task 2.5.2] should be integrated after [Task 2.5.1, Task 2.5.3, Task 2.5.4] so re-initialization hooks are known
- [Task 2.5.5] depends on all previous tasks
