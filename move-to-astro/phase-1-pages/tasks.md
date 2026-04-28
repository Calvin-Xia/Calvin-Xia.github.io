# Tasks

- [ ] Task 1.1: 创建 PageIntro 组件
  - [ ] SubTask 1.1.1: 创建 `src/components/PageIntro.astro`，接受 `kicker`, `title`, `subtitle`, `center`, `compact` props
  - [ ] SubTask 1.1.2: 渲染 `<section class="page-intro">` 结构，根据 props 控制 CSS 类名

- [ ] Task 1.2: 迁移 about.astro
  - [ ] SubTask 1.2.1: 创建 `src/pages/about.astro`，使用 BaseLayout + PageIntro
  - [ ] SubTask 1.2.2: 迁移版权声明、隐私政策、免责声明、联系方式四个区块
  - [ ] SubTask 1.2.3: 引入 `email-protection.ts` 脚本
  - [ ] SubTask 1.2.4: 视觉对比验证：与原 `about.html` 一致

- [ ] Task 1.3: 迁移 works.astro
  - [ ] SubTask 1.3.1: 创建 `src/pages/works.astro`，使用 BaseLayout + PageIntro
  - [ ] SubTask 1.3.2: 迁移 "持续维护" 状态面板
  - [ ] SubTask 1.3.3: 迁移 4 个作品卡片（指纹验证、网址收藏夹、蹭饭地图、按钮块设计器）
  - [ ] SubTask 1.3.4: 确保所有外部链接 `target="_blank" rel="noopener"`
  - [ ] SubTask 1.3.5: 视觉对比验证：与原 `Works.html` 一致

- [ ] Task 1.4: 迁移 404.astro
  - [ ] SubTask 1.4.1: 创建 `src/pages/404.astro`，使用 BaseLayout
  - [ ] SubTask 1.4.2: 迁移错误码 404 和 "页面未找到" 内容
  - [ ] SubTask 1.4.3: 迁移 "返回首页" 和 "返回上一页" 按钮
  - [ ] SubTask 1.4.4: 迁移管理员邮箱链接
  - [ ] SubTask 1.4.5: 视觉对比验证：与原 `404.html` 一致

- [ ] Task 1.5: 迁移 styleguide.astro
  - [ ] SubTask 1.5.1: 创建 `src/pages/styleguide.astro`，使用 BaseLayout
  - [ ] SubTask 1.5.2: 迁移色彩系统、排版系统、按钮、卡片、时间组件、链接、间距展示
  - [ ] SubTask 1.5.3: 视觉对比验证：与原 `styleguide.html` 一致

- [ ] Task 1.6: 拆分 js/main.js 脚本模块
  - [ ] SubTask 1.6.1: 创建 `src/scripts/time-display.ts`，从 main.js 提取 TimeDisplay 对象
  - [ ] SubTask 1.6.2: 创建 `src/scripts/page-animations.ts`，从 main.js 提取 PageAnimations 对象
  - [ ] SubTask 1.6.3: 创建 `src/scripts/email-protection.ts`，从 main.js 提取 EmailProtection 对象
  - [ ] SubTask 1.6.4: 在 `index.astro` 的 `<script>` 中引用 `time-display.ts` 和 `page-animations.ts`
  - [ ] SubTask 1.6.5: 在 `about.astro` 的 `<script>` 中引用 `email-protection.ts`

- [ ] Task 1.7: 完善 index.astro
  - [ ] SubTask 1.7.1: 确认 `time-display.ts` 在首页正常启动时间更新
  - [ ] SubTask 1.7.2: 确认 `page-animations.ts` 在首页正常执行动画
  - [ ] SubTask 1.7.3: 确认 "最近更新" 区域存在（内容留待 Phase 2 填充）
  - [ ] SubTask 1.7.4: 最终视觉对比验证：首页与原 `index.html` 完全一致

# Task Dependencies
- [Task 1.2 ~ 1.5] depend on [Task 1.1]
- [Task 1.6] has no dependency (独立模块提取)
- [Task 1.7] depends on [Task 1.6]
