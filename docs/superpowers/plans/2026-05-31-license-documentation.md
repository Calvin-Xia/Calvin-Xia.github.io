# License Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update README.md, package.json, and about.astro to document the dual-license structure (MIT for code, CC BY-NC-SA 4.0 for blog articles).

**Architecture:** Add license documentation to three locations: README.md (developer-facing), package.json (tooling-facing), and about.astro (user-facing). Each change is independent and can be implemented in any order.

**Tech Stack:** Markdown, JSON, Astro components

---

## Context

The repository uses a dual-license structure:
- **Code** (all source code): MIT License
- **Blog articles** (`src/content/blog/*.md`): CC BY-NC-SA 4.0

The `LICENSE` file has been updated to reflect this. Now we need to update three other locations to maintain consistency.

## Current State

| File | Current License Reference | Needed Change |
|------|--------------------------|---------------|
| `README.md` | No license section | Add License section with dual-license explanation |
| `package.json` | No `license` field | Add `"license": "MIT"` field |
| `src/pages/about.astro` | Generic copyright notice | Update to reflect dual-license structure |

---

### Task 1: Add License Section to README.md

**Files:**
- Modify: `README.md:196-202` (before "相关说明文档" section)

- [ ] **Step 1: Read the current README.md structure**

Read `README.md` to understand the current section order and find the insertion point.

Current sections:
1. 项目标题 + 简介
2. 当前结构
3. 本地开发
4. 环境配置
5. 常用命令
6. 内容维护
7. 推荐验证流程
8. CI/CD
9. 相关说明文档

- [ ] **Step 2: Add License section before "相关说明文档"**

Insert the following section at line 196 (before "## 相关说明文档"):

```markdown
## 许可证

本项目采用双重许可结构：

| 组件 | 许可证 | 范围 |
|------|--------|------|
| 源代码 | [MIT License](./LICENSE) | `src/`、`scripts/`、`tools/`、`tests/`、配置文件 |
| 博客文章 | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) | `src/content/blog/*.md` |

- **代码**：可自由使用、修改、分发，包括商业用途
- **博客文章**：可分享和改编，但须署名、非商业使用、相同方式共享

详见 [LICENSE](./LICENSE) 文件。
```

- [ ] **Step 3: Verify the change**

Run: `npm run build`
Expected: Build succeeds, no errors

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add license section to README explaining dual-license structure"
```

---

### Task 2: Add License Field to package.json

**Files:**
- Modify: `package.json:5-6` (after `"private": true`)

- [ ] **Step 1: Read the current package.json**

Read `package.json` to understand the current structure.

Current structure:
```json
{
    "name": "calvin-xia-github-io",
    "type": "module",
    "version": "0.0.1",
    "private": true,
    "engines": { ... },
    ...
}
```

- [ ] **Step 2: Add license field**

Insert `"license": "MIT"` after `"private": true` at line 6:

```json
{
    "name": "calvin-xia-github-io",
    "type": "module",
    "version": "0.0.1",
    "private": true,
    "license": "MIT",
    "engines": {
```

**Note:** Since the package is `"private": true`, this field is primarily for documentation purposes. The MIT license applies to the code; blog articles are separately licensed under CC BY-NC-SA 4.0 as documented in LICENSE and README.

- [ ] **Step 3: Verify the change**

Run: `npm run build`
Expected: Build succeeds, no errors

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add license field to package.json"
```

---

### Task 3: Update Copyright Notice on About Page

**Files:**
- Modify: `src/pages/about.astro:13-19` (版权声明 section)

- [ ] **Step 1: Read the current about.astro**

Read `src/pages/about.astro` to understand the current copyright notice.

Current content (lines 13-19):
```astro
<section class="shadowbox legal-stack">
    <h2>版权声明</h2>
    <p class="indent">
        本网站所有原创内容版权归
        <a href="https://github.com/calvin-xia" target="_blank" rel="noopener">Calvin Xia</a>
        所有。未经许可，请勿转载或商业使用。
    </p>
```

- [ ] **Step 2: Update the copyright notice**

Replace lines 14-19 with the following content that reflects the dual-license structure:

```astro
<section class="shadowbox legal-stack">
    <h2>版权声明</h2>
    <p class="indent">
        本网站采用双重许可结构：
    </p>
    <ul class="license-list">
        <li>
            <strong>源代码</strong>：
            <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener">MIT License</a>
            — 可自由使用、修改、分发，包括商业用途
        </li>
        <li>
            <strong>博客文章</strong>：
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>
            — 可分享和改编，但须署名、非商业使用、相同方式共享
        </li>
    </ul>
    <p class="indent">
        详细条款请参阅
        <a href="https://github.com/Calvin-Xia/Calvin-Xia.github.io/blob/main/LICENSE" target="_blank" rel="noopener">LICENSE</a>
        文件。
    </p>
```

- [ ] **Step 3: Add CSS for the license list**

Add the following CSS to `src/styles/global.css` after the `.license-section` styles (around line 1435):

```css
.license-list {
    margin-block: 0.75rem;
    padding-inline-start: 1.5rem;
    list-style: disc;
}

.license-list li {
    margin-block-end: 0.5rem;
    line-height: 1.6;
}

.license-list li::marker {
    color: var(--accent);
}
```

- [ ] **Step 4: Verify the change**

Run: `npm run build`
Expected: Build succeeds, no errors

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Visit: `http://localhost:4321/about/`
Expected: 
- 版权声明部分显示双重许可结构
- 链接可点击，指向正确的许可证页面
- 样式与现有设计一致

- [ ] **Step 6: Commit**

```bash
git add src/pages/about.astro src/styles/global.css
git commit -m "feat: update about page copyright notice to reflect dual-license structure"
```

---

## Verification Checklist

After all tasks complete:

- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] README.md contains License section with dual-license explanation
- [ ] package.json contains `"license": "MIT"` field
- [ ] About page displays dual-license information with correct links
- [ ] All links point to correct license pages
- [ ] Styling matches existing design system

---

## Summary

| Task | File | Change |
|------|------|--------|
| 1 | `README.md` | Add License section before "相关说明文档" |
| 2 | `package.json` | Add `"license": "MIT"` field |
| 3 | `src/pages/about.astro` | Update copyright notice to dual-license |
| 3 | `src/styles/global.css` | Add `.license-list` styles |

Total: 4 files modified, 3 commits
