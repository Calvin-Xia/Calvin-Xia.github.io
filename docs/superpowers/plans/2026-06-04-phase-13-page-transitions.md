# Phase 13: 全站页面过渡动画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Astro ClientRouter 过渡动画从 `/articles/` 和 `/updates/` 扩展到全站所有内部导航，在设备条件支持时提供平滑的 fade 过渡效果。

**Architecture:** 泛化 `article-transitions.js` 为 `page-transitions.js`，移除路径限制使所有内部链接走 ClientRouter，文章方向性动画作为子集保留。CSS 无需改动。

**Tech Stack:** Astro ClientRouter (View Transitions API), vanilla JS, CSS animations

---

## File Structure

| File | Operation | Responsibility |
|------|-----------|---------------|
| `src/scripts/page-transitions.js` | Create | 泛化页面过渡引擎（从 `article-transitions.js` 重命名） |
| `src/scripts/article-transitions.js` | Modify | 向后兼容 re-export shim |
| `src/scripts/article-runtime.js` | Modify | 从 `page-transitions.js` 导入 |
| `tests/page-transitions.test.js` | Create | 泛化过渡单元测试 |
| `tests/article-transitions.test.js` | Modify | 向后兼容测试 re-export |
| `tests/phase-2-5-integration.test.js` | Modify | 更新导入路径 |
| `tests/phase-13-integration.test.js` | Create | 全站过渡集成测试 |

**No CSS changes. No BaseLayout.astro changes. No new dependencies.**

---

### Task 1: 重命名并泛化过渡模块

**Files:**
- Create: `src/scripts/page-transitions.js` (from `article-transitions.js`)
- Modify: `src/scripts/article-transitions.js` (→ re-export shim)

- [ ] **Step 1: 复制源文件**

```bash
cp src/scripts/article-transitions.js src/scripts/page-transitions.js
```

- [ ] **Step 2: 修改 `shouldUseClientRouter()` 移除路径限制**

在 `src/scripts/page-transitions.js` 中，找到 `shouldUseClientRouter` 函数的最后一行：

```js
return isAllowedArticleTransitionPath(url.pathname);
```

改为：

```js
return true;
```

这使得所有内部链接都走 ClientRouter，不再限制于文章路径。

- [ ] **Step 3: 重命名 `markArticleTransitionLinks()` → `markTransitionLinks()`**

将函数名改为 `markTransitionLinks`，并修改逻辑不再给非文章链接添加 `data-astro-reload`：

```js
export function markTransitionLinks(root = document, locationRef = window.location) {
    root.querySelectorAll?.('a[href]').forEach((anchor) => {
        if (shouldUseClientRouter(anchor, locationRef)) {
            anchor.removeAttribute('data-astro-reload');
            const url = new URL(anchor.getAttribute('href') || '', locationRef.href);
            if (isAllowedArticleTransitionPath(url.pathname)) {
                anchor.setAttribute('data-article-transition', 'true');
            }
        }
    });
}
```

**关键变化:** 移除了 `else if` 分支，不再给任何链接添加 `data-astro-reload`。

- [ ] **Step 4: 重命名 `initArticleTransitions()` → `initPageTransitions()`**

将函数名改为 `initPageTransitions`，内部调用改为使用新函数名：

```js
export function initPageTransitions(root = document, windowRef = window) {
    markTransitionLinks(root, windowRef.location);
    const documentRef = getDocumentForRoot(root, windowRef);
    initSwapFadeFallback(documentRef, windowRef);
    initArticleNavigationState(documentRef, windowRef);
}
```

- [ ] **Step 5: 移除 click boundary listener**

删除 `initPageTransitions` 函数末尾的 click boundary listener 代码块（原 `initArticleTransitions` 中 line 244-256）：

```js
// 删除以下代码
if (clickBoundaryDocuments.has(documentRef)) {
    return;
}

clickBoundaryDocuments.add(documentRef);
documentRef.addEventListener('click', (event) => {
    const anchor = getAnchorFromEvent(event);
    if (!anchor || shouldUseClientRouter(anchor, windowRef.location)) {
        return;
    }

    anchor.setAttribute('data-astro-reload', '');
}, true);
```

