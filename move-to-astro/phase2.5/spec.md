# Phase 2.5：文章体验增强评估 Spec

## Why

Phase 2 已完成内容集合、文章列表、文章详情页和搜索能力。当前文章页已经能承载长文、多图和多级标题，但阅读体验仍可继续增强：图片需要沉浸式查看，多篇文章之间可以更顺滑地切换，长文标题层级需要更清晰的扫描和定位能力。

本阶段先做方案评估与实施规格，不直接进入开发。目标是在不破坏静态站点、无框架膨胀、兼顾移动端的前提下，明确哪些体验增强值得做、怎么做、如何验收。

## Scope

- 图片点按放大为悬浮层，并支持放大、缩小、关闭、键盘操作和移动端基础手势
- 文章页之间的平滑切换，包括文章列表 → 详情、详情 → 详情、详情 → 列表
- 标题层级排版优化：按层级增加适度文字间隔，悬浮时显示 `#` 锚点
- 长文侧栏目录：按标题跳转、当前阅读位置高亮、阅读进度显示

## Non-Goals

- 不引入 React/Vue 等重型运行时
- 不把所有站点导航改成 SPA
- 不在本阶段实现全文评论、图片管理后台或云端图片编辑
- 不修改 Obsidian vault 内容

## Feasibility Summary

| 功能 | 可行性 | 推荐方案 | 风险 |
|---|---|---|---|
| 图片悬浮放大 | 高 | 原生 `<dialog>` + vanilla JS + CSS transform | 手势缩放和滚轮缩放需要边界控制，避免页面滚动冲突 |
| 文章平滑切换 | 中高 | Astro `ClientRouter`/View Transitions 渐进增强，保留普通链接兜底 | 需要重新初始化图片 caption、灯箱、目录监听等页面脚本 |
| 标题锚点与层级排版 | 高 | 构建期生成稳定 heading id，CSS 层级间距 + hover/focus `#` | 中文标题重复时 id 去重规则要稳定 |
| 侧栏目录与进度 | 中高 | 客户端从 `.markdown-content h2,h3` 生成 TOC，IntersectionObserver 高亮 | 移动端空间有限，需要折叠或底部按钮入口 |

## Recommended Architecture

### Article Enhancements Boundary

新增 `src/lib/article-enhancements/` 作为文章页交互增强边界，避免把所有逻辑堆进 `articles/[...slug].astro`。推荐拆分为：

- `image-lightbox.js`：图片悬浮层、缩放、关闭、键盘事件
- `heading-index.js`：标题 id、锚点、目录数据提取
- `reading-progress.js`：阅读进度、当前标题高亮
- `article-enhancements.js`：统一初始化入口，处理 Astro 页面切换后的重复初始化

### Styling Boundary

新增或扩展 `src/styles/global.css` 中的文章体验样式，使用现有 CSS 变量和 `.markdown-content` 视觉语言。侧栏在桌面端固定于正文右侧，移动端折叠为浮动目录按钮或文章顶部目录抽屉。

### Progressive Enhancement

所有功能都应在无 JS 时退化为普通文章页：

- 图片仍是普通图片和灰色说明文字
- 标题仍能通过原生锚点跳转
- 文章链接仍是普通页面跳转
- 目录和进度条消失但不阻塞阅读

## Requirements

### Requirement: 图片悬浮放大

#### Scenario: 打开图片
- **WHEN** 用户点击文章正文图片
- **THEN** 页面显示悬浮层，展示原图片和说明文字
- **AND** 背景内容变暗但仍保留文章语境

#### Scenario: 缩放控制
- **WHEN** 用户点击放大/缩小按钮或使用滚轮
- **THEN** 图片在合理范围内缩放（建议 1x–4x）
- **AND** 重置按钮恢复到适合视窗的初始比例

#### Scenario: 关闭与无障碍
- **WHEN** 用户按 Escape、点击关闭按钮或点击遮罩空白处
- **THEN** 悬浮层关闭，焦点回到原图片
- **AND** 悬浮层使用 `aria-modal="true"` 或 `<dialog>` 的原生语义

### Requirement: 文章平滑切换

#### Scenario: 列表到详情
- **WHEN** 用户从 `/articles/` 点击文章卡片进入详情页
- **THEN** 页面使用轻量淡入/位移动效过渡
- **AND** 浏览器不支持 View Transitions 时回退为普通跳转

#### Scenario: 脚本重新初始化
- **WHEN** 平滑切换完成并加载新文章
- **THEN** 图片 caption、灯箱、标题目录、阅读进度等增强脚本重新绑定到新 DOM
- **AND** 不重复注册全局事件监听

### Requirement: 标题层级排版与锚点

#### Scenario: 层级间距
- **WHEN** 渲染 `.markdown-content h1` 到 `h4`
- **THEN** 不同层级使用不同的上外边距、字号和轻微字距，提升长文扫描性
- **AND** 字距不使用负值，不随 viewport 宽度缩放

#### Scenario: 悬浮锚点
- **WHEN** 用户 hover 或键盘 focus 标题
- **THEN** 标题左侧或右侧显示 `#` 锚点
- **AND** 点击后 URL hash 更新并复制/定位到该标题

### Requirement: 侧栏目录与进度

#### Scenario: 目录生成
- **WHEN** 文章包含多个 `h2/h3`
- **THEN** 桌面端显示侧栏目录，按层级缩进
- **AND** 点击目录项平滑滚动到对应标题

#### Scenario: 当前章节高亮
- **WHEN** 用户滚动文章
- **THEN** 当前视口附近的标题在目录中高亮
- **AND** 页面顶部或侧栏展示阅读进度

#### Scenario: 移动端体验
- **WHEN** 视口宽度不足以显示侧栏
- **THEN** 目录折叠为浮动按钮或文章顶部折叠区
- **AND** 展开后不遮挡正文主要阅读区域

## Open Decisions

- 图片灯箱是否需要左右切换上一张/下一张图片：建议纳入，成本低，收益高
- 目录移动端形态：建议先做文章顶部折叠区，比悬浮按钮更稳
- 文章切换范围：建议只对站内文章链接启用，不接管外链和工具页链接
