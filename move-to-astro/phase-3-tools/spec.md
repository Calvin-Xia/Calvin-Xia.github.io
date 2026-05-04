# Phase 3：工具页迁移 Spec

## Why
当前两个工具页包含密集的客户端交互逻辑（计时器、随机选择器、Word 文档导入、Markdown 即时渲染、导出 HTML 等）。这些页面需要精细的拆分策略：HTML 结构迁入 Astro 组件，交互逻辑提取为独立 TypeScript 模块，通过 Astro 的 `<script>` 标签加载。

**入口调整**：工具不再作为顶部导航的独立一级入口，改为下沉到"作品"页面内部，以"工具集"区域呈现，与现有作品卡片并列。

## What Changes
- 迁移 `timetable.html` → 工具集区域（计时器 + 随机选择器两选项卡），嵌入 `works.astro`
- 迁移 `markdown-to-html-tool.html` → `markdown-tool.astro`（Markdown 即时渲染工具）
- 将 Markdown 渲染工具作为工具集区域的第三个选项卡接入
- 创建 `TimerWidget.astro` 和 `RandomSelector.astro` 组件（纯 HTML 结构）
- 创建 `MarkdownToolWidget.astro` 组件（编辑器 + 预览面板 + 工具栏）
- 提取 `src/scripts/timer.ts`（从 `main.js` Timer 模块）
- 提取 `src/scripts/random-selector.ts`（从 `timetable.html` 内联脚本）
- 提取 `src/scripts/markdown-renderer.ts`（从 `markdown-to-html-tool.html` 内联脚本核心逻辑）
- 将 markdown-to-html-tool 的内联 CSS 拆为组件内 `<style>` 块
- 将 marked + highlight.js + KaTeX 的加载改为 npm import
- 新增"格式化 HTML 输出"功能：对渲染后的 HTML 进行缩进美化后导出/复制
- 新增"微信公众号格式"渲染模式：将 Markdown 渲染为带内联样式的 HTML，兼容微信编辑器粘贴
- mammoth 保持 CDN + 本地回退策略，保留 `public/libs/mammoth/` 本地副本
- 从 `Header.astro` 的 `navItems` 中移除"工具"项

## Impact
- New files: `src/pages/markdown-tool.astro`, `src/components/TimerWidget.astro`, `src/components/RandomSelector.astro`, `src/components/MarkdownToolWidget.astro`, `src/components/ToolsSection.astro`, `src/scripts/timer.ts`, `src/scripts/random-selector.ts`, `src/scripts/markdown-renderer.ts`
- Modified files: `src/pages/works.astro`（嵌入 ToolsSection 组件）, `src/components/Header.astro`（移除"工具"导航项）, `src/styles/global.css`（可为工具页添加微小样式调整）
- Retained files: `public/libs/mammoth/mammoth.browser.min.js`（从 `libs/mammoth/` 移动或保持）
- 删除的文件：`src/pages/tools.astro` 不再需要（工具入口直接在 works.astro 内）
- 不影响旧 HTML 文件

## ADDED Requirements

### Requirement: 导航调整——工具入口下沉至作品栏
"工具" SHALL NOT 出现在顶部导航栏中，工具入口 SHALL 作为 works.astro 页面内的一个区域呈现。

#### Scenario: 顶部导航
- **WHEN** 用户访问任意页面
- **THEN** Header 导航项为：首页、作品、文章、关于（不含"工具"）

#### Scenario: 作品页内工具入口
- **WHEN** 用户访问 `/works/`
- **THEN** 在作品卡片列表下方显示"工具集"区域，包含工具选项卡

### Requirement: ToolsSection 组件（作品页内工具区域）
`ToolsSection.astro` SHALL 在作品页内渲染工具集区域，包含三个选项卡：在线计时器、随机选择器、Markdown 渲染工具。

#### Scenario: 区域结构
- **WHEN** ToolsSection 渲染
- **THEN** 显示区域标题"工具集"、三个选项卡按钮、对应工具面板

#### Scenario: 选项卡切换
- **WHEN** 点击某个选项卡按钮
- **THEN** 对应工具面板显示，其余隐藏，active 状态正确切换

