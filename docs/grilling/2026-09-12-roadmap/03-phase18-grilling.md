# Phase 18 专项 grilling 记录(2026-09-12)

> 收官阶段五问,逐题作答,全部定案。事实依据:works.astro 文案走双语 i18n 键而 works JSON 中文单语、articles.astro 约 650 行内联 script、global.css @import 四族字重、manifest theme_color #1a1a2e。

### Q1 - works 双语策略
works 单一来源化的核心矛盾:页面文案是双语 i18n 键,works JSON 是中文单语。
**用户答复**:JSON 存 i18n 键引用(推荐)——卡片结构/链接/tags/按钮数据化进 JSON,文案仍用 works.xxx 双语 i18n 键。双语不丢,数据单一来源。

### Q2 - action 按钮数据化
**用户答复**:通用 actions 数组(推荐)——JSON 加 `actions: [{labelKey, href, variant, external}]`,模板循环渲染,每项目任意数量按钮。

### Q3 - 测试文章 00010101-test-assignment.md 处置
**用户答复**:直接删除(git 历史可找回),生产构建不再出该路由。

### Q4 - articles.astro 拆分粒度
**用户答复**:中粒度 4 模块(推荐)——payload(数据序列化)/ cards(卡片 DOM)/ filters(URL 状态+筛选)/ search(搜索、建议、历史),主 astro 只留装配与事件绑定;escapeRegExp/safeInit/CDN 白名单同步收敛共享模块。

### Q5 - 字体档位与 manifest
**用户答复**:全档+修色(推荐)——字重按现状全档引入(serif 500/600/700、sans 400-700、mono 400/500/600,CJK unicode-range 分片按需加载);manifest theme_color 改品牌色 #315d67;PWA scope 保持 /works/tools/ 不动。
