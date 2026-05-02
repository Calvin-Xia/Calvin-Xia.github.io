import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import {
    CONTENT_TYPES,
    compareContentItems,
    isFreshDate,
    parseDateValue,
} from '../src/lib/shared-content.js';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

describe('shared content ranking helpers', () => {
    test('content type labels and actions are defined in one importable module', () => {
        assert.deepEqual(Object.keys(CONTENT_TYPES).sort(), ['article', 'tool', 'update-log', 'work']);
        assert.equal(CONTENT_TYPES.article.label, '文章');
        assert.equal(CONTENT_TYPES.work.action, '查看作品');
        assert.equal(CONTENT_TYPES.tool.label, '工具');
        assert.equal(CONTENT_TYPES['update-log'].action, '查看日志');
    });

    test('parseDateValue accepts strict YYYY-MM-DD dates and rejects calendar overflow', () => {
        assert.equal(parseDateValue('2026-04-30'), Date.UTC(2026, 3, 30));
        assert.equal(parseDateValue('2026-2-3'), Number.NEGATIVE_INFINITY);
        assert.equal(parseDateValue('2026-02-29'), Number.NEGATIVE_INFINITY);
        assert.equal(parseDateValue(''), Number.NEGATIVE_INFINITY);
    });

    test('compareContentItems sorts by date, type priority, then Chinese title', () => {
        const items = [
            { type: 'tool', date: '2026-04-01', title: '在线计时器' },
            { type: 'work', date: '2026-04-01', title: '指纹识别' },
            { type: 'article', date: '2026-04-02', title: '最新文章' },
            { type: 'article', date: '2026-04-01', title: '测试文章' },
            { type: 'article', date: '2026-04-01', title: '阿尔法' },
        ];

        assert.deepEqual([...items].sort(compareContentItems).map((item) => item.title), [
            '最新文章',
            '阿尔法',
            '测试文章',
            '指纹识别',
            '在线计时器',
        ]);
    });

    test('isFreshDate treats dates within the last seven days as fresh', () => {
        const now = new Date('2026-04-30T16:45:00+08:00');

        assert.equal(isFreshDate('2026-04-30', now), true);
        assert.equal(isFreshDate('2026-04-23', now), true);
        assert.equal(isFreshDate('2026-04-22', now), false);
        assert.equal(isFreshDate('2026-05-01', now), false);
        assert.equal(isFreshDate('not-a-date', now), false);
    });

    test('server and client code import shared helpers instead of duplicating them', () => {
        const contentSource = readFileSync(projectPath('src', 'lib', 'content.ts'), 'utf8');
        const articlesSource = readFileSync(projectPath('src', 'pages', 'articles.astro'), 'utf8');

        assert.match(contentSource, /from\s+['"]\.\/shared-content\.js['"]/);
        assert.match(articlesSource, /from\s+['"]\.\.\/lib\/shared-content\.js['"]/);

        for (const duplicate of [
            /const\s+contentTypes\s*=/,
            /const\s+typePriority\s*=/,
            /function\s+parseDateValue\s*\(/,
            /function\s+compareByDate\s*\(/,
            /function\s+isFreshDate\s*\(/,
        ]) {
            assert.doesNotMatch(articlesSource, duplicate);
        }
    });
});
