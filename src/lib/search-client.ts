import MiniSearch, { type AsPlainObject, type SearchOptions, type SearchResult as MiniSearchResult } from 'minisearch';
import { searchIndexOptions } from './search-index-options.ts';
import { tokenizeSearchText } from './search-tokenizer.ts';
import type { SearchEntry } from './search-types.ts';

const SEARCH_HISTORY_KEY = 'calvin-xia-search-history';
const MAX_HISTORY_ITEMS = 10;

export type SearchHit = MiniSearchResult & SearchEntry;

export interface SearchResult extends SearchEntry {
    matchScore: number;
    highlightedTitle: string;
    highlightedExcerpt: string;
}

export interface ClientSearchOptions {
    types?: string[];
    category?: string;
    tag?: string;
    limit?: number;
}

type SearchIndexPayload = {
    index: AsPlainObject;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<{
    ok: boolean;
    status?: number;
    json: () => Promise<unknown>;
}>;

let miniSearch: MiniSearch<SearchEntry> | null = null;
let loadPromise: Promise<MiniSearch<SearchEntry>> | null = null;

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeRegExp(value: string): string {
    return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function normalizeFilterValue(value?: string): string {
    const normalized = String(value || '').trim();
    return normalized === 'all' ? '' : normalized;
}

function getHighlightTerms(query: string): string[] {
    const terms = new Set<string>();
    const normalizedQuery = String(query || '').trim();

    if (normalizedQuery) {
        terms.add(normalizedQuery);
    }

    tokenizeSearchText(normalizedQuery).forEach((term) => terms.add(term));

    return Array.from(terms)
        .filter(Boolean)
        .sort((left, right) => right.length - left.length);
}

function highlightText(text: string, query: string): string {
    const source = String(text || '');
    const terms = getHighlightTerms(query);

    if (!terms.length) {
        return escapeHtml(source);
    }

    const pattern = new RegExp(terms.map(escapeRegExp).join('|'), 'giu');
    let lastIndex = 0;
    let highlighted = '';

    for (const match of source.matchAll(pattern)) {
        const matchIndex = match.index ?? 0;
        highlighted += escapeHtml(source.slice(lastIndex, matchIndex));
        highlighted += `<mark>${escapeHtml(match[0])}</mark>`;
        lastIndex = matchIndex + match[0].length;
    }

    highlighted += escapeHtml(source.slice(lastIndex));
    return highlighted;
}

function getStorage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

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
    const categoryFilter = normalizeFilterValue(options.category);
    const tagFilter = normalizeFilterValue(options.tag);
    const searchOptions: SearchOptions = {
        ...searchIndexOptions.searchOptions,
    };

    if (typeFilter || categoryFilter || tagFilter) {
        searchOptions.filter = (result) => {
            if (typeFilter && !typeFilter.has(String(result['type']))) {
                return false;
            }

            if (categoryFilter && result['category'] !== categoryFilter) {
                return false;
            }

            if (tagFilter) {
                const tags = Array.isArray(result['tags']) ? result['tags'] : [];

                if (!tags.includes(tagFilter)) {
                    return false;
                }
            }

            return true;
        };
    }

    const results = index.search(normalizedQuery, searchOptions) as SearchHit[];

    return typeof options.limit === 'number' ? results.slice(0, options.limit) : results;
}

export function formatSearchResult(result: SearchHit | (SearchEntry & { score?: number }), query: string): SearchResult {
    return {
        ...result,
        matchScore: result.score || 0,
        highlightedTitle: highlightText(result.title, query),
        highlightedExcerpt: highlightText(result.excerpt, query),
    };
}

export function filterSearchResults(
    results: SearchResult[],
    filters: { category?: string; tag?: string },
): SearchResult[] {
    const categoryFilter = normalizeFilterValue(filters.category);
    const tagFilter = normalizeFilterValue(filters.tag);

    return results.filter((result) => {
        if (categoryFilter && result.category !== categoryFilter) {
            return false;
        }

        if (tagFilter && !result.tags.includes(tagFilter)) {
            return false;
        }

        return true;
    });
}

export function debounce<T extends (...args: never[]) => unknown>(
    func: T,
    wait: number,
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return (...args: Parameters<T>) => {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

export function getSearchHistory(): string[] {
    const storage = getStorage();

    if (!storage) {
        return [];
    }

    try {
        const history = storage.getItem(SEARCH_HISTORY_KEY);
        const parsed = history ? JSON.parse(history) : [];
        return Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [];
    } catch {
        return [];
    }
}

export function addToSearchHistory(query: string): void {
    const normalizedQuery = query.trim();
    const storage = getStorage();

    if (!normalizedQuery || !storage) {
        return;
    }

    const history = getSearchHistory();
    const filteredHistory = history.filter((item) => item !== normalizedQuery);
    const newHistory = [normalizedQuery, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);

    try {
        storage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch {
        // Ignore storage quota or privacy-mode failures.
    }
}

export function clearSearchHistory(): void {
    const storage = getStorage();

    if (!storage) {
        return;
    }

    try {
        storage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
        // Ignore storage quota or privacy-mode failures.
    }
}

export function renderSearchHistory(
    container: HTMLElement,
    onSelect: (query: string) => void,
    labels: { title?: string; clear?: string } = {},
): void {
    const history = getSearchHistory();
    container.innerHTML = '';

    if (!history.length) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'search-history';

    const header = document.createElement('div');
    header.className = 'search-history-header';

    const title = document.createElement('span');
    title.textContent = labels.title || '最近搜索';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'search-history-clear';
    clearButton.textContent = labels.clear || '清除';
    clearButton.addEventListener('click', () => {
        clearSearchHistory();
        container.innerHTML = '';
    });

    const list = document.createElement('div');
    list.className = 'search-history-list';

    history.forEach((query) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'search-history-item';
        item.textContent = query;
        item.addEventListener('click', () => onSelect(query));
        list.append(item);
    });

    header.append(title, clearButton);
    wrapper.append(header, list);
    container.append(wrapper);
}
