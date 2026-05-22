# Tasks

> Sync 2026-05-23: 阶段 1-6 的主要实现已落地。追补主题切换图标、标题换行、Markdown `==...==` 高亮、Astro/Shiki 代码块 light/dark 可读性与 Giscus 消息目标校验后，又完成 code review 发现的 4 项修复（Header scroll 监听器去重、localStorage try-catch、Markdown 工具 restoreInput 渲染、首页发现区 heading 语义）。`npm test` 155/155 通过，`npm run build` 成功生成 19 pages。阶段 7 中完整多视口、键盘路径与 legacy preview 仍需继续验收。

- [x] Task 0: 阶段 0 - 基线审计与范围固化
  - [x] SubTask 0.1: 核对 `DESIGN.md`、`move-to-astro/visual-style-refactor-complete-report.md` 和本目录 spec，确认执行口径统一为 `Calvin Xia`
  - [x] SubTask 0.2: 建立页面族群清单：首页、文章列表、文章正文、文章归档、作品页、作品工具页、Markdown 独立页、关于页、更新日志、`/new-post`、404、styleguide、Giscus、灯箱、legacy 跳转
  - [x] SubTask 0.3: 建立状态清单：空状态、加载、搜索建议、无结果、评论加载、图片灯箱、移动端导航、工具 tab、表单错误、localStorage 恢复、reduced-motion
  - [x] SubTask 0.4: 标记非改动范围：Worker、RSS、SEO、content schema、publish 流程、R2 上传、local CDN proxy、`.well-known/`
  - [x] SubTask 0.5: 记录阶段回退边界：每个阶段以页面族群和可见 UI 行为为回退单位，不以单个 CSS 片段为回退单位
  - [x] SubTask 0.6: 运行 `npm test` 和 `npm run build`，记录重构前基线结果（`npm test`: 141/141 → 当前 155/155；`npm run build`: 19 pages）

- [x] Task 1: 阶段 1 - 设计系统与主题基础
  - [x] SubTask 1.1: 在 `src/styles/global.css` 建立 token 区段，覆盖 `DESIGN.md` 中 light / dark 的背景、表面、边框、文字、强调色、语义色、代码块、引用、mark、RGB helper、圆角、阴影、focus ring、motion token
  - [x] SubTask 1.2: 把组件 CSS 中新增或保留的主视觉颜色改为 CSS 变量引用，避免在 token 之外新增 hex 颜色
  - [x] SubTask 1.3: 在 `src/layouts/BaseLayout.astro` 增加首屏主题初始化脚本，默认浅色并读取 `calvin-xia-theme`
  - [x] SubTask 1.4: 新增或整理主题切换初始化逻辑，确保切换时更新 `data-theme`、`aria-pressed`、`aria-label`、localStorage，并派发 `calvin-theme-change`
  - [x] SubTask 1.5: 定义字体栈：中文标题衬线、中文正文 sans、英文数字辅助、代码 mono，并控制 web font 加载成本
  - [x] SubTask 1.6: 建立基础布局变量：站点容器、窄容器、文章宽度、section padding、component gap、header 高度预算
  - [x] SubTask 1.7: 建立全局 reduced-motion 规则，关闭大幅位移、循环动画和非必要转场
  - [x] SubTask 1.8: 运行 `npm run build`，检查主题初始化没有阻塞 Astro 构建

