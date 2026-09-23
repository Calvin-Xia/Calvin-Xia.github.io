# Lane 1 探查任务：站点外壳 / 路由 / 组件 / SEO / 样式

你在 Herdr 面板里运行，仓库 cwd = `C:\Users\Calvin-Xia\mr.xia.github.io`（Astro 静态站 + Cloudflare Worker，最近从根级 HTML/CSS/JS 迁移而来）。

## 硬性约束
- **只读**：除最终报告文件外，不得修改、新建、删除仓库内任何文件；不得 `git add/commit/push`；不得 `npm install/publish/deploy`；不得执行 `npm run build/publish/redirects`（会写盘）。允许只读命令：`git log/show/diff`、`ls`、`grep`。
- 报告写入（覆盖写）：`C:\Users\Calvin-Xia\mr.xia.github.io\tmp\project-explore\lane-1-shell.md`
- 报告：中文 Markdown，**必须带证据**（`相对路径:行号` + 关键代码片段或事实）。禁止泛泛而谈、禁止复述 README 空话。目标 200~400 行，详细到可被我直接当作事实来源使用。
- 完成后**只回复**：报告绝对路径 + 8 行以内要点摘要。

## 探查范围（这是你的地盘，逐项读完）
1. `astro.config.mjs`（整合项、sitemap、输出模式、本地 `/__cdn/*` 代理、vite 配置）
2. `src/pages/**` 全量路由清单：每个 `.astro`/`.ts` 页面 → 产出 URL 形态（含动态路由、归档、404、`robots.txt.ts`、`rss.xml.ts`、works/tools 相关页）
3. `src/layouts/**`（`BaseLayout.astro` 的 head 生成、字体 `@fontsource` 自托管、referrer meta、跳转/动画脚本装配）
4. `src/components/**` 15 个组件各自职责与互相依赖（重点 `GiscusComments.astro`、导航/头部/页脚/卡片类组件）
5. `src/i18n/**` 的机制与覆盖范围
6. `src/lib/site-seo.js`（`buildSocialMeta` 等）与站点级 SEO helper 被谁调用
7. `src/styles/global.css` 的结构：`:root` 变量体系、排版、响应式断点、组件级样式约定
8. 前端装配方式：`src/scripts/**` 中与外壳相关的模块（`page-animations`、`safe-init`、`navigation`类）如何被页面引入（`<script>` 内联 / `type=module` / `import` 路径）

## 必须回答的问题
- 站点共有哪些 URL 路由形态？导航结构（层级、跨栏目入口）是什么？
- SEO / OG 分享卡 / sitemap / RSS / robots 的**完整实现链路**与生成时机（构建期脚本 vs 运行时）？
- `AGENTS.md` 里 giscus 的两条硬约束（`data-astro-rerun` 必须保留；不得加 `transition:persist`）在代码中的具体位置与原因？
- 页面 ↔ 布局 ↔ 组件 的依赖图（谁引用谁，有无孤儿组件）？
- CSS 变量/设计 token 体系与响应式策略；有无与 `DESIGN.md` 冲突之处？
- 客户端脚本的加载策略（defer/module/inline、失败降级）？
- 发现的可疑点/技术债/死代码（带 file:line）。
