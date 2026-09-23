# Grilling 问答记录(2026-09-12)

> **历史快照（2026-09-12）**：那一轮的产物，现状见 docs/grilling/2026-09-23-project-audit/00-project-map.md。

> 每轮问题原文 + 用户答复原样记录。**状态:三轮全部完成,共识已确认(Q19)。**

## Round 1(前沿 8 问)— 已全部回答 ✅

### Q1 - 产出边界
本轮 grilling 的终点是什么?(a 规划文档 / b 规划+实施 P0 / c 规划+实施全部)

**用户答复**:「反正你先规划,做不做是后面的事」→ 采 a:只产出规划文档,实施另行排期。

### Q2 - 三轴优先级

**用户答复**:CLI → 站点 → 新功能(推荐项)。

### Q3 - 依赖策略

**用户答复**:devDependencies 可加,src 运行时零新增(推荐项)。

### Q4 - 主部署通道

**用户答复**:calvin-xia.cn(Worker/TEO)为主,GitHub Pages 灾备不动(推荐项)。

### Q5 - 上次 grilling 遗留 5 条(①../file/链接重写 ②括号文件名 ③BOM ④readline/prompts ⑤串行上传)哪些翻案?

**用户答复**:全部维持现状 → 本轮 CLI 工作只做新增能力,不翻旧账。

### Q6 - CLI 架构

**用户答复**:维持分散 npm scripts,补齐各自 --help 与共享 env 校验(推荐项)。

### Q7 - 站点功能优化重点(多选,拆两半)

**Q7-1 用户答复**:a)SEO 补全 + b)文章页导航 + d)数据双轨修复。未选 c)标签/分类落地页。

**Q7-2 用户答复**:e)拆分 articles.astro + f)图片 CLS 防护 + g)字体加载优化。
**附加要求**:「对于 f 和 g 请务必仔细 grilling 方案」→ 已在 R2 Q13/Q14 专项落实。

### Q8 - 新功能方向(多选,拆两半)

**Q8-1 用户答复**:a)RSS 全文 + b)热门文章 + c)OG 分享图。d)反响按钮不做——「点赞按钮在 giscus 框里面有的,虽然需要登录 GitHub 但也够用了」。

**Q8-2 用户答复**:均不做——「全站 pwa 不现实,草稿在我的 Obsidian vault 不用预览」。

## Round 2(前沿 9 问)— 已全部回答 ✅

> R1 决议解锁:C4 新命令、C3 publish 补强、C5 api 加固、S2 导航细节、N1-c OG 方案、S6-f 图片方案、S7-g 字体方案、N1-b 热门数据源;Q12 答复中用户自提头图功能,扩为 Q12b。

### Q9 - 新 CLI 命令选型(多选)

**用户答复**:四个全要——check 内容体检、stats 统计报表、new 交互建稿、list 文章清单。

### Q10 - publish 小补强(多选)

**用户答复**:三项全要——覆盖保护(wx+--force)、--version、未知 flag 改报错。

### Q11 - api-server 加固(多选)

**用户答复**:timing-safe 比较 + GET /api/health;**未选**请求日志。

### Q12 - OG 分享图方案

**用户答复**:选 satori 逐篇标题卡。**附加提议**:「顺便评估一下加入文章头图的功能,比如交互选一张 vault 中已引用的图片然后本地降采样后复制到 repository 的 src 随 Astro 打包,这样可以降低 r2 损耗的同时加入页面?」→ 扩为 Q12b。

### Q12b - 文章头图功能边界

**用户答复**:全量纳入——publish 交互选头图→sharp 降采样 webp(约 1600px)存 src/assets 随包发布;详情页顶部渲染 hero;og:image 优先真实头图,无头图回退 satori 标题卡。

### Q13 - 图片 CLS 方案(用户点名细问)

**用户答复**:A 发布时探测——上传 R2 时读图片头取宽高写入 frontmatter 资产清单,rehype 插件渲染时注入 width/height/lazy/decoding,一次性脚本回填存量 13 篇。

### Q14 - 字体方案(用户点名细问)

**用户答复**:A @fontsource 全自托管(4 族全保),删除 @import。

### Q15 - 热门文章数据源

**用户答复**:A Worker /api/trending 代理 Umami + Cache API 缓存(零新绑定)。

### Q16 - 文章页导航细节

**用户答复**:A prev/next + 相关文章 4 篇(构建时计算)。

## Round 3(收尾核对)— 已全部回答 ✅

### Q17 - 默认项核对(D1-D12)

**用户答复**:全部认可(推荐项)。

### Q18 - Phase 划分(P14-P18)确认

**用户答复**:确认五阶段结构与依赖顺序(推荐项)。

### Q19 - 共识确认

**用户答复**:「确认,产出规划」→ 共识达成,grilling 结束,产出 [03-decisions.md](03-decisions.md) 与 [04-phases-p14-p18.md](04-phases-p14-p18.md)。
