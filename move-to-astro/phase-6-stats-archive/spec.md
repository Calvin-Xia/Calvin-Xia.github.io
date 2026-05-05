# Phase 6：文章统计与归档 Spec

## Why

Phase 2 和 5 已完善内容集合、文章列表/详情、RSS/sitemap 和评论区。当前文章体验仍缺少三个能力：

1. **文章元数据展示**：缺少字数统计和自动阅读时间预估，需要读者自行评估文章长度。
2. **归档浏览**：7 篇文章的列表已经够用，但随着文章累积，缺少按时间线归组的归档视图。
3. **SPA 切换体验**：已启用 `ClientRouter` + View Transitions，但列表页 ↔ 详情页的过渡仍为通用 fade，缺乏内容关联感和状态保持。

本阶段目标：在不引入后端数据库、不破坏静态站点架构的前提下，补上字数/阅读时间、归档页和增强过渡。

## Status

- 状态：未开始
- 依赖：Phase 2（内容集合）、Phase 5（RSS/sitemap/评论区）

## Scope

- 字数统计与阅读时间：构建时从 Markdown body 自动计算，文章列表卡片和详情页 meta 区展示
- 归档页：`/articles/archive/` 按年份归组的文章时间线，入口在文章首页内部
- SPA 增强过渡：列表 ↔ 详情 的方向性动画（前进/后退），详情页滚动位置保存与恢复
- 在线阅读量：先进行可行性评估和方案设计，不直接进入实施

## Non-Goals

- 不引入后端数据库（如 D1、Postgres）
- 不在文章列表首页显示阅读量
- 归档页不做复杂交互（纯静态时间线，不做无限滚动或动态加载）
- 不对工具页或作品页做 SPA 过渡增强

## Feasibility Summary

### 字数统计与阅读时间预估

| 项目 | 可行性 | 方案 |
|---|---|---|
| 字数统计 | 高 | 构建时从 `post.body`（原始 Markdown）计算中文字符数 + 英文单词数 |
| 阅读时间 | 高 | 基于字数自动推算：中文 ~300 字/分钟，英文 ~200 词/分钟 |
| 展示位置 | 高 | 文章列表卡片、详情页 meta 区，替换当前手动 `readTime` 为自动计算值 |

**实现方式**：新增 `src/lib/word-count.js`，导出 `computeReadingStats(body: string)` 函数返回 `{ characters, wordCount, readTimeMinutes, readTimeDisplay }`。在 `blogEntryToItem` 或页面组件中调用。

**兼容现有手动 `readTime`**：若 frontmatter 已有 `readTime`，优先使用手动值；否则自动计算。

### 在线文章阅读量统计（可行性评估）

| 方案 | 描述 | 优点 | 缺点 | 推荐度 |
|---|---|---|---|---|
| **A. Cloudflare Pages Function + KV** | 在 `functions/api/views/` 创建一个 Serverless Function，写入/读取 KV | 完全自控，与现有部署栈一致 | 需要编写 Worker 代码，KV 有每日读写限制（免费 1000 次/天写入） | ⭐⭐⭐ |
| **B. CountAPI** | `https://api.countapi.xyz/hit/calvin-xia-blog/slug` | 零配置，一个 `<img>` 或 `fetch` 即可 | 第三方依赖，稳定性不可控，计数不可迁移 | ⭐⭐ |
| **C. Cloudflare Analytics Engine** | 通过 `wrangler.toml` 配置 Analytics Engine 绑定，在 Worker 中写入 | 官方方案，无 KV 限制 | 需要 Beta 申请，SQL 查询语法学习成本 | ⭐ |
| **D. 暂不实施** | 仅做字数/阅读时间/归档 | 零风险 | 缺少阅读量数据 | — |

**推荐**：本阶段先实施方案 A 的基础版本（简单的 `GET` 查询 + `POST` 增量），作为 Cloudflare Pages Function 放置于 `functions/api/views/[[slug]].ts`。若实施复杂度超出预期，降级为方案 D。

**隐私考量**：阅读量统计仅为数字累加，不记录访问者 IP、UA 或其他个人信息，符合 GDPR 隐私要求。

### 归档页时间线

| 项目 | 可行性 | 方案 |
|---|---|---|
| 页面结构 | 高 | 新增 `src/pages/articles/archive.astro`，纯静态生成 |
| 数据来源 | 高 | `getCollection('blog')` → 按年份分组 → 按日期排序 |
| 视觉风格 | 高 | 垂直时间线 + 年份标题 + 文章条目（日期 + 标题），CSS-only |
| 入口位置 | 高 | 文章首页 `/articles/` 内部放置 "归档" 按钮或导航链接 |

### SPA 增强过渡

| 项目 | 可行性 | 方案 |
|---|---|---|
| 方向性动画 | 高 | 利用 Astro View Transitions `data-astro-transition` 属性区分离开/进入方向 |
| 卡片 ↔ 详情 morph | 中 | 为列表卡片和详情 `h1` 设置相同 `view-transition-name`，实现标题 morph |
| 滚动位置恢复 | 中高 | 利用浏览器原生 `sessionStorage` + Astro `astro:after-swap` 事件恢复滚动位置 |
| 列表状态保持 | 中高 | 搜索/过滤参数通过 `history.state` 或 `URL searchParams` 保持 |

**重要限制**：`view-transition-name` 在 Astro 中必须**全局唯一**。若多张卡片都声明相同的 `view-transition-name`（用于 morph 到详情），会导致 View Transitions API 跳过动画。因此**不能**对多卡片列表使用 morph 过渡。

