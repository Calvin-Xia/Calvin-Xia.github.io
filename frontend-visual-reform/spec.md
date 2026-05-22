# 前端视觉重构 Spec

## Why
Astro 迁移完成后，站点结构、内容集合、工具组件、文章增强和发布链路已经稳定，但视觉仍主要停留在旧的暖色玻璃拟态体系中。当前 `src/styles/global.css` 集中了大量 token、布局、组件、页面、工具、文章、响应式和动画规则，导致全局样式牵连大、卡片感重复、light / dark 主题缺失，后续维护成本偏高。

本次重构需要把站点整理为 `DESIGN.md` 定义的 Calvin Xia 视觉系统：中性、直接、轻装饰、中文阅读友好、工具可用、动效克制。重构必须分阶段推进，每个阶段都能独立验收、可构建、可回退，并且不隐性改动 Worker、RSS、SEO、content schema、文章发布流程或 legacy 跳转策略。

## Source Of Truth
- 主要设计口径：`DESIGN.md`
- 范围、风险和阶段来源：`move-to-astro/visual-style-refactor-complete-report.md`
- 任务链条格式参考：`.trae/specs/*/spec.md`、`.trae/specs/*/tasks.md`、`.trae/specs/*/checklist.md`

当报告与 `DESIGN.md` 冲突时，以 `DESIGN.md` 为准：
- 可见品牌统一使用 `Calvin Xia`
- Header logo 回首页
- 主导航只放 `文章 / 作品 / 关于`
- 工具继续归入作品体系，不进入主导航
- 不引入 GSAP、ScrollTrigger、Lenis、Three.js 或全局 custom cursor

## What Changes
- 建立 light / dark 双主题 token，默认固定浅色，深色由用户手动切换并保存。
- 将旧暖色玻璃拟态替换为中性色、轻边框、小圆角、低阴影、低噪声背景和内容优先的视觉系统。
- 重构 Header、Footer、DynamicBackground、SkipLink、TransitionIndicator、主题切换控件和基础 UI 状态。
- 重构首页为清晰入口页：H1 使用 `Calvin Xia`，保留当前时间组件，搜索降级为辅助入口，最近更新作为索引。
- 重构文章列表、文章正文、归档、目录、阅读进度、Giscus、代码块、表格、引用、图片灯箱的视觉层级。
- 重构作品页为轻量项目档案，不引入封面、截图、时间线、主推项目或复杂过滤。
- 重构工具页和独立 Markdown 工具页的视觉，保留现有 tab，增强 Markdown 编辑体验和同步滚动。
- 轻量统一 `/new-post` 本地开发辅助页，不增加草稿、secret 保存、slug 预览或发布说明。
- 保持 legacy 旧路径跳转和兼容入口，不默认视觉同步旧静态页面。
- 完成桌面、移动端、light / dark、reduced-motion、键盘焦点、浏览器 console、构建和测试验证。

## Out Of Scope
- 不修改 `src/worker.ts`、`src/lib/umami-view-counter.js` 的 Worker / Umami 逻辑。
- 不修改 `src/pages/rss.xml.ts`、`src/pages/robots.txt.ts`、`src/lib/site-seo.js` 的 RSS / SEO 行为。
- 不修改 `src/content.config.ts` 的 content schema。
- 不修改 `scripts/publish-post.js`、`scripts/post-utils.js`、`scripts/markdown-utils.js` 的文章发布流程。
- 不修改 R2 上传、资源链接转换、文章 slug、frontmatter schema 或 publish 输出文件名。
- 不改变 `.well-known/`、referrer policy、local CDN proxy referer 策略。
- 不把工具升级为主导航或独立产品工作台。
- 不把首页改成营销落地页、full-bleed hero 或强叙事页面。
- 不新增重型视觉资产、项目截图、封面、地图、代码片段主视觉或生成图片。
- 不把旧静态 HTML 页面纳入新视觉覆盖主线。

## Impact
- Affected specs: 新增本目录 `frontend-visual-reform/`
- Affected design docs:
  - `DESIGN.md`
  - `move-to-astro/visual-style-refactor-complete-report.md`
