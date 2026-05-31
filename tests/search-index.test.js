import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import MiniSearch from 'minisearch';

import { buildSearchIndex } from '../src/lib/search-index-builder.ts';

const searchOptions = {
    fields: ['title', 'excerpt', 'category', 'tags', 'typeLabel'],
    storeFields: ['id', 'type', 'title', 'excerpt', 'category', 'tags', 'date', 'url', 'typeLabel'],
};

describe('buildSearchIndex', () => {
    test('returns serialized MiniSearch JSON with an index payload', () => {
        const result = buildSearchIndex([]);
        const parsed = JSON.parse(result);

        assert.equal(typeof result, 'string');
        assert.ok(parsed.index);
        assert.ok(parsed.options);
    });

    test('indexes blog entries with searchable and stored fields', () => {
        const entries = [
            {
                id: '20260411-ai-reliance',
                type: 'blog',
                title: 'AI 依赖性反思',
                excerpt: '讨论 AI 技术的影响',
                category: '技术',
                tags: ['AI', '反思'],
                date: '2026-04-11',
                url: '/articles/20260411-ai-reliance/',
                typeLabel: '文章',
            },
        ];

        const parsed = JSON.parse(buildSearchIndex(entries));
        const miniSearch = MiniSearch.loadJS(parsed.index, searchOptions);
        const results = miniSearch.search('AI', { prefix: true });

        assert.equal(results.length, 1);
        assert.equal(results[0].id, '20260411-ai-reliance');
        assert.equal(results[0].title, 'AI 依赖性反思');
        assert.deepEqual(results[0].tags, ['AI', '反思']);
    });
});