同时删除不再使用的 `clickBoundaryDocuments` 常量：

```js
// 删除
const clickBoundaryDocuments = new WeakSet();
```

- [ ] **Step 6: 添加向后兼容导出**

在 `src/scripts/page-transitions.js` 文件末尾添加别名导出：

```js
// Backward compatibility aliases
export { markTransitionLinks as markArticleTransitionLinks };
export { initPageTransitions as initArticleTransitions };
```

- [ ] **Step 7: 替换 `article-transitions.js` 为兼容层**

将 `src/scripts/article-transitions.js` 的全部内容替换为：

```js
export {
    getArticleTransitionDirection,
    getSwapFadeDurationMs,
    shouldUseClientRouter,
    markTransitionLinks as markArticleTransitionLinks,
    initPageTransitions as initArticleTransitions,
    saveArticleListScrollPosition,
    restoreArticleListScrollPosition,
} from './page-transitions.js';
```

- [ ] **Step 8: 验证模块加载**

```bash
node -e "import('./src/scripts/page-transitions.js').then(m => console.log(Object.keys(m))).catch(e => console.error(e))"
```

Expected: 打印导出函数列表，包括 `shouldUseClientRouter`, `markTransitionLinks`, `initPageTransitions` 等。

- [ ] **Step 9: Commit**

```bash
git add src/scripts/page-transitions.js src/scripts/article-transitions.js
git commit -m "refactor: generalize article-transitions to page-transitions for full-site ClientRouter"
```

---

### Task 2: 更新导入路径

**Files:**
- Modify: `src/scripts/article-runtime.js`

- [ ] **Step 1: 更新导入语句**

在 `src/scripts/article-runtime.js` 中，将：

```js
import { initArticleTransitions } from './article-transitions.js';
```

改为：

```js
import { initPageTransitions } from './page-transitions.js';
```

将函数调用从：

```js
initArticleTransitions(document, window);
```

改为：

```js
initPageTransitions(document, window);
```

- [ ] **Step 2: 验证语法**

```bash
node --check src/scripts/article-runtime.js
```

Expected: 无输出（语法正确）

- [ ] **Step 3: Commit**

```bash
git add src/scripts/article-runtime.js
git commit -m "refactor: import page-transitions in article-runtime"
```

---

### Task 3: 重命名并更新测试文件

**Files:**
- Create: `tests/page-transitions.test.js` (from `article-transitions.test.js`)
- Modify: `tests/article-transitions.test.js` (→ re-export shim)
- Modify: `tests/phase-2-5-integration.test.js`

- [ ] **Step 1: 复制测试文件**

```bash
cp tests/article-transitions.test.js tests/page-transitions.test.js
```

- [ ] **Step 2: 更新导入路径**

在 `tests/page-transitions.test.js` 中，将所有：

```js
await import('../src/scripts/article-transitions.js')
```

改为：

```js
await import('../src/scripts/page-transitions.js')
```

将 describe 名称从 `'article transitions'` 改为 `'page transitions'`。

- [ ] **Step 3: 新增测试用例 — 全站链接允许 ClientRouter**

在 `tests/page-transitions.test.js` 的 `describe('page transitions', ...)` 块末尾添加：

```js
test('shouldUseClientRouter allows all internal links', async () => {
    const { shouldUseClientRouter } = await import('../src/scripts/page-transitions.js');
    const location = new URL('https://calvin-xia.cn/');

    const worksAnchor = new FakeAnchor('/works/');
    assert.equal(shouldUseClientRouter(worksAnchor, location), true);

    const aboutAnchor = new FakeAnchor('/about/');
    assert.equal(shouldUseClientRouter(aboutAnchor, location), true);

    const toolsAnchor = new FakeAnchor('/works/tools/');
    assert.equal(shouldUseClientRouter(toolsAnchor, location), true);

    const externalAnchor = new FakeAnchor('https://example.com/');
    assert.equal(shouldUseClientRouter(externalAnchor, location), false);

    const mailtoAnchor = new FakeAnchor('mailto:test@example.com');
    assert.equal(shouldUseClientRouter(mailtoAnchor, location), false);
});
```