#### Scenario: 键盘导航
- **WHEN** 用户在选项卡按钮上按 ArrowLeft / ArrowRight
- **THEN** 焦点移动到相邻选项卡并激活

### Requirement: TimerWidget 组件
`TimerWidget.astro` SHALL 渲染计时器的完整 HTML 结构。

#### Scenario: 结构完整性
- **WHEN** TimerWidget 渲染
- **THEN** 包含时间设置区域（小时/分钟/秒输入及 +/- 按钮）、时间显示、进度条、开始/暂停/重置按钮、使用说明

#### Scenario: 时间输入验证
- **WHEN** 输入小时 > 99 或分钟/秒 > 59
- **THEN** 值被限制在有效范围内

#### Scenario: 计时器功能完整
- **WHEN** 设置时分秒并开始计时
- **THEN** 计时显示更新、进度条更新、暂停/重置按钮状态正确

### Requirement: RandomSelector 组件
`RandomSelector.astro` SHALL 渲染随机选择器的完整 HTML 结构。

#### Scenario: 添加选项
- **WHEN** 输入文本并点击添加 / 按 Enter
- **THEN** 选项添加到列表，输入框清空，选项文本 HTML 转义

#### Scenario: 随机抽取
- **WHEN** 列表有选项时点击随机抽取
- **THEN** 显示 "抽中：xxx" 结果

#### Scenario: 文件导入
- **WHEN** 选择 .txt/.md 文件并导入
- **THEN** 文件内容被读取为选项行，自动填充列表

#### Scenario: Word 文档导入
- **WHEN** 选择 .docx 文件并导入
- **THEN** mammoth 解析文档文本，自动填充列表；mammoth 加载失败时显示 alert

#### Scenario: mammoth 回退
- **WHEN** CDN 加载 mammoth 失败
- **THEN** 自动切换到本地 `public/libs/mammoth/mammoth.browser.min.js`

### Requirement: MarkdownToolWidget 组件（作品页内嵌版）
`MarkdownToolWidget.astro` SHALL 渲染 Markdown 编辑器和预览面板的完整 HTML 结构，作为 ToolsSection 的第三个选项卡。

#### Scenario: 编辑器面板
- **WHEN** MarkdownToolWidget 渲染
- **THEN** 显示 Markdown 输入 textarea + 加载示例按钮 + 清空按钮

#### Scenario: 预览面板
- **WHEN** MarkdownToolWidget 渲染
- **THEN** 显示 HTML 预览 div + 折叠/展开按钮

#### Scenario: 工具栏
- **WHEN** MarkdownToolWidget 渲染
- **THEN** 显示渲染、格式化 HTML、导出 HTML、复制 HTML、微信公众号格式按钮

### Requirement: markdown-tool.astro 页面（独立页面版）
`markdown-tool.astro` SHALL 提供独立的 Markdown 编辑和实时预览工具，与 ToolsSection 中的嵌入版共享同一脚本。

#### Scenario: Markdown 渲染
- **WHEN** 在左栏输入 Markdown，点击渲染
- **THEN** 右栏显示渲染后的 HTML，含代码高亮和数学公式

#### Scenario: 折叠/展开
- **WHEN** 点击折叠按钮
- **THEN** 预览区切换为摘要视图，再次点击恢复完整视图

#### Scenario: 导出 HTML
- **WHEN** 点击导出 HTML
- **THEN** 下载包含自包含样式和脚本的独立 HTML 文件

#### Scenario: 复制 HTML
- **WHEN** 点击复制 HTML
- **THEN** 渲染后的 HTML 复制到剪贴板，显示成功提示

#### Scenario: 快捷键
- **WHEN** 在编辑器内按 Ctrl+Enter
- **THEN** 执行渲染；Ctrl+S 导出；Ctrl+C（非编辑器焦点）复制

### Requirement: timer.ts 模块
`src/scripts/timer.ts` SHALL 包含计时器纯逻辑，与原 `main.js` Timer 对象行为一致。

#### Scenario: 正向计时
- **WHEN** start() 被调用
- **THEN** 每 100ms 更新显示，`elapsedTime` 递增

