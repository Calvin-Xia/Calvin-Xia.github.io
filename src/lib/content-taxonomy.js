// Blog Taxonomy —— category/tags 封闭词表的唯一事实源（single source of truth）。
// 被 src/content.config.ts（Astro 构建期 schema）与 scripts/check-posts.js（npm run check
// 人类友好报错层）共同引用，并与 AGENTS.md 的 "Blog Taxonomy" 小节保持同步：
// - category 是栏目，每篇恰好一个；
// - tags 是跨栏目的封闭主题词表，每篇 TAG_MIN_COUNT-TAG_MAX_COUNT 个，且不得与该篇 category 同值。
// 白名单是封闭词表：新增词必须是一次显式决定，并同步更新 AGENTS.md 的列表。
export const CATEGORY_WHITELIST = ['随笔', '总结', '日志'];
export const TAG_WHITELIST = [
    '武汉大学',
    '高考',
    '旅行',
    '铁路',
    '人工智能',
    '故乡',
    '测绘',
    '自我',
    '劳动',
    '语言文化',
    '科技',
];
export const TAG_MIN_COUNT = 1;
export const TAG_MAX_COUNT = 4;
