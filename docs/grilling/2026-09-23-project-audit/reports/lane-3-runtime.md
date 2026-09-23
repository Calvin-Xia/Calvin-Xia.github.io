# Lane 3 探查报告：Worker 运行时 / API / 数据 / 部署拓扑

> 只读探查。除本文件外未修改仓库任何内容（`git status` 干净；本文件位于被 gitignore 的 `tmp/`）。
> 事实来源：源码 + 配置 + 本地产物 + `git log`。所有结论后附 `相对路径:行号` 证据。未读取/输出任何真实凭证值（`.dev.vars` 只提取键名）。

## 0. 结论速览

| 项 | 事实 |
|---|---|
| Worker 入口 | `src/worker.ts`（152 行），wrangler 4.108.0 |
| Worker 路径 | 只有 `/api/health`、`/api/trending`、`/api/views/<slug>` 三类，其余全走 ASSETS |
| 生产数据源 | 自部署 Umami（`umami.calvin-xia.cn`）；**无 KV / D1 / R2 / Vectorize / cron / queue 绑定** |
| 公开 vars | `UMAMI_HOST`、`UMAMI_WEBSITE_ID`（`wrangler.jsonc:12-15`） |
| 必须 secret | `UMAMI_USERNAME`、`UMAMI_PASSWORD`、`HEALTH_CHECK_TOKEN` |
| 服务端缓存 | 仅 trending 用 Cache API（600s）；views 只发 `Cache-Control: max-age=300`（浏览器级） |
| 限流/防刷 | **完全没有**；浏览量去重依赖 Umami 官方脚本自身逻辑 |
| 部署 | 生产 = 人工 `npm run build` + `npx wrangler deploy`；镜像 = `deploy.yml` 自动发 GitHub Pages |
| 硬依赖 | 页面渲染对 API **零硬依赖**（热门卡默认 `hidden`、浏览量是纯文本 span） |

---

## 1. 运行时拓扑

```
浏览器 ──GET /api/* ──▶ Worker(src/worker.ts)  ──login+metrics──▶ umami.calvin-xia.cn
        └─其它路径────▶ Workers Static Assets(dist/, _headers 生效)
                            └─ 404 → dist/404.html
GH Pages 镜像(calvin-xia.github.io) ──/api/* → GH Pages 404 页面(无 Worker)
```

- `wrangler.jsonc:6-11`：`assets.directory=./dist`、`binding=ASSETS`、`not_found_handling=404-page`、`run_worker_first=["/api/*"]`。
  → **非 `/api/*` 路径根本不进 Worker**，由静态资产引擎直接服务（性能上是好事）。
- `wrangler.jsonc:5`：`compatibility_date=2026-04-28`，**无 `compatibility_flags`**。
- `wrangler.jsonc` **没有 `routes` / `workers_dev`**：自定义域 `calvin-xia.cn` 在 Cloudflare 控制台绑定（`site-maintenance-guide.md:381` 明示）。
- `wrangler.jsonc:16-30`：observability 全开（logs/traces，`head_sampling_rate: 1`，`persist: true`）→ 日志与 trace 100% 落盘，长期有成本/噪声风险（见 P2-9）。

## 2. Worker 路由表（完整）

分派代码（`src/worker.ts:136-152`）：

```ts
if (url.pathname === '/api/health')            response = await handleHealthRequest(request, env);
else if (url.pathname === '/api/trending')     response = await handleTrendingRequest(request, env);
else                                           response = await handleViewCounterRequest(request, env); // catch-all
logSecurityRequest(request, url, response);
```

