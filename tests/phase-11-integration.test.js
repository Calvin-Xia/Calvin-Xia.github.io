import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import MiniSearch from 'minisearch';

import { buildSearchIndex, searchIndexOptions } from '../src/lib/search-index-builder.ts';
import {
    addToSearchHistory,
    debounce,
    filterSearchResults,
    formatSearchResult,
    getSearchHistory,
} from '../src/lib/search-client.ts';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

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

describe('Phase 11 search enhancement integration', () => {
    test('search index handles Chinese segmentation for short terms', () => {
        const entries = [
            {
                id: 'test',
                type: 'article',
                title: '人工智能技术发展',
                excerpt: '讨论人工智能的未来',
                category: '技术',
                tags: ['AI'],
                date: '2026-01-01',
                filePath: '/articles/test/',
                typeLabel: '文章',
            },
        ];
        const payload = JSON.parse(buildSearchIndex(entries));
        const miniSearch = MiniSearch.loadJS(payload.index, searchIndexOptions);
        const results = miniSearch.search('智能', searchIndexOptions.searchOptions);

        assert.equal(results.length, 1);
        assert.equal(results[0].id, 'test');
    });

    test('formatSearchResult highlights query text', () => {
        const formatted = formatSearchResult({
            id: 'test',
            type: 'article',
            title: '测试标题',
            excerpt: '这是测试内容',
            date: '2026-01-01',
            category: '测试',
            tags: [],
            filePath: '/articles/test/',
            typeLabel: '文章',
        }, '测试');

        assert.ok(formatted.highlightedTitle.includes('<mark>测试</mark>'));
        assert.ok(formatted.highlightedExcerpt.includes('<mark>测试</mark>'));
    });

    test('debounce delays execution', async () => {
        let called = false;
        const debouncedFn = debounce(() => {
            called = true;
        }, 40);

        debouncedFn();
        assert.equal(called, false);

        await new Promise((resolve) => setTimeout(resolve, 70));
        assert.equal(called, true);
    });

    test('history stores recent queries and filters narrow formatted results', () => {
        globalThis.localStorage = createStorage();

        try {
            addToSearchHistory('人工智能');
            addToSearchHistory('工具');

            assert.deepEqual(getSearchHistory(), ['工具', '人工智能']);

            const results = [
                formatSearchResult({
                    id: 'article',
                    type: 'article',
                    title: '人工智能',
                    excerpt: '技术文章',
                    category: '技术',
                    tags: ['AI'],
                    date: '2026-01-01',
                    filePath: '/articles/article/',
                    typeLabel: '文章',
                }, '人工智能'),
            ];

            assert.equal(filterSearchResults(results, { category: '技术', tag: 'AI' }).length, 1);
            assert.equal(filterSearchResults(results, { category: '生活' }).length, 0);
        } finally {
            delete globalThis.localStorage;
        }
    });

    test('article page integrates debounced search, history, result display, and filters', () => {
        const source = readFileSync(projectPath('src', 'pages', 'articles.astro'), 'utf8');

        assert.match(source, /debounce\(\(\)\s*=>\s*{\s*void performSearch\(\);[\s\S]*},\s*300\)/);
        assert.match(source, /addToSearchHistory\(query\)/);
        assert.match(source, /renderSearchHistory\(/);
        assert.match(source, /formatSearchResult\(result,\s*query\)/);
        assert.match(source, /search-history-container/);
        assert.match(source, /search-result/);
    });
});
