# 前端视觉重构检查清单

> Sync 2026-05-23: 源码重构与自动验证已同步到本清单。追补主题切换图标、标题换行、Markdown `==...==` 高亮、Astro/Shiki 代码块 light/dark 可读性与 Giscus 消息目标校验后，又完成 code review 发现的 4 项修复（Header scroll 监听器去重、localStorage try-catch、Markdown 工具 restoreInput 渲染、首页发现区 heading 语义）。`npm test` 155/155 通过，`npm run build` 成功生成 19 pages。完整多视口、键盘路径和 legacy preview 项仍保持未完成。

## 阶段 0 - 基线审计与范围固化
- [x] 已确认 `DESIGN.md` 是最终视觉口径来源
- [x] 已确认可见品牌统一为 `Calvin Xia`
- [x] 已确认主导航只包含 `文章 / 作品 / 关于`
- [x] 已确认工具保留在作品体系内
- [x] 已建立页面族群清单
- [x] 已建立状态清单
- [x] 已记录 Worker、RSS、SEO、content schema、publish 流程、R2 上传、local CDN proxy、`.well-known/` 为非改动范围
- [x] 已运行重构前 `npm test`（141/141 通过）
- [x] 已运行重构前 `npm run build`（19 pages built）

## 阶段 1 - 设计系统与主题基础
- [x] `src/styles/global.css` 已建立 light / dark token
- [x] 背景、表面、边框、文字、强调色、语义色、代码块、引用、mark 已有 token
- [x] RGB helper、圆角、阴影、focus ring、motion token 已定义
- [x] token 定义外没有新增组件级 hex 主视觉颜色
- [x] 旧橙、粉、青绿不再作为主视觉色系
- [x] 默认主题固定浅色
- [x] 手动深色主题可以保存到 `calvin-xia-theme`
- [x] 首屏主题初始化避免明显闪烁
- [x] 主题切换更新 `data-theme`、`aria-pressed`、`aria-label` 和 localStorage
- [x] 主题切换派发 `calvin-theme-change`
- [x] 字体栈符合中文标题、中文正文、英文数字、代码场景
- [x] reduced-motion 全局规则已覆盖
- [x] `npm run build` 通过

## 阶段 2 - 站点外壳与基础组件
- [x] Header logo 显示 `Calvin Xia`
- [x] Header logo 链接首页
- [x] Header 主导航为 `文章 / 作品 / 关于`
- [x] Header 保留 `aria-current="page"`
- [x] 工具未进入主导航
- [x] 桌面主题切换控件可用
- [x] 移动端主题切换控件可用
- [x] 移动端导航和主题切换触控目标不小于 `44px`
- [x] Footer 使用新 token 和短文案
- [x] DynamicBackground 已替换为低噪声背景
- [x] SkipLink 键盘可见且不遮挡主要内容
- [x] TransitionIndicator 使用统一 loading 和 motion token
- [x] 按钮、链接、tag、badge、输入框、select、textarea、面板、列表、分隔线、tab 状态统一
- [x] focus ring 清楚可见
- [x] disabled 状态清楚且不可误操作
- [ ] 桌面、`768px`、`480px`、`375px` 下 Header 与基础控件无横向溢出
- [x] `npm run build` 通过

## 阶段 3 - 首页与内容入口
- [x] 首页 H1 使用 `Calvin Xia`
- [x] 已移除“欢迎来到 Mr.Xia 的小站”等旧品牌文案
- [x] 当前时间组件保留
- [x] 当前时间组件为辅助层级
- [x] 首页不展示主推文章
- [x] 首页不展示主推作品
- [x] 首页不强化工具快捷重点区
- [x] 首页不使用营销式 CTA 堆叠
- [x] 首页说明文案短、直接、必要
- [x] 文章、作品、关于、最近更新层级清楚
- [x] 最近更新作为轻量索引保留
- [x] 搜索作为辅助入口保留
- [ ] H1 在 `375px` 无单字孤行、横向溢出或挤压
- [ ] H1 在 `480px` 无单字孤行、横向溢出或挤压
- [ ] H1 在 `768px` 无单字孤行、横向溢出或挤压
- [ ] H1 在桌面宽度无不自然断行
- [ ] 首页 light / dark 都可读
- [ ] 首页浏览器 console 无新增错误
- [x] `npm run build` 通过

