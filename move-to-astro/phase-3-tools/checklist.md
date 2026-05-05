# Code Review Checklist

## 导航调整
- [x] Header 导航栏不包含"工具"项（仅首页、作品、文章、关于）
- [x] 移除后所有页面导航高亮正确
- [x] 首页快捷入口不再指向旧 `/tools/`，改为 `/works/tools/`

## 计时器
- [x] timer.ts 模块独立可加载，`Timer.init()` 正常工作
- [x] 计时器正向计时正确（每 100ms 更新显示）
- [x] 时/分/秒设置功能正确（+- 按钮、输入框、进位/借位）
- [x] 进度条在 targetTime > 0 时正常更新百分比
- [x] 开始/暂停/重置按钮状态切换正确

## 随机选择器
- [x] random-selector.ts 模块独立可加载
- [x] 选项添加（按钮 + Enter 键）和删除功能正常
- [x] 随机抽取功能正常（随机选一项并显示）
- [x] 清空选项功能正常（含 confirm）
- [x] .txt/.md 文件导入功能正常（文本分行填充）
- [x] .docx 文件导入功能正常（mammoth 解析后填充）
- [x] mammoth CDN 失败时自动回退到本地 public/libs/mammoth/
- [x] 不支持的格式显示错误提示

## 工具集区域（ToolsSection）
- [x] works.astro 页面在作品卡片下方显示"工具集"入口卡片
- [x] 工具集入口卡片链接到 `/works/tools/`
- [x] `/works/tools/` 页面显示完整"工具集"区域
- [x] 三个选项卡（在线计时器 / 随机选择器 / Markdown 渲染工具）切换正常
- [x] 切换选项卡计时器状态保持一致
- [x] 键盘 ArrowLeft/ArrowRight 切换选项卡

## Markdown 渲染工具
- [x] markdown-renderer.ts 模块使用 npm import（非 CDN 加载）
- [x] Markdown 输入后点击渲染，预览区正确显示
- [x] 代码块语法高亮（highlight.js）正常
- [x] 数学公式渲染（KaTeX 行内 $ 和块级 $$）正常
- [x] 图片自动添加 caption（从 alt 属性提取）
- [x] 折叠/展开预览功能正常（折叠显示摘要 + 渐变遮罩）
- [x] 导出 HTML 功能正常（下载独立 HTML 文件）
- [x] 复制 HTML 功能正常（clipboard API）
- [x] 加载示例功能正常
- [x] 清空功能正常
- [x] 快捷键：Ctrl+Enter 渲染、Ctrl+S 导出

## 格式化 HTML 输出
- [x] 格式化 HTML 按钮正常工作
- [x] 格式化后的 HTML 缩进正确（块级元素独占一行并缩进，内联元素保留在行内）
- [x] 格式化导出下载正常
- [x] 格式化复制到剪贴板正常

## 微信公众号格式
- [x] 微信公众号格式按钮正常工作
- [x] 微信格式预览区显示正确（内联样式生效）
- [x] 微信格式下复制功能正常（复制内联样式 HTML）
- [x] 微信格式 HTML 可直接粘贴到微信公众号编辑器
- [x] 普通模式和微信格式模式切换正常，不丢失输入内容
- [x] 微信格式样式规则正确：正文 15px/1.8 行高/#3f3f3f 色、标题加粗、代码块灰底、引用左边框、图片居中、表格细边框

## 样式与质量
- [x] 工具页专属样式不污染其他页面
- [x] MarkdownToolWidget 组件可在 `/works/tools/` 和独立页面两种场景复用
- [x] `npm run build` 零错误零警告
- [x] 旧 `timetable.html` 和 `markdown-to-html-tool.html` 未被修改
