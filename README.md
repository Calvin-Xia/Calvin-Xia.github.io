# Mr.Xia 个人网站

这是一个静态个人站点仓库，正在从根目录 HTML/CSS/vanilla JS 迁移到 Astro。Phase 2 已完成：Astro 内容集合已接管博客、作品、工具和更新日志的数据层，`/articles/`、文章详情页、首页最近更新、新建文章工具和 Obsidian→R2 发布管线已经可用。

旧 HTML/JSON/Python 管线仍保留到 Phase 4 清理阶段，用于兼容旧页面和旧 URL。新开发优先放在 `src/`、`src/content/`、`scripts/*.js` 和 `tools/` 中。

## 当前结构

```text
mr.xia.github.io/
├── astro.config.mjs              # Astro 站点配置，site 来自 BASE_URL
├── package.json                  # npm 脚本与依赖
├── src/
│   ├── content.config.ts         # Astro 内容集合 schema 与 loader
│   ├── content/                  # blog / works / tools / updates 内容集合
│   ├── components/               # Astro 共享组件
│   ├── layouts/                  # BaseLayout 等布局
│   ├── lib/                      # 内容转换、排序、Markdown 增强工具
│   ├── pages/                    # Astro 页面与动态路由
│   ├── scripts/                  # Astro 客户端脚本
│   └── styles/global.css         # Astro 全局样式
├── scripts/                      # 发布、slug、Markdown、Content-Type 工具
├── tools/api-server.js           # 本地 new-post API
├── tests/                        # Node test suites
├── public/                       # Astro 静态资源
├── .github/workflows/            # Astro / legacy / Phase 2 CI
├── .env.example                  # 本地配置模板，不含真实凭证
├── .gitattributes                # LF 行尾规则
├── index.html 等旧页面           # 保留到 Phase 4 清理
├── blog/、content/、UpdateLog/    # 旧内容索引与旧更新日志
└── move-to-astro/                # 迁移规格、任务和验收清单
```

## 本地开发

```bash
npm install
npm run dev
```

默认访问 `http://localhost:4321/`。常用 Astro 路由：

- `/`
- `/articles/`
- `/articles/20260411-ai-reliance/`
- `/works/`
- `/new-post/`（仅 dev 模式启用可提交表单）

旧 HTML 仍可用本地静态服务器预览：

```bash
python -m http.server 3001
```

然后访问 `http://localhost:3001/index.html` 或 `http://localhost:3001/statement.html`。

## 环境配置

复制 `.env.example` 为 `.env`，填入本机配置和 R2 凭证。

- `BASE_URL`：Astro 构建使用的单一 canonical 主域名，默认 `https://calvin-xia.cn`
- `OKP_VAULT`：Obsidian vault 路径
- `R2_*`：Cloudflare R2 S3 兼容上传配置
- `NEW_POST_SECRET`：`/new-post/` 本地 API 鉴权密钥
- `NEW_POST_ALLOWED_ORIGINS`：额外允许调用本地 API 的精确 origin

`.env` 已被 `.gitignore` 排除，不要提交真实凭证。

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm test
npm run test:coverage
npm run api
npm run publish -- --dry-run <obsidian-post-dir>
npm run publish <obsidian-post-dir>
```

- `npm run api` 启动本地 new-post API，默认监听 `127.0.0.1:4322`
- `npm run publish -- --dry-run <dir>` 只打印 Obsidian→R2 发布计划，不写文件、不上传
- `npm run publish <dir>` 复制 Obsidian Markdown 到 `src/content/blog/`，上传 `file/` 资源到 R2，并替换副本中的资源 URL

旧站内容索引仍可用：

```bash
python scripts/content_pipeline.py check
```

这条命令维护旧 `content/content-manifest.json`，主要服务旧页面，Phase 4 前仍保留。

## 内容维护

### 新增 Astro 文章

推荐路径：

1. 在 Obsidian 中准备文章目录与 `file/` 资源。
2. 运行 `npm run publish -- --dry-run <dir>` 预览目标 Markdown 和 R2 key。
3. 确认后运行 `npm run publish <dir>`。
4. 运行 `npm test` 和 `npm run build`。

临时本地写作也可以使用：

1. 同时运行 `npm run api` 和 `npm run dev`。
2. 打开 `/new-post/`。
3. 使用 `NEW_POST_SECRET` 提交表单，生成 `src/content/blog/*.md`。

### 更新作品、工具或更新日志

Astro 内容集合文件位于：

- `src/content/works/*.json`
- `src/content/tools/*.json`
- `src/content/updates/*.json`

更新后运行：

```bash
npm test
npm run build
```

旧页面和旧 metadata 仍保留到 Phase 4。如果修改的是旧 HTML 入口或旧 JSON，还需要运行 `python scripts/content_pipeline.py check`。

## 推荐验证流程

在提交或发布前建议运行：

```bash
npm test
npm run test:coverage
npm run build
git diff --check
```

如果改动影响旧页面或 legacy metadata，再加：

```bash
python scripts/content_pipeline.py check
```

## CI/CD

当前 CI 包括：

- `astro-build-check.yml`：安装依赖、构建 Astro、验证关键静态输出
- `phase-2-content-check.yml`：运行 `npm test`、`npm run test:coverage`、内容文件存在性检查和 Astro build
- `content-check.yml`：保留旧 Python 内容 manifest 检查

## 相关说明文档

- [QUICKSTART.md](./QUICKSTART.md)
- [site-maintenance-guide.md](./site-maintenance-guide.md)
- [move-to-astro/README.md](./move-to-astro/README.md)
- [AGENTS.md](./AGENTS.md)
- [content/README.md](./content/README.md)
- [blog/README.md](./blog/README.md)
