# Lane 2 探查任务：内容模型 / 文章渲染管线 / 内容合规

你在 Herdr 面板里运行，仓库 cwd = `C:\Users\Calvin-Xia\mr.xia.github.io`（Astro 静态站）。

## 硬性约束
- **只读**：除最终报告文件外，不得修改、新建、删除仓库内任何文件；不得 `git add/commit/push`；不得执行 `npm run build/publish`。允许只读命令与 `node -e` 做**不写盘**的统计（例如解析 frontmatter 统计，但不要生成文件）。
- 报告写入（覆盖写）：`C:\Users\Calvin-Xia\mr.xia.github.io\tmp\project-explore\lane-2-content.md`
- 报告：中文 Markdown，**必须带证据**（`相对路径:行号` + 关键片段/统计数字）。目标 200~400 行。
- 完成后**只回复**：报告绝对路径 + 8 行以内要点摘要。

## 探查范围
1. `src/content.config.ts`：四个 collection（blog/works/tools/updates）的 schema 全字段、类型、可选性与默认值
2. `src/content/blog/*.md`：逐篇列出 `category`、`tags`、日期、slug、字数（若易得）；给出**分布统计**（category 计数、tag 计数）
3. `src/content/works/*`、`src/content/tools/*`、`src/content/updates/*`：条目清单与结构差异
4. 内容渲染管线：`src/lib/rehype-scrollable-tables.js`、`src/lib/word-count.js`、`src/lib/archive.js`、`src/lib/article-enhancements/**`（每个子模块：灯箱、标题锚点、目录、阅读进度、逐段渐显）
5. 运行时增强脚本：`src/scripts/article-runtime.js`、`article-mermaid.js`（自托管 lazy import / 主题感知 / 源码回退）、`markdown-renderer.js` 及文章页引用它们的组件
6. 资源引用：`public/storage/**` 的目录形态与文章正文/`hero`/`imageDimensions` 的引用约定（抽 3~5 个实际例子）

## 必须回答的问题
- 一篇 md 从文件到最终页面经过哪些构建期（remark/rehype）与客户端处理步骤？顺序与关键参数？
- 图片：hero 选择、`imageDimensions` 回填、CDN 域名、灯箱、懒加载分别由谁负责？
- Mermaid、可滚动表格、目录、阅读进度、逐段渐显各自的触发条件与降级行为？
- 归档（`archive.js`）如何分组、排序、去重？
- **合规核查**（按 `AGENTS.md` 的 Blog Taxonomy 与 Blog Slugs 规则）：
  - `category` 是否恰好属于 {随笔, 总结, 日志}？
  - `tags` 是否 ⊆ {武汉大学, 高考, 旅行, 铁路, 人工智能, 故乡, 测绘, 自我, 劳动, 语言文化}，每篇 1~4 个，且不含自己的 category？
  - 每篇 tag 是否为独立数组项（无逗号塞词）？
  - slug 文件名是否 `^[A-Za-z0-9._-]+$` 且形如 `<YYYYMMDD>-<english-semantic-slug>`？
  逐条给出**违规清单（文件:行 + 实际值）**，没有违规则明确写"未发现违规"。
- 内容层发现的问题（孤立资源、字段无用、schema 与文档不符等），带 file:line。
