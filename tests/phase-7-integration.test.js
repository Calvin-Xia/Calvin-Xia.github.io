import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import MiniSearch from 'minisearch';

import { checkHealth } from '../src/lib/health-check.js';
import { buildSearchIndex, searchIndexOptions } from '../src/lib/search-index-builder.ts';
import { search } from '../src/lib/search-client.ts';

function createEntry(index, overrides = {}) {
    return {
        id: `entry-${index}`,
        type: index % 3 === 0 ? 'tool' : index % 3 === 1 ? 'work' : 'article',
        title: `Phase 7 搜索条目 ${index}`,
        excerpt: `用于验证 MiniSearch 集成的内容 ${index}`,
        category: index % 2 === 0 ? '技术' : '工具',
        tags: ['Phase7', index % 2 === 0 ? '搜索' : '健康检查'],
        date: '2026-05-31',
        filePath: `/entries/${index}/`,
        typeLabel: index % 3 === 0 ? '工具' : index % 3 === 1 ? '作品' : '文章',
        ...overrides,
    };
}

describe('Phase 7 integration', () => {
    test('search index payload can be loaded and queried by the client module', () => {
        const entries = Array.from({ length: 60 }, (_, index) => createEntry(index, {
            title: index === 42 ? 'MiniSearch 精准命中' : `Phase 7 搜索条目 ${index}`,
        }));
        const payload = JSON.parse(buildSearchIndex(entries));
        const miniSearch = MiniSearch.loadJS(payload.index, searchIndexOptions);
        const startedAt = performance.now();
        const results = search(miniSearch, 'MiniSearch', { types: ['article', 'work', 'tool'] });
        const elapsed = performance.now() - startedAt;

        assert.equal(results[0].id, 'entry-42');
        assert.ok(elapsed < 200, `expected search under 200ms, got ${elapsed}ms`);
    });

    test('health check degrades gracefully when Umami is unavailable', async () => {
        const result = await checkHealth({
            umamiUrl: 'https://invalid.example.com',
            umamiApiKey: 'test',
            version: '1.0.0',
            fetchFn: async () => { throw new Error('DNS error'); },
        });

        assert.equal(result.status, 'degraded');
        assert.equal(result.dependencies.umami.status, 'degraded');
    });
});
