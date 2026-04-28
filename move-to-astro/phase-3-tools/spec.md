# Phase 3：工具页迁移 Spec

## Why
当前两个工具页包含密集的客户端交互逻辑（计时器、随机选择器、Word 文档导入、Markdown 即时渲染、导出 HTML 等）。这些页面需要精细的拆分策略：HTML 结构迁入 Astro 组件，交互逻辑提取为独立 TypeScript 模块，通过 Astro 的 `<script>` 标签加载。

## What Changes
- 迁移 `timetable.html` → `tools.astro`（计时器 + 随机选择器两选项卡）
- 迁移 `markdown-to-html-tool.html` → `markdown-tool.astro`（Markdown 即时渲染工具）
- 创建 `TimerWidget.astro` 和 `RandomSelector.astro` 组件（纯 HTML 结构）
- 提取 `src/scripts/timer.ts`（从 `main.js` Timer 模块）
- 提取 `src/scripts/random-selector.ts`（从 `timetable.html` 内联脚本）
- 提取 `src/scripts/markdown-renderer.ts`（从 `markdown-to-html-tool.html` 内联脚本核心逻辑）
- 将 markdown-to-html-tool 的内联 CSS 拆为组件内 `<style>` 块
- 将 marked + highlight.js + KaTeX 的加载改为 npm import
- mammoth 保持 CDN + 本地回退策略，保留 `public/libs/mammoth/` 本地副本

## Impact
- New files: `src/pages/tools.astro`, `src/pages/markdown-tool.astro`, `src/components/TimerWidget.astro`, `src/components/RandomSelector.astro`, `src/scripts/timer.ts`, `src/scripts/random-selector.ts`, `src/scripts/markdown-renderer.ts`
- Retained files: `public/libs/mammoth/mammoth.browser.min.js`（从 `libs/mammoth/` 移动或保持）
- Modified files: `src/styles/global.css`（可为工具页添加微小样式调整）
- 不影响旧 HTML 文件

## ADDED Requirements

### Requirement: tools.astro 页面
`tools.astro` SHALL 包含计时器和随机选择器两个选项卡，功能与原 `timetable.html` 完全一致。

#### Scenario: 页面结构
- **WHEN** 访问 `/tools/`
- **THEN** 显示 PageIntro（kicker: "效率工具"，title: "工具集"）和两个选项卡按钮

#### Scenario: 选项卡切换
- **WHEN** 点击 "随机选择器" 选项卡
- **THEN** 计时器面板隐藏，随机选择器面板显示，active 状态正确切换

#### Scenario: 计时器功能完整
- **WHEN** 设置时分秒并开始计时
- **THEN** 计时显示更新、进度条更新、暂停/重置按钮状态正确

### Requirement: TimerWidget 组件
`TimerWidget.astro` SHALL 渲染计时器的完整 HTML 结构。

#### Scenario: 结构完整性
- **WHEN** TimerWidget 渲染
- **THEN** 包含时间设置区域（小时/分钟/秒输入及 +/- 按钮）、时间显示、进度条、开始/暂停/重置按钮、使用说明

#### Scenario: 时间输入验证
- **WHEN** 输入小时 > 99 或分钟/秒 > 59
- **THEN** 值被限制在有效范围内

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

### Requirement: markdown-tool.astro 页面
`markdown-tool.astro` SHALL 提供独立的 Markdown 编辑和实时预览工具。

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

### Requirement: markdown-renderer.ts 模块
`src/scripts/markdown-renderer.ts` SHALL 封装 Markdown 渲染管道，使用 npm 安装的 marked、highlight.js、KaTeX。

#### Scenario: 渲染管道
- **WHEN** render() 被调用
- **THEN** marked.parse() → renderMathInElement() → hljs.highlightElement() → processImages() 按序执行

#### Scenario: 构建时依赖
- **WHEN** 模块被 import
- **THEN** marked、hljs、katex 从 npm 包导入，无需 CDN 加载

### Requirement: 工具页样式独立
markdown-tool 的内联 CSS SHALL 保留在组件内，不污染 global.css。

#### Scenario: 样式隔离
- **WHEN** markdown-tool 页面渲染
- **THEN** 工具专属样式（编辑器布局、面板样式、loading 指示器等）仅在工具页生效
