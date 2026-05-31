import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import MiniSearch from 'minisearch';

import { buildSearchIndex, searchIndexOptions } from '../src/lib/search-index-builder.ts';
import { loadSearchIndex, search } from '../src/lib/search-client.ts';

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

describe('search-client', () => {
    test('exports loadSearchIndex and search functions', () => {
        assert.equal(typeof loadSearchIndex, 'function');
        assert.equal(typeof search, 'function');
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
});
