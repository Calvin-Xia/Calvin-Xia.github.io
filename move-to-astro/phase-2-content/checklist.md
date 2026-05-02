# Phase 2 Code Review Checklist

## 内容集合与数据
- [x] `astro.config.mjs` 的 `site` 从 `BASE_URL` 读取，默认 `https://calvin-xia.cn`，用于单一 canonical 主域名
- [x] `.env.example` 包含 `BASE_URL=https://calvin-xia.cn`
- [x] `.gitattributes` 对 `.mjs`、`.astro`、`.ts`、`.js`、`.json`、`.css`、`.md`、`.yml`、`.yaml` 等源码文件统一 LF 行尾
- [x] `src/content.config.ts` 定义 blog、works、tools、updates 4 个集合 schema，并使用 Astro 6 Content Layer loader
- [x] 6 篇 `.md` 文件已迁入 `src/content/blog/`，frontmatter 字段齐全（title, date, excerpt, category, tags）
- [x] frontmatter 中 `date` 格式为 `YYYY-MM-DD`
- [x] frontmatter 中 `tags` 为数组格式
- [x] works/tools/updates JSON 文件与 schema 定义一致
- [x] `src/content/updates/fingerprint-app-update-log.json` 包含结构化 `timeline` 数据，不依赖遗留 HTML 作为时间线来源
- [x] blog loader 仅匹配日期开头的 Markdown 文件（`[0-9]*.md`），避免 `README.md` 等非内容文档被误收为文章
- [x] `20251231-2025年度总结.md` 图片指向 `https://assets.calvin-xia.cn/` 根目录，无残留 `2025summaryimage/` 或 `content.calvin-xia.cn/`
- [x] 其他既有文章指向 `https://content.calvin-xia.cn/<slug>/` 目录，不做批量改到 assets

## 文章与搜索页面
- [x] `/articles/` 列表页显示所有 6 篇文章
- [x] 文章按日期降序排列
- [x] 分类过滤按钮正常（点击后仅显示对应分类文章）
- [x] 标签过滤按钮正常（点击后仅显示含对应标签文章）
- [x] 分类和标签可组合过滤
- [x] 搜索框输入关键词后显示建议下拉
- [x] 搜索建议最多 6 条，关键词高亮显示
- [x] 搜索结果显示类型 badge + 标题 + 摘要 + 标签 + 日期
- [x] 搜索时分类/标签过滤器隐藏
- [x] 清空搜索框恢复文章列表视图
- [x] 键盘上下键切换搜索建议，Enter 跳转，Escape 关闭
- [x] `/articles/` 搜索范围由构建时 payload 的 `searchableTypes` 提供，客户端不硬编码 `update-log` 排除规则
- [x] 服务端内容排序、首页最近更新和 `/articles/` 客户端搜索共同使用 `src/lib/shared-content.js` 中的内容类型、日期解析、排序和 `NEW` 判定逻辑
- [x] `articles.astro` 客户端脚本不再重复定义 `contentTypes`、`typePriority`、`parseDateValue`、`compareByDate`、`isFreshDate`
- [x] `articles/20260411-ai-reliance/` 详情页文章内容完整
- [x] 每篇文章详情页 Markdown 渲染样式与 `global.css` 匹配
- [x] 引用块（`>`）内软换行渲染为 `<br>`，多行引文不会合并为单行
- [x] 图片非空 `alt` 在图片下方显示为灰色说明文字
- [x] 手写 HTML 并排图片的说明文字不破坏原有图片宽度比例
- [x] 图片说明宽度通过 `.markdown-image-figure--sized` 和 `--markdown-image-width` 由 CSS 接管，脚本不写入普通 `style.width`
- [x] 详情页含 "← 返回文章列表" 链接
- [x] 详情页显示日期、分类、标签信息
- [x] `BaseLayout` 设置 `<meta name="referrer" content="same-origin" />`，本地预览跨域 CDN 图片时不发送 localhost Referer
- [x] dev-only CDN 图片代理实现位于 `src/scripts/local-cdn-proxy.js`，`BaseLayout` 只引用脚本 URL，不内联维护 MutationObserver 逻辑
- [x] `local-cdn-proxy.js` 在页面无 `content.calvin-xia.cn` / `assets.calvin-xia.cn` 图片时早退，不创建 `MutationObserver`

