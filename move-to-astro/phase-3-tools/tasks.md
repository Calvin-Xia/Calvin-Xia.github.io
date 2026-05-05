# Tasks

- [x] Task 3.0: 导航调整——移除"工具"导航项
  - [x] SubTask 3.0.1: 从 `src/components/Header.astro` 的 `navItems` 数组中删除"工具"条目
  - [x] SubTask 3.0.2: 验证移除后所有页面导航栏显示正确（首页、作品、文章、关于）
  - [x] SubTask 3.0.3: 将首页工具快捷入口从 `/tools/` 更新为 `/works/tools/`

- [x] Task 3.1: 提取 timer.ts 模块
  - [x] SubTask 3.1.1: 创建 `src/scripts/timer.ts`，从 `js/main.js` 提取 Timer 对象
  - [x] SubTask 3.1.2: 将 `Timer.init()` 改为接受可选 `elements` 参数（便于在不同 DOM 环境中使用）
  - [x] SubTask 3.1.3: 保留正向计时、目标时间设置、进度条更新、开始/暂停/重置逻辑
  - [x] SubTask 3.1.4: 保留 `changeTime()` 函数（时/分/秒进位/借位逻辑）

- [x] Task 3.2: 提取 random-selector.ts 模块
  - [x] SubTask 3.2.1: 创建 `src/scripts/random-selector.ts`，从 `timetable.html` 内联 IIFE 提取
  - [x] SubTask 3.2.2: 包含选项管理（add/delete/deleteAll/updateList）
  - [x] SubTask 3.2.3: 包含文件处理（handleFiles: .txt/.md → text, .docx → mammoth）
  - [x] SubTask 3.2.4: 包含 mammoth CDN+本地回退加载逻辑
  - [x] SubTask 3.2.5: 暴露 `window.RandomSelector` 全局对象（保持与原页面相同的 API 签名）

- [x] Task 3.3: 创建 TimerWidget 组件
  - [x] SubTask 3.3.1: 创建 `src/components/TimerWidget.astro`
  - [x] SubTask 3.3.2: 渲染计时器设置区域（时/分/秒输入 + 加减按钮 + 设置按钮）
  - [x] SubTask 3.3.3: 渲染时间显示 `#timer-display`（默认 00:00:00）
  - [x] SubTask 3.3.4: 渲染进度条（容器 + 进度 div + 百分比文本）
  - [x] SubTask 3.3.5: 渲染控制按钮（开始/暂停/重置）
  - [x] SubTask 3.3.6: 渲染使用说明和功能特点面板
  - [x] SubTask 3.3.7: 在组件底部 `<script>` 中 import `timer.ts` 并调用 `Timer.init()`

- [x] Task 3.4: 创建 RandomSelector 组件
  - [x] SubTask 3.4.1: 创建 `src/components/RandomSelector.astro`
  - [x] SubTask 3.4.2: 渲染输入区域（文本输入 + 添加/清空按钮）
  - [x] SubTask 3.4.3: 渲染选项列表 `#items` + 随机抽取按钮
  - [x] SubTask 3.4.4: 渲染结果展示 `#chosen`
  - [x] SubTask 3.4.5: 渲染文件上传区域（选择文件按钮 + 导入按钮 + 状态提示）
  - [x] SubTask 3.4.6: 在组件底部 `<script>` 中 import `random-selector.ts`

- [x] Task 3.5: 创建 ToolsSection 组件和 `/works/tools/` 子路由
  - [x] SubTask 3.5.1: 创建 `src/components/ToolsSection.astro`
  - [x] SubTask 3.5.2: 渲染区域标题"工具集"
  - [x] SubTask 3.5.3: 渲染三个选项卡按钮（在线计时器 / 随机选择器 / Markdown 渲染工具）
  - [x] SubTask 3.5.4: 嵌入 TimerWidget、RandomSelector、MarkdownToolWidget 组件
  - [x] SubTask 3.5.5: 实现客户端选项卡切换逻辑（`<script>` 内联）
  - [x] SubTask 3.5.6: 切换选项卡时确保计时器状态正确同步
  - [x] SubTask 3.5.7: 实现键盘导航（ArrowLeft/ArrowRight 切换选项卡）
  - [x] SubTask 3.5.8: 创建 `src/pages/works/tools.astro`，使用 BaseLayout + PageIntro + ToolsSection 渲染完整工具台
  - [x] SubTask 3.5.9: 在 `src/pages/works.astro` 的作品卡片列表下方添加"工具集"入口卡片，链接到 `/works/tools/`
  - [x] SubTask 3.5.10: 视觉和功能对比验证：与原 `timetable.html` + `markdown-to-html-tool.html` 一致

