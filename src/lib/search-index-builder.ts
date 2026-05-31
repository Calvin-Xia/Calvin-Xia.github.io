import MiniSearch, { type Options } from 'minisearch';

export type SearchEntryType = 'blog' | 'works' | 'tools' | 'updates' | 'article' | 'work' | 'tool' | 'update-log';

export interface SearchEntry {
    id: string;
    type: SearchEntryType;
    title: string;
    excerpt: string;
    category: string;
    tags: string[];
    date: string;
    url: string;
    typeLabel: string;
}

export const searchIndexOptions: Options<SearchEntry> = {
    fields: ['title', 'excerpt', 'category', 'tags', 'typeLabel'],
    storeFields: ['id', 'type', 'title', 'excerpt', 'category', 'tags', 'date', 'url', 'typeLabel'],
    searchOptions: {
        boost: { title: 6, tags: 4, excerpt: 3, category: 2, typeLabel: 1 },
        prefix: true,
    },
};

export function buildSearchIndex(entries: SearchEntry[]): string {
    const miniSearch = new MiniSearch<SearchEntry>(searchIndexOptions);
    miniSearch.addAll(entries);

    return JSON.stringify({
        index: miniSearch.toJSON(),
        options: {
            fields: searchIndexOptions.fields,
            storeFields: searchIndexOptions.storeFields,
            searchOptions: searchIndexOptions.searchOptions,
        },
    });
}
