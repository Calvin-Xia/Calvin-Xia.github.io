# 仓库优化决策与实施记录（2026-09-23）

背景：三角度审计（本地体检 / 外部标准对比 / 质量与取舍）+ grilling 三轮收敛出的定稿方案。本文记录决策、实施要点与验证命令。审计过程中的分歧已裁决并体现在"明确不做"一节。

## 性能实测数据（裁决依据）

Lighthouse 移动端（150ms RTT / 1.47Mbps / 4× CPU）打生产站：

| 指标 | 结果 |
|---|---|
| Perf / FCP / LCP | 62 / 6.0s / 6.5s |
| TBT / CLS | 47ms / 0（CPU 侧健康，慢在网络） |
| 首屏传输 | 3.0 MB |
| 元凶 | `/storage/icon.png` 1.35MB 进首屏（manifest 双引用 + webp 双下载） |
| 字体 | 43 请求 / 1.38MB（unicode-range 按需切片，属真实下载） |
| 构建耗时 | 33s（无痛点） |

分歧裁决：审计称 icon.png "仅 webp 不受支持时抓取"，实测双下载，以实测为准。

## 已实施（10 项）

| # | 决策 | 要点 | 验证 |
|---|---|---|---|
| 1 | 发布链路无默认值 | 取消「未分类」默认，缺 category/tags 校验报错、强制显式输入；4 脚本 + 4 测试 + QUICKSTART.md 同步 | `npm test`、`npm run check` |
| 2 | 白名单单一事实源 | `src/lib/content-taxonomy.js` 供 `content.config.ts`（blog schema 的 z.enum + superRefine 断言 tag≠category）与 `check-posts.js` 共用；check-posts 降为友好报错层 | `npm run astro -- sync`、`npm run check` |
| 3 | 依赖最小集 | `@astrojs/rss` 4.0.19；wrangler 挪 `devDependencies` | `npm install`、`npm test` |
| 4 | CI 去重 | astro-build-check 与 phase-2-content-check 的重复 build/重复测试去重，补 `paths:` 过滤；deploy.yml 不动 | workflow diff 自查 |
| 5 | CI 豁免清单 | AGENTS.md 记录 backfill-image-dimensions.js、generate-og-images.mjs+og-card.js 存量豁免，新特性仍须配 `*-check.yml` | — |
| 6 | 字数统计单实现 | `src/lib/word-count-core.js` 为核心（无 i18n 依赖），`word-count.js`（站点）与 `readable-stats.js`（CLI）共用；新增对拍测试 `tests/word-count-parity.test.js` + `word-count-parity-check.yml` | `npm run stats` 与站点一致（2,569 字/9 分钟） |
| 7 | 本地残留清理 | 删 `.npm-cache`/`.trae`/`tmp/`/根目录日志（回收约 717MB）；`prd-*` 与空目录保留 | — |
| 8 | icon 资产修复 | icon.png 1,409,769B → 88,802B（512×512，palette 量化）；删 BaseLayout 的 webp `<link>` 消除首屏双下载；manifest 双引用是 1.4MB 进首屏的根因 | 首屏该图标传输 <100KB |
| 9 | 长缓存 | `public/_headers` 补 `/_astro/*` → `max-age=31556952, immutable` | 部署后验响应头 |
| 10 | 字体死代码 | 删 `@fontsource/noto-serif-sc/500.css` 导入（`--font-serif` 仅用于 600），省产物约 6.9MB/196 文件 | `npm run build` 后对照产物 |

技术偏差记录（实施中必要调整）：Zod enum 约束放在 blog schema 覆盖处而非 `commonMetadata`（后者被 works/tools/updates 共用，其 category 是「AI 与智能体」等展示分类）；词表仍只有一份。

## 明确不做（grilling 烤掉）

字体管线迁移、variable 字体、woff2-only、远程图片优化、`security.csp`（ClientRouter+Shiki 双命中官方限制，不可用）、HSTS、中文 hero/APK 改名、文档收口、git 历史瘦身、backfill/OG 补 `*-check.yml`、major 版本升级、Astro 7。

## 遗留观察点

- HSTS 未加（Q16 明确只做缓存头）；zone 级配置不可见，部署后可复查响应头。
- manifest.json 首个 icon 项声明 `192x192` 但文件为 512×512（历史遗留，非本次引入）。
- `public/sw-tools.js` 预缓存仍含 icon.webp（44KB，非首屏路径）；与 Beian.webp 同属"预缓存孤儿"，可下次顺手清。
- README 的 Umami 接口描述（stats→metrics）漂移未修（不在定稿范围）。
- `tests/phase-6-stats-archive.test.js:453` 读侧解析兜底 `|| '未分类'` 保留（不影响写入行为）。
- major 升级（Astro 7 / Sätteri 插件移植、marked/minisearch/katex/typescript）与 `.git` 历史大图瘦身另议。

## 验证记录（2026-09-23 实施后完整测试）

```bash
npm test                                  # 470 pass / 0 fail
npm run lint                              # 0 errors（16 个既有 no-console warning）
npm run check                             # 14 篇 / 0 错误 / 0 警告
npm run build                             # OK（astro build + OG 15 张 + 17 跳转页）
node --test tests/giscus-comments.test.js # 10 pass / 0 fail（构建后产物断言）
npm run stats                             # 与站点字数一致（对拍见 word-count-parity）
```
