# Tasks

- [ ] Task 0.1: 初始化 Astro 项目
  - [ ] SubTask 0.1.1: 执行 `npm create astro@latest . -- --template minimal --skip-houston` 初始化项目
  - [ ] SubTask 0.1.2: 安装 npm 依赖 `marked highlight.js katex dompurify`
  - [ ] SubTask 0.1.3: 安装开发依赖 `@types/dompurify`（如需 TypeScript 类型）
  - [ ] SubTask 0.1.4: 验证 `npm run dev` 可启动，默认页面正常渲染

- [ ] Task 0.2: 迁移全局样式
  - [ ] SubTask 0.2.1: 将 `css/style.css` 内容复制到 `src/styles/global.css`
  - [ ] SubTask 0.2.2: 在 `BaseLayout.astro` 中通过 `import` 或 `<link>` 引入 `global.css`
  - [ ] SubTask 0.2.3: 验证所有 CSS 变量、动画、响应式断点在 Astro 环境下正确生效

- [ ] Task 0.3: 创建 BaseLayout 及子组件
  - [ ] SubTask 0.3.1: 创建 `src/components/SkipLink.astro`
  - [ ] SubTask 0.3.2: 创建 `src/components/DynamicBackground.astro`
  - [ ] SubTask 0.3.3: 创建 `src/components/Header.astro`（包含 `<header><nav>` 完整结构）
  - [ ] SubTask 0.3.4: 创建 `src/components/Footer.astro`（包含备案信息）
  - [ ] SubTask 0.3.5: 创建 `src/components/TransitionIndicator.astro`
  - [ ] SubTask 0.3.6: 创建 `src/layouts/BaseLayout.astro`（组装所有子组件 + `<html>`/`<head>`/`<body>` 骨架）
  - [ ] SubTask 0.3.7: BaseLayout 支持 `title`、`description`、`currentPage` 等 props

- [ ] Task 0.4: 创建 index.astro 验证页
  - [ ] SubTask 0.4.1: 创建 `src/pages/index.astro`，使用 BaseLayout
  - [ ] SubTask 0.4.2: 迁移首页英雄区域 HTML（欢迎标题 + 副标题）
  - [ ] SubTask 0.4.3: 迁移快速导航卡片 HTML（个人作品、实用工具、网站文章）
  - [ ] SubTask 0.4.4: 迁移全站搜索入口 HTML
  - [ ] SubTask 0.4.5: 迁移最近更新区域 HTML
  - [ ] SubTask 0.4.6: 迁移时间显示脚本（从 `js/main.js` TimeDisplay 模块）
  - [ ] SubTask 0.4.7: 迁移页面动画脚本（从 `js/main.js` PageAnimations 模块）
  - [ ] SubTask 0.4.8: 迁移邮箱保护脚本（从 `js/main.js` EmailProtection 模块）
  - [ ] SubTask 0.4.9: 视觉对比验证：`npm run dev` 首页与当前 `index.html` 逐区对比

- [ ] Task 0.5: 配置 GitHub Pages 部署
  - [ ] SubTask 0.5.1: 在 `astro.config.mjs` 中设置 `site` 为生产域名
  - [ ] SubTask 0.5.2: 在 `astro.config.mjs` 中设置 `base` 为 `/`
  - [ ] SubTask 0.5.3: 更新 `.gitignore` 添加 `dist/` 和 `node_modules/`
  - [ ] SubTask 0.5.4: 执行 `npm run build`，检查 `dist/` 输出结构
  - [ ] SubTask 0.5.5: 使用 `npm run preview` 本地预览生产构建

# Task Dependencies
- [Task 0.2] depends on [Task 0.1]
- [Task 0.3] depends on [Task 0.2]
- [Task 0.4] depends on [Task 0.3]
- [Task 0.5] depends on [Task 0.4]
