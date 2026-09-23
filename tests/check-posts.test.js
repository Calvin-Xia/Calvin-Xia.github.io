import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const blogDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog');
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

// Taxonomy-valid fixture: category/tags must stay inside the whitelist enforced by
// scripts/check-posts.js (see the Blog Taxonomy section in AGENTS.md).
const validFrontmatter = [
    'title: "测试文章"',
    'date: "2026-06-03"',
    'excerpt: "摘要内容"',
    'category: "随笔"',
    'tags:',
    '  - "自我"',
    '',
].join('\n');

describe('check-posts frontmatter validation', () => {
    test('accepts a complete valid frontmatter without issues', () => {
        const issues = validateFrontmatter({
            title: '测试',
            date: '2026-06-03',
            excerpt: '摘要',
            category: '随笔',
            tags: ['自我', '旅行'],
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
            category: '随笔',
            tags: ['自我'],
            featured: 'yes',
            status: 3,
        });
        const messages = issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);

        assert.ok(messages.some((message) => message.includes('YYYY-MM-DD')));
        assert.ok(messages.some((message) => message.includes('featured 必须为布尔值')));
        assert.ok(messages.some((message) => message.includes('status 必须为字符串')));
    });

    test('flags a non-array tags field', () => {
        const issues = validateFrontmatter({ title: 'T', date: '2026-06-03', excerpt: 'e', category: '随笔', tags: 'a,b' });

        assert.ok(issues.some((issue) => issue.level === 'error' && issue.message.includes('tags 必须为非空字符串数组')));
    });
});

describe('check-posts taxonomy validation', () => {
    const baseTaxonomyMeta = { title: 'T', date: '2026-06-03', excerpt: 'e', category: '随笔' };

    test('accepts every whitelisted category paired with a distinct whitelisted tag', () => {
        for (const category of ['随笔', '总结', '日志']) {
            assert.deepEqual(
                validateFrontmatter({ ...baseTaxonomyMeta, category, tags: ['自我'] }),
                [],
                `category ${category} 应被接受`,
            );
        }
    });

    test('rejects a category outside the whitelist and reports the actual value', () => {
        const issues = validateFrontmatter({ ...baseTaxonomyMeta, category: '学业总结', tags: ['自我'] });
        const error = issues.find((issue) => issue.level === 'error' && issue.message.includes('category 必须为'));

        assert.ok(error, '非法 category 必须报错');
        assert.ok(error.message.includes('学业总结'), `错误消息应回显实际值，实际: ${error.message}`);
        assert.ok(error.message.includes('随笔 / 总结 / 日志'));
    });

    test('rejects a tag outside the whitelist and reports the actual value', () => {
        const issues = validateFrontmatter({ ...baseTaxonomyMeta, tags: ['自我', '学业总结'] });
        const error = issues.find((issue) => issue.level === 'error' && issue.message.includes('白名单外'));

        assert.ok(error, '未知 tag 必须报错');
        assert.ok(error.message.includes('学业总结'), `错误消息应回显实际值，实际: ${error.message}`);
    });

    test('rejects zero tags and more than four tags', () => {
        const zeroTags = validateFrontmatter({ ...baseTaxonomyMeta, tags: [] });
        const zeroError = zeroTags.find((issue) => issue.level === 'error' && issue.message.includes('tags 数量必须为'));

        assert.ok(zeroError, '0 个 tags 必须报错');
        assert.ok(zeroError.message.includes('实际值: 0 个'));

        const fiveTags = validateFrontmatter({
            ...baseTaxonomyMeta,
            tags: ['武汉大学', '高考', '旅行', '铁路', '自我'],
        });
        const fiveError = fiveTags.find((issue) => issue.level === 'error' && issue.message.includes('tags 数量必须为'));

        assert.ok(fiveError, '5 个 tags 必须报错');
        assert.ok(fiveError.message.includes('实际值: 5 个'));
    });

    test('rejects a tag that duplicates the article category', () => {
        const issues = validateFrontmatter({ ...baseTaxonomyMeta, category: '日志', tags: ['日志', '自我'] });
        const error = issues.find((issue) => issue.level === 'error' && issue.message.includes('不得与 category 相同'));

        assert.ok(error, 'tag 等于 category 必须报错');
        assert.ok(error.message.includes('"日志"'));
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
            frontmatter: { title: 'T', date: '2026-06-03', excerpt: 'e', category: '随笔', tags: ['自我'] },
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
        await writePost(dir, '20260604-broken-post.md', 'title: ""\ndate: "2026-06-04"\nexcerpt: ""\ncategory: "随笔"\ntags:\n  - "自我"\n', '![本地](file/cover.png)\n[失效](/articles/20990101-nope/)');

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

describe('check-posts hero and imageDimensions validation', () => {
    const baseMeta = { title: 'T', date: '2026-06-03', excerpt: 'e', category: '随笔', tags: ['自我'] };

    test('accepts a well-formed hero and imageDimensions manifest', () => {
        const issues = validateFrontmatter({
            ...baseMeta,
            hero: '20260603-t.webp',
            imageDimensions: [{ path: 'p/a.jpg', width: 100, height: 50 }],
        });

        assert.deepEqual(issues, []);
    });

    test('flags invalid hero and manifest entries', () => {
        const issues = validateFrontmatter({
            ...baseMeta,
            hero: 3,
            imageDimensions: [{ path: '', width: -1, height: 0 }, 'broken'],
        });
        const messages = issues.filter((issue) => issue.level === 'error').map((issue) => issue.message);

        assert.ok(messages.some((message) => message.includes('hero 必须为非空字符串')));
        assert.equal(messages.filter((message) => message.includes('imageDimensions 条目无效')).length, 2);
    });

    test('flags a non-array imageDimensions field', () => {
        const issues = validateFrontmatter({ ...baseMeta, imageDimensions: 'nope' });

        assert.ok(issues.some((issue) => issue.level === 'error' && issue.message.includes('imageDimensions 必须为数组')));
    });

    test('reports missing hero files when a hero directory is provided', () => {
        const issues = analyzePost({
            filePath: 'C:/tmp/20260603-a.md',
            fileName: '20260603-a.md',
            frontmatter: { ...baseMeta, hero: 'missing.webp' },
            body: '',
        }, { knownSlugs: new Set(['20260603-a']), heroDir: os.tmpdir() });

        assert.ok(issues.some((issue) => issue.level === 'error' && issue.message.includes('hero 文件不存在: missing.webp')));
    });

    test('rejects a non-ASCII filename because it would percent-encode the article URL', () => {
        const issues = analyzePost({
            filePath: 'C:/tmp/20260315-两小时，环线，慢行.md',
            fileName: '20260315-两小时，环线，慢行.md',
            frontmatter: { ...baseMeta },
            body: '',
        }, { knownSlugs: new Set(['20260315-两小时，环线，慢行']) });

        const slugIssues = issues.filter((issue) => issue.message.includes('非 ASCII'));
        assert.equal(slugIssues.length, 1);
        assert.equal(slugIssues[0].level, 'error');
    });

    test('every shipped blog filename is ASCII', async () => {
        const files = (await readdir(blogDir)).filter((name) => name.endsWith('.md'));

        assert.ok(files.length > 0);
        for (const fileName of files) {
            assert.match(fileName, /^[A-Za-z0-9._-]+$/, `${fileName} 含非 ASCII 字符`);
        }
    });
});
