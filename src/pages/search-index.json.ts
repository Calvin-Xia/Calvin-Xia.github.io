import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
    CONTENT_TYPES,
    blogEntryToItem,
    compareContentItems,
    dataEntryToItem,
    type ContentItem,
} from '../lib/content';
import { buildSearchIndex, type SearchEntry } from '../lib/search-index-builder.ts';

function itemToSearchEntry(item: ContentItem): SearchEntry {
    return {
        id: item.id,
        type: item.type,
        title: item.title,
        excerpt: item.excerpt,
        category: item.category,
        tags: item.tags,
        date: item.date,
        filePath: item.filePath,
        typeLabel: CONTENT_TYPES[item.type]?.label || '',
        readingStats: item.readingStats
            ? {
                wordCountDisplay: item.readingStats.wordCountDisplay,
                readTimeDisplay: item.readingStats.readTimeDisplay,
            }
            : undefined,
    };
}

export const GET: APIRoute = async () => {
    const [blog, works, tools, updates] = await Promise.all([
        getCollection('blog', ({ data }) => data.status !== 'draft'),
        getCollection('works', ({ data }) => data.status !== 'draft'),
        getCollection('tools', ({ data }) => data.status !== 'draft'),
        getCollection('updates', ({ data }) => data.status !== 'draft'),
    ]);

    const entries = [
        ...blog.map(blogEntryToItem),
        ...works.map((entry) => dataEntryToItem('work', entry)),
        ...tools.map((entry) => dataEntryToItem('tool', entry)),
        ...updates.map((entry) => dataEntryToItem('update-log', entry)),
    ].sort(compareContentItems).map(itemToSearchEntry);

    return new Response(buildSearchIndex(entries), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
        },
    });
};
