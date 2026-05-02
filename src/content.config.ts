import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const fileStem = ({ entry }: { entry: string }) => entry.replace(/\.(md|json)$/i, '');

const commonMetadata = {
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    excerpt: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
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
        featured: z.boolean().optional(),
        author: z.string().optional(),
        readTime: z.string().optional(),
        status: z.string().optional(),
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