| # | Method | Path | 鉴权 | 数据源 | 成功响应 | 缓存头 | 失败响应 |
|---|---|---|---|---|---|---|---|
| 1 | 任意（无 method 校验） | `/api/health` | 无 token → 公开态；带 Bearer 且**不匹配** → 401 | `checkHealth()` → Umami 登录探针 | 200 `{status,timestamp}`；带正确 Bearer → 200 `{status,version,timestamp,dependencies.analytics.status}` | `?cache=N`（整数>0）→ `public, max-age=N`，否则 `no-store` | 401 `{error:'unauthorized'}`；内部异常 → 503 `{status:'unhealthy',timestamp}`（`worker.ts:74-94`） |
| 2 | 任意 | `/api/trending?limit=N` | **无** | Umami metrics（近 30 天，`type=url`） | 200 `{trending:[{slug,views}]}` | `public, max-age=600` | 200 `{trending:[]}` + `no-store`（失败即降级，永不 5xx，`umami-trending.js:101-109`） |
| 3 | 任意 | `/api/views/<slug>` | **无** | Umami metrics（`startAt=0` 全时段，`url=/articles/<slug>/`） | 200 `{slug,views:number}` | `public, max-age=300` | 400 `{error:'invalid slug'}`（含 `..`、`/`、`\`）；上游异常 → 200 `{slug,views:null}`（`umami-view-counter.js:140-152`） |
| 4 | 任意 | `/api/**` 其它 | — | ASSETS | 透传资产响应 | 资产自身 | `/api/foo` → Worker → `env.ASSETS.fetch()` → 404 页（`umami-view-counter.js:134-138`） |
| 5 | — | 其它任何路径 | — | 不进 Worker | 静态资产 | `public/_headers` | `dist/404.html` |

要点与观察：

- **无 CORS 头**：三类响应都不带 `Access-Control-Allow-*`（`worker.ts:39-47` 只设 `Content-Type`；`umami-*.js` 只设 `Content-Type`+`Cache-Control`）→ 其它站点无法读取（同源策略拦住读），但**可以发起跨站 GET**（无需预检的简单请求），无副作用所以影响有限。
- **无 method 校验**：`POST /api/health`、`DELETE /api/views/x` 都会正常执行（只有 pathname 判断）。
- **无 OPTIONS/CORS 预检支持**：与上一条一致，跨域读写不可能（预期行为，非 bug）。
- **安全头全部在 `public/_headers`**（CSP / X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy，`public/_headers:1-6`），Worker 不重复设置；`dist/_headers` 与 `public/_headers` 字节一致（`diff` 无差异）。
- ASSETS 回退只出现在 view-counter 模块里（`umami-view-counter.js:134-138`），语义上属"路由兜底"，放在业务模块内是抽象错位（P2-4）。
- `worker.ts` 顶层 `fetch` **无 try/catch**（`worker.ts:137-151`）：`new URL()`/logger 抛错会变成平台 500，而不是 JSON 错误体。
- 请求日志只覆盖 `/api/*`（`worker.ts:113-116`），且记录的是路径、状态、方法，不含 query 与 header → 不会泄露 token。

## 3. 密钥 / var 边界

| 名称 | 类型 | 位置 | 用途 / 风险 |
|---|---|---|---|
| `UMAMI_HOST` | **public var** | `wrangler.jsonc:13` = `https://umami.calvin-xia.cn` | 上游地址；公开无害 |
| `UMAMI_WEBSITE_ID` | **public var** | `wrangler.jsonc:14` = `48c8309d-…-cc5b127950a8` | 同时**硬编码在页面里**：`src/layouts/BaseLayout.astro:82` `data-website-id` —— 两者一致，且 website-id 本就是客户端可见值，非泄露 |
| `UMAMI_USERNAME` / `UMAMI_PASSWORD` | **secret** | `wrangler secret put`（`README.md:93-95`） | 只在 Worker 内使用（`umami-view-counter.js:51-54`），客户端 grep 无命中 ✅ |
| `HEALTH_CHECK_TOKEN` | **secret** | 同上 | `worker.ts:74` 比较；未配置时"带 Bearer"必然 401（除非 Bearer 为空） |
| `WORKER_VERSION` | **声明了但从未配置** | `worker.ts:12,79`；`wrangler.jsonc` 无该 var；全仓 grep 仅命中这两处 | `/api/health` 详细响应永远 `version:"0.0.1"`（P2-2） |
| `NEW_POST_SECRET` / `R2_*` / `OKP_VAULT` | 本地 `.env` | `.env.example`（键：BASE_URL、OKP_VAULT、R2_ENDPOINT、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET、R2_PUBLIC_URL、NEW_POST_SECRET、NEW_POST_ALLOWED_ORIGINS） | 只被 node 脚本/本地 API 使用，不进 Worker |

本地运行：

- `.dev.vars.example:5-7` 只有三个键：`UMAMI_USERNAME`、`UMAMI_PASSWORD`、`HEALTH_CHECK_TOKEN`（键名照抄，无值）。
- `.gitignore:38-41` 忽略 `.env*` 与 `.dev.vars*`，但保留两个 `.example`；`git ls-files` 确认真实 `.dev.vars`/`.env` 未被跟踪 ✅。
- ⚠️ **本机 `.dev.vars` 实际键集合与模板漂移**：存在 `UMAMI_API_KEY`，缺少 `UMAMI_USERNAME` / `UMAMI_PASSWORD`；而代码只读后两者（`umami-view-counter.js:48-63`），`UMAMI_API_KEY` 全仓无引用 → 本地 `npx wrangler dev` 下 `/api/views/*` 必然是 `views:null`、`/api/health` 必然 `degraded/not_configured`（P1-1）。
- 本地 CDN 调试另见第 7 节。

## 4. Umami 集成流程（鉴权 / 缓存 / 降级 / 数据形状）

### 4.1 登录与 token 缓存（`src/lib/umami-view-counter.js`）

```js
export function getUmamiConfig(env)      // :48-63  host 去尾斜杠；四字段齐全才 configured
export function requestUmamiToken(...)   // :69-93
```

- `:70-72` 命中模块级 `let cachedToken`（`:3`）就直接返回 → **token 缓存是 isolate 级、无 TTL、无 single-flight**；isolate 回收后首个请求重新登录。
- `:75-79` `POST {host}/api/auth/login`，body 为 `{username,password}`（来自 secret）；`:82` 非 2xx 抛错；`:88` 响应无 `token` 抛错。
- `:106-114` 查询时若首次 401/403 → `continue` 一轮，第二次用 `forceRefresh:true` 重新登录（自愈路径正确）。
- 并发场景下两个请求同时看到 `cachedToken === null` 会各登录一次（无 mutex）→ 冷启动时对 Umami 有登录脉冲。

### 4.2 单篇浏览量（`:95-128`）

```
GET {host}/api/websites/{websiteId}/metrics?type=url&startAt=0&endAt={Date.now()}&url={encodeURIComponent('/articles/<slug>/')}
Authorization: Bearer <token>
```

- `:41-46` `normalizeArticlePath()` 强制 `/articles/<slug>/` 尾斜杠——必须与 Umami 记录的 pathname 一致。
- `:120-124` 取返回数组首行 `row.y`；非有限值或负数归一为 0。
- `startAt=0` → **全时段累计**，不做时间窗。
- 降级链：未配置 → `null`；上游异常 → 捕获后 `{slug,views:null}` + 200（`:146-152`）。

### 4.3 趋势榜（`src/lib/umami-trending.js`）

- 时间窗：`rangeDays = 30`，`startAt = now - 30*86400000`（`:29-33`）。
- 上游 limit：`limit=${Math.max(50, limit*4)}`（`:33`）→ 客户端 limit 5 时实际取 50 行。
- 默认 `limit=5`，上限 20，非法值回落 5（`:8-18`）。
- 过滤/排序/截断（`:49-66`）：
  1. `decodeURIComponent(row.x)`（中文旧路径还原，`:53-57`）；
  2. 正则 `/^\/articles\/(\d{8}[^/]*)\/?$/`（`:7`）只保留文章路径，**丢弃首页/工作页/绝对 URL**；
  3. `Number.isFinite(views) && views > 0`（0 阅读不上榜）；
  4. 按 `views` 降序 `sort` + `slice(0, limit)`。
- 缓存（`:72-100`）：Cache API 键 `new Request(new URL('/api/trending?limit=N', url.origin))`；命中直接返回缓存的 Response（含 `Cache-Control: public, max-age=600`）；**只有 `trending.length > 0` 才 `put`**（`:96-98`）→ 空结果/上游故障**不缓存**，每次都打上游（P1-4）。
- 客户端二次过滤：首页把 slug 与本地 `titleMap` 求交（`src/pages/index.astro:137` `filter((entry) => titleMap[entry.slug])`）→ 旧 slug（已改名文章在 Umami 里的历史路径）自动被丢弃，不会渲染死链。

### 4.4 健康检查（`src/lib/health-check.js:1-41`）

- 探针 = 复用 `requestUmamiToken()`（即"能不能登录 Umami"），**不检查 metrics 可用性**，也**不探测静态资产**。
- 未配置 → `degraded` + `dependencies.analytics.status='not_configured'`（`:7-15`）；登录抛错 → `degraded` + `unreachable`（`:29-40`）；HTTP 仍 200（`worker.ts:85,88`）。
- 只有 `checkHealth` 自身抛异常才会走到 `worker.ts:89-93` 的 503 —— 但 `checkHealth` 内部已 try/catch，**503 实际几乎不可达**（P2-3）。

## 5. 缓存 / 限流矩阵

| Endpoint | 服务端（Cache API） | 响应头缓存 | 限流 | 备注 |
|---|---|---|---|---|
| `/api/health` | ✗ | `no-store` 或 `?cache=N` 自定义 | ✗ | `N` 无上限（`worker.ts:49-58`），可被要 `cache=31536000` |
| `/api/trending` | ✓ 600s（仅非空结果） | `public, max-age=600` | ✗ | 空/失败 `no-store` |
| `/api/views/<slug>` | ✗ | `public, max-age=300`（**含失败态**） | ✗ | 见 P1-3 |

- Workers 对 Worker 生成的响应**无默认边缘缓存**，`max-age=300/600` 实际生效的是浏览器端（与 `site-maintenance-guide.md:262` 的"缓存 5 分钟"表述需区分层级）。
- 全站无速率限制/验证码/WAF 规则（仓库内无相关配置）；`/api/views/*` 是公开 GET，任何人均可脚本化刷请求（每次可能触发一次 Umami 登录→metrics）。
- 浏览量**统计本身**由 Umami 官方脚本在客户端上报（`BaseLayout.astro:82`），站点侧没有点赞、没有"用户去重"、没有防刷逻辑；全仓 grep `点赞|like-button|data-like` 零命中 → **不存在点赞功能**。

## 6. 前端 ↔ 后端契约与降级路径

### 6.1 文章浏览量（`src/scripts/view-counter.js`，经 `BaseLayout.astro:126` 全局加载）

- 选择器 `[data-view-counter][data-slug]`（`:3`）；文章页标记在 `src/pages/articles/[...slug].astro:99`，slug 用 `post.id`（= 文件名 stem）。
- 请求：`fetch('/api/views/' + encodeURIComponent(slug), {headers:{Accept:'application/json'}})`（`:44-46`）。
- 状态机与文案（i18n `src/i18n/zh-CN.json:370-375`）：
  - `!response.ok` → `阅读量不可用`（`:48-53`）
  - `views === null/undefined` → `暂无阅读量`（`:57-62`）
  - 成功 → `t('viewCounter.views', {views, 本地化千分位})`，写 `dataset.views`（`:8-27`）
  - fetch 抛错 → `阅读量加载失败`（`:63-68`）
  - 空 slug → `counter.remove()`（`:38-41`）
- ⚠️ 文档与实现不一致：`site-maintenance-guide.md:262` 称"无数据时返回 `views:null`，前端自动隐藏浏览量"，实现是**换文案而非隐藏**（`:57-62`）。
- 生命周期：`astro:page-load` 重新初始化（`:77`），`dataset.loaded` 防重复；语言切换只重渲染已缓存值（`:78-84`）。

### 6.2 首页热门卡（`src/pages/index.astro:105-172`）

- 容器默认 `hidden`（`:105`）→ **API 挂掉也不会白屏**；列表为空/异常时 `section.hidden = true`（`:127-131,169-171`，`.catch` 里再次 `hidden = true`）。
- `fetch('/api/trending?limit=5')` → `.then(response => response.json())`（`:133-134`）。**注意：未检查 `response.ok`**，若拿到 HTML（例如镜像站 GH Pages 的 404 页）会在 `.json()` 处抛错并被 catch 吞掉（结果是隐藏卡片，功能上仍安全，但错误被静默）。
- 渲染：`<li class="trending-item">` + 序号（CSS `counter`）+ `<a href=/articles/{slug}/>` + `{views} 阅读`；标题来自构建期 `data-title-map`（`:112`），**不信任接口返回的文本**（无 XSS 面）。

### 6.3 其它客户端脚本

- `src/scripts/safe-init.js:4-12`：`safeInit(name, fn)` 用 try/catch 包裹模块初始化，出错仅 `console.error` → 首页/styleguide/about 用它包裹（`index.astro:188`、`styleguide.astro:117-119`、`about.astro:67`），单模块崩溃不拖垮页面。
- 第三方 Umami 采集脚本：`BaseLayout.astro:82` `<script is:inline defer src="https://umami.calvin-xia.cn/script.js">`。
  - 用 `defer` 而非 `async`：**若该源不可达，DOMContentLoaded 会被这个脚本的连接超时拖住**（defer 脚本阻塞 DCL），是唯一"外部依赖可能拖慢首屏"的点（P2-1）。
  - CSP 已放行（`public/_headers:2` 的 `script-src` 与 `connect-src`）。
- `src/scripts/local-cdn-proxy.js`：**仅 DEV 注入**（`BaseLayout.astro:59,154`），生产零开销；用 `MutationObserver` 把 CDN 图片改写成 `/__cdn/*`，仅针对 `cdn-hosts.js` 白名单两域（`local-cdn-proxy.js:3-6`）。

## 7. 本地 CDN 代理 / `.well-known` / mammoth / SW

### 7.1 本地 CDN 代理（`astro.config.mjs:66-84`）

```js
const cdnProxyReferer = 'https://workers.calvin-xia.cn/';       // :14
'/__cdn/content': target https://content.calvin-xia.cn, changeOrigin, headers:{Referer: cdnProxyReferer}, rewrite 去前缀   // :70-76
'/__cdn/assets':  target https://assets.calvin-xia.cn,  同上                                                          // :77-83
```

- 目的：本地 `npm run dev` 时绕过 CDN 的 Referer 防盗链。约定见 `site-maintenance-guide.md:360`（"回填/下载 CDN 资产必须带 Referer `https://workers.calvin-xia.cn/`，否则 403"）。
- 同一份域名白名单存在于 `src/lib/cdn-hosts.js:3-11`（`trustedImageHosts` + `cdnProxyPaths`），被 `local-cdn-proxy.js:1` 与图片灯箱复用；`astro.config.mjs` 仍是**手写重复**（第三处，规范化缺口）。
- 站点级 referrer 策略保持 `strict-origin-when-cross-origin`（`BaseLayout.astro:70`），与代理头的显式 `Referer` 不冲突。

### 7.2 `public/.well-known/**`

- `public/.well-known/pki-validation/fileauth.txt` 与 `public/.well-known/teo-verification/1j1au6v619.txt`：各含一行域名验证 token（证书签发 / 腾讯 EdgeOne 归属验证）。
- 构建后原样进 `dist/.well-known/**`（已确认存在），由 ASSETS 直接服务 → **不要删除/改内容**，否则验证失败（`docs/grilling/2026-09-12-roadmap/03-decisions.md:34` 亦要求"不动 `.well-known/`"）。

### 7.3 `public/libs/mammoth/**` 与工具页 PWA

- `public/libs/mammoth/mammoth.browser.min.js` 是 docx 本地解析的离线兜底（`src/scripts/random-selector.ts:21-22` 定义 CDN URL 与本地 URL）。
- 加载顺序是 **CDN 优先**（`:149-156`）；但生产 CSP `script-src` **不含 `cdnjs.cloudflare.com`**（`public/_headers:2`）→ CDN 分支实际被 CSP 拦截，靠 `onerror` 走本地（功能可用，但有一次失败请求 + 控制台 CSP 报错 + `BaseLayout.astro:71-72` 的 preconnect 浪费）。测试只锁定了"代码里存在 cdnjs URL"（`tests/phase-3-tools.test.js:134`），没有锁定 CSP 一致性。
- `public/manifest.json`：`scope`/`start_url` 固定 `/works/tools/`；`public/sw-tools.js:1-2` 缓存名 `tools-v1`、路径 `/works/tools/`，只缓存同源 `/_astro/`、`/storage/`、`/libs/`、`/manifest.json`（`:13-21`）；注册 scope 也是 `/works/tools/`（`BaseLayout.astro:135-141`）→ **Service Worker 不覆盖文章/首页，也不缓存任何 `/api/*`**，因此不存在 API 离线兜底（无 SWR），但也避免陈旧数据。

## 8. 部署拓扑与产物契约

### 8.1 构建链（`package.json:20`）

```
astro build → dist/
  → node scripts/generate-og-images.mjs   # dist/og/*.png（satori + resvg）
  → node scripts/generate-redirects.mjs   # dist/**/ 旧 URL 跳转页
