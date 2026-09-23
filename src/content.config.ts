import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import {
    CATEGORY_WHITELIST,
    TAG_MAX_COUNT,
    TAG_MIN_COUNT,
    TAG_WHITELIST,
} from './lib/content-taxonomy.js';

const fileStem = ({ entry }: { entry: string }) => entry.replace(/\.(md|json)$/i, '');

// works/tools/updates 的 category/tags 是作品展示分类（如「AI 与智能体」），不在博客分类词表内，
// 因此 commonMetadata 只保留自由字符串；blog schema 会用 blogTaxonomy 覆盖这两个字段。
const commonMetadata = {
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    excerpt: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
};

// blog 的 category/tags 是 AGENTS.md "Blog Taxonomy" 的封闭词表。词表唯一定义在
// src/lib/content-taxonomy.js（scripts/check-posts.js 复用同一份），不要在此处手写词条。
const blogTaxonomy = {
    category: z.enum(CATEGORY_WHITELIST as [string, ...string[]]),
    tags: z.array(z.enum(TAG_WHITELIST as [string, ...string[]]))
        .min(TAG_MIN_COUNT)
        .max(TAG_MAX_COUNT),
};

const updateTimelineItem = z.object({
    type: z.enum(['new', 'update', 'fix', 'optimize', 'cancel', 'note', 'bug', 'info']),
    label: z.string().optional(),
    text: z.string(),
});

const updateTimelineVersion = z.object({
    version: z.string(),
    updatedAt: z.string(),
    items: z.array(updateTimelineItem),
});

const blog = defineCollection({
    loader: glob({ pattern: '[0-9]*.md', base: './src/content/blog', generateId: fileStem }),
    schema: z.object({
        ...commonMetadata,
        ...blogTaxonomy,
        featured: z.boolean().optional(),
        author: z.string().optional(),
        readTime: z.string().optional(),
        status: z.string().optional(),
        hero: z.string().optional(),
        imageDimensions: z.array(z.object({
            path: z.string(),
            width: z.number(),
            height: z.number(),
        })).optional(),
    }).superRefine((meta, ctx) => {
        if (meta.tags.includes(meta.category)) {
            ctx.addIssue({
                code: 'custom',
                path: ['tags'],
                message: `tags 不得与 category 相同: ${meta.category}（见 AGENTS.md 的 Blog Taxonomy）`,
            });
        }
    }),
});

const works = defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/works', generateId: fileStem }),
    schema: z.object({
        ...commonMetadata,
        filePath: z.string(),
        externalUrl: z.string().url().optional(),
        status: z.string().optional(),
        featured: z.boolean().optional(),
        order: z.number(),
        i18nPrefix: z.string(),
        displayTags: z.array(z.object({
            key: z.string().optional(),
            text: z.string().optional(),
        })).optional(),
        actions: z.array(z.object({
            key: z.string().optional(),
            text: z.string().optional(),
            href: z.string(),
            variant: z.enum(['primary', 'outline']).default('outline'),
            external: z.boolean().default(false),
        })),
    }),
});

const tools = defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/tools', generateId: fileStem }),
    schema: z.object({
        ...commonMetadata,
        filePath: z.string(),
        featured: z.boolean().optional(),
        status: z.string().optional(),
    }),
});

const updates = defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/updates', generateId: fileStem }),
    schema: z.object({
        ...commonMetadata,
        filePath: z.string(),
        featured: z.boolean().optional(),
        status: z.string().optional(),
        timeline: z.array(updateTimelineVersion).default([]),
    }),
});

export const collections = {
    blog,
    works,
    tools,
    updates,
};
