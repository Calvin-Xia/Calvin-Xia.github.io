import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import {
    analyzePost,
    collectHttpUrls,
    collectInternalArticleSlugs,
    collectPostIssues,
    findInvalidUrls,
    findUntransformedAssetLinks,
    validateFrontmatter,
} from '../scripts/check-posts.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createTempContentDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'check-posts-'));
    tempDirs.push(dir);
    return dir;
}

async function writePost(dir, fileName, frontmatter, body = '') {
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    await writeFile(filePath, `---\n${frontmatter}---\n\n${body}\n`, 'utf8');
    return filePath;
}

const validFrontmatter = [
    'title: "测试文章"',
    'date: "2026-06-03"',
    'excerpt: "摘要内容"',
    'category: "测试"',
    'tags:',
    '  - "测试"',
    '',
].join('\n');

describe('check-posts frontmatter validation', () => {
    test('accepts a complete valid frontmatter without issues', () => {
        const issues = validateFrontmatter({
            title: '测试',
            date: '2026-06-03',
            excerpt: '摘要',
            category: '分类',
            tags: ['a'],
        });

        assert.deepEqual(issues, []);
    });

    test('rejects missing fields, bad date formats and impossible calendar dates', () => {
        const issues = validateFrontmatter({ title: '', date: '2026-02-30', excerpt: '', category: '', tags: [] });
        const errors = issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);
        const warnings = issues.filter((issue) => issue.level === 'warning').map((issue) => issue.message);

        assert.equal(errors.length, 4);
        assert.ok(errors.some((message) => message.includes('title')));
        assert.ok(errors.some((message) => message.includes('category')));
        assert.ok(errors.some((message) => message.includes('tags')));
        assert.ok(errors.some((message) => message.includes('date 不是真实存在的日历日期')));
        assert.deepEqual(warnings, ['excerpt 为空，建议补充摘要']);
    });

    test('flags malformed date format and wrong optional field types', () => {
        const issues = validateFrontmatter({
            title: 'T',
            date: '2026/06/03',
            excerpt: '摘要',
            category: '分类',
            tags: ['a'],
            featured: 'yes',
            status: 3,
        });
        const messages = issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);

        assert.ok(messages.some((message) => message.includes('YYYY-MM-DD')));
        assert.ok(messages.some((message) => message.includes('featured 必须为布尔值')));
        assert.ok(messages.some((message) => message.includes('status 必须为字符串')));
    });

    test('flags a non-array tags field', () => {
        const issues = validateFrontmatter({ title: 'T', date: '2026-06-03', excerpt: 'e', category: 'c', tags: 'a,b' });

        assert.ok(issues.some((issue) => issue.level === 'error' && issue.message.includes('tags 必须为非空字符串数组')));
    });
});

describe('check-posts body validation', () => {
    test('flags leftover untransformed file/ asset links', () => {
        assert.equal(findUntransformedAssetLinks('![图](file/a.png)'), true);
        assert.equal(findUntransformedAssetLinks('![图](./file/a.png)'), true);
        assert.equal(findUntransformedAssetLinks('![图](../file/a.png)'), true);
        assert.equal(findUntransformedAssetLinks('![图](https://content.calvin-xia.cn/a/b.png)'), false);
    });

    test('collects http urls from markdown links and raw html img tags', () => {
        const urls = collectHttpUrls('[站点](https://calvin-xia.cn/x) <img src="https://assets.calvin-xia.cn/a.jpg">');

        assert.deepEqual(urls, ['https://calvin-xia.cn/x', 'https://assets.calvin-xia.cn/a.jpg']);
    });

    test('flags malformed http urls', () => {
        assert.deepEqual(findInvalidUrls('[bad](https://)'), ['https://']);
        assert.deepEqual(findInvalidUrls('[ok](https://calvin-xia.cn/a)'), []);
    });

    test('extracts internal article slugs from links', () => {
        const slugs = collectInternalArticleSlugs('[前](/articles/20251231-abc/) [后](/articles/20260411-ai-reliance)');

        assert.deepEqual(slugs, ['20251231-abc', '20260411-ai-reliance']);
    });

    test('analyzePost reports errors without touching unrelated fields', () => {
        const issues = analyzePost({
            filePath: 'C:/tmp/20260603-a.md',
            fileName: '20260603-a.md',
            frontmatter: { title: 'T', date: '2026-06-03', excerpt: 'e', category: 'c', tags: ['a'] },
            body: '[失效](/articles/20990101-nope/) [外链](https://calvin-xia.cn)',
        }, { knownSlugs: new Set(['20260603-a']) });

        assert.deepEqual(issues, [{
            level: 'error',
            message: '内部链接指向不存在的文章: /articles/20990101-nope/',
            file: 'C:/tmp/20260603-a.md',
        }]);
    });
});

describe('check-posts directory scan', () => {
    test('reports no issues for a valid post directory', async () => {
        const dir = await createTempContentDir();
        await writePost(dir, '20260603-valid-post.md', validFrontmatter, '正文 [自链](/articles/20260603-valid-post/) 与 [外链](https://calvin-xia.cn)。');

        const report = await collectPostIssues(dir);

        assert.equal(report.fileCount, 1);
        assert.deepEqual(report.issues.filter((issue) => issue.level === 'error'), []);
    });

    test('reports broken frontmatter, leftover file links and missing internal targets', async () => {
        const dir = await createTempContentDir();
        await writePost(dir, '20260604-broken-post.md', 'title: ""\ndate: "2026-06-04"\nexcerpt: ""\ncategory: "测试"\ntags:\n  - "测试"\n', '![本地](file/cover.png)\n[失效](/articles/20990101-nope/)');

        const report = await collectPostIssues(dir);
        const errors = report.issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);

        assert.ok(errors.some((message) => message.includes('title 必须为非空字符串')));
        assert.ok(errors.some((message) => message.includes('file/ 本地资源链接')));
        assert.ok(errors.some((message) => message.includes('/articles/20990101-nope/')));
        assert.ok(report.issues.some((issue) => issue.level === 'warning' && issue.message.includes('excerpt 为空')));
    });

    test('errors when the directory contains no markdown files', async () => {
        const dir = await createTempContentDir();

        const report = await collectPostIssues(dir);

        assert.equal(report.fileCount, 0);
        assert.equal(report.issues[0].level, 'error');
    });

    test('warns when a filename falls outside the loader pattern', async () => {
        const dir = await createTempContentDir();
        await writePost(dir, 'notes.md', validFrontmatter, '');

        const report = await collectPostIssues(dir);

        assert.ok(report.issues.some((issue) => issue.level === 'warning' && issue.message.includes('文件名不以数字开头')));
    });

    test('online checks turn 4xx responses into errors and network failures into warnings', async () => {
        const dir = await createTempContentDir();
        await writePost(dir, '20260605-online-post.md', validFrontmatter, '[坏链](https://example.invalid/404) [断网](https://unreachable.test/) [好链](https://calvin-xia.cn/)');
        const fetchImpl = async (url) => {
            if (url === 'https://example.invalid/404') {
                return { status: 404 };
            }
            if (url === 'https://calvin-xia.cn/') {
                return { status: 200 };
            }
            throw new Error('network down');
        };

        const report = await collectPostIssues(dir, { online: true, fetchImpl });

        assert.ok(report.issues.some((issue) => issue.level === 'error' && issue.message.includes('返回 404')));
        assert.ok(report.issues.some((issue) => issue.level === 'warning' && issue.message.includes('unreachable.test')));
    });
});
