import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';

import {
    collectMetadataEdits,
    parseEditMetadataArgs,
    readPostMetadata,
    validatePostMetadata,
    writePostMetadataAtomic,
} from '../scripts/edit-metadata.js';

const tempDirs = [];

async function createTempDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'edit-metadata-'));
    tempDirs.push(dir);
    return dir;
}

async function createTempPost(markdown) {
    const dir = await createTempDir();
    const filePath = path.join(dir, '20260601-post.md');
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, markdown, 'utf8');
    return filePath;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('edit metadata CLI helpers', () => {
    test('reads markdown frontmatter and normalizes editable metadata', async () => {
        const filePath = await createTempPost([
            '---',
            'title: "旧标题"',
            'date: "2026-06-01"',
            'excerpt: "旧摘要"',
            'category: "随笔"',
            'tags:',
            '  - "生活"',
            '  - "Astro"',
            'featured: true',
            'author: "Calvin"',
            'readTime: "5 min"',
            'status: "published"',
            'customField: "kept"',
            '---',
            '',
            '# 正文',
            '',
        ].join('\n'));

        const post = await readPostMetadata(filePath);

        assert.deepEqual(post.metadata, {
            title: '旧标题',
            date: '2026-06-01',
            excerpt: '旧摘要',
            category: '随笔',
            tags: ['生活', 'Astro'],
            featured: true,
            author: 'Calvin',
            readTime: '5 min',
            status: 'published',
            customField: 'kept',
        });
        assert.equal(post.content, '# 正文\n');
    });

    test('requires existing markdown frontmatter before editing', async () => {
        const filePath = await createTempPost('# 没有 frontmatter\n');

        await assert.rejects(
            () => readPostMetadata(filePath),
            /frontmatter is required/,
        );
    });

    test('validates metadata with the blog frontmatter schema and normalizes valid input', () => {
        const invalid = validatePostMetadata({
            title: '',
            date: '20260601',
            category: '',
            tags: '测试, Astro',
        });

        assert.deepEqual(invalid.errors, {
            title: '标题不能为空',
            date: '日期格式必须为 YYYY-MM-DD',
            category: '分类不能为空',
        });

        const valid = validatePostMetadata({
            title: '  新标题  ',
            date: '2026-06-01',
            excerpt: '  新摘要  ',
            category: '  记录  ',
            tags: '测试, Astro,  ',
            author: '  ',
            readTime: ' 4 min ',
            status: ' published ',
            customField: 'kept',
        });

        assert.equal(valid.errors, null);
        assert.deepEqual(valid.value, {
            title: '新标题',
            date: '2026-06-01',
            excerpt: '新摘要',
            category: '记录',
            tags: ['测试', 'Astro'],
            readTime: '4 min',
            status: 'published',
            customField: 'kept',
        });
    });

    test('writes updated metadata through a temporary file before renaming', async () => {
        const filePath = await createTempPost([
            '---',
            'title: "旧标题"',
            'date: "2026-06-01"',
            'excerpt: "旧摘要"',
            'category: "随笔"',
            'tags:',
            '  - "旧标签"',
            '---',
            '',
            '# 正文',
            '',
        ].join('\n'));
        const operations = [];

        await writePostMetadataAtomic(
            filePath,
            {
                title: '新标题',
                date: '2026-06-02',
                excerpt: '新摘要',
                category: '记录',
                tags: ['新标签', 'Astro'],
            },
            {
                writeFile: async (target, content, encoding) => {
                    operations.push({ type: 'writeFile', target });
                    await writeFile(target, content, encoding);
                },
                rename: async (from, to) => {
                    operations.push({ type: 'rename', from, to });
                    await rename(from, to);
                },
            },
        );

        assert.equal(operations[0].type, 'writeFile');
        assert.notEqual(operations[0].target, filePath);
        assert.ok(operations[0].target.startsWith(`${filePath}.tmp-`));
        assert.deepEqual(operations[1], {
            type: 'rename',
            from: operations[0].target,
            to: filePath,
        });

        const updated = await readFile(filePath, 'utf8');
        assert.match(updated, /title: 新标题/);
        assert.match(updated, /date: ['"]2026-06-02['"]/);
        assert.match(updated, /tags:\n  - 新标签\n  - Astro/);
        assert.match(updated, /\n# 正文\n$/);
    });

    test('cleans up the temporary file when atomic rename fails', async () => {
        const filePath = await createTempPost([
            '---',
            'title: "旧标题"',
            'date: "2026-06-01"',
            'excerpt: "旧摘要"',
            'category: "随笔"',
            'tags: []',
            '---',
            '',
            '# 正文',
            '',
        ].join('\n'));
        const removed = [];

        await assert.rejects(
            () => writePostMetadataAtomic(
                filePath,
                {
                    title: '新标题',
                    date: '2026-06-02',
                    excerpt: '新摘要',
                    category: '记录',
                    tags: [],
                },
                {
                    rename: async () => {
                        throw new Error('rename failed');
                    },
                    unlink: async (target) => {
                        removed.push(target);
                        await rm(target, { force: true });
                    },
                },
            ),
            /rename failed/,
        );

        assert.equal(removed.length, 1);
        assert.ok(removed[0].startsWith(`${filePath}.tmp-`));
    });

    test('collects interactive edits with defaults and confirmation state', async () => {
        const questionsSeen = [];
        const prompts = async (questions) => {
            questionsSeen.push(...questions.map((question) => ({
                name: question.name,
                initial: question.initial,
            })));
            return {
                title: '新标题',
                date: '2026-06-03',
                excerpt: '新摘要',
                category: '记录',
                tags: ['AI', '生活'],
                featured: undefined,
                author: '',
                readTime: '3 min',
                status: 'published',
                skipValidation: false,
                confirmed: true,
            };
        };

        const result = await collectMetadataEdits({
            title: '旧标题',
            date: '2026-06-01',
            excerpt: '旧摘要',
            category: '随笔',
            tags: ['旧标签'],
        }, { prompts });

        assert.deepEqual(questionsSeen.slice(0, 5), [
            { name: 'title', initial: '旧标题' },
            { name: 'date', initial: '2026-06-01' },
            { name: 'excerpt', initial: '旧摘要' },
            { name: 'category', initial: '随笔' },
            { name: 'tags', initial: '旧标签' },
        ]);
        assert.equal(result.confirmed, true);
        assert.equal(result.skipValidation, false);
        assert.deepEqual(result.metadata, {
            title: '新标题',
            date: '2026-06-03',
            excerpt: '新摘要',
            category: '记录',
            tags: ['AI', '生活'],
            readTime: '3 min',
            status: 'published',
        });
    });

    test('parses metadata editor arguments', () => {
        assert.deepEqual(parseEditMetadataArgs([
            '--skip-validation',
            'src/content/blog/20260601-post.md',
        ]), {
            filePath: 'src/content/blog/20260601-post.md',
            skipValidation: true,
            help: false,
        });

        assert.deepEqual(parseEditMetadataArgs(['--help']), {
            filePath: '',
            skipValidation: false,
            help: true,
        });
    });
});
