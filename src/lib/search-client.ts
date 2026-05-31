import MiniSearch, { type SearchResult } from 'minisearch';
import { searchIndexOptions, type SearchEntry } from './search-index-builder.ts';

export type SearchHit = SearchResult & SearchEntry;

export interface ClientSearchOptions {
    types?: string[];
    limit?: number;
}

type SearchIndexPayload = {
    index: Record<string, unknown>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<{
    ok: boolean;
    status?: number;
    json: () => Promise<unknown>;
}>;

let miniSearch: MiniSearch<SearchEntry> | null = null;
let loadPromise: Promise<MiniSearch<SearchEntry>> | null = null;

export async function loadSearchIndex(fetchFn: FetchLike = fetch): Promise<MiniSearch<SearchEntry>> {
    if (miniSearch) {
        return miniSearch;
    }

    if (loadPromise) {
        return loadPromise;
    }

    loadPromise = fetchFn('/search-index.json')
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`Failed to load search index: ${response.status ?? 'unknown'}`);
            }

            const payload = await response.json() as SearchIndexPayload;
            miniSearch = MiniSearch.loadJS<SearchEntry>(payload.index, searchIndexOptions);
            return miniSearch;
        })
        .catch((error) => {
            loadPromise = null;
            throw error;
        });

    return loadPromise;
}

export function search(
    index: MiniSearch<SearchEntry>,
    query: string,
    options: ClientSearchOptions = {},
): SearchHit[] {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
        return [];
    }

    const typeFilter = options.types?.length ? new Set(options.types) : null;
    const results = index.search(normalizedQuery, {
        ...searchIndexOptions.searchOptions,
        filter: typeFilter ? (result) => typeFilter.has(String(result.type)) : undefined,
    }) as SearchHit[];

    return typeof options.limit === 'number' ? results.slice(0, options.limit) : results;
}
