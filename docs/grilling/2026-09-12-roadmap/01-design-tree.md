# Grilling 设计树(2026-09-12)— 终稿

> 命题:功能优化 / 新功能加入 / CLI 优化新增 的整体规划。
> **状态:三轮 20 问全部完成,用户于 Q19 确认共识。全部节点已决,无悬空分支。**
> 事实:[00-project-map.md](00-project-map.md) · 答复原文:[02-rounds.md](02-rounds.md) · 决策表:[03-decisions.md](03-decisions.md) · 实施:[04-phases-p14-p18.md](04-phases-p14-p18.md)

```
ROOT: 2026 下半年路线图 — ✅ 共识达成
│
├─ M 元决策 — 全 ✅
│  ├─ M1 只产出规划文档,实施后议 (R1-Q1)
│  ├─ M2 文档落点 docs/grilling/2026-09-12-roadmap/ (我方定,用户未异议)
│  ├─ M3 文档语言中文
│  ├─ M4 优先级 CLI→站点→新功能 (R1-Q2)
│  ├─ M5 dev 可加/运行时零新增 (R1-Q3)
│  └─ M6 主通道 calvin-xia.cn,Pages 灾备冻结 (R1-Q4)
│
├─ C CLI 轴 — 全 ✅
│  ├─ C1 上次 5 条遗留全部维持现状 (R1-Q5)
│  ├─ C2 维持分散 npm scripts (R1-Q6)
│  ├─ C4 新命令 check/stats/new/list 四个全做 (R2-Q9)
│  ├─ C3 publish 补强:覆盖保护+--force/--version/未知flag报错 (R2-Q10)
│  ├─ C5 api 加固:timing-safe + /api/health;不做日志 (R2-Q11)
│  ├─ C6 头图功能全量纳入 (R2-Q12b,用户自提)
│  └─ C7 图片宽高发布时探测 + rehype 注入 + 存量回填 (R2-Q13)
│
├─ S 站点轴 — 全 ✅
│  ├─ S1 SEO 补全 ✅(og:/twitter:/canonical/JSON-LD)
│  ├─ S2 prev/next + 相关文章 4 篇 ✅ (R2-Q16)
│  ├─ S3 标签/分类落地页 ❌ 未选
│  ├─ S4 数据双轨修复 ✅ = D1 works 单一来源 + D2 测试文章迁移
│  ├─ S5 articles.astro 拆分 + 三处去重 ✅ = D8
│  ├─ S6 图片 CLS ✅ 路线 A (R2-Q13)
│  └─ S7 字体 @fontsource 全自托管 ✅ (R2-Q14)
│
├─ N 新功能轴 — 全 ✅
│  ├─ N-a RSS 全文 ✅ = D3(content:encoded 构建时 HTML)
│  ├─ N-b 热门文章 ✅ /api/trending 代理 Umami + Cache API (R2-Q15);展示位 = D4(仅首页)
│  ├─ N-c OG 图 ✅ satori 逐篇 (R2-Q12);决策树 = D5(hero>satori>默认卡)
│  ├─ N-d 反响按钮 ❌(giscus 已覆盖)
│  ├─ N-e 全站 PWA ❌ / N-f 草稿预览 ❌
│  └─ N3 Analytics Engine ❌ 搁置记 backlog
│
└─ I 实施策略 — 全 ✅
   ├─ I1 Phase P14-P18 结构与依赖确认 (R3-Q18)
   ├─ I2 默认项 D1-D12 全部认可 (R3-Q17)
   ├─ I3 CI/文档义务 = D11(cli-commands-check.yml 等)
   └─ I4 03/04 两份规划文档已产出(Q19 确认)
```

## 默认项 D1-D12(R3-Q17 全部认可)

- **D1** works 单一来源化:works.astro 消费集合,卡片 UI 不变,数据搬 JSON,schema 按渲染需要扩展。
- **D2** 测试文章 00010101-test-assignment.md 移出 blog 集合。
- **D3** RSS 全文:content:encoded 构建时 HTML(含 Shiki),保留 summary。
- **D4** 热门文章仅首页卡片;/api/trending?limit=N,Cache API 缓存 10 分钟,返回 [{slug,views}]。
- **D5** og:image 决策树:有头图→头图;无头图→satori 标题卡;非文章页→全站默认卡。
- **D6** 头图交互:publish 元数据问答后 prompts select(file/ 内图片),选空=无头图;frontmatter 记 hero。
- **D7** check 体检项:frontmatter 规范/正文链接与 R2 引用/hero 一致性;失败退出码非 0。
- **D8** articles 拆法:内联 script 迁 src/lib/articles-page/ 分模块;escapeRegExp/safeInit 收敛共享;CDN 白名单单一来源化。
- **D9** 字体:fontsource 选型实施时定(variable 优先),font-display: swap,验收含真机加载验证。
- **D10** JSON-LD:文章页 BlogPosting,全站 WebSite。
- **D11** CI:CLI 新命令+publish/api 改动配 cli-commands-check.yml;其余扩展现有 workflow;README 补记 edit-metadata/lint 及新命令。
- **D12** Phase 命名自 Phase 14 起,每 Phase 独立可交付可单独上线。

## 轮次记录

R1 ✅ 8 问(R1-Q1~Q8) → R2 ✅ 9 问(R2-Q9~Q16 + 用户自提 Q12b) → R3 ✅ 3 问(Q17 默认核对/Q18 Phase 确认/Q19 共识) → 产出 03/04 文档,grilling 结束。