## 阶段 4 - 文章列表、归档与正文
- [x] 文章列表保持博客流
- [x] 分类筛选可用
- [x] 标签筛选可用
- [x] 搜索建议可用
- [x] 无结果状态可恢复
- [x] 归档页为轻量索引
- [x] 文章正文行宽稳定
- [x] 文章正文行高适合中文阅读
- [x] 标题层级清楚
- [x] 代码块接近 GitHub 清晰风格
- [x] `text` fenced block 和真实代码 fenced block 都使用等宽字体、代码块背景和可读文字颜色
- [x] Astro/Shiki 代码块支持 light / dark 双主题颜色
- [x] 真实 `javascript` fenced block 会输出 Shiki token 级语法高亮
- [x] 引用、表格、KaTeX、图片、图注、mark 样式统一
- [x] Markdown `==...==` 高亮可在文章正文渲染为 `mark`
- [x] 桌面目录右侧 sticky
- [x] 移动端目录顶部折叠
- [x] 阅读进度条保留并适配新风格
- [x] 阅读量保留辅助层级
- [x] 顶部和底部返回入口可用
- [x] Giscus 保留
- [x] Giscus 跟随 light / dark 主题
- [x] Giscus 主题同步等待 iframe 可接收消息，避免本地预览 `postMessage` warning
- [x] 图片灯箱保留并适配新风格
- [ ] 长文检查通过
- [ ] 含图片文章检查通过
- [ ] 含代码或公式文章检查通过
- [ ] 文章页 light / dark 都可读
- [ ] 文章页移动端无横向溢出
- [x] `npm test` 通过
- [x] `npm run build` 通过

## 阶段 4.5 - 文章发布与本地创作辅助页
- [x] `/new-post` 保持开发环境隐藏辅助属性
- [x] `/new-post` 未加入公开导航
- [x] `NewPostForm` 视觉与基础表单统一
- [x] `NewPostForm` 错误和成功状态清楚
- [x] 未保存 `NEW_POST_SECRET`
- [x] 未新增草稿保存
- [x] 未新增 slug / frontmatter 预览
- [x] 未新增重复文件提示增强
- [x] 未新增 dry-run 输出整理
- [x] 未新增前端发布说明
- [x] `tools/api-server.js` 文件写入逻辑保持不变，除非配套测试和 CI 已补齐
- [x] `scripts/publish-post.js` 发布逻辑保持不变，除非配套测试和 CI 已补齐
- [x] `scripts/post-utils.js` 资源处理逻辑保持不变，除非配套测试和 CI 已补齐
- [x] `scripts/markdown-utils.js` Markdown 转换逻辑保持不变，除非配套测试和 CI 已补齐
- [x] 如修改文件操作逻辑，已新增或更新 `.github/workflows/*-check.yml` 或 `*-ci.yml`
- [x] `npm test` 通过
- [x] `npm run build` 通过

## 阶段 5 - 作品、工具与更新日志
- [x] 作品页为轻量项目档案
- [x] 作品页未新增主推项目
- [x] 作品页未新增封面或截图
- [x] 作品页未新增时间线
- [x] 作品页未新增状态字段
- [x] 作品页未新增项目主次分级
- [x] 作品页未新增复杂过滤
- [x] 工具页保留在作品体系下
- [x] Timer、Random Selector、Markdown Tool 并列呈现
- [x] 现有 tab 结构保留
- [x] tab、工具标题和按钮没有解释型文案
- [x] Timer 控件尺寸稳定
- [x] Random Selector 结果反馈中立
- [x] Markdown 工具更接近编辑器界面
- [x] Markdown 工具支持 `==...==` 高亮渲染
- [x] Markdown 工具编辑区与预览区同步滚动可用
- [x] Markdown 工具预览未共享文章正文样式
- [x] 工具输入 localStorage key 稳定
- [x] 工具输入初始化、清空、异常恢复可用
- [ ] 工具 tab 切换没有布局跳动
- [ ] 计时器变化没有布局跳动
- [ ] Markdown 预览更新没有布局跳动
- [x] 更新日志保持轻量记录型内容
- [x] `npm test` 通过
- [x] `npm run build` 通过

## 阶段 6 - 辅助页面、styleguide 与 legacy 验证
- [x] 关于页保留法律、隐私、免责声明和联系方式
- [x] 关于页未增加个人介绍长文
- [x] 404 页面使用短文案和清晰返回入口
- [x] `styleguide.astro` 仅作为内部维护页处理
- [ ] `public/Works.html` 兼容行为可用
- [ ] `public/about.html` 兼容行为可用
- [ ] `public/statement.html` 兼容行为可用
- [ ] `public/styleguide.html` 兼容行为可用
- [ ] `public/timetable.html` 兼容行为可用
- [ ] `public/markdown-to-html-tool.html` 兼容行为可用
- [ ] `public/blog/*` legacy 内容入口未被破坏
- [ ] `public/UpdateLog/*` legacy 内容入口未被破坏
- [x] `npm run build` 通过