- [ ] Task 2: 阶段 2 - 站点外壳与基础组件
  - [x] SubTask 2.1: 重构 `src/components/Header.astro`，logo 改为 `Calvin Xia` 并链接首页
  - [x] SubTask 2.2: 调整 Header 主导航为 `文章 / 作品 / 关于`，移除首页和工具主导航项，保留 `aria-current="page"`
  - [x] SubTask 2.3: 添加桌面和移动端主题切换控件，确保触控目标不小于 `44px`
  - [x] SubTask 2.4: 重构 `src/components/Footer.astro`，使用轻量边框、短文案和新 token
  - [x] SubTask 2.5: 重构 `src/components/DynamicBackground.astro`，替换旧高饱和装饰为低对比线纹、轻颗粒或静态面层
  - [x] SubTask 2.6: 重构 `src/components/SkipLink.astro`，保持键盘可见、focus ring 清楚、位置不遮挡 Header
  - [x] SubTask 2.7: 重构 `src/components/TransitionIndicator.astro`，统一 loading indicator、`aria-hidden`、`aria-busy` 和 motion token
  - [x] SubTask 2.8: 统一按钮、链接、tag、badge、输入框、select、textarea、面板、列表、分隔线、tab、hover、focus、disabled 状态
  - [x] SubTask 2.9: 整理 `src/scripts/page-animations.ts` 和 `src/scripts/article-transitions.js`，让页面转场、进入动画、按钮 ripple 使用同一套 motion token
  - [ ] SubTask 2.10: 在桌面、`768px`、`480px`、`375px` 检查 Header、Footer、skip link、主题切换和基础控件
  - [x] SubTask 2.11: 运行 `npm run build`，确认全局外壳阶段可构建

- [ ] Task 3: 阶段 3 - 首页与内容入口
  - [x] SubTask 3.1: 重构 `src/pages/index.astro` 首屏，H1 使用 `Calvin Xia`，移除“欢迎来到 Mr.Xia 的小站”等旧文案
  - [x] SubTask 3.2: 保留并重排 `#currentTime` 当前时间组件，使其成为辅助状态而非主视觉中心
  - [x] SubTask 3.3: 精简首页说明文字，只保留导航、命名、状态、必要约束和行动文本
  - [x] SubTask 3.4: 将首页入口区整理为文章、作品、关于和最近更新的清晰层级，不新增工具快捷重点区
  - [x] SubTask 3.5: 将最近更新从旧卡片感改为轻量索引、列表或单层面板
  - [x] SubTask 3.6: 将首页搜索降级为辅助入口，避免成为首页主视觉中心
  - [x] SubTask 3.7: 调整 `src/scripts/time-display.ts` 的样式依赖，确保时间组件在 light / dark 下可读
  - [ ] SubTask 3.8: 检查 H1 在 `375px`、`480px`、`768px` 和桌面宽度下没有单字孤行、横向溢出或挤压
  - [ ] SubTask 3.9: 运行 `npm run build`，并检查首页浏览器 console 无新增错误（build 已通过，console 待浏览器验证）

- [ ] Task 4: 阶段 4 - 文章列表、归档与正文
  - [x] SubTask 4.1: 重构 `src/pages/articles.astro`，保持博客流、分类筛选、标签筛选、搜索建议和无结果状态
  - [x] SubTask 4.2: 重构 `src/pages/articles/archive.astro`，让归档页成为轻量索引，不引入额外卡片堆叠
  - [x] SubTask 4.3: 重构 `src/pages/articles/[...slug].astro` 的文章外壳、元信息、返回入口、正文容器和底部区域
  - [x] SubTask 4.4: 重构 `src/components/ArticleToc.astro`，保持桌面右侧 sticky 和移动端顶部折叠
  - [x] SubTask 4.5: 重构 `src/components/GiscusComments.astro`，让 Giscus 主题跟随 `calvin-theme-change` 与当前 `data-theme`
  - [x] SubTask 4.6: 统一文章正文中的标题、段落、链接、列表、引用、表格、代码块、KaTeX、图片、图注和 mark 样式
  - [x] SubTask 4.7: 同步 `src/lib/article-enhancements/reading-progress.js`、`heading-index.js`、`image-lightbox.js`、`section-reveals.js` 的视觉状态
  - [ ] SubTask 4.8: 检查文章搜索建议键盘操作、无结果恢复操作、阅读进度、目录跳转、图片灯箱、Giscus 加载和返回链接
  - [ ] SubTask 4.9: 在 light / dark 和移动端检查至少一篇长文、一篇含图片文章、一篇含代码或公式文章
  - [x] SubTask 4.10: 运行 `npm run build` 和 `npm test`
  - [x] SubTask 4.11: 追补 Markdown `==...==` 高亮在文章渲染与 Markdown 工具中的一致支持
  - [x] SubTask 4.12: 追补 Astro/Shiki 代码块双主题配置，确保 `text` fenced block 和真实代码 fenced block 都使用等宽字体、代码块背景和可读文字颜色
  - [x] SubTask 4.13: 添加真实 `javascript` fenced block 回归测试，确认 Shiki 输出 light / dark token 级语法高亮
  - [x] SubTask 4.14: 修复 Giscus 主题同步过早 `postMessage` 与 CSP 阻挡外部字体/评论样式的问题

