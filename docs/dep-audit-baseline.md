# 依赖审计基线（dep-audit baseline）

`npm audit` 告警的显式豁免登记处。原则：能随 semver 范围 `npm audit fix` 掉的一律照常修；只有上游尚未修复、而唯一修复路径是破坏性降级/升级时，才在此登记豁免，并写清暴露面与"服务端不可达"的理由。未登记的告警视为待修。

决定日期：2026-09-23。

## 当前豁免项（2 项）

### 1. GHSA-r5fr-rjxr-66jc — lodash-es ≤4.17.23（lodash 系列 `_.template` 代码注入）

- 公告：<https://github.com/advisories/GHSA-r5fr-rjxr-66jc>
- 依赖链：`mermaid@12` → `chevrotain@11` → `@chevrotain/*` → `lodash-es`
- 豁免理由：唯一修复路径是把 mermaid 破坏性降到 11.x（`npm audit fix --force` 会装 mermaid@11.17.2），已决定不降级。mermaid 只在浏览器端按需懒加载（`src/scripts/article-mermaid.js` 内 `await import('mermaid')`），渲染的是本站内容集合里的自写图表代码；构建期与 Cloudflare Worker（`src/worker.ts`）完全不加载 mermaid / lodash-es，服务端不可达。
- 同链路附带：GHSA-f23m-r3pf-42rh（lodash-es `_.unset`/`_.omit` 原型污染）随本条一并豁免，理由相同：<https://github.com/advisories/GHSA-f23m-r3pf-42rh>

### 2. GHSA-px8p-9vwx-vf98 — fflate 0.7.0–0.7.4（`unzipSync` 解析畸形 ZIP64 死循环）

- 公告：<https://github.com/advisories/GHSA-px8p-9vwx-vf98>
- 依赖链：`satori@0.33.x` → `fflate`
- 豁免理由：唯一修复路径是把 satori 破坏性降到 0.32.0（`npm audit fix --force` 会装 satori@0.32.0），已决定不降级。satori 只在构建期生成 OG 卡片（`scripts/og-card.js`，入口 `scripts/generate-og-images.mjs`，即 `npm run build` / `npm run og`），输入全部是仓库自有图片与模板，不存在不可信上传面；运行时（纯静态站 + Worker API）不加载 satori / fflate。

## 复核时机

- mermaid 换到 chevrotain 修复版、或 satori 换到 fflate 修复版后，随常规依赖升级移除对应条目。
- 新增豁免必须追加条目，注明公告链接、依赖链与不可达理由；同时更新本节计数。

## 相关已修复项（不豁免）

- GHSA-8j5q-mfj2-5q9q（@astrojs/rss 未转义字段导致 XML 注入）：随 2026-09-23 依赖最小集调整升级到 `@astrojs/rss@4.0.19` 修复。
