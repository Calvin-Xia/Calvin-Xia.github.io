# Phase 1：低复杂度页面迁移 Spec

## Why
Phase 0 已完成 Astro 基础环境搭建和 BaseLayout 组件创建。此阶段将 5 个结构简单、无复杂交互的页面迁入 Astro，验证组件化模板的收益，并为后续复杂页面迁移积累模式。

## What Changes
- 迁移 `about.html` → `src/pages/about.astro`
- 迁移 `Works.html` → `src/pages/works.astro`
- 迁移 `404.html` → `src/pages/404.astro`
- 迁移 `styleguide.html` → `src/pages/styleguide.astro`
- 完善 `src/pages/index.astro`（时间显示、最近更新、邮箱保护脚本）
- 将 `js/main.js` 拆分为独立脚本模块：
  - `src/scripts/time-display.ts`
  - `src/scripts/page-animations.ts`
  - `src/scripts/email-protection.ts`
- 创建 `PageIntro.astro` 组件（复用页面顶部介绍区域）

## Impact
- New files: `src/pages/about.astro`, `src/pages/works.astro`, `src/pages/404.astro`, `src/pages/styleguide.astro`, `src/components/PageIntro.astro`, `src/scripts/time-display.ts`, `src/scripts/page-animations.ts`, `src/scripts/email-protection.ts`
- Modified files: `src/pages/index.astro`, `src/styles/global.css`（小幅样式修复/优化）
- 不影响旧 HTML 文件

## ADDED Requirements

### Requirement: about.astro 迁移
关于页面 SHALL 完整渲染，内容与当前 `about.html` 一致。

#### Scenario: 版权声明区域
- **WHEN** 访问 `/about/`
- **THEN** 显示 "版权声明"、"隐私政策"、"免责声明"、"联系方式" 四个区块

#### Scenario: 邮箱保护
- **WHEN** 页面加载
- **THEN** `[data-email-placeholder]` 元素被替换为可点击的 `mailto:` 链接

#### Scenario: 返回首页链接
- **WHEN** 页面渲染
- **THEN** "← 返回首页" 链接指向 `/`

### Requirement: works.astro 迁移
作品页 SHALL 渲染 4 个作品卡片，内容与当前 `Works.html` 一致。

#### Scenario: 作品卡片列表
- **WHEN** 访问 `/works/`
- **THEN** 显示 "持续维护" 状态面板和 4 个项目卡片（指纹验证应用、网址收藏夹、蹭饭地图、按钮块设计器）

#### Scenario: 外部链接可用
- **WHEN** 点击 "下载应用" / "GitHub Repository" / "访问地址" 等链接
- **THEN** 正确跳转到外部 URL，`target="_blank"` `rel="noopener"` 属性存在

### Requirement: 404.astro 迁移
404 页面 SHALL 渲染与当前 `404.html` 一致的内容。

#### Scenario: 错误信息显示
- **WHEN** 访问不存在的路径
- **THEN** 显示 "404" 错误码和 "页面未找到" 标题

#### Scenario: 返回按钮工作
- **WHEN** 点击 "返回首页" / "返回上一页"
- **THEN** 正确导航到首页或浏览器历史上一页

### Requirement: styleguide.astro 迁移
样式指南页 SHALL 展示设计 token 和组件示例，内容与当前 `styleguide.html` 一致。

#### Scenario: 色彩展示
- **WHEN** 访问样式指南
- **THEN** 显示主色、辅色、强调色的色块卡片

### Requirement: 脚本模块拆分
`js/main.js` 中的模块 SHALL 按职责拆分为独立 TypeScript 文件。

#### Scenario: 时间显示模块独立
- **WHEN** `src/scripts/time-display.ts` 被首页引用
- **THEN** `TimeDisplay.init()` 启动时钟更新，功能与 `js/main.js` 原实现一致

#### Scenario: 页面动画模块独立
- **WHEN** `src/scripts/page-animations.ts` 被页面引用
- **THEN** `PageAnimations.init()` 添加 fade-in-up 动画类和滚动动画，尊重 `prefers-reduced-motion`

#### Scenario: 邮箱保护模块独立
- **WHEN** `src/scripts/email-protection.ts` 被 about 页引用
- **THEN** `EmailProtection.init()` 解码 base64 邮箱并插入 mailto 链接

### Requirement: PageIntro 组件
页面 SHALL 使用 `PageIntro.astro` 组件统一标题区域。

#### Scenario: 基本用法
- **WHEN** 向 PageIntro 传入 `kicker`、`title`、`subtitle` props
- **THEN** 渲染 `<section class="page-intro">` 包含 kicker、h1 标题、副标题

#### Scenario: 居中变体
- **WHEN** 向 PageIntro 传入 `center: true` prop
- **THEN** 渲染 `page-intro--center` 类

#### Scenario: 紧凑变体
- **WHEN** 向 PageIntro 传入 `compact: true` prop
- **THEN** 渲染 `page-intro--compact` 类