- [x] Task 4.5: 阶段 4.5 - 文章发布与本地创作辅助页
  - [x] SubTask 4.5.1: 轻量重构 `src/pages/new-post.astro` 和 `src/components/NewPostForm.astro`，统一视觉、表单、按钮、状态和错误提示
  - [x] SubTask 4.5.2: 保持 `/new-post` 开发环境隐藏辅助属性，不加入公开导航
  - [x] SubTask 4.5.3: 确认 `NewPostForm` 不保存 `NEW_POST_SECRET`、不新增草稿保存、不增加 slug / frontmatter 预览
  - [x] SubTask 4.5.4: 保持 `tools/api-server.js`、`scripts/publish-post.js`、`scripts/post-utils.js`、`scripts/markdown-utils.js` 文件写入与发布逻辑不变
  - [x] SubTask 4.5.5: 若本阶段实际修改任何文件操作逻辑，补充对应 Node 测试并新增或更新 `.github/workflows/*-check.yml`
  - [x] SubTask 4.5.6: 运行 `npm test` 和 `npm run build`

- [ ] Task 5: 阶段 5 - 作品、工具与更新日志
  - [x] SubTask 5.1: 重构 `src/pages/works.astro`，将作品页整理为轻量项目档案
  - [x] SubTask 5.2: 保持作品页不新增主推项目、封面、截图、时间线、状态字段、项目主次分级或复杂过滤
  - [x] SubTask 5.3: 重构 `src/components/ToolsSection.astro` 和 `src/pages/works/tools.astro`，保持工具属于作品体系
  - [x] SubTask 5.4: 重构 `src/components/TimerWidget.astro` 与 `src/scripts/timer.ts`，确保控件尺寸稳定、状态清楚、移动端可用
  - [x] SubTask 5.5: 重构 `src/components/RandomSelector.astro` 与 `src/scripts/random-selector.ts`，保持结果反馈中立，不增加强仪式感
  - [x] SubTask 5.6: 重构 `src/components/MarkdownToolWidget.astro`、`src/pages/markdown-tool.astro` 与 `src/scripts/markdown-renderer.ts`，让编辑器和预览更接近编辑界面
  - [x] SubTask 5.7: 为 Markdown 工具加入或校准编辑区与预览区同步滚动，并保持站内文章正文样式分离
  - [x] SubTask 5.8: 为工具输入建立稳定 localStorage key、初始化、清空和异常恢复策略
  - [x] SubTask 5.9: 重构 `src/pages/updates/[...slug].astro`，让更新日志保持轻量记录型内容
  - [ ] SubTask 5.10: 检查工具 tab、计时器变化、随机选择器结果、Markdown 预览更新、localStorage 恢复过程中没有布局跳动
  - [x] SubTask 5.11: 运行 `npm run build` 和 `npm test`

- [ ] Task 6: 阶段 6 - 辅助页面、styleguide 与 legacy 验证
  - [x] SubTask 6.1: 重构 `src/pages/about.astro`，保持法律、隐私、免责声明和联系方式，避免增加个人介绍长文
  - [x] SubTask 6.2: 重构 `src/pages/404.astro`，使用短文案、清晰返回入口和新视觉 token
  - [x] SubTask 6.3: 评估 `src/pages/styleguide.astro`，仅在 token 和基础组件稳定后作为内部维护页同步，不作为首轮视觉前置
  - [ ] SubTask 6.4: 验证 `public/Works.html`、`public/about.html`、`public/statement.html`、`public/styleguide.html`、`public/timetable.html`、`public/markdown-to-html-tool.html` 的旧路径兼容行为
  - [ ] SubTask 6.5: 验证 `public/blog/*` 与 `public/UpdateLog/*` legacy 内容入口没有被新视觉改动破坏
  - [ ] SubTask 6.6: 运行 `npm run build`，并抽查 legacy 路径在本地预览中的跳转或兼容行为