- [ ] **Step 4: 新增测试用例 — markTransitionLinks 不添加 data-astro-reload**

在 `tests/page-transitions.test.js` 中添加：

```js
test('markTransitionLinks does not add data-astro-reload to internal links', async () => {
    const { markTransitionLinks } = await import('../src/scripts/page-transitions.js');
    const anchor = new FakeAnchor('/works/');
    const documentRef = new FakeDocument(anchor);
    const location = new URL('https://calvin-xia.cn/');

    markTransitionLinks(documentRef, location);

    assert.equal(anchor.attributes.has('data-astro-reload'), false);
    assert.equal(anchor.attributes.has('data-article-transition'), false);
});

test('markTransitionLinks adds data-article-transition to article links', async () => {
    const { markTransitionLinks } = await import('../src/scripts/page-transitions.js');
    const anchor = new FakeAnchor('/articles/test-post/');
    const documentRef = new FakeDocument(anchor);
    const location = new URL('https://calvin-xia.cn/');

    markTransitionLinks(documentRef, location);

    assert.equal(anchor.attributes.get('data-article-transition'), 'true');
    assert.equal(anchor.attributes.has('data-astro-reload'), false);
});
```

- [ ] **Step 5: 替换 `article-transitions.test.js` 为兼容层测试**

将 `tests/article-transitions.test.js` 的全部内容替换为：

```js
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('article-transitions backward compatibility', () => {
    test('re-exports from page-transitions', async () => {
        const mod = await import('../src/scripts/article-transitions.js');
        assert.equal(typeof mod.getArticleTransitionDirection, 'function');
        assert.equal(typeof mod.getSwapFadeDurationMs, 'function');
        assert.equal(typeof mod.shouldUseClientRouter, 'function');
        assert.equal(typeof mod.markArticleTransitionLinks, 'function');
        assert.equal(typeof mod.initArticleTransitions, 'function');
        assert.equal(typeof mod.saveArticleListScrollPosition, 'function');
        assert.equal(typeof mod.restoreArticleListScrollPosition, 'function');
    });

    test('markArticleTransitionLinks works via re-export', async () => {
        const { markArticleTransitionLinks } = await import('../src/scripts/article-transitions.js');
        assert.equal(typeof markArticleTransitionLinks, 'function');
    });
});
```

- [ ] **Step 6: 检查 `phase-2-5-integration.test.js`**

读取 `tests/phase-2-5-integration.test.js`，检查是否有对 `article-transitions.js` 的导入引用。如果有，更新为 `page-transitions.js` 或保留兼容层导入（兼容层会自动 re-export）。

- [ ] **Step 7: 运行新测试**

```bash
node --test tests/page-transitions.test.js tests/article-transitions.test.js
```

Expected: 所有测试通过

- [ ] **Step 8: Commit**

```bash
git add tests/page-transitions.test.js tests/article-transitions.test.js tests/phase-2-5-integration.test.js
git commit -m "test: rename and update transition tests for full-site ClientRouter"
```

---

### Task 4: 集成测试和验证

**Files:**
- Create: `tests/phase-13-integration.test.js`

- [ ] **Step 1: 创建集成测试文件**

创建 `tests/phase-13-integration.test.js`：

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');

