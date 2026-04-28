# Phase 0：环境搭建与验证 Spec

## Why
将现有纯 HTML/CSS/JS 静态站点迁移到 Astro 框架，需要一个可运行的基础环境作为后续所有迁移工作的底座。此阶段需初始化 Astro 项目、迁入现有 CSS 资产、建立共享布局组件，并验证 GitHub Pages 部署配置正确。

## What Changes
- 在仓库根目录初始化 Astro 项目（`package.json`、`astro.config.mjs`、`tsconfig.json`）
- 安装 npm 依赖：`marked`、`highlight.js`、`katex`、`dompurify`（核心库 npm 管理）
- 将 `css/style.css` 复制为 `src/styles/global.css`，作为全局样式入口
- 创建 `BaseLayout.astro` 及子组件（Header、Footer、TransitionIndicator、SkipLink、DynamicBackground）
- 配置 `astro.config.mjs`：`site`、`base`、输出目录
- 用 `index.astro` 验证首页渲染与原站视觉一致
- 验证 `npm run build` 产出正确的静态文件

## Impact
- Affected specs: 全部后续 Phase 依赖此阶段的输出
- New files: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/TransitionIndicator.astro`, `src/components/SkipLink.astro`, `src/components/DynamicBackground.astro`, `src/styles/global.css`, `src/pages/index.astro`
- Modified files: `.gitignore`（添加 `dist/`、`node_modules/`）
- 不影响现有 HTML/CSS/JS 文件（此阶段仅新增 Astro 文件，与现有文件共存）

## ADDED Requirements

### Requirement: Astro 项目初始化
项目 SHALL 在仓库根目录拥有完整的 Astro 项目配置。

#### Scenario: 项目可启动开发服务器
- **WHEN** 执行 `npm run dev`
- **THEN** Astro 开发服务器在 `localhost:4321` 启动，无错误

#### Scenario: 项目可执行生产构建
- **WHEN** 执行 `npm run build`
- **THEN** 在 `dist/` 目录生成静态文件，构建过程零错误

### Requirement: 全局样式迁入
现有 `css/style.css` SHALL 完整迁入 `src/styles/global.css`，渲染效果与原站一致。

#### Scenario: CSS 变量保留
- **WHEN** Astro 页面加载 `global.css`
- **THEN** 所有 `:root` CSS 变量（颜色、间距、阴影、圆角）正确生效

#### Scenario: 响应式样式保留
- **WHEN** 视口宽度 ≤ 768px
- **THEN** 响应式断点样式正确应用，移动端布局与当前一致

### Requirement: BaseLayout 组件
`BaseLayout.astro` SHALL 封装所有页面共享的结构和资源。

#### Scenario: 页头导航渲染
- **WHEN** 任何使用 BaseLayout 的页面渲染
- **THEN** `<header>` 包含 logo "Mr.Xia" 和五个导航链接（首页、作品、工具、文章、关于），`aria-current="page"` 正确标记当前页

#### Scenario: 页脚备案渲染
- **WHEN** 页面渲染
- **THEN** `<footer>` 包含 ICP 备案号和公安备案号及图标

#### Scenario: SEO meta 渲染
- **WHEN** 页面渲染
- **THEN** `<head>` 包含 charset、viewport、favicon、preconnect/dns-prefetch 标签

#### Scenario: 跳过链接渲染
- **WHEN** 页面渲染
- **THEN** `<a class="skip-link" href="#main-content">跳到主要内容</a>` 出现在 body 最顶部

#### Scenario: 动态背景渲染
- **WHEN** 页面渲染
- **THEN** `<div class="bg-img"></div>` 出现在 body 内

#### Scenario: 过渡指示器渲染
- **WHEN** 页面渲染
- **THEN** `<div id="page-transition-indicator">` 包含 spinner 子元素

### Requirement: index.astro 验证页
首页内容 SHALL 完整渲染，与当前 `index.html` 视觉一致。

#### Scenario: 英雄区域渲染
- **WHEN** 访问首页
- **THEN** 显示 "欢迎来到 Mr.Xia 的小站" 标题和副标题

#### Scenario: 时间显示工作
- **WHEN** 首页加载
- **THEN** `.current-time` 元素显示当前时间和日期，每秒更新

#### Scenario: 快速导航卡片渲染
- **WHEN** 首页渲染
- **THEN** 三张快速导航卡片（个人作品、实用工具、网站文章）正确显示

### Requirement: GitHub Pages 部署配置
Astro 项目 SHALL 配置为与 GitHub Pages 兼容。

#### Scenario: base 路径正确
- **WHEN** `astro.config.mjs` 中 `base` 设置为 `/`
- **THEN** 所有资源路径以 `/` 开头，与 GitHub Pages 根域名部署匹配

#### Scenario: 构建输出可部署
- **WHEN** 执行 `npm run build`
- **THEN** `dist/` 目录可作为 GitHub Pages 的发布源