- [ ] Task 7: 阶段 7 - 全站质量验证
  - [x] SubTask 7.1: 运行 `npm test`（155/155 通过）
  - [x] SubTask 7.2: 运行 `npm run build`（19 pages）
  - [x] SubTask 7.11: Code review — 修复 Header `initHeaderState` scroll 监听器重复注册，添加 `dataset.headerReady` 去重守卫
  - [x] SubTask 7.12: Code review — 修复 Header `setTheme` 中 `localStorage.setItem` 缺少 try-catch 保护，与 BaseLayout 和 MarkdownRenderer 保持一致
  - [x] SubTask 7.13: Code review — 修复 Markdown 工具 `restoreInput()` 恢复内容后未触发 `this.render()`，导致预览区空白
  - [x] SubTask 7.14: Code review — 修复首页 home-discovery section 缺少 `<h2>` 标题，补齐屏幕阅读器导航层级
  - [ ] SubTask 7.3: 在桌面宽度检查首页、文章列表、文章正文、归档、作品页、工具页、Markdown 独立页、关于页、更新日志、`/new-post`、404
  - [ ] SubTask 7.4: 在 `375px`、`480px`、`768px`、`1024px` 检查同一批页面没有横向滚动、遮挡、文字挤压或按钮过小
  - [ ] SubTask 7.5: 分别在 light 和 dark 主题检查正文、链接、按钮、输入框、标签、代码块、表格、Giscus、灯箱和工具界面
  - [ ] SubTask 7.6: 检查键盘 Tab 顺序、focus ring、skip link、导航、搜索建议、工具 tab、表单输入、返回入口
  - [ ] SubTask 7.7: 检查 reduced-motion 下没有大幅位移、强滚动动效或阻塞性动画
  - [ ] SubTask 7.8: 检查浏览器 console 没有新增错误
  - [x] SubTask 7.8a: 复核 `/articles/00010101-test-assignment/` 当前 console 无新增错误
  - [x] SubTask 7.9: 检查 visible copy，删除解释设计、教程化、营销化或重复说明的前端文案
  - [x] SubTask 7.10: 若引入新 npm 依赖，记录用途、替代方案、移除成本，并确认没有违反 `DESIGN.md` 动效依赖限制

- [ ] Task 8: 阶段 8 - 分阶段上线与收口
  - [x] SubTask 8.1: 按阶段整理变更摘要、影响页面、验证命令和人工测试记录
  - [x] SubTask 8.2: 更新 `frontend-visual-reform/checklist.md`，将已完成阶段和未覆盖项准确标记
  - [x] SubTask 8.3: 更新 `DESIGN.md` 中实现后发生变化的 token、组件规则或页面规则
  - [x] SubTask 8.4: 如项目结构、命令或约定变化，更新 `AGENTS.md` 和 `README.md`
  - [x] SubTask 8.5: 如修改文件操作功能，确认测试与 `.github/workflows/*-check.yml` 或 `*-ci.yml` 已同步
  - [ ] SubTask 8.6: 全站改造完成后做一次视觉一致性审计，记录剩余暂缓项和后续增强项

# Task Dependencies
- [Task 1] depends on [Task 0]
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1, Task 2]
- [Task 4] depends on [Task 1, Task 2]
- [Task 4.5] depends on [Task 1, Task 2]
- [Task 5] depends on [Task 1, Task 2]
- [Task 6] depends on [Task 1, Task 2]
- [Task 7] depends on [Task 3, Task 4, Task 4.5, Task 5, Task 6]
- [Task 8] depends on [Task 7]
