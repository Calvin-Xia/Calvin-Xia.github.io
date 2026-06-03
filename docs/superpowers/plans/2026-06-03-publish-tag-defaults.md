# 发布流程标签默认值修复 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `npm run publish` 流程中标签为空导致测试失败的问题，提供默认标签值"未分类"。

**Architecture:** 同时修改发布脚本的用户提示和 fallback 链，确保无论哪个入口都不会产生空标签。

**Tech Stack:** Node.js, JavaScript

**Status (2026-06-03):** 已实施并验证，尚未提交。

---

## 文件结构

| 文件 | 修改类型 | 职责 |
|------|----------|------|
| `scripts/publish-post.js` | 修改 | 发布脚本入口，用户提示和输入处理 |
| `scripts/post-utils.js` | 修改 | 发布工具函数，标签合并和 fallback 逻辑 |

---

## Task 1: 修改发布脚本标签提示

**Files:**
- Modify: `scripts/publish-post.js:192-193`

- [x] **Step 1: 读取当前代码**

读取 `scripts/publish-post.js` 第192-193行，确认当前逻辑：

```javascript
const tagsInput = (await rl.question('标签 (逗号分隔): ')).trim();
const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [];
```

- [x] **Step 2: 修改标签提示和默认值**

将第192-193行修改为：

```javascript
const tagsInput = (await rl.question('标签 (逗号分隔) [未分类]: ')).trim();
const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : ['未分类'];
```

**变化点：**
- 提示文字从 `标签 (逗号分隔): ` 改为 `标签 (逗号分隔) [未分类]: `
- 空输入时默认值从 `[]` 改为 `['未分类']`

- [x] **Step 3: 验证修改**

读取修改后的代码，确认：
1. 提示文字包含 `[未分类]`
2. 空输入时 `tags` 为 `['未分类']`

- [ ] **Step 4: 提交修改**

本轮未提交，当前修复仍在工作区中。

```bash
git add scripts/publish-post.js
git commit -m "fix(publish): 添加标签默认值提示和回退逻辑"
```

---

## Task 2: 修改 fallback 链默认值

**Files:**
- Modify: `scripts/post-utils.js:190`

- [x] **Step 1: 读取当前代码**

读取 `scripts/post-utils.js` 第190行，确认当前逻辑：

```javascript
tags: userMeta.tags || sourceMeta.tags || [],
```

- [x] **Step 2: 修改 fallback 链**

原计划将第190行修改为：

```javascript
tags: userMeta.tags || sourceMeta.tags || ['未分类'],
```

实际实现为等价且更稳健的空数组防护：

```javascript
tags: tagsWithDefault(userMeta.tags || sourceMeta.tags || ['未分类']),
```

**变化点：**
- fallback 最终值从 `[]` 改为 `['未分类']`
- 缺失、空字符串和空数组都会归一化为 `['未分类']`

- [x] **Step 3: 验证修改**

读取修改后的代码，确认：
1. fallback 链最终值为 `['未分类']`
2. 逻辑结构保持不变

- [ ] **Step 4: 提交修改**

本轮未提交，当前修复仍在工作区中。

```bash
git add scripts/post-utils.js
git commit -m "fix(post-utils): 标签 fallback 链提供默认值"
```

---

## Task 3: 运行测试验证

**Files:**
- Test: `tests/*.test.js`

- [x] **Step 1: 运行完整测试套件**

```bash
npm test
```

**预期结果：**
- 所有测试通过
- 特别关注 `phase-2-content.test.js` 中的标签验证测试

- [x] **Step 2: 如果测试失败，分析原因**

测试先按 TDD 红灯验证失败，再修复转绿。覆盖：

1. `tests/publish-post.test.js`：标签提示和空输入默认值
2. `tests/post-utils.test.js`：无标签和空 `tags:` fallback

若未来测试失败，检查：
1. 是否有其他地方需要修改
2. 是否有测试依赖空标签数组
3. 是否需要更新测试

- [ ] **Step 3: 提交最终修改**

本轮未提交，当前修复仍在工作区中。

```bash
git add -A
git commit -m "fix: 确保标签默认值修复通过所有测试"
```

---

## Task 4: 构建验证

**Files:**
- None (验证步骤)

- [x] **Step 1: 运行构建**

```bash
npm run build
```

**预期结果：**
- 构建成功
- 无错误输出

- [x] **Step 2: 验证生成的文件**

`npm run build` 已成功生成 19 个页面。检查重点：
1. 博客页面正常生成
2. 标签相关页面正常生成

- [x] **Step 3: 完成**

所有任务完成，标签默认值修复已实施并验证。

---

## 验证清单

- [x] `scripts/publish-post.js` 标签提示已修改
- [x] `scripts/post-utils.js` fallback 链已修改
- [x] `npm test` 所有测试通过
- [x] `npm run build` 构建成功
- [ ] 代码已提交

---

## 相关文档

- 设计规范：`docs/superpowers/specs/2026-06-03-publish-tag-defaults-design.md`
- 发布脚本：`scripts/publish-post.js`
- 工具函数：`scripts/post-utils.js`
- 测试文件：`tests/phase-2-content.test.js`
