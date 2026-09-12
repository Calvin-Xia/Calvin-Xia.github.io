import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { buildStats, countImages, formatStatsTable } from '../scripts/post-stats.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createTempContentDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'post-stats-'));
    tempDirs.push(dir);
    return dir;
}

async function writePost(dir, fileName, title, date, body) {
    const frontmatter = [
        'title: "' + title + '"',
        'date: "' + date + '"',
        'excerpt: "摘要"',
        'category: "测试"',
        'tags:',
        '  - "测试"',
        '',
    ].join('\n');
    await writeFile(path.join(dir, fileName), `---\n${frontmatter}---\n\n${body}\n`, 'utf8');
}

describe('post stats', () => {
    test('counts both markdown images and raw html img tags', () => {
        assert.equal(countImages('![a](https://x/a.png) ![b](https://x/b.png) <img src="https://x/c.png">'), 3);
        assert.equal(countImages('纯文本正文'), 0);
    });

    test('builds per-post stats sorted by date descending with totals', async () => {
        const dir = await createTempContentDir();
        await writePost(dir, '20260101-eng-post.md', 'Eng Post', '2026-01-01', 'hello world');
        await writePost(dir, '20260102-cn-post.md', '中文文章', '2026-01-02', '你好世界');

        const report = await buildStats(dir);

        assert.equal(report.count, 2);
        assert.equal(report.posts[0].date, '2026-01-02');
        assert.deepEqual([report.posts[0].characters, report.posts[0].englishWords], [4, 0]);
        assert.deepEqual([report.posts[1].characters, report.posts[1].englishWords], [0, 2]);
        assert.equal(report.totals.totalCount, 6);
        assert.equal(report.totals.readTimeMinutes, 2);
    });

    test('formats a readable table with a totals line', async () => {
        const dir = await createTempContentDir();
        await writePost(dir, '20260102-cn-post.md', '中文文章', '2026-01-02', '你好世界');
        const report = await buildStats(dir);
        const logs = [];

        formatStatsTable(report, { logger: { log: (message) => logs.push(message) } });

        assert.ok(logs.some((message) => message.includes('中文文章')));
        assert.ok(logs[logs.length - 1].includes('共 1 篇'));
        assert.ok(logs[logs.length - 1].includes('总字数 4'));
    });
});