**推荐方案**：
1. 列表 → 详情：`slide-in-right` 类动画（新页面从右侧滑入），通过 CSS `::view-transition-new` 的 `clip-path` 或 `transform` 实现
2. 详情 → 列表：反向动画（详情从左侧滑出），通过 `data-direction` 判断方向
3. 详情页滚动恢复：`astro:after-swap` 事件中从 `sessionStorage` 读取并恢复
4. 列表页搜索/过滤状态：通过 URL `searchParams` 序列化，导航返回时自动恢复

## Recommended Architecture

### 文件结构

```
src/
├── lib/
│   └── word-count.js              # 字数统计 & 阅读时间计算
├── pages/
│   ├── articles/
│   │   ├── [...slug].astro        # 修改：展示自动 readTime
│   │   └── archive.astro          # 新建：归档页
│   └── articles.astro             # 修改：卡片展示 readTime、归档入口
├── styles/
│   └── global.css                 # 修改：归档时间线样式、过渡动画
└── scripts/
    └── article-transitions.js     # 修改：增加滚动恢复逻辑
functions/
└── api/
    └── views/
        └── [[slug]].ts            # 新建（可选）：阅读量 Worker
tests/
└── phase-6-stats-archive.test.js  # 新建：字数统计 + 归档数据测试
wrangler.jsonc                     # 修改（可选）：KV namespace 绑定
```

### 字数统计算法

```
总阅读时间 = 中文字符数 / 300 + 英文单词数 / 200
显示格式:
  - < 1 分钟 → "< 1 分钟"
  - 1-59 分钟 → "X 分钟"
  - ≥ 60 分钟 → "X 小时 Y 分钟"
字数显示: "约 X,XXX 字"
```

`body` 从 `render(post)` 后的 `post.body` 获取——这是原始的 Markdown 文本（`getCollection` 返回的 entry 有 `body` 属性）。

### 归档页数据流

```
getCollection('blog', non-draft)
  → group by year (data.date.substring(0, 4))
  → sort within year by date desc
  → render timeline HTML
```

### 过渡增强数据流

```
列表页 → 详情页:
  1. 点击文章卡片链接
  2. ClientRouter 拦截，设置 direction=forward
  3. CSS ::view-transition-new 执行 slide-in 动画
  4. 保存列表页滚动位置到 sessionStorage

详情页 → 列表页:
  1. 点击返回或浏览器后退
  2. astro:after-swap 恢复列表页滚动位置
  3. 恢复搜索/过滤状态（从 URL params 读取）
```

## Requirements

### Requirement: 字数统计与阅读时间

#### Scenario: 自动计算字数
- **WHEN** 构建时处理文章
- **THEN** 系统从 Markdown body 自动计算总字数（中文按字符数、英文按单词数）
- **AND** 剔除 frontmatter、HTML 标签、图片链接等非正文内容

#### Scenario: 显示阅读时间
- **WHEN** 用户在文章列表或详情页查看
- **THEN** 每篇文章显示自动计算的预估阅读时间
- **AND** 格式为 "< 1 分钟" / "X 分钟" / "X 小时 Y 分钟"
- **AND** 若 frontmatter 手动指定 `readTime`，优先使用手动值

#### Scenario: 文章列表卡片展示
- **WHEN** 用户在文章列表页浏览
- **THEN** 每张文章卡片在日期旁展示字数（如 "约 3,500 字"）和阅读时间

#### Scenario: 详情页展示
- **WHEN** 用户打开文章详情页
- **THEN** 文章 meta 区域展示字数和阅读时间

### Requirement: 归档页时间线

#### Scenario: 归档入口
- **WHEN** 用户访问文章首页 `/articles/`
- **THEN** 页面上方或侧边有 "文章归档" 入口链接
- **AND** 点击进入 `/articles/archive/`

#### Scenario: 按年份分组
- **WHEN** 用户访问归档页
- **THEN** 文章按年份分组显示
- **AND** 年份从新到旧排列
- **AND** 每组内文章按日期从新到旧排列

#### Scenario: 时间线条目
- **WHEN** 查看文章归档
- **THEN** 每条条目显示日期（MM-DD）、标题、分类
- **AND** 标题可点击进入文章详情页

#### Scenario: 空状态
- **WHEN** 某年没有文章
- **THEN** 该年份不出现在归档中

### Requirement: SPA 增强过渡

#### Scenario: 列表到详情过渡
- **WHEN** 用户从文章列表点击文章卡片
- **THEN** 页面使用方向性过渡动画（左滑/淡入）
- **AND** 过渡时间 ≤ 250ms

#### Scenario: 详情返回到列表
- **WHEN** 用户从详情页返回列表页
- **THEN** 列表页滚动位置恢复到离开前的位置
- **AND** 搜索/过滤状态保持不变（若通过 URL 参数存储）

#### Scenario: 浏览器后退/前进
- **WHEN** 用户使用浏览器后退/前进按钮
- **THEN** 过渡动画和滚动恢复正常工作

#### Scenario: reduced-motion
- **WHEN** 用户启用了 `prefers-reduced-motion: reduce`
- **THEN** 过渡动画禁用，回退为瞬时切换

## Resolved Decisions

- **字数统计时机**：构建时（`blogEntryToItem` 调用时或页面组件中），不运行时计算
- **阅读时间覆盖**：frontmatter 手动 `readTime` > 自动计算值
- **归档页路由**：`/articles/archive/`
- **归档分组粒度**：按年分组，不做月分组（避免空组过多）
- **过渡方向判断**：通过 `history.state.direction` 或 Astro `navigate` 事件的 `direction` 属性
- **滚动恢复方式**：`sessionStorage` + `astro:after-swap` 事件
- **阅读量统计**：本阶段先做方案 A（CF Pages Function + KV）的基础设计，若实施受阻则降级为仅做字数/归档/过渡