function readSource(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('Phase 13 Integration', () => {
    it('page-transitions.js exports expected API', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.match(source, /export function shouldUseClientRouter/);
        assert.match(source, /export function markTransitionLinks/);
        assert.match(source, /export function initPageTransitions/);
        assert.match(source, /export function getArticleTransitionDirection/);
        assert.match(source, /export function getSwapFadeDurationMs/);
    });

    it('page-transitions.js allows all internal links', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.match(source, /return true/);
    });

    it('page-transitions.js does not add data-astro-reload to internal links', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.doesNotMatch(source, /setAttribute\(\s*['"]data-astro-reload['"]\s*,\s*['"]['"]\s*\)/);
    });

    it('page-transitions.js has no click boundary listener', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.doesNotMatch(source, /clickBoundaryDocuments/);
    });

    it('article-transitions.js is a re-export shim', () => {
        const source = readSource('src/scripts', 'article-transitions.js');
        assert.match(source, /from ['"]\.\/page-transitions\.js['"]/);
        assert.match(source, /export \{/);
    });

    it('article-runtime.js imports from page-transitions', () => {
        const source = readSource('src/scripts', 'article-runtime.js');
        assert.match(source, /from ['"]\.\/page-transitions\.js['"]/);
        assert.match(source, /initPageTransitions/);
    });

    it('backward compatibility aliases exist in page-transitions.js', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.match(source, /markTransitionLinks as markArticleTransitionLinks/);
        assert.match(source, /initPageTransitions as initArticleTransitions/);
    });
});
```

- [ ] **Step 2: 运行集成测试**

```bash
node --test tests/phase-13-integration.test.js
```

Expected: 所有 7 个测试通过

- [ ] **Step 3: 运行全部测试**

```bash
npm test
```

Expected: 所有测试通过，包括新的 `page-transitions.test.js`、兼容层 `article-transitions.test.js`、`phase-13-integration.test.js`、和现有测试

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

Expected: 构建成功，无错误

- [ ] **Step 5: Commit**

```bash
git add tests/phase-13-integration.test.js
git commit -m "test: add Phase 13 integration tests for full-site transitions"
```

---

### Task 5: 手动验证

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 验证全站导航无整页刷新**

在浏览器中打开 DevTools Network 面板，测试以下导航路径，确认请求类型为 `fetch`（而非 `document`）：

1. 首页 → 文章列表: 点击 `/articles/` 链接
2. 首页 → 作品: 点击 `/works/` 链接
3. 首页 → 关于: 点击 `/about/` 链接
4. Header 导航: 点击所有导航链接
5. 文章列表 → 文章详情: 点击任意文章卡片
6. 文章详情 → 文章列表: 点击返回按钮
7. 作品 → 工具: 点击工具链接

- [ ] **Step 3: 验证动画行为**

1. 非文章导航: 应有 fade 过渡（内容淡入淡出 + 轻微上移）
2. 文章列表→详情: 应有从右滑入动画
3. 文章详情→列表: 应有从左滑入动画

- [ ] **Step 4: 验证降级**

1. 在 DevTools 中模拟 `prefers-reduced-motion: reduce`，确认无动画
2. 刷新页面，确认所有内容正常显示（无隐藏元素）

- [ ] **Step 5: 验证滚动位置保存**

1. 在文章列表页向下滚动
2. 点击一篇文章进入详情
3. 点击返回
4. 确认列表页滚动位置恢复到之前的位置

- [ ] **Step 6: 最终 Commit**

```bash
git add -A
git commit -m "feat: Phase 13 complete — full-site page transitions with ClientRouter"
```

---

## 验收标准

完成所有 Task 后，验证以下验收标准：

- [ ] 所有站内链接走 ClientRouter，不再有 `data-astro-reload` 强制刷新
- [ ] 非文章导航使用 `siteViewEnter`/`siteViewExit` fade 动画（240ms）
- [ ] 文章列表↔详情保留 `articleSlideFrom*` 方向性 slide 动画
- [ ] 文章列表页滚动位置在导航后正确保存/恢复
- [ ] 非 View Transitions 浏览器使用 swap-fade 降级
- [ ] `prefers-reduced-motion: reduce` 时禁用所有动画
- [ ] `article-transitions.js` re-export 保持现有测试和导入可用
- [ ] `npm test` 全部通过
- [ ] `npm run build` 成功
