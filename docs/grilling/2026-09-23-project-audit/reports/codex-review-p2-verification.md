# 独立复核：Codex 自动审查的 P2 意见（`article-runtime` 早退）

- 来源：PR #15 上 `chatgpt-codex-connector[bot]` 的 inline 意见，位置 `src/scripts/article-runtime.js:17`。
- 复核方式：主管另开一个只读 agent（`codex-review-check`，模型 `xiaomi/mimo-v2.6-pro`）独立判断，未改动仓库文件。
- 主管复核：结论逐条核验通过。其中「`tests/article-scope.test.js:74-76` 用正则钉死了旧形状」经确认属实，修复时已同步修改；该 agent 未能执行的真实浏览器观测由主管补做（`04-risks.md` §8，泄漏 7 次 → 0 次）。
- 下文为该 agent 的原始报告，逐字保留。

---

# 复核结论

对象：PR #15 自动审查意见 [P2] "Run article cleanup before returning on non-article routes"
（`src/scripts/article-runtime.js:17`）。方法：只读代码复核 + Node 假 DOM 实验（`node --input-type=module -e`，未写仓库文件）。

## 1. 是否成立

**成立**。上一篇的清理唯一发生地就是 `initArticleEnhancements` 入口处：
- `src/lib/article-enhancements/article-enhancements.js:26-27` 先执行 `enhancementCleanups.get(documentRef)?.()`（上一篇的 cleanup 存于 `:60`），`:53-56` 的 cleanup 依次调用选区工具条/阅读进度/逐段渐显三个子 cleanup。
- 没有别的清理路径：子模块的自清理（`selection-toolbar.js:162`、`section-reveals.js:39-40`、`reading-progress.js:203-204`）都以「同一个元素实例」为键（WeakMap），而 ClientRouter 换 body 后容器是新节点，永远匹配不到旧条目；`src/scripts/page-transitions.js` 全文无增强清理（其 WeakMap 只管自身计时器 `page-transitions.js:113-115`）。
- `article-runtime.js:15-18` 在 `!articleContent` 时直接 `return`（Codex 指向的 `:17`），跳过唯一清理入口。且 `document` 对象在 ClientRouter 导航中是持续存在的（body 整体替换：`node_modules/astro/dist/transitions/swap-functions.js:67,174`），所以旧 cleanup 确实还能被 `enhancementCleanups` 找到——只是没人调用。
- 实验证实（假 DOM，同一持久 document）：文章页 init 后 `win scroll=2, resize=1, doc keydown=1, 活跃 IO=2`；跳非文章页什么都不做则数字不变；补一次 `initArticleEnhancements(document)` 后全部归零、2 个 IO 全部 disconnect。

## 2. 残留清单（≥3 个标题、未开 reduced-motion 的典型文章页）

绑定在**持久对象**上、会持续生效的：
1. `window` scroll ×2：`reading-progress.js:253`（`update`）+ `selection-toolbar.js:231`（`handleScroll`）。
2. `window` resize ×1：`reading-progress.js:254`（`handleResize`）。
3. `document` keydown ×1：`selection-toolbar.js:230`（`handleKeydown`，仅 Escape 时 `hideToolbar`，`selection-toolbar.js:219-222`，不 preventDefault）。
4. IntersectionObserver（阅读进度）：`reading-progress.js:235-245`，observe 各标题元素（已脱离 DOM）。
5. IntersectionObserver（逐段渐显）：`section-reveals.js:58-72`，observe H2/H3/H4/FIGURE/BLOCKQUOTE/PRE/TABLE 直属子元素（已脱离 DOM）。

持有的脱离 DOM：上述 handler 及 `enhancementCleanups` 值闭包（`article-enhancements.js:53-60`，键是持久的 document）共同闭包持有旧 `contentRoot`/`tocRoot`/`headings`/`toolbar`/`elements`（`reading-progress.js:259-275`、`selection-toolbar.js:233-242`、`section-reveals.js:74-78`）→ 整棵脱离的文章正文 + 目录 DOM 被保留。

条件性说明：阅读进度一组只在 `shouldRenderToc(headings)`（≥3 标题，`reading-progress.js:3,18-20,208-214`）才绑定，否则返回空 cleanup；逐段渐显在 `prefers-reduced-motion` 或无匹配子元素时提前返回（`section-reveals.js:43-51`）；选区工具条无条件绑定（`selection-toolbar.js:226-231`）。

无关紧要的项（直接说清）：
- 绑在元素上的监听器（`selection-toolbar.js:226-229`、`reading-progress.js:256-268` 目录链接 click、`heading-index.js:90` 目录 keydown、`image-lightbox.js:488-489,362-390`）随节点脱离永不触发，只作为被保留在图里的死重量。
- 灯箱 dialog（`image-lightbox.js:340`）与复制反馈条（`selection-toolbar.js:111`）挂在旧 `document.body` 上，body 被整体替换时一并丢弃（`swap-functions.js:67,174`），**不在**新页面残留可见 DOM。
- `initImageLightbox` 不在 cleanup 清单里（`article-enhancements.js:53-56` 未含它）但其监听全绑元素，无功能影响。

## 3. 严重性判断

