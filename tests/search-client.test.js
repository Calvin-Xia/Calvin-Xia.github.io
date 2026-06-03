import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import MiniSearch from 'minisearch';

import { buildSearchIndex, searchIndexOptions } from '../src/lib/search-index-builder.ts';
import {
    addToSearchHistory,
    clearSearchHistory,
    debounce,
    filterSearchResults,
    formatSearchResult,
    getSearchHistory,
    loadSearchIndex,
    search,
} from '../src/lib/search-client.ts';

const entries = [
    {
        id: 'article-1',
        type: 'article',
        title: 'AI 依赖性反思',
        excerpt: '讨论 AI 技术的影响',
        category: '技术',
        tags: ['AI', '反思'],
        date: '2026-04-11',
        filePath: '/articles/article-1/',
        typeLabel: '文章',
    },
    {
        id: 'tool-1',
        type: 'tool',
        title: '随机抽取工具',
        excerpt: '从名单中抽取条目',
        category: '工具',
        tags: ['随机'],
        date: '2026-04-12',
        filePath: '/works/tools/',
        typeLabel: '工具',
    },
];

function createStorage() {
    const items = new Map();

    return {
        getItem(key) {
            return items.has(key) ? items.get(key) : null;
        },
        setItem(key, value) {
            items.set(key, String(value));
        },
        removeItem(key) {
            items.delete(key);
        },
    };
}

describe('search-client', () => {
    test('exports loadSearchIndex and search functions', () => {
        assert.equal(typeof loadSearchIndex, 'function');
        assert.equal(typeof search, 'function');
        assert.equal(typeof formatSearchResult, 'function');
        assert.equal(typeof debounce, 'function');
        assert.equal(typeof getSearchHistory, 'function');
        assert.equal(typeof addToSearchHistory, 'function');
        assert.equal(typeof clearSearchHistory, 'function');
        assert.equal(typeof filterSearchResults, 'function');
    });

    test('loads the serialized search index lazily', async () => {
        const payload = JSON.parse(buildSearchIndex(entries));
        let callCount = 0;

        const miniSearch = await loadSearchIndex(async (url) => {
            callCount += 1;
            assert.equal(url, '/search-index.json');
            return {
                ok: true,
                json: async () => payload,
            };
        });

        assert.equal(callCount, 1);
        assert.ok(miniSearch instanceof MiniSearch);
        assert.equal(search(miniSearch, 'AI')[0].id, 'article-1');
    });

    test('returns ranked cross-section results and supports type filtering', () => {
        const miniSearch = new MiniSearch(searchIndexOptions);
        miniSearch.addAll(entries);

        const allResults = search(miniSearch, '工具');
        const toolResults = search(miniSearch, '工具', { types: ['tool'] });

        assert.deepEqual(allResults.map((result) => result.id), ['tool-1']);
        assert.deepEqual(toolResults.map((result) => result.id), ['tool-1']);
        assert.deepEqual(search(miniSearch, '工具', { types: ['article'] }), []);
    });

    test('returns an empty result list for blank queries', () => {
        const miniSearch = new MiniSearch(searchIndexOptions);
        miniSearch.addAll(entries);

        assert.deepEqual(search(miniSearch, '   '), []);
    });

    test('formats search results with score and escaped highlights', () => {
        const formatted = formatSearchResult({
            id: 'article-1',
            type: 'article',
            title: '测试 <script>标题</script>',
            excerpt: '这是测试内容',
            category: '技术',
            tags: ['测试'],
            date: '2026-01-01',
            filePath: '/articles/article-1/',
            typeLabel: '文章',
            score: 12.5,
        }, '测试');

        assert.equal(formatted.matchScore, 12.5);
        assert.equal(formatted.highlightedTitle, '<mark>测试</mark> &lt;script&gt;标题&lt;/script&gt;');
        assert.equal(formatted.highlightedExcerpt, '这是<mark>测试</mark>内容');
    });

    test('filters formatted search results by category and tag', () => {
        const results = [
            {
                ...entries[0],
                matchScore: 2,
                highlightedTitle: entries[0].title,
                highlightedExcerpt: entries[0].excerpt,
            },
            {
                ...entries[1],
                matchScore: 1,
                highlightedTitle: entries[1].title,
                highlightedExcerpt: entries[1].excerpt,
            },
        ];

        assert.deepEqual(filterSearchResults(results, { category: '技术' }).map((result) => result.id), ['article-1']);
        assert.deepEqual(filterSearchResults(results, { tag: '随机' }).map((result) => result.id), ['tool-1']);
        assert.deepEqual(filterSearchResults(results, { category: '技术', tag: '随机' }), []);
    });

    test('stores the latest ten unique search history items', () => {
        globalThis.localStorage = createStorage();

        try {
            ['AI', '搜索', '工具', 'Astro', '博客', '技术', '阅读', '作品', '更新', '标签', '分类', 'AI'].forEach((query) => {
                addToSearchHistory(query);
            });

            assert.deepEqual(getSearchHistory(), ['AI', '分类', '标签', '更新', '作品', '阅读', '技术', '博客', 'Astro', '工具']);

            clearSearchHistory();
            assert.deepEqual(getSearchHistory(), []);
        } finally {
            delete globalThis.localStorage;
        }
    });

    test('debounce delays execution and keeps the last call arguments', async () => {
        const values = [];
        const debounced = debounce((value) => {
            values.push(value);
        }, 40);

        debounced('first');
        debounced('second');

        assert.deepEqual(values, []);

        await new Promise((resolve) => setTimeout(resolve, 70));

        assert.deepEqual(values, ['second']);
    });
});
