import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { collectPosts, filterPosts, formatPostList } from '../scripts/list-posts.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createTempContentDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'list-posts-'));
    tempDirs.push(dir);
    return dir;
}

async function writePost(dir, fileName, { title, date, category, tags }) {
    const tagLines = tags.map((tag) => `  - "${tag}"`).join('\n');
    const frontmatter = [
        `title: "${title}"`,
        `date: "${date}"`,
        'excerpt: "摘要"',
        `category: "${category}"`,
        'tags:',
        tagLines,
        '',
    ].join('\n');
    await writeFile(path.join(dir, fileName), `---\n${frontmatter}---\n\n正文\n`, 'utf8');
}

describe('list posts', () => {
    test('collects posts sorted by date descending', async () => {
        const dir = await createTempContentDir();
        await writePost(dir, '20260101-older.md', { title: '旧文', date: '2026-01-01', category: '生活', tags: ['a'] });
        await writePost(dir, '20260102-newer.md', { title: '新文', date: '2026-01-02', category: '技术', tags: ['b'] });

        const posts = await collectPosts(dir);

        assert.deepEqual(posts.map((post) => post.title), ['新文', '旧文']);
        assert.deepEqual(posts[0].tags, ['b']);
    });

    test('filters by category and tag case-insensitively', () => {
        const posts = [
            { title: 'A', date: '2026-01-01', category: '生活总结', tags: ['大学'] },
            { title: 'B', date: '2026-01-02', category: '技术', tags: ['Astro'] },
        ];

        assert.deepEqual(filterPosts(posts, { category: '生活总结' }).map((post) => post.title), ['A']);
        assert.deepEqual(filterPosts(posts, { category: '生活总结'.toLowerCase() }).map((post) => post.title), ['A']);
        assert.deepEqual(filterPosts(posts, { tag: 'astro' }).map((post) => post.title), ['B']);
        assert.deepEqual(filterPosts(posts, { category: '技术', tag: '大学' }), []);
        assert.equal(filterPosts(posts, {}).length, 2);
    });

    test('formats a readable list with a total count line', () => {
        const logs = [];
        formatPostList([
            { file: 'a.md', title: '标题', date: '2026-01-01', category: '分类', tags: ['x', 'y'] },
        ], { logger: { log: (message) => logs.push(message) } });

        assert.ok(logs[0].includes('2026-01-01'));
        assert.ok(logs[0].includes('#x'));
        assert.ok(logs[logs.length - 1].includes('共 1 篇'));
    });
});
