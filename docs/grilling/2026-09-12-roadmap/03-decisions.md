# 最终决策总览(2026-09-12)

> 由 grilling 流程产出:3 轮 20 问全部回答完毕,用户于 Q19 确认共识。
> 配套文档:[00-project-map.md](00-project-map.md)(事实基础) · [01-design-tree.md](01-design-tree.md)(决策树+默认项 D1-D12) · [02-rounds.md](02-rounds.md)(答复原文) · [04-phases-p14-p18.md](04-phases-p14-p18.md)(分阶段实施规划)。

## 一、决策总览表

| # | 决策 | 来源 |
|---|---|---|
| M1 | 本轮只产出规划文档,实施另行排期 | R1-Q1 |
| M4 | 优先级:CLI → 站点功能优化 → 新功能 | R1-Q2 |
| M5 | devDependencies 可加;src 运行时零新增 | R1-Q3 |
| M6 | 规范 URL 以 calvin-xia.cn(Worker/TEO)为准;GitHub Pages deploy.yml 灾备冻结 | R1-Q4 |
| C1 | 上次 grilling(2026-09-01)5 条遗留项全部维持现状,不翻案 | R1-Q5 |
| C2 | CLI 维持分散 npm scripts 架构,补齐各自 --help 与共享 env 校验 | R1-Q6 |
| C4 | 新增 4 个 CLI 命令:check / stats / new / list | R2-Q9 |
| C3 | publish 补强:覆盖保护(+--force)、--version、未知 flag 改报错 | R2-Q10 |
| C5 | api-server 加固:timing-safe Bearer 比较、GET /api/health;不做请求日志 | R2-Q11 |
| C6 | 文章头图功能全量纳入:交互选图→sharp 降采样→src/assets→详情页 hero→og:image 优先用头图 | R2-Q12b(用户自提) |
| C7 | 图片 CLS 路线 A:发布时探测宽高入 frontmatter 资产清单 + rehype 注入 + 存量回填 | R2-Q13 |
| S1 | SEO 补全:og:/twitter:/canonical/JSON-LD(BlogPosting/WebSite) | R1-Q7-1 + D10 |
| S2 | 文章页导航:prev/next + 相关文章 4 篇,构建时计算 | R2-Q16 |
| S4 | 数据双轨修复(方案=D1/D2) | R1-Q7-1 + R3-Q17 |
| S5 | articles.astro 拆分 + escapeRegExp/safeInit/CDN 白名单去重(方案=D8) | R1-Q7-2 + R3-Q17 |
| S7 | 字体:@fontsource 全自托管 4 族,删 @import | R2-Q14 |
| N-a | RSS 全文(content:encoded,构建时 HTML) | R1-Q8-1 + D3 |
| N-b | 热门文章:Worker /api/trending 代理 Umami + Cache API 缓存,首页卡片 | R2-Q15 + D4 |
| N-c | OG 分享图:satori 逐篇标题卡 | R2-Q12 |
| I1 | Phase 划分 P14-P18(结构见 04 文档) | R3-Q18 |

## 二、全局约束(实施时必须遵守)

1. **运行时零新增依赖**:sharp、satori、@fontsource/* 全部落在 devDependencies。
2. **规范域名**:SEO/OG/RSS/sitemap 一律 calvin-xia.cn;不改 deploy.yml、不动 `.well-known/`。
3. **不翻旧账**:C1 的 5 条遗留项(../file/ 重写、括号文件名、BOM、readline/prompts 混用、串行上传)保持现状;头图/尺寸探测属新增能力,不算翻案。
4. **CI 义务**:凡新增/修改文件操作与构建逻辑,按 AGENTS.md 配套 `*-check.yml`(详见 04 文档各 Phase)。
5. **测试**:沿用 node:test;每个 Phase 附带测试扩展;提交前 `npm test` + `npm run build` + `npm run lint` 全绿。
6. **提交规范**:短语式祈使 subject,一个逻辑一个 commit(沿用仓库惯例)。

## 三、明确不做清单(本轮)

- 标签/分类独立落地页(S3,未选)
- 文章反响/点赞按钮(giscus 已覆盖,用户确认)
- 全站 PWA、发布草稿预览(用户否决)
- Analytics Engine 迁移(随 Q15 选 A 搁置,记 backlog)
- api-server 请求日志(用户明确不要)
- 上次 grilling 5 条遗留项翻案(C1)

## 四、默认项(D1-D12)

见 [01-design-tree.md](01-design-tree.md)「默认项清单」,用户于 R3-Q17 全部认可,与本文档具有同等效力。
