# 站点维护与界面更新说明

这份文档描述 Phase 2 完成后的维护方式。当前推荐维护入口是 Astro 内容集合；旧 HTML/JSON/Python 管线仍保留到 Phase 4 清理。

## 当前内容结构

Astro 内容集合：

- 博客文章：`src/content/blog/*.md`
- 作品：`src/content/works/*.json`
- 工具：`src/content/tools/*.json`
- 更新日志：`src/content/updates/*.json`
- Schema：`src/content.config.ts`

辅助脚本：

- `tools/api-server.js`：本地 `/new-post/` API
- `scripts/publish-post.js`：Obsidian→R2 发布管线
- `scripts/post-utils.js`、`scripts/markdown-utils.js`、`scripts/slug.js`、`scripts/content-types.js`：发布和文件操作工具

旧内容层：

- `blog/blog-files.json`
- `blog/blog-metadata.json`
- `content/*.json`
- `content/content-manifest.json`
- `scripts/content_pipeline.py`

旧内容层继续服务旧页面；新功能优先使用 Astro 内容集合。

## 页面联动

- 首页 `/`
  - 从 Astro 内容集合静态生成最近更新。
- 文章页 `/articles/`
  - 默认展示 blog 集合文章。
  - 搜索范围由构建时 payload 的 `searchableTypes` 控制，目前包括 article、work、tool。
- 文章详情 `/articles/{slug}/`
  - 从 `src/content/blog/*.md` 静态生成。
  - 图片 `alt` 会渲染为灰色说明文字。
- 作品页 `/works/`
  - 使用 Astro 页面和内容集合入口。
- 更新日志 `/updates/fingerprint-app-update-log/`
  - 从 `src/content/updates/*.json` 的结构化 `timeline` 渲染。

## 新增文章

推荐流程：

1. 在 Obsidian vault 中准备文章目录和 `file/` 资源。
2. 运行：

```bash
npm run publish -- --dry-run <obsidian-post-dir>
```

3. 检查目标 Markdown 路径、R2 object key 和公网 URL。
4. 确认后运行：

```bash
npm run publish <obsidian-post-dir>
```

5. 运行：

```bash
npm test
npm run build
```

发布脚本只修改仓库中的 Markdown 副本，不修改 Obsidian vault 原始内容。

## 本地快速创建文章

1. 运行本地 API：

```bash
npm run api
```

2. 运行 Astro dev server：

```bash
npm run dev
```

3. 打开 `/new-post/`，使用 `.env` 中的 `NEW_POST_SECRET` 提交。

生产构建不会暴露可提交表单或完整本地 API 地址。

## 更新作品、工具、更新日志

修改对应集合文件：

- `src/content/works/*.json`
- `src/content/tools/*.json`
- `src/content/updates/*.json`

然后运行：

```bash
npm test
npm run build
```

如果改动影响旧页面入口或旧 manifest，再运行：

```bash
python scripts/content_pipeline.py check
```

## 配置维护

- `BASE_URL`：Astro canonical 主域名，一次构建只配置一个。
- `R2_PUBLIC_URL`：文章资源公网 URL，不等同于站点主域名。
- `NEW_POST_ALLOWED_ORIGINS`：本地 API 允许的额外精确 origin。
- `.gitattributes`：源码文件统一 LF 行尾，减少 Windows/CI diff 噪声。

不要提交 `.env` 或任何真实凭证。

## 验证流程

常规提交前：

```bash
npm test
npm run build
git diff --check
```

涉及文件操作、发布脚本、本地 API 或审查补充测试：

```bash
npm run test:coverage
```

涉及旧内容索引：

```bash
python scripts/content_pipeline.py check
```

## CI

- `astro-build-check.yml` 构建 Astro 并验证关键静态输出。
- `phase-2-content-check.yml` 运行 npm 测试、coverage、内容文件检查和 Astro build。
- `content-check.yml` 保留旧 Python manifest 检查。
