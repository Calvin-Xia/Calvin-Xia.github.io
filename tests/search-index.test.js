import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import MiniSearch from 'minisearch';

import { buildSearchIndex, searchIndexOptions } from '../src/lib/search-index-builder.ts';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

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
                filePath: '/articles/20260411-ai-reliance/',
                typeLabel: '文章',
            },
        ];

        const parsed = JSON.parse(buildSearchIndex(entries));
        const miniSearch = MiniSearch.loadJS(parsed.index, searchIndexOptions);
        const results = miniSearch.search('AI', { prefix: true });

        assert.equal(results.length, 1);
        assert.equal(results[0].id, '20260411-ai-reliance');
        assert.equal(results[0].title, 'AI 依赖性反思');
        assert.equal(results[0].filePath, '/articles/20260411-ai-reliance/');
        assert.deepEqual(results[0].tags, ['AI', '反思']);
    });

    test('tokenizes Chinese entries for short search terms', () => {
        const entries = [
            {
                id: 'ai-development',
                type: 'article',
                title: '人工智能技术发展',
                excerpt: '讨论人工智能的未来',
                category: '技术',
                tags: ['AI'],
                date: '2026-01-01',
                filePath: '/articles/ai-development/',
                typeLabel: '文章',
            },
        ];

        const parsed = JSON.parse(buildSearchIndex(entries));
        const miniSearch = MiniSearch.loadJS(parsed.index, searchIndexOptions);
        const results = miniSearch.search('智能', searchIndexOptions.searchOptions);

        assert.equal(results.length, 1);
        assert.equal(results[0].id, 'ai-development');
    });

    test('search index endpoint builds from all content collections', () => {
        const source = readFileSync(projectPath('src', 'pages', 'search-index.json.ts'), 'utf8');

        assert.match(source, /getCollection\('blog'/);
        assert.match(source, /getCollection\('works'/);
        assert.match(source, /getCollection\('tools'/);
        assert.match(source, /getCollection\('updates'/);
        assert.match(source, /buildSearchIndex/);
        assert.match(source, /Cache-Control['"]?:\s*['"]public, max-age=3600/);
    });
});
