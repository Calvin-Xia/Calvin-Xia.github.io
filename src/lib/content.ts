import type { CollectionEntry } from 'astro:content';
import {
    CONTENT_TYPES,
    TYPE_PRIORITY,
    compareContentItems,
    isFreshDate,
    parseDateValue,
} from './shared-content.js';

export type ContentType = keyof typeof CONTENT_TYPES;

export interface ContentItem {
    id: string;
    type: ContentType;
    title: string;
    excerpt: string;
    date: string;
    filePath: string;
    tags: string[];
    category: string;
    featured: boolean;
    externalUrl?: string;
    status?: string;
}

export { CONTENT_TYPES, TYPE_PRIORITY, compareContentItems, isFreshDate, parseDateValue };

export function blogEntryToItem(entry: CollectionEntry<'blog'>): ContentItem {
    return {
        id: entry.id,
        type: 'article',
        title: entry.data.title,
        excerpt: entry.data.excerpt,
        date: entry.data.date,
        filePath: `/articles/${entry.id}/`,
        tags: entry.data.tags,
        category: entry.data.category,
        featured: Boolean(entry.data.featured),
        status: entry.data.status,
    };
}

export function dataEntryToItem(
    type: Exclude<ContentType, 'article'>,
    entry: CollectionEntry<'works'> | CollectionEntry<'tools'> | CollectionEntry<'updates'>,
): ContentItem {
    return {
        id: entry.id,
        type,
        title: entry.data.title,
        excerpt: entry.data.excerpt,
        date: entry.data.date,
        filePath: entry.data.filePath,
        tags: entry.data.tags,
        category: entry.data.category,
        featured: Boolean(entry.data.featured),
        externalUrl: 'externalUrl' in entry.data ? entry.data.externalUrl : undefined,
        status: entry.data.status,
    };
}

export function getUniqueValues(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

export function getHomepageUpdates(items: ContentItem[], limit = 4): ContentItem[] {
    const sorted = [...items].sort(compareContentItems);
    const primary = sorted.filter((item) => item.type !== 'tool').slice(0, limit);

    if (primary.length >= limit) {
        return primary;
    }

    return primary.concat(sorted.filter((item) => item.type === 'tool').slice(0, limit - primary.length));
}