## 更新日志与首页
- [x] `updates/fingerprint-app-update-log/` 详情页内容完整
- [x] 更新日志详情页从内容集合 `timeline` 渲染版本时间线，不读取 `UpdateLog/fingerprint-app-update-log.html`，不使用 `set:html` 注入遗留片段
- [x] `works.astro` 更新日志入口改为 `/updates/fingerprint-app-update-log/`
- [x] 首页最近更新区域显示 4 条内容卡片
- [x] 最近更新卡片按优先级和日期排序
- [x] 首页最近更新卡片中 ≤ 7 天的文章显示 `NEW` 徽章

## 加载反馈与动效
- [x] Skeleton 骨架卡片渲染 4 张，尺寸与 `.card` 一致
- [x] Skeleton 脉动动画使用 `@keyframes pulse`
- [x] 搜索/过滤触发时 skeleton 显示，结果就绪后隐藏
- [x] 结果卡片以 staggered fade-in-up 动画入场
- [x] 发布时间 ≤ 7 天的文章卡片显示 `NEW` 徽章
- [x] `NEW` 徽章使用 `.content-type-badge--new` 样式（accent 色，脉冲呼吸动画）
- [x] 搜索/过滤无结果时显示 `.no-results` 空状态
- [x] 空状态含 "没有找到匹配的文章" 文案和 "重置筛选" 按钮
- [x] 点击 "重置筛选" 清空过滤条件并恢复完整列表
- [x] `prefers-reduced-motion: reduce` 时 skeleton 脉动和交错入场动画跳过

## 新建文章工具
- [x] `.env.example` 文件存在，含 `NEW_POST_SECRET=your-secret-here-change-me`
- [x] `.env.example` 包含 `NEW_POST_ALLOWED_ORIGINS`，用于精确补充 Workers 原链接等额外 origin
- [x] `.env.example` 的 `OKP_VAULT` 使用通用占位路径，不包含真实 Windows 用户名或本机 Obsidian vault 路径
- [x] `.gitignore` 包含 `.env`
- [x] `npm run api` 启动本地 API 服务（端口 4322），无错误
- [x] 访问 `/new-post/` 表单页面使用 `BaseLayout` + `PageIntro`，标题为 "新建文章"
- [x] 表单容器使用 `.card` 玻璃拟态面板，与站点其他卡片视觉一致
- [x] 表单控件（input/textarea/select/button）使用站点 CSS 变量，风格统一
- [x] 分类 dropdown 从当前内容集合动态提取已有分类
- [x] Markdown 正文输入时实时预览面板同步更新，应用 `.markdown-content` 样式
- [x] 预览面板正确渲染完整 Markdown 语法：标题 H1-H6、加粗/斜体、行内代码、围栏代码块（含 `highlight.js` 语法高亮）、无序/有序列表、引用块、表格、图片、链接、分割线
- [x] 标题为空时前端阻止提交并显示验证提示
- [x] 日期为空时前端阻止提交并显示验证提示
- [x] 密钥错误时 API 返回 401，不创建文件
- [x] `/new-post/` 表单与提交脚本仅在 Astro dev 模式启用，生产构建不暴露完整 `localhost:4322/api/new-post` 地址
- [x] 本地 API CORS 不使用 `Access-Control-Allow-Origin: *`，仅放行 localhost / 127.0.0.1、`calvin-xia.cn`、`www.calvin-xia.cn`、`origin.calvin-xia.cn`、`mr-xia-site.calvin-xia.workers.dev` 和 `NEW_POST_ALLOWED_ORIGINS` 精确列出的 origin
- [x] 请求体超过 1 MB 时立即拒绝、移除请求流监听器并销毁请求，避免超限后继续累计内存
- [x] 新建文章 API 不向客户端返回文件系统路径：文件已存在返回通用 409，非预期服务端错误返回通用 500，详细错误仅写服务端日志
- [x] 单元测试覆盖 `YYYYMMDD-slug.md` 生成、frontmatter 写入、中文标题拼音首字母 slug、重复文件拒绝覆盖
- [x] HTTP 集成测试覆盖本地 API 的 401 未授权、422 表单校验失败、201 创建成功响应，并在临时内容目录验证 Markdown 文件写入
- [ ] 携带正确 `Authorization: Bearer <secret>` 提交成功，返回 201（未执行真实创建，避免留下测试文章）
- [ ] 完整流程验证：`api` + `dev` 同时运行，表单提交 → 热更新可见新文章（未执行真实创建，单元测试已覆盖核心文件写入）

