import type { Options } from 'minisearch';

import { tokenizeSearchText } from './search-tokenizer.ts';
import type { SearchEntry } from './search-types.ts';

export const searchIndexOptions: Options<SearchEntry> = {
    fields: ['title', 'excerpt', 'category', 'tags', 'typeLabel'],
    storeFields: [
        'id',
        'type',
        'title',
        'excerpt',
        'category',
        'tags',
        'date',
        'filePath',
        'typeLabel',
        'readingStats',
    ],
    tokenize: tokenizeSearchText,
    searchOptions: {
        boost: { title: 6, tags: 4, excerpt: 3, category: 2, typeLabel: 1 },
        prefix: true,
        tokenize: tokenizeSearchText,
    },
};
