# Phase 6 Code Review Checklist

## 字数统计与阅读时间
- [ ] `src/lib/word-count.js` 导出 `computeReadingStats(body)` 函数
- [ ] 中文纯文本：字符数 = 非空白中文字符数（不含标点）
- [ ] 英文纯文本：单词数按空格/标点拆分统计
- [ ] 中英混合文本：中文字符 + 英文单词分别统计后合计
- [ ] `formatReadTime` 返回值："< 1 分钟" / "X 分钟" / "Xh Ym" 三种格式
- [ ] `formatWordCount` 返回值："约 X,XXX 字"（千位逗号）
- [ ] Markdown 语法（`#`、`**`、`[link]()`）在统计前被剔除
- [ ] HTML 标签（`<div>`、`&emsp;` 等）在统计前被剔除
- [ ] 图片链接（`![](url)`）和代码块被正确过滤
- [ ] 空内容返回 `{ characters: 0, wordCount: 0, readTimeMinutes: 0, display: "< 1 分钟" }`
- [ ] 文章列表卡片展示字数和阅读时间（在日期旁）
- [ ] 详情页 meta 区展示字数和阅读时间
- [ ] frontmatter 手动 `readTime` > 自动计算值（优先显示手动值）
- [ ] 手动 `readTime` 与自动计算值同时存在时，仅显示手动值
- [ ] 不修改已有 `readTime` frontmatter 文件的内容

## 归档页时间线
- [ ] `/articles/archive/` 页面可访问，返回 200
- [ ] 文章按年份分组，年份从新到旧排列
- [ ] 每组内文章按日期从新到旧排列
- [ ] 每条条目显示日期（MM-DD）、标题（可点击）、分类标签
- [ ] 标题链接指向 `/articles/{slug}/`
- [ ] 所有非草稿文章均出现，无遗漏
- [ ] 空年份不显示
- [ ] `/articles/` 页面有 "文章归档" 入口链接
- [ ] 归档入口在移动端可见且可点击
- [ ] 时间线在桌面端和移动端均完整显示、不溢出
- [ ] 时间线样式与站点整体设计风格一致

## SPA 增强过渡
- [ ] 列表 → 详情：有方向性过渡动画（非通用 fade）
- [ ] 详情 → 列表：有反向动画
- [ ] 列表页滚动位置在返回时恢复（无页面顶部跳动）
- [ ] 搜索/过滤状态在返回列表时保持（若通过 URL params 实现）
- [ ] 浏览器前进/后退按钮过渡正常
- [ ] `prefers-reduced-motion: reduce` 时动画关闭
- [ ] 不支持 View Transitions 的浏览器回退为 swap 或无动画
- [ ] 过渡时间 ≤ 250ms
- [ ] 现有功能（灯箱、标题锚点、TOC、评论区）在过渡后正常重新初始化

## 阅读量统计（条件实施）
- [ ] 若实施：CF Pages Function 正确读写 KV
- [ ] `GET /api/views/{slug}` 返回 `{ slug, views }` JSON
- [ ] `POST /api/views/{slug}` 递增计数并返回新值
- [ ] 前端仅展示数字，不对本地 KV 做多余请求
- [ ] 隐私合规：不记录 IP/UA/Referer
- [ ] 若降级为方案 D：Phase 6 文档明确标记阅读量统计推迟

## 自动化与构建
- [ ] `npm test` 通过（覆盖字数统计、归档数据、过渡逻辑）
- [ ] `npm run build` 通过且无新增警告/错误
- [ ] 桌面端和移动端浏览器验证均通过
- [ ] Phase 6 文档状态已更新
