# Tasks

- [ ] Task 6.1: 字数统计与阅读时间自动计算
  - [ ] SubTask 6.1.1: 创建 `src/lib/word-count.js`，导出 `computeReadingStats(body)` 函数
  - [ ] SubTask 6.1.2: 实现 `countCharacters` / `countWords` —— 中文按字符、英文按单词、过滤 Markdown 语法和 HTML 标签
  - [ ] SubTask 6.1.3: 实现 `formatReadTime(minutes)` —— "< 1 分钟" / "X 分钟" / "Xh Ym"
  - [ ] SubTask 6.1.4: 实现 `formatWordCount(count)` —— "约 X,XXX 字"（千位逗号分隔）
  - [ ] SubTask 6.1.5: 在 `blogEntryToItem` 或文章列表组件中调用 `computeReadingStats(post.body)`，将结果汇入 `ContentItem`
  - [ ] SubTask 6.1.6: 更新 `articles.astro` 博客卡片，在日期旁展示字数和阅读时间
  - [ ] SubTask 6.1.7: 更新 `articles/[...slug].astro` 详情页 meta 区展示字数和阅读时间（自动值优先，手动 `readTime` 覆盖）
  - [ ] SubTask 6.1.8: 添加单元测试 —— 纯中文、纯英文、中英混合、空内容、短内容、超长内容、Markdown 语法和 HTML 标签过滤
  - [ ] SubTask 6.1.9: 运行 `npm test` 和 `npm run build` 验证

- [ ] Task 6.2: 归档页时间线
  - [ ] SubTask 6.2.1: 创建 `src/pages/articles/archive.astro` 页面，路由为 `/articles/archive/`
  - [ ] SubTask 6.2.2: 从 `getCollection('blog')` 加载非草稿文章，按年份分组（`data.date.substring(0, 4)`），组内按日期 desc 排序
  - [ ] SubTask 6.2.3: 渲染垂直时间线 —— CSS 实现左侧年份标记 + 右侧文章条目列表（日期 MM-DD + 标题 + 分类标签）
  - [ ] SubTask 6.2.4: 添加 "文章归档" 入口到 `/articles/` 页面（页面上方靠右或 page-intro 下方导航区）
  - [ ] SubTask 6.2.5: CSS 样式：`.archive-timeline`、`.archive-year`、`.archive-item` 等，移动端适配
  - [ ] SubTask 6.2.6: 添加测试：验证归档页包含所有非草稿文章、按年份分组正确、排序正确、没有空年份
  - [ ] SubTask 6.2.7: 运行 `npm test` 和 `npm run build` 验证

- [ ] Task 6.3: SPA 增强过渡
  - [ ] SubTask 6.3.1: 在 CSS 中新增 `slide-from-right` / `slide-from-left` 的 `::view-transition-new` / `::view-transition-old` 动画 keyframe
  - [ ] SubTask 6.3.2: 在 `article-transitions.js` 中增加方向检测逻辑：通过 `NavigationDirection` 或 `sessionStorage` 判断前进/后退
  - [ ] SubTask 6.3.3: 为文章详情页的 `main` 元素添加 `data-transition-direction` 属性，CSS 根据方向选择不同动画
  - [ ] SubTask 6.3.4: 实现列表页滚动位置保存与恢复：在离开列表页时将 `window.scrollY` 存入 `sessionStorage`，`astro:after-swap` 事件中恢复
  - [ ] SubTask 6.3.5: （可选）将搜索/过滤参数序列化到 URL `searchParams`，返回列表时恢复搜索状态
  - [ ] SubTask 6.3.6: 验证 `prefers-reduced-motion: reduce` 时动画关闭
  - [ ] SubTask 6.3.7: 验证浏览器后退/前进按钮的过渡和滚动表现
  - [ ] SubTask 6.3.8: 添加测试：过渡脚本导出正确、动画 keyframe 在 CSS 中存在、回退逻辑不破坏现有功能
  - [ ] SubTask 6.3.9: 运行 `npm test` 和 `npm run build` 验证

- [ ] Task 6.4: 阅读量统计（条件实施）
  - [ ] SubTask 6.4.1: 评估 Cloudflare Pages Function + KV 绑定在 wrangler.jsonc 中的配置方式
  - [ ] SubTask 6.4.2: 若可行，创建 `functions/api/views/[[slug]].ts`：`GET` 返回当前阅读量，`POST` 增量
  - [ ] SubTask 6.4.3: 创建前端 `src/scripts/view-counter.js`：在文章详情页加载后异步 fetch 阅读量并渲染
  - [ ] SubTask 6.4.4: 在 `articles/[...slug].astro` 底部引入 counter 脚本（可选、渐进增强）
  - [ ] SubTask 6.4.5: 添加测试验证 API 行为
  - [ ] SubTask 6.4.6: 若 Cloudflare Functions 复杂度过高，降级为方案 D（暂不实施），本文档标记为 Phase 7 或未来里程碑

- [ ] Task 6.5: 集成、验证与文档
  - [ ] SubTask 6.5.1: 运行 `npm test` 确保全量测试通过
  - [ ] SubTask 6.5.2: 运行 `npm run build` 确保构建无新增警告/错误
  - [ ] SubTask 6.5.3: 浏览器验证：字数/阅读时间显示、归档页时间线、列表↔详情过渡
  - [ ] SubTask 6.5.4: 移动端验证归档页和过渡在窄屏下的表现
  - [ ] SubTask 6.5.5: 更新 Phase 6 checklist 和迁移 README 状态

# Task Dependencies

- [Task 6.1] 和 [Task 6.2] 独立，可并行实施
- [Task 6.3] 依赖 [Task 6.1] 和 [Task 6.2]（需要知道完整的页面结构才能设计过渡）
- [Task 6.4] 完全独立于其他任务，可在任何时候降级为不实施
- [Task 6.5] 依赖所有前置任务