**P2 合当：真实的生命周期缺陷，内存 + 空转 CPU，无用户可见故障；但有界、不累积。**
- 无功能异常：残留 handler 只写脱离节点（`setProgress`/`setActiveTocItem` → `tocRoot`，`reading-progress.js:55-93`；`hideToolbar` → `toolbar`，`selection-toolbar.js:224`），Escape 的 keydown 不拦截事件（`selection-toolbar.js:219-222`）。
- 内存：上一整篇文章正文 + 目录 DOM（含 img 元素）被保留，直到下一次 `initArticleEnhancements` 覆盖 `enhancementCleanups` 条目（`article-enhancements.js:26-27`）。实验第 4 步证实 article→article 会顺带清理旧篇，所以任意时刻只滞留「一篇」的量——不是每次导航都翻倍的泄漏。
- CPU：离开文章后，非文章页每次滚动都会跑 `update`（对全部标题逐个 `getBoundingClientRect` + DOM 写，`reading-progress.js:149-158,183-193,259-265`）和 `handleScroll`（`selection-toolbar.js:224`），直到下次进文章。
- 可观察/可复现：假 DOM 实验里观察 window/document 监听器计数与 FakeIO 的 `disconnected`（本报告第 1 节数字即复现结果）。浏览器侧：DevTools 控制台 `getEventListeners(window).scroll` 在站内跳转前后对比；或 Memory 堆快照搜 `Detached HTMLArticleElement`，retainer 指向 `update`/cleanup 闭包。

## 4. 最小修复方案

改 `src/scripts/article-runtime.js:15-21` 一处：让「无文章」也走 `initArticleEnhancements`（该函数本来就先清理、再判空返回，`article-enhancements.js:26-35`）：

```js
const articleContent = findArticleContent();
initArticleEnhancements(articleContent || document);   // 原来在 :20，提前并兜底传 document
if (!articleContent) {
    return;                                            // 只拦 mermaid
}
void renderArticleMermaid(articleContent);
```

为什么最小：不新增 API、不引入新生命周期钩子，复用既有清理路径，净改动 2 行；mermaid 仍只对文章跑。等价写法是 `initArticleEnhancements(document)`（`resolveArticleContent(document)` 会解析出同一容器，`article-scope.js:29-40`），但 `articleContent || document` 更贴合批次③「只作用于文章正文容器」的意图。
取舍比较：
- 变体 b：导出 `cleanupArticleEnhancements(documentRef)` 并在 early-return 分支调用。意图直白，但多一个公共 API、两处调用点，清理逻辑易漂移，改动反而更大。
- 变体 c：挂到 `astro:before-swap`/`astro:after-swap`（`page-transitions.js:219,233` 风格）。对未来的入口更稳健，但改变清理时机（swap 时而非 page-load 时），还要动本无关的 transitions 模块，爆炸半径大。当前只有 `article-runtime.js` 一个调用方（grep 全库确认），不需要。
注意：`tests/article-scope.test.js:75` 的 `initArticleEnhancements\(articleContent\)` 会因本修复失配，需同步改成 `initArticleEnhancements\(articleContent \|\| document\)`（`:74` 的 early-return 正则在本写法下仍然成立，不用动）。

## 5. 测试建议

现有覆盖——**没有任何测试能发现这个问题**，且一处还反向锁死现状：
- `tests/article-scope.test.js:74` 用正则钉死了 `if (!articleContent) { return; }` 这个形状（`:75-76` 钉 `initArticleEnhancements(articleContent)`）——修复必须先改这条断言。
- `tests/phase-2-5-integration.test.js:150-158`：只做源码正则（`enhancementCleanups` 形状），不验行为。
- `tests/article-reveals.test.js:129-142`：行为测试，但只覆盖「同一容器重复 init 时子模块自清理」（`section-reveals.js:39`），不经过 `enhancementCleanups`，测不到 article→非文章 路径。
- `tests/article-progress.test.js:144-151`、`tests/article-selection-toolbar.test.js:157,192,224`：前者是源码正则；后者手动调 cleanup，均不验证运行时会不会调它。

该补的测试（针对可观察量 = window/document 监听器计数 + observer 的 `disconnected` 标志）：
1. 行为测试（新建 `tests/article-enhancements-cleanup.test.js`）：复用 `tests/article-reveals.test.js:29-49` 的 FakeIntersectionObserver 与 `tests/article-selection-toolbar.test.js:60-143` 的 fake window/document 手法；同一 fake document 上先 `initArticleEnhancements(articleRoot)`（≥3 个 h2 + 带 `[data-article-toc-list]` 的 tocRoot），再 `initArticleEnhancements(无文章的根)`，断言 window `scroll`/`resize` 计数归零、document `keydown` 归零、全部 FakeIO `disconnected === true`。（本次复核的实验脚本即此结构，可直接落成测试。）
2. 接线回归（改 `tests/article-scope.test.js:75`）：断言新形状 `initArticleEnhancements\(articleContent \|\| document\)`，保证无文章时也进清理路径。第 1 条锁库契约、第 2 条锁 article-runtime 接线，缺一则本 bug 可再次引入。

## 6. 我没能验证的部分

- 真实浏览器未跑（只做了 Node 假 DOM 实验）：DevTools `getEventListeners` / 堆快照的观察方法给出但未执行；img 解码位图是否随脱离节点保留属浏览器实现细节，未验证。
- ClientRouter「body 整体替换、document 持久」是读 `node_modules/astro/dist/transitions/swap-functions.js:52-67,174` 与 `src/layouts/BaseLayout.astro:17,111`（`<ClientRouter fallback="swap" />`）得出，未做浏览器级验证。
- 被保留 DOM 的实际字节数未测量（需堆快照）。
- 实验脚本第 5 步（重复 2→3 的冗余场景）因命令超时未打印完，不影响结论（2→3 已覆盖同一路径）。
