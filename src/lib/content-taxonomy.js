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

// category/tags 封闭词表规则校验，供三个写入口（scripts/post-utils.js 的
// validatePostPayload / readTransformedMarkdown、scripts/publish-post.js 的交互循环、
// scripts/edit-metadata.js 的 schema 与 prompts validate）在各自的非空校验之上叠加调用。
// - tags 传 undefined 时跳过 tags 维度（用于只提示 category 的交互场景）；
// - options 可注入 { categoryWhitelist?, tagWhitelist? }（测试用假词表，避免对词表变更过敏）。
// 返回 { category?: string, tags?: string }（空对象表示通过），报错文案与 check-posts.js /
// content.config.ts 的既有句式保持一致。
export function validateTaxonomy(category, tags, options = {}) {
    const categoryWhitelist = options.categoryWhitelist ?? CATEGORY_WHITELIST;
    const tagWhitelist = options.tagWhitelist ?? TAG_WHITELIST;
    const errors = {};

    const cleanCategory = String(category ?? '').trim();
    const rawTags = tags === undefined
        ? []
        : (Array.isArray(tags) ? tags : String(tags).split(',')).map((tag) => String(tag ?? '').trim()).filter(Boolean);

    if (!cleanCategory) {
        errors.category = '分类不能为空';
    } else if (!categoryWhitelist.includes(cleanCategory)) {
        errors.category = `category 必须为 ${categoryWhitelist.join(' / ')} 之一，实际值: ${cleanCategory}（见 AGENTS.md 的 Blog Taxonomy）`;
    }

    if (tags === undefined) {
        return errors;
    }

    const tagIssues = [];
    if (rawTags.length === 0) {
        tagIssues.push('标签不能为空');
    } else {
        if (rawTags.length < TAG_MIN_COUNT || rawTags.length > TAG_MAX_COUNT) {
            tagIssues.push(`tags 数量必须为 ${TAG_MIN_COUNT}-${TAG_MAX_COUNT} 个，实际值: ${rawTags.length} 个`);
        }

        const unknownTags = rawTags.filter((tag) => !tagWhitelist.includes(tag));
        if (unknownTags.length > 0) {
            tagIssues.push(`tags 含白名单外的词: ${unknownTags.join('、')}，允许: ${tagWhitelist.join('、')}（见 AGENTS.md 的 Blog Taxonomy）`);
        }

        if (cleanCategory && rawTags.includes(cleanCategory)) {
            tagIssues.push(`tags 不得与 category 相同: ${cleanCategory}（见 AGENTS.md 的 Blog Taxonomy）`);
        }
    }

    if (tagIssues.length > 0) {
        errors.tags = tagIssues.join('；');
    }

    return errors;
}