```

- OG 卡：每篇**有 title** 的文章 1 张 + `dist/og/default.png`（`scripts/generate-og-images.mjs:21-47`；`tests/…`/CI 用"标题文章数 + 1"断言卡数，`astro-build-check.yml`）。
- 跳转页：来源为 `scripts/legacy-redirects.js` 单一映射表（`:12-33`），生成器写完**回读磁盘**校验 meta refresh / canonical / JS 跳转 / 无 JS 兜底四项信号，不合格即 `exitCode=1`（`scripts/generate-redirects.mjs:55-66,104-108`）→ 这是链上最硬的失败闸门。
- 当前实测：14 个 md 文件、`dist/og` 15 张 PNG、6 个 `/blog/*.html` + 5 个 `/articles/<中文>/`（含 7 个平级旧页），与映射表一致。
- CSS/JS 产物在 `dist/_astro/`，`_headers`、`manifest.json`、`sw-tools.js`、`.well-known/`、`storage/`、`libs/` 原样复制。
- 产物契约的安全网：`astro-build-check.yml` 断言 `dist/index.html`、`dist/_headers`、`nosniff` 头、OG 数、RSS `content:encoded` 长度、已删测试文章路由不存在等。

### 8.2 两条发布通道

| | 生产（主） | GitHub Pages（镜像） |
|---|---|---|
| 触发 | 人工 | push `main` / `workflow_dispatch`（`deploy.yml:3-7`） |
| 步骤 | `npm run build` → `npx wrangler deploy` | `npm ci` → `npm run build` → `upload-pages-artifact` → `deploy-pages` |
| canonical | `https://calvin-xia.cn`（默认） | `BASE_URL=${{ vars.BASE_URL || 'https://calvin-xia.github.io' }}`（`deploy.yml:38`）→ **若仓库未设置 vars.BASE_URL，镜像会自指 canonical**（SEO 上主站/镜像互为副本） |
| API | 三条 `/api/*` 可用 | **无 Worker**：`/api/*` 落到 GH 404 页 → views 显示"阅读量不可用"、trending 卡片隐藏 |
| 安全头 | `_headers` 生效（CSP/XFO/nosniff/Referrer/Permissions） | GH Pages **不消费 `_headers`** → 镜像无 CSP 等自定义头 |
| 分析 | Umami 脚本照常上报（`BaseLayout.astro:82` 硬编码域名，与 BASE_URL 无关） | 同样上报 → 镜像流量进入同一 Umami website |
| 回滚 | 未文档化：仓库无 rollback 脚本、无版本固定，只能靠 Cloudflare 控制台的 deployment 回滚 | Actions 里 redeploy 旧 artifact/commit |

### 8.3 线上生效链路与风险

- 仓库内**没有**任何把 `npm run build` 与 `wrangler deploy` 串起来的脚本（`package.json:18-34` 的 `build` 只到两个后处理脚本）。
- `README.md:107` 写"`npx wrangler deploy` **先构建后**把 `dist/` 部署"——**不成立**：Workers 的 wrangler 不会自动执行构建命令（`wrangler.jsonc` 无 build 配置），因此该行属文档错误，且容易让人直接 deploy **过期 `dist/`**（当前 `dist` 与 HEAD 同步，mtime 2026-09-20 16:17 = 最新 commit 日期，属巧合正确，无新鲜度闸门）。
- 无 CI 校验"生产 dist 与 HEAD 一致"，也无 smoke test 打生产 `/api/health`。

## 9. 必须回答的问题（逐条）

**Q1 有哪些 API endpoint、鉴权、数据源、缓存/限流、失败响应？**
三类（见第 2 节表）：`/api/health`（可选 Bearer `HEALTH_CHECK_TOKEN`，否则只返回 status/timestamp，401/503 分支）、`/api/trending?limit=`（无鉴权，Cache API 600s）、`/api/views/<slug>`（无鉴权，max-age=300）。数据源只有自部署 Umami（登录换 token + `/api/websites/{id}/metrics`），无数据库/KV。限流：无。失败：health 503、trending 空数组 200、views `{views:null}` 200、非法 slug 400。另有本地 Node 服务 `tools/api-server.js`（`POST /api/new-post` Bearer `NEW_POST_SECRET` + Origin 白名单 + 1MB 上限，`GET /api/health`），监听 `127.0.0.1:4322`（`:37,183-193`），仅开发用（前端 `new-post.astro:11-12` 只在 DEV 挂载）。

**Q2 浏览量如何统计/聚合/展示？趋势榜算法与时间窗？**
统计：Umami 官方脚本在浏览器上报 pageview（`BaseLayout.astro:82`，website-id 公开）；站点侧无点赞、无服务端去重/防刷，去重与 bot 过滤完全依赖 Umami 自身。聚合：Worker 按 `/articles/<slug>/` 精确查 `type=url` 指标，**全时段求和**（`startAt=0`），取首行 `y`。展示：文章页 span → `/api/views/{id}` → 本地化千分位文案（或 4 种降级文案）。趋势榜：近 **30 天**窗口（`umami-trending.js:29-33`）→ 正则只留 `/articles/<8位日期…>/` → 按 views 降序 → slice(limit≤20，默认 5) → Cache API 600s → 首页与本地标题表求交后渲染。

**Q3 公开 var vs secret？有无泄露风险？**
公开：`UMAMI_HOST`、`UMAMI_WEBSITE_ID`（`wrangler.jsonc:12-15`，website-id 同时写在客户端，属设计如此）。必须 secret：`UMAMI_USERNAME`、`UMAMI_PASSWORD`、`HEALTH_CHECK_TOKEN`（`README.md:93-95`；本地 `.dev.vars`）。风险点：客户端脚本全仓 grep 三个 secret 名**零命中** ✅；`.gitignore:38-41` 已排除 `.env*`/`.dev.vars*` 且 `git ls-files` 无真实凭证 ✅。非泄露但值得修：`.dev.vars` 键漂移（P1-1）、`WORKER_VERSION` 从不生效（P2-2）。

**Q4 API 不可用时的降级路径？有无硬依赖？**
无硬依赖：热门卡默认 `hidden`、失败即隐藏（`index.astro:105,169-171`）；浏览量是服务端渲染的 `<span>`，最差显示"不可用/失败/暂无"（`view-counter.js:48-68`）；giscus 评论独立。SSR/构建不依赖 API（纯静态 + `getCollection`）。唯一"可能被拖慢"的是 `defer` 的 Umami 采集脚本（P2-1）。镜像站（GH Pages）没有 API，走的就是上述降级路径。

**Q5 部署与回滚链路？GH Pages 与主站差异？**
主站：`npm run build`（astro + OG + 跳转页）→ `npx wrangler deploy` 上传 Worker + `dist/` 为 ASSETS，`/api/*` 先走 Worker，自定义域控制台绑定（`site-maintenance-guide.md:381`）。镜像：push `main` 自动 GH Pages，与主站完全独立（`deploy.yml:1-48`）。差异：无 API、无 `_headers` 安全头、canonical 取决 `vars.BASE_URL`（默认 github.io）、旧跳转页与 OG 卡两者都有。回滚：**未文档化**，生产靠 Cloudflare 控制台既有 deployment 切回；无 CI 产物新鲜度校验。

**Q6 可疑点/技术债？** 见下节。

## 10. 技术债与可疑点

### P1（建议优先处理）

1. **本地秘钥键漂移**：`.dev.vars` 有 `UMAMI_API_KEY`、缺 `UMAMI_USERNAME`/`UMAMI_PASSWORD`，代码只读后者（`src/lib/umami-view-counter.js:48-63`）；模板 `.dev.vars.example:5-7` 才是对的 → 本地 Worker 调试时浏览量/健康检查必坏。
2. **出站 fetch 全无超时**：`src/lib/umami-view-counter.js:75-79`、`:108-110`，`src/lib/umami-trending.js:37-39`，`src/lib/health-check.js:19` 均未传 `AbortSignal.timeout(...)`；Umami 半死不活（连接不断、响应不发）时，Worker 请求与浏览器请求会一直挂到平台/浏览器超时，既不返回 `views:null` 也不返回空数组（降级只在"抛错"时触发）。
3. **失败响应被缓存 5 分钟**：`jsonResponse()` 无条件设置 `Cache-Control: public, max-age=300`（`umami-view-counter.js:8-14`），400 `invalid slug` 与 `{views:null}` 降级态（`:140-151`）同样带该头 → 一次瞬时故障会在浏览器里固化 5 分钟。
4. **trending 空结果不缓存**：`umami-trending.js:96-98` 仅在 `trending.length > 0` 时 `put` → Umami 不可达/无数据时，每次首页访问都会同步打上游（含登录重试 2 次），放大故障期负载。

### P2（质量/一致性）

5. **只按 `url` 过滤，不分 hostname**：`umami-view-counter.js:103-104`、`umami-trending.js:32-34` 的 metrics 查询只过滤路径；GH Pages 镜像在同一 Umami website 上报同样的 `/articles/<slug>/` 路径（`BaseLayout.astro:82` 不受 `BASE_URL` 影响）→ 主站阅读量/趋势被镜像流量污染，且镜像自身看不到数据。
6. **改名文章的历史浏览量丢失**：4 篇中文 slug 文章改名（`scripts/legacy-redirects.js:29-33`）后，计数器查的是新路径（`normalizeArticlePath`, `umami-view-counter.js:41-46`），旧路径累计的 views 从展示与趋势榜里消失。
7. **`WORKER_VERSION` 死配置**：`src/worker.ts:12,79` 读取，但 `wrangler.jsonc` 从未定义该 var，全仓无其他引用 → `/api/health` 永远 `version:"0.0.1"`，版本可观测性等于零。
8. **`README.md:107` 的部署描述错误**：`npx wrangler deploy` 不会先构建（`package.json:20` 的 build 不含 wrangler；`wrangler.jsonc` 无 build 配置）→ 误导性文档 + 陈旧 `dist` 上线风险，且无新鲜度闸门（对照 `site-maintenance-guide.md:381` 的正确表述"先 build 再 deploy"）。
9. **观测性全采样**：`wrangler.jsonc:16-30` logs/traces 全部 `head_sampling_rate: 1` + `persist: true`；叠加 `/api/views/*` 是高频公开端点（每篇文章页一次），长期会放大日志量与成本，建议降到 0.1 或按路径采样。

### P3（结构/文档）

10. **路由分派脆弱 + 抽象错位**：`src/worker.ts:141-147` 是 if/elseif/else 三段式，新增路由必须插在 else 之前；"ASSETS 兜底"藏在浏览量模块（`umami-view-counter.js:134-138`）。建议引入显式路由表（`[{method, pattern, handler}]`）+ 独立 `serveAssets()`。
11. **Worker 顶层无错误边界**：`src/worker.ts:137-151` 无 try/catch，异常直接变平台 500（非 JSON）。
12. **`/api/health` 的 `?cache=N` 无上限**：`src/worker.ts:49-58`，任意正整数都会写进 `Cache-Control`。
13. **日志与计数为 isolate 内存态**：`src/lib/security-logger.js:3-12`（`logs.shift()` 为 O(n)，`maxSize=1000`）、`src/worker.ts:33-34,102-107`（每 100 次按 isolate 计数）→ 告警阈值与统计口径都不稳定，且无持久化（`docs/grilling/2026-09-12-roadmap/00-project-map.md:21` 亦记录该事实）。
14. **CSP 与 CDN 兜底不一致**：`public/_headers:2` 的 `script-src` 不含 `cdnjs.cloudflare.com`，但 `src/scripts/random-selector.ts:21,149-156` 仍 CDN 优先、`src/layouts/BaseLayout.astro:71-72` 还 preconnect cdnjs → 生产必然先失败一次再走 `/libs/mammoth/`；`markdown-renderer.ts:82-83,864-865` 的 cdnjs 样式只用于**下载的独立 HTML**，站内 CSP 无关（此处无 bug，但 preconnect 无收益）。
15. **CDN 域名白名单三处维护**：`src/lib/cdn-hosts.js:3-11`（权威）、`src/scripts/local-cdn-proxy.js:3-6`（选择器手写）、`astro.config.mjs:70-83`（代理 target 手写）→ 加/改域名容易漏改。
16. **文档与实现不一致（浏览量空数据）**：`site-maintenance-guide.md:262` 说"前端自动隐藏浏览量"，实现是替换为"暂无阅读量"文案（`src/scripts/view-counter.js:57-62`）。
17. **旧探查文档过期**：`docs/grilling/2026-09-12-roadmap/00-project-map.md:20` 仍写"Worker 路由仅两个"，未包含 `/api/trending`；同一文档还有"全站无 og:/canonical"等已被 Phase 16 修掉的结论 → 后续 grilling/规划容易踩到陈旧事实。
18. **`/api/*` 兜底行为单测与生产接线不同**：`tests/umami-view-counter.test.js:30-38` 断言"ASSETS 不可用时 404"，而生产里非 `/api/*` 路径根本不进 Worker（`wrangler.jsonc:10`）；`worker.ts` 只有 `tests/security-logger.test.js:104-168` 的动态导入覆盖，**没有针对路由表本身的集成测试**（`/api/trending`、ASSETS 透传、method 无校验均无测试）。
19. **回滚链路空白**：全仓 grep `rollback|回滚` 无任何部署回滚说明（`README.md`/`site-maintenance-guide.md` 只讲正向部署），生产回滚完全依赖控制台操作经验。

## 11. 覆盖度与存疑

- 已读全量：`src/worker.ts`、`src/lib/{umami-view-counter,umami-trending,health-check,security-logger}.js`、`wrangler.jsonc`、`.dev.vars.example`、`public/_headers`、`astro.config.mjs`、`src/scripts/{view-counter,local-cdn-proxy,safe-init}.js`、`src/lib/cdn-hosts.js`、`src/pages/index.astro`（相关段）、`src/pages/articles/[...slug].astro`（相关段）、`src/layouts/BaseLayout.astro`（相关段）、`tools/api-server.js`、`scripts/{generate-redirects,generate-og-images}.js`（相关段）、`.github/workflows/{deploy,astro-build-check,phase-2-content-check,legacy-redirects-check}.yml`、相关测试。
- 未验证（无网络/不允许变更）：Umami 实际接口响应形状与登录 token 有效期；Cloudflare 控制台的自定义域绑定与 `_headers` 在 Worker 上的实际生效情况（仅由文档与 CI 的"文件存在"断言间接保证）；生产站 `/api/*` 的真实延迟与错误率（需线上日志）。
- 存疑待确认：本机 `.dev.vars` 的 `UMAMI_API_KEY` 是否曾被旧版本代码使用（当前全仓零引用）；`vars.BASE_URL` 在 GitHub 仓库变量里是否已设（决定镜像 canonical 指向）。