## Obsidian→R2 发布管线
- [x] `.env.example` 包含 `BASE_URL`、`OKP_VAULT`、`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_PUBLIC_URL`、`NEW_POST_SECRET`、`NEW_POST_ALLOWED_ORIGINS` 全部字段
- [x] `npm run publish` 无参数启动交互模式，提示输入目录名
- [x] `npm run publish <dir>` 直接执行，跳过确认
- [x] 交互模式列出 `.md` 文件和大小写不敏感 `file/` 下图片清单及目标 R2 key
- [x] 确认后三步依次执行：复制 `.md` → 上传图片 → 替换路径，每步打印状态
- [x] `.md` 从 Obsidian 正确复制到 `src/content/blog/` 原文件名不变
- [x] 图片上传使用 `.env` 中 `R2_BUCKET` 指定的桶，object key 使用 `assetSlug/relativePath`，在桶内形成文章独立前缀目录
- [x] 复制的 `.md` 中所有 `](./file/xxx)`、`](./File/xxx)`、`](FILE/xxx)` 已替换为 `](https://content.calvin-xia.cn/slug/xxx)`
- [x] Markdown 图片公网路径使用 `.env` 中 `R2_PUBLIC_URL` + `assetSlug/relativePath`，与 R2 object key 前缀保持一致
- [x] Obsidian 原始 `.md` 文件未被修改，路径替换仅发生在副本上
- [x] 图片/附件类型识别大小写不敏感，覆盖 `.jpg`、`.jpeg`、`.png`、`.PNG`、`.webp`、`.gif`、`.svg`、`.heic`、`.tif/.tiff`、`.pdf`
- [x] R2 上传每个资源最多重试 3 次，单个资源最终失败时继续尝试后续资源并在最后汇总报告
- [x] 发布工具按关注点拆分：`scripts/slug.js`、`scripts/markdown-utils.js`、`scripts/content-types.js` 承担纯工具逻辑，`scripts/post-utils.js` 仅保留验证、文件创建、vault 扫描和发布计划编排
- [x] `npm run publish -- --dry-run <dir>` 仅打印发布计划，不写入 Markdown，不上传 R2
- [x] 单元测试覆盖 dry-run 参数解析和 dry-run 不写文件/不上传行为
- [ ] 图片上传到 R2 后，公网 URL `https://content.calvin-xia.cn/slug/img.png` 可访问（未对新测试文章执行真实上传；Preflight 已验证 R2 凭证与桶可用）
- [ ] `npm run build` 包含新发布文章后构建成功（未新建测试文章；当前 6 篇迁移文章构建成功）

## 自动化验证
- [x] `npm test` 覆盖内容集合、`BASE_URL` canonical 配置、`.gitattributes` 行尾规则、blog loader 日期文件匹配、frontmatter、JSON 拆分、更新日志结构化 timeline、20251231 图片根目录、referrer policy、dev CDN 代理脚本抽取与早退、图片说明文字 CSS 宽度接管、引用块换行、搜索范围 payload 序列化、共享排序/新鲜度逻辑与去重约束、`.env.example` 通用路径、`/new-post/` 本地 API 暴露防护、API CORS 白名单、请求体超限清理、错误响应脱敏、HTTP 集成响应、R2 上传重试与失败汇总、publish dry-run、发布工具核心函数与模块边界
- [x] `npm run test:coverage` 可执行并生成覆盖率
- [x] `npm run build` 零错误零警告
- [x] `.github/workflows/phase-2-content-check.yml` 在 push / pull_request 中运行 `npm ci`、`npm test`、JSON/文件存在性检查、`npm run build`
