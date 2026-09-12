import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildArticleNavigation, selectRelatedPosts, sortPostsByDateDesc } from '../src/lib/article-navigation.js';

function post(id, title, date, category = '随笔', tags = []) {
    return { id, data: { title, date, category, tags, excerpt: `${title}的摘要` } };
}

const posts = [
    post('20260706-diary-2', '测区日志(下)', '2026-07-06', '随笔', ['测区']),
    post('20260620-cultural-legacy', '潜入江心', '2026-07-01', '随笔', ['旅行', '测区']),
    post('20260609-essay', '高考随笔', '2026-06-09', '随笔', ['高考']),
    post('20260503-labors', '劳动节', '2026-05-03', '生活', ['劳动']),
];

describe('article navigation', () => {
    test('sorts posts by date descending', () => {
        assert.deepEqual(sortPostsByDateDesc(posts).map((p) => p.id), [
            '20260706-diary-2',
            '20260620-cultural-legacy',
            '20260609-essay',
            '20260503-labors',
        ]);
    });

    test('builds older/newer neighbors around the current post', () => {
        const nav = buildArticleNavigation(sortPostsByDateDesc(posts), '20260620-cultural-legacy');

        assert.equal(nav.older.slug, '20260609-essay');
        assert.equal(nav.newer.slug, '20260706-diary-2');
    });

    test('returns null neighbors at both ends', () => {
        const first = buildArticleNavigation(sortPostsByDateDesc(posts), '20260706-diary-2');
        const last = buildArticleNavigation(sortPostsByDateDesc(posts), '20260503-labors');

        assert.equal(first.newer, null);
        assert.equal(first.older.slug, '20260620-cultural-legacy');
        assert.equal(last.older, null);
        assert.equal(last.newer.slug, '20260609-essay');
    });

    test('returns nulls for unknown ids', () => {
        assert.deepEqual(buildArticleNavigation(sortPostsByDateDesc(posts), 'nope'), { older: null, newer: null });
    });
});

describe('related posts selection', () => {
    test('scores same category and tag overlap ahead of recency fill', () => {
        const sorted = sortPostsByDateDesc(posts);
        const related = selectRelatedPosts(sorted, '20260706-diary-2', {
            limit: 3,
            category: '随笔',
            tags: ['测区'],
        });

        assert.deepEqual(related.map((item) => item.slug), [
            '20260620-cultural-legacy',
            '20260609-essay',
            '20260503-labors',
        ]);
    });

    test('excludes the current post and respects the limit', () => {
        const sorted = sortPostsByDateDesc(posts);
        const related = selectRelatedPosts(sorted, '20260503-labors', {
            limit: 2,
            category: '生活',
            tags: ['劳动'],
        });

        assert.equal(related.length, 2);
        assert.ok(!related.some((item) => item.slug === '20260503-labors'));
    });

    test('fills with newest posts when nothing scores', () => {
        const sorted = sortPostsByDateDesc(posts);
        const related = selectRelatedPosts(sorted, '20260503-labors', {
            limit: 2,
            category: '不存在的分类',
            tags: ['不存在'],
        });

        assert.deepEqual(related.map((item) => item.slug), ['20260706-diary-2', '20260620-cultural-legacy']);
    });
});
