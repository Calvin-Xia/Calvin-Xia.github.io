# Lane 3 探查任务：Worker 运行时 / API / 数据 / 部署拓扑

你在 Herdr 面板里运行，仓库 cwd = `C:\Users\Calvin-Xia\mr.xia.github.io`（Astro 静态站 + Cloudflare Worker）。

## 硬性约束
- **只读**：除最终报告文件外，不得修改、新建、删除仓库内任何文件；不得 `git add/commit/push`；不得 `wrangler deploy`、不得 `npm run build`、不得 `wrangler secret put`。允许：读代码/配置、`git log`、`ls`、`grep`。**不要**读取或输出任何真实密码/token 值（`.dev.vars` 只说明存在哪些键，不要打印值）。
- 报告写入（覆盖写）：`C:\Users\Calvin-Xia\mr.xia.github.io\tmp\project-explore\lane-3-runtime.md`
- 报告：中文 Markdown，**必须带证据**（`相对路径:行号` + 关键片段）。目标 200~400 行。
- 完成后**只回复**：报告绝对路径 + 8 行以内要点摘要。

## 探查范围
1. `src/worker.ts`：完整路由表（method + path pattern + 返回结构 + 状态码）、错误处理、CORS/CSP/安全头、ASSETS 回退逻辑
2. `src/lib/umami-view-counter.js` 与 `src/lib/umami-trending.js`：调用 Umami 的流程、鉴权（登录/token 缓存）、KV/缓存策略、失败降级、数据形状
3. `wrangler.jsonc`：worker 入口、`ASSETS` 绑定、vars（哪些是 public var）、兼容性日期/flag、路由与域名
4. `.dev.vars.example`（只列键名）与密钥边界：哪些必须由 `wrangler secret put` 注入，本地如何跑
5. 前端与后端的网络契约：文章页浏览量组件、首页热门卡片、`src/scripts/**` 中的 `cdn-proxy`/view-counter/`safe-init` 等，如何请求这些 API（含失败/离线降级）
6. `astro.config.mjs` 中的本地 CDN 代理 `/__cdn/content`、`/__cdn/assets` 与 `Referer` 约定；`public/.well-known/**`、`public/libs/mammoth/**` 的用途
7. 部署拓扑：`dist/` 产物契约、Cloudflare Workers(ASSETS) 与 GitHub Pages 镜像的关系、`npm run build` 的后处理步骤（OG 图、legacy 跳转页）

## 必须回答的问题
- 后端一共有哪些 API endpoint？各自鉴权方式、读写的数据源、缓存/限流、失败时的响应？
- 浏览量是如何统计、聚合、展示的（含点赞/去重/防刷若有）？趋势榜排序算法与时间窗？
- 哪些信息是公开 var、哪些必须是 secret？有无密钥泄露风险点（如把 secret 写进客户端脚本）？
- 页面在 API 不可用时的降级路径是什么？有没有硬依赖（会导致白屏/报错）？
- 部署与回滚链路：从 `npm run build` 到线上生效的步骤、GH Pages 镜像与主站的差异？
- 发现的可疑点/技术债（重复逻辑、无超时、无错误边界等），带 file:line。