- [x] Task 3.6: 提取 markdown-renderer.ts 模块
  - [x] SubTask 3.6.1: 创建 `src/scripts/markdown-renderer.ts`，从 `markdown-to-html-tool.html` 内联脚本提取核心逻辑
  - [x] SubTask 3.6.2: 使用 `import { marked } from 'marked'` 替代 CDN 加载
  - [x] SubTask 3.6.3: 使用 `highlight.js` npm 包（core + 常用语言注册）替代 CDN 加载
  - [x] SubTask 3.6.4: 使用 `import katex from 'katex'` 和 `import renderMathInElement from 'katex/contrib/auto-render'` 替代 CDN 加载
  - [x] SubTask 3.6.5: 端口 render/showCollapsed/showExpanded/togglePreview/exportHTML/copyHTML/processImages 函数
  - [x] SubTask 3.6.6: 暴露 `window.MarkdownRenderer` 全局对象
  - [x] SubTask 3.6.7: 实现 `formatHTML()` 函数——对渲染后的 HTML 进行缩进美化
  - [x] SubTask 3.6.8: 实现 `exportFormattedHTML()` 函数——格式化后下载为 `.html` 文件
  - [x] SubTask 3.6.9: 实现 `renderWeChat()` 函数——将 Markdown 渲染为微信公众号兼容的内联样式 HTML
  - [x] SubTask 3.6.10: 实现 `copyWeChatHTML()` 函数——复制微信格式 HTML 到剪贴板
  - [x] SubTask 3.6.11: 实现 `toggleWeChatMode()` 函数——在普通模式和微信格式模式之间切换预览

- [x] Task 3.7: 创建 MarkdownToolWidget 组件
  - [x] SubTask 3.7.1: 创建 `src/components/MarkdownToolWidget.astro`
  - [x] SubTask 3.7.2: 将 `markdown-to-html-tool.html` 的内联 CSS 提取为组件 `<style>` 块
  - [x] SubTask 3.7.3: 渲染编辑器面板（Markdown 输入 textarea + 清空/加载示例按钮）
  - [x] SubTask 3.7.4: 渲染预览面板（HTML 预览 div + 折叠/展开按钮）
  - [x] SubTask 3.7.5: 渲染工具栏（渲染 / 格式化 HTML / 导出 HTML / 复制 HTML / 微信公众号格式按钮）
  - [x] SubTask 3.7.6: 渲染使用说明区域（功能特性、方法、语法说明、测试用例、快捷键）
  - [x] SubTask 3.7.7: 渲染 loading 指示器和页面过渡指示器
  - [x] SubTask 3.7.8: 在组件底部 `<script>` 中 import `markdown-renderer.ts` 并初始化
  - [x] SubTask 3.7.9: 格式化 HTML 按钮绑定 `exportFormattedHTML()` / 复制格式化 HTML
  - [x] SubTask 3.7.10: 微信公众号格式按钮绑定 `toggleWeChatMode()`，切换时预览区即时更新
  - [x] SubTask 3.7.11: 在微信格式模式下复制按钮切换为复制微信格式 HTML

- [x] Task 3.8: 创建 markdown-tool.astro 独立页面
  - [x] SubTask 3.8.1: 创建 `src/pages/markdown-tool.astro`，使用 BaseLayout + PageIntro
  - [x] SubTask 3.8.2: 复用 MarkdownToolWidget 的样式和脚本逻辑
  - [x] SubTask 3.8.3: 实现独立页面版的完整功能（与嵌入版一致）
  - [x] SubTask 3.8.4: 视觉和功能对比验证：与原 `markdown-to-html-tool.html` 一致

- [x] Task 3.9: 处理 mammoth 保留
  - [x] SubTask 3.9.1: 确认 `libs/mammoth/mammoth.browser.min.js` 保留在 `public/libs/mammoth/` 路径
  - [x] SubTask 3.9.2: 随机选择器使用相同 CDN+fallback 策略（cdnjs → `public/libs/mammoth/mammoth.browser.min.js`）

# Task Dependencies
- [Task 3.3] depends on [Task 3.1]
- [Task 3.4] depends on [Task 3.2]
- [Task 3.7] depends on [Task 3.6]
- [Task 3.5] depends on [Task 3.3, Task 3.4, Task 3.7]
- [Task 3.8] depends on [Task 3.7]
- [Task 3.9] depends on [Task 3.4]
- [Task 3.0] can be done independently at any time
