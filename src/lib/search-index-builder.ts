import MiniSearch, { type Options } from 'minisearch';
import { cut_for_search } from 'jieba-wasm/node';

import { searchIndexOptions } from './search-index-options.ts';
import { tokenizeSearchText } from './search-tokenizer.ts';
export { searchIndexOptions };
export type { SearchEntry, SearchEntryType } from './search-types.ts';
import type { SearchEntry } from './search-types.ts';

function tokenizeWithJieba(text: string): string[] {
    const terms = new Set(tokenizeSearchText(text));

    for (const term of cut_for_search(String(text || ''), true)) {
        for (const token of tokenizeSearchText(term)) {
            terms.add(token);
        }
    }

    return Array.from(terms);
}

const buildSearchIndexOptions: Options<SearchEntry> = {
    ...searchIndexOptions,
    tokenize: tokenizeWithJieba,
    searchOptions: {
        ...searchIndexOptions.searchOptions,
        tokenize: tokenizeWithJieba,
    },
};

export function buildSearchIndex(entries: SearchEntry[]): string {
    const miniSearch = new MiniSearch<SearchEntry>(buildSearchIndexOptions);
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