## 阶段 7 - 全站质量验证
- [x] `npm test` 通过（155/155）
- [x] `npm run build` 通过（19 pages）
- [x] Header `initHeaderState` scroll 监听器不重复注册（`dataset.headerReady` 去重）
- [x] Header `setTheme` 中 `localStorage.setItem` 包裹 try-catch
- [x] Markdown 工具 `restoreInput()` 恢复内容后触发 `this.render()`
- [x] 首页 home-discovery section 包含 `<h2>` 标题，屏幕阅读器可导航
- [ ] 桌面宽度：首页检查通过
- [ ] 桌面宽度：文章列表检查通过
- [ ] 桌面宽度：文章正文检查通过
- [ ] 桌面宽度：归档检查通过
- [ ] 桌面宽度：作品页检查通过
- [ ] 桌面宽度：工具页检查通过
- [ ] 桌面宽度：Markdown 独立页检查通过
- [ ] 桌面宽度：关于页检查通过
- [ ] 桌面宽度：更新日志检查通过
- [ ] 桌面宽度：`/new-post` 检查通过
- [ ] 桌面宽度：404 检查通过
- [ ] `375px` 移动端无横向滚动、遮挡、文字挤压或按钮过小
- [ ] `480px` 移动端无横向滚动、遮挡、文字挤压或按钮过小
- [ ] `768px` 平板宽度无横向滚动、遮挡、文字挤压或按钮过小
- [ ] `1024px` 宽度布局稳定
- [ ] light 主题正文、链接、按钮、输入框、标签、代码块、表格、Giscus、灯箱和工具界面可读
- [ ] dark 主题正文、链接、按钮、输入框、标签、代码块、表格、Giscus、灯箱和工具界面可读
- [ ] 键盘 Tab 顺序合理
- [ ] focus ring 全站可见
- [ ] skip link 可用
- [ ] 搜索建议可键盘操作
- [ ] 工具 tab 可键盘操作
- [ ] 表单输入 label 和状态清楚
- [ ] 返回入口可用
- [ ] reduced-motion 下没有大幅位移、强滚动动效或阻塞性动画
- [ ] 浏览器 console 无新增错误
- [x] `/articles/00010101-test-assignment/` 当前 console 无新增错误
- [x] 可见文案没有解释设计、教程化、营销化或重复说明
- [x] 新 npm 依赖均记录用途、替代方案和移除成本
- [x] 未引入 `DESIGN.md` 禁止的动效依赖

## 阶段 8 - 分阶段上线与收口
- [x] 已整理每个阶段的变更摘要
- [x] 已整理每个阶段的影响页面
- [x] 已整理每个阶段的验证命令
- [x] 已整理每个阶段的人工测试记录
- [x] 已更新本 checklist 的完成状态
- [x] 已同步更新 `DESIGN.md` 中实现后变化的 token、组件规则或页面规则
- [x] 如项目结构、命令或约定变化，已更新 `AGENTS.md`
- [x] 如项目结构、命令或约定变化，已更新 `README.md`
- [x] 如修改文件操作功能，测试和 `.github/workflows/*-check.yml` 或 `*-ci.yml` 已同步
- [ ] 已完成全站视觉一致性审计
- [ ] 已记录剩余暂缓项和后续增强项

## 剩余暂缓项
- [ ] 使用真实浏览器复核桌面、`1024px`、`768px`、`480px`、`375px` 页面族群。
- [ ] 使用真实浏览器复核 light / dark 切换后的正文、Giscus、灯箱、工具界面和表单。
- [ ] 使用真实浏览器复核 console、键盘 Tab 顺序、skip link、搜索建议、工具 tab 和返回入口。
- [ ] 使用本地 preview 或等价 HTTP 验证 legacy 路径兼容行为。
- [ ] 清理本轮 Browser/CDP 尝试留下的 `.tmp-chrome-*` 临时目录。

## 验收结果
- [ ] 全站视觉从旧暖色玻璃拟态切换到 Calvin Xia 中性轻装饰系统
- [ ] 首页、文章、作品、工具、关于在同一视觉 DNA 下各自任务清楚
- [ ] light / dark 主题完整可读并支持手动切换
- [x] 默认主题固定浅色
- [ ] 文章阅读体验没有退步
- [ ] 工具交互稳定可用
- [x] 发布流程没有被视觉重构隐性改变
- [ ] legacy 跳转兼容没有被破坏
- [ ] 移动端没有横向滚动、遮挡、文字挤压或按钮过小
- [ ] 键盘焦点、aria 状态、skip link 和 focus ring 不退步
- [x] `npm test` 与 `npm run build` 通过（155/155 tests, 19 pages）
