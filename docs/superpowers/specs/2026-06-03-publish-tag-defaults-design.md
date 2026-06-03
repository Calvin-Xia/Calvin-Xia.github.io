# 设计规范：发布流程标签默认值

**日期**：2026-06-03  
**状态**：已实施，未提交  
**范围**：`npm run publish` 流程中标签（tags）的默认值处理

---

## 问题描述

在 `npm run publish` 流程中，当用户填写文章标签时直接按回车（不输入任何内容），会导致：

1. `tags` 变成空数组 `[]`
2. 生成的 Markdown 文件中 `tags:` 后面没有列表项
3. `phase-2-content.test.js` 第69行的正则验证 `/tags:\s*\r?\n\s+-\s*.+/` 失败
4. 构建失败，页面无法生成

**根本原因**：发布脚本和 fallback 链都没有提供默认标签值。

---

## 实施状态

2026-06-03 已按本设计完成实现，并额外覆盖了源 Markdown 已存在空 `tags:` 列表的边界场景。

已验证：

- `node --test tests/publish-post.test.js`
- `node --test tests/post-utils.test.js`
- `npm test`：247/247 通过
- `npm run test:coverage`：247/247 通过
- `npm run build`
- `npm run lint`：0 errors，20 个既有 warnings
- `git diff --check`

当前代码尚未提交。

---

## 解决方案

采用综合修复方案，同时修改发布脚本和 fallback 链，确保无论哪个入口都不会产生空标签。

### 修改 1：发布脚本提示逻辑

**文件**：`scripts/publish-post.js`  
**位置**：第192-193行

**原问题代码**：
```javascript
const tagsInput = (await rl.question('标签 (逗号分隔): ')).trim();
const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [];
```

**已修改为**：
```javascript
const tagsInput = (await rl.question('标签 (逗号分隔) [未分类]: ')).trim();
const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : ['未分类'];
```

**变化点**：
- 提示文字从 `标签 (逗号分隔): ` 改为 `标签 (逗号分隔) [未分类]: `
- 空输入时默认值从 `[]` 改为 `['未分类']`

### 修改 2：Fallback 链默认值

**文件**：`scripts/post-utils.js`  
**位置**：第190行

**原问题代码**：
```javascript
tags: userMeta.tags || sourceMeta.tags || [],
```

**已修改为（行为等价，实际实现增加了空数组防护）**：
```javascript
tags: tagsWithDefault(userMeta.tags || sourceMeta.tags || ['未分类']),
```

**变化点**：
- fallback 最终值从 `[]` 改为 `['未分类']`
- `tagsWithDefault()` 会把缺失、空字符串和空数组都归一化为 `['未分类']`

---

## 不修改的部分

| 组件 | 原因 |
|------|------|
| `src/content.config.ts` | 不添加 `.min(1)` 约束，避免破坏现有内容 |
| `tests/phase-2-content.test.js` | 不修改测试，保持现有的"至少一个标签"要求 |
| `scripts/edit-metadata.js` | 该入口有独立的标签处理逻辑，不在本次范围内 |

---

## 影响分析

### 正面影响

- 用户不输入标签时，自动使用"未分类"作为默认标签
- 测试验证通过，构建不再失败
- 用户体验改善——提示中显示默认值

### 潜在风险

- 所有未输入标签的文章都会标记为"未分类"
- 如果用户有意留空标签，需要手动删除"未分类"

### 兼容性

- 不影响现有文章（已有标签不会被覆盖）
- 不影响其他入口（如 `edit-metadata.js`）

---

## 验证方案

1. `tests/publish-post.test.js` 覆盖标签提示文案和空输入默认值
2. `tests/post-utils.test.js` 覆盖无 frontmatter 标签和空 `tags:` 列表 fallback
3. `npm test` 验证所有测试通过
4. `npm run build` 验证构建成功

---

## 实施步骤

1. 修改 `scripts/publish-post.js` 第192-193行
2. 修改 `scripts/post-utils.js` 第190行
3. 运行测试验证
4. 提交代码

---

## 相关文件

- `scripts/publish-post.js` - 发布脚本入口
- `scripts/post-utils.js` - 发布工具函数
- `scripts/markdown-utils.js` - Markdown 生成工具
- `src/content.config.ts` - 内容集合 schema
- `tests/phase-2-content.test.js` - 内容验证测试