- Affected code:
  - `src/styles/global.css`
  - `src/layouts/BaseLayout.astro`
  - `src/components/Header.astro`
  - `src/components/Footer.astro`
  - `src/components/DynamicBackground.astro`
  - `src/components/SkipLink.astro`
  - `src/components/TransitionIndicator.astro`
  - `src/components/PageIntro.astro`
  - `src/components/ArticleToc.astro`
  - `src/components/GiscusComments.astro`
  - `src/components/ToolsSection.astro`
  - `src/components/TimerWidget.astro`
  - `src/components/RandomSelector.astro`
  - `src/components/MarkdownToolWidget.astro`
  - `src/components/NewPostForm.astro`
  - `src/pages/index.astro`
  - `src/pages/articles.astro`
  - `src/pages/articles/[...slug].astro`
  - `src/pages/articles/archive.astro`
  - `src/pages/works.astro`
  - `src/pages/works/tools.astro`
  - `src/pages/markdown-tool.astro`
  - `src/pages/about.astro`
  - `src/pages/new-post.astro`
  - `src/pages/updates/[...slug].astro`
  - `src/pages/styleguide.astro`
  - `src/scripts/page-animations.ts`
  - `src/scripts/time-display.ts`
  - `src/scripts/timer.ts`
  - `src/scripts/random-selector.ts`
  - `src/scripts/markdown-renderer.ts`
  - `src/scripts/article-runtime.js`
  - `src/scripts/article-transitions.js`
  - `src/lib/article-enhancements/*`
- Validation commands:
  - `npm run build`
  - `npm test`
  - `npm run test:coverage` when file operation features are modified

## ADDED Requirements

### Requirement: 设计系统基础
系统应使用 `DESIGN.md` 的 Calvin Xia 视觉系统替换旧暖色玻璃拟态。

#### Scenario: CSS token 统一
- **WHEN** 开发者实现全局视觉 token
- **THEN** 背景、文字、边框、强调色、状态色、代码块、按钮、输入框、焦点、阴影、圆角和动效时长应通过 CSS 变量管理
- **AND** 组件样式中除 token 定义外不应新增硬编码 hex 颜色
- **AND** 旧橙、粉、青绿不应继续作为主视觉色系

#### Scenario: light / dark 双主题
- **WHEN** 用户首次访问站点
- **THEN** 页面应默认使用浅色主题
- **AND** 不应默认跟随系统主题切换
- **WHEN** 用户手动切换深色主题
- **THEN** 选择应保存到 localStorage
- **AND** Header、正文、按钮、表单、代码块、Giscus、灯箱和工具界面应同步适配

### Requirement: 站点外壳与导航
系统应提供克制、稳定、可访问的站点外壳。

#### Scenario: 主导航结构
- **WHEN** 用户查看 Header
- **THEN** logo 文案应为 `Calvin Xia`
- **AND** logo 应链接到首页
- **AND** 主导航只包含 `文章 / 作品 / 关于`
- **AND** 工具入口应保留在作品体系内，不出现在主导航中

#### Scenario: 移动端导航
- **WHEN** 用户在小于 `700px` 的移动端视口访问站点
- **THEN** Header 应保持可操作
- **AND** 导航链接、主题切换和按钮触控目标不应小于 `44px`
- **AND** 页面不应出现横向滚动或文字挤压

### Requirement: 首页入口体验
首页应是个人站入口页，不是营销页。

#### Scenario: 首页首屏
- **WHEN** 用户打开首页
- **THEN** 主标题应使用 `Calvin Xia`
- **AND** 当前时间组件应保留但不抢主标题层级
- **AND** 首页不应展示主推文章、主推作品、工具快捷重点区或解释型长文案
- **AND** H1 在 `375px`、`480px`、`768px` 和桌面宽度下不应出现单字孤行或挤压

#### Scenario: 首页内容入口
- **WHEN** 用户浏览首页入口区
- **THEN** 文章、作品、关于和最近更新之间应有清晰层级
- **AND** 最近更新应作为轻量索引保留
- **AND** 搜索应作为辅助入口，不应成为首页主视觉中心

### Requirement: 文章体系
系统应保持中文博客阅读体验，并同步新视觉系统。

#### Scenario: 文章列表
- **WHEN** 用户浏览文章列表
- **THEN** 页面应呈现清楚的博客流
- **AND** 分类筛选、标签筛选、搜索建议和无结果状态应保持可用
- **AND** 视觉应降低工具感，不使用封面卡片瀑布流

#### Scenario: 文章正文
- **WHEN** 用户阅读文章正文
- **THEN** 正文行宽、行高、标题层级、代码块、引用、表格、KaTeX 和图片应保持可读
- **AND** 桌面端目录应继续右侧 sticky
- **AND** 移动端目录应保持顶部折叠
- **AND** 阅读进度条、阅读量、返回入口、Giscus 和图片灯箱应保持功能不退步
- **AND** Giscus 主题应跟随站点 light / dark 手动主题