#### Scenario: 设置目标时间
- **WHEN** setTimeFromInputs() 被调用
- **THEN** 从 DOM 读取时/分/秒，设置 `targetTime`，重置 `elapsedTime`

#### Scenario: 进度条更新
- **WHEN** targetTime > 0
- **THEN** 进度条宽度 = (elapsed / target × 100)%

### Requirement: random-selector.ts 模块
`src/scripts/random-selector.ts` SHALL 包含随机选择器核心逻辑，与原 `timetable.html` 内联脚本行为一致。

#### Scenario: 选项管理
- **WHEN** addItem / deleteItem / deleteAll 调用
- **THEN** 列表数据正确更新，DOM 同步渲染

#### Scenario: 文件处理
- **WHEN** handleFiles 被调用
- **THEN** 根据文件后缀（.txt/.md → text(), .docx → mammoth）解析并填充

### Requirement: markdown-renderer.ts 模块
`src/scripts/markdown-renderer.ts` SHALL 封装 Markdown 渲染管道，使用 npm 安装的 marked、highlight.js、KaTeX。同时包含格式化 HTML 输出和微信公众号格式渲染能力。

#### Scenario: 渲染管道
- **WHEN** render() 被调用
- **THEN** marked.parse() → renderMathInElement() → hljs.highlightElement() → processImages() 按序执行

#### Scenario: 构建时依赖
- **WHEN** 模块被 import
- **THEN** marked、hljs、katex 从 npm 包导入，无需 CDN 加载

### Requirement: 格式化 HTML 输出
`markdown-renderer.ts` SHALL 提供格式化 HTML 输出功能，将渲染后的 HTML 美化为人类可读的缩进格式。

#### Scenario: 格式化导出
- **WHEN** 用户点击"格式化 HTML"按钮
- **THEN** 对渲染后的 HTML 进行缩进美化（保留标签层级、自动换行），然后下载为 `.html` 文件

#### Scenario: 格式化复制
- **WHEN** 用户点击"复制格式化 HTML"或通过格式化模式执行复制
- **THEN** 格式化后的 HTML 字符串复制到剪贴板，显示成功提示

#### Scenario: 格式化规则
- **WHEN** 执行格式化
- **THEN** 块级元素（div、p、h1-h6、ul、ol、li、table、blockquote、pre 等）独占一行并正确缩进；内联元素（span、a、strong、em、code 等）保留在行内不拆行；空行合理控制

### Requirement: 微信公众号格式渲染
`markdown-renderer.ts` SHALL 提供微信公众号兼容的渲染模式，输出带内联样式的 HTML，可直接粘贴到微信公众号编辑器。

#### Scenario: 微信格式渲染
- **WHEN** 用户点击"微信公众号格式"按钮
- **THEN** Markdown 渲染为全内联样式 HTML（无 class、无外部 CSS 依赖），预览区显示微信风格效果

#### Scenario: 微信格式复制
- **WHEN** 用户在微信格式模式下点击"复制"
- **THEN** 带内联样式的 HTML 片段复制到剪贴板，可直接粘贴到微信编辑器

#### Scenario: 微信格式样式规则
- **WHEN** 执行微信格式渲染
- **THEN** 正文使用 `font-size: 15px; line-height: 1.8; color: #3f3f3f; letter-spacing: 0.5px`；标题使用加粗 + 适当字号；代码块使用灰底圆角背景；引用使用左边框 + 灰底；图片居中、最大宽度 100%；表格使用细边框；所有颜色、间距、字体通过 `style` 属性内联

#### Scenario: 微信格式切换
- **WHEN** 用户在普通模式和微信格式模式之间切换
- **THEN** 预览区即时更新为对应格式，不丢失输入内容

### Requirement: 工具页样式独立
Markdown 工具的内联 CSS SHALL 保留在组件内，不污染 global.css。

#### Scenario: 样式隔离
- **WHEN** markdown-tool 页面或 ToolsSection 渲染
- **THEN** 工具专属样式（编辑器布局、面板样式、loading 指示器等）仅在工具页/区域生效