### Requirement: 作品与工具体系
系统应让作品页成为轻量项目档案，并让工具保持作品体系的一部分。

#### Scenario: 作品页
- **WHEN** 用户浏览作品页
- **THEN** 页面不应强推单个作品
- **AND** 不应新增截图、封面、时间线、状态字段、项目主次分级或复杂过滤
- **AND** 项目条目应使用列表、分隔线、轻量面板或单层容器表达

#### Scenario: 工具页
- **WHEN** 用户使用作品体系下的工具页
- **THEN** Timer、Random Selector、Markdown Tool 应并列呈现
- **AND** 现有 tab 结构应保留
- **AND** 工具标题、tab 和按钮不应增加解释型文案
- **AND** 输入、按钮、tab、结果区和预览区尺寸应稳定，交互时不应布局跳动

#### Scenario: Markdown 工具
- **WHEN** 用户使用 Markdown 工具
- **THEN** 编辑区和预览区应保持公众号 / HTML 工具语境
- **AND** 不应共享站内文章正文样式
- **AND** 可加入编辑区与预览区同步滚动
- **AND** 工具输入内容可使用 localStorage 保存

### Requirement: `/new-post` 本地辅助页
系统应轻量统一 `/new-post` 页面视觉，不改变正式发布流程。

#### Scenario: 本地新建文章工具
- **WHEN** 开发者在开发环境访问 `/new-post`
- **THEN** 页面应保持隐藏辅助入口属性
- **AND** 只做视觉统一和基础可用性检查
- **AND** 不应保存 `NEW_POST_SECRET`
- **AND** 不应增加草稿保存、slug / frontmatter 预览、重复文件提示增强、dry-run 输出整理或前端发布说明

### Requirement: 动效、可访问性与性能
系统应保持 L2 轻量流畅动效，并满足基础可访问性。

#### Scenario: 动效行为
- **WHEN** 用户浏览页面、点击按钮或切换页面
- **THEN** 动效应只服务识别、状态和层级
- **AND** 页面转场、按钮 ripple、loading indicator 可以保留但必须统一 motion token
- **AND** 不应引入 GSAP、Lenis、ScrollTrigger、Three.js、WebGL 背景或全局 custom cursor

#### Scenario: reduced-motion
- **WHEN** 用户启用 `prefers-reduced-motion: reduce`
- **THEN** 大幅位移、强滚动动效、循环动画和非必要转场应关闭或降到最低
- **AND** 内容和状态仍应完整可见

#### Scenario: 可访问性
- **WHEN** 用户通过键盘或辅助技术操作站点
- **THEN** focus ring、skip link、aria 状态、tab 顺序、表单 label 和按钮可访问名称不应退步
- **AND** 正文、按钮、链接、输入框、标签、代码块和 dark mode 对比度应尽可能满足 WCAG AA

### Requirement: Legacy 与非视觉链路保护
系统应保护旧路径兼容和非视觉功能。

#### Scenario: Legacy 跳转
- **WHEN** 用户访问 `public/` 中的旧 URL 兼容入口
- **THEN** 旧路径应继续跳转或展示当前既有兼容行为
- **AND** 旧静态 HTML 页面不应被默认纳入新视觉覆盖

#### Scenario: 发布与平台链路
- **WHEN** 开发者运行构建、测试、RSS、Worker 或发布相关流程
- **THEN** 视觉重构不应改变 Worker、RSS、SEO、content schema、publish 流程、R2 上传或 local CDN proxy 行为
- **AND** 如果后续修改文件读写逻辑，应同步补充测试和 `.github/workflows/*-check.yml` 或 `*-ci.yml`

### Requirement: 分阶段验证
每个阶段完成后都应具备明确验收和回退边界。

#### Scenario: 阶段完成
- **WHEN** 一个阶段的任务完成
- **THEN** `npm run build` 应通过
- **AND** 与该阶段相关的页面应完成桌面、移动端、light / dark、键盘焦点和 console 检查
- **AND** `frontend-visual-reform/checklist.md` 中对应验收项应更新为完成状态

## MODIFIED Requirements
无现有 spec 被直接修改。本目录作为全站视觉重构的新任务链条。

## REMOVED Requirements
无。
