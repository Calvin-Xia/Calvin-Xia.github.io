import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';

import { getContentType } from '../scripts/content-types.js';
import {
    buildMarkdownDocument,
    transformMarkdownAssetLinks,
} from '../scripts/markdown-utils.js';
import {
    buildPublishPlan,
    createPostFile,
    deriveDateFromDirName,
    readTransformedMarkdown,
    validatePostPayload,
} from '../scripts/post-utils.js';
import { deriveAssetSlug, slugifyTitle } from '../scripts/slug.js';

const tempDirs = [];
const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

async function createTempDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'phase-2-post-utils-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('post utility functions', () => {
    test('post-utils stays focused on validation and file/publish orchestration', () => {
        const source = readFileSync(projectPath('scripts', 'post-utils.js'), 'utf8');

        assert.match(source, /from\s+['"]\.\/slug\.js['"]/);
        assert.match(source, /from\s+['"]\.\/markdown-utils\.js['"]/);
        assert.doesNotMatch(source, /CHINESE_INITIALS/);
        assert.doesNotMatch(source, /export\s+function\s+slugifyTitle/);
        assert.doesNotMatch(source, /export\s+function\s+buildMarkdownDocument/);
        assert.doesNotMatch(source, /export\s+function\s+transformMarkdownAssetLinks/);
        assert.doesNotMatch(source, /export\s+function\s+getContentType/);
    });

    test('slugifyTitle keeps latin words and converts supported Chinese characters to pinyin initials', () => {
        assert.equal(slugifyTitle('From Nervousness to Growth: A Reflection'), 'from-nervousness-to-growth-a-reflection');
        assert.equal(slugifyTitle('返校宣讲 破局·成长'), 'fxxj-pjcz');
        assert.equal(slugifyTitle('新建文章'), 'xjwz');
    });

    test('validatePostPayload reports missing required fields and normalizes valid payloads', () => {
        const invalid = validatePostPayload({ title: '', date: '', body: '正文' });
        assert.deepEqual(invalid.errors, {
            title: '标题不能为空',
            date: '日期不能为空',
        });

        const valid = validatePostPayload({
            title: '新建文章',
            date: '2026-04-30',
            category: '生活总结',
            tags: '测试, Astro',
            excerpt: '摘要',
            body: '# 正文',
        });

        assert.equal(valid.errors, null);
        assert.deepEqual(valid.value.tags, ['测试', 'Astro']);
    });

    test('buildMarkdownDocument writes complete YAML frontmatter before body content', () => {
        const markdown = buildMarkdownDocument({
            title: '新建文章',
            date: '2026-04-30',
            excerpt: '摘要',
            category: '生活总结',
            tags: ['测试', 'Astro'],
            body: '正文内容',
        });

        assert.match(markdown, /^---\ntitle: "新建文章"\ndate: "2026-04-30"/);
        assert.match(markdown, /tags:\n  - "测试"\n  - "Astro"/);
        assert.match(markdown, /\n---\n\n正文内容\n$/);
    });

    test('createPostFile writes a dated slug markdown file and refuses to overwrite it', async () => {
        const contentDir = await createTempDir();
        const result = await createPostFile(
            {
                title: '新建文章',
                date: '2026-04-30',
                excerpt: '摘要',
                category: '生活总结',
                tags: ['测试'],
                body: '正文',
            },
            { contentDir },
        );

        assert.equal(result.entrySlug, '20260430-xjwz');
        assert.equal(path.basename(result.filePath), '20260430-xjwz.md');
        assert.match(await readFile(result.filePath, 'utf8'), /title: "新建文章"/);

        await assert.rejects(
            () => createPostFile(
                {
                    title: '新建文章',
                    date: '2026-04-30',
                    excerpt: '摘要',
                    category: '生活总结',
                    tags: ['测试'],
                    body: '正文',
                },
                { contentDir },
            ),
            /already exists/,
        );
    });

    test('publish helpers derive asset slug and rewrite copied markdown asset links only', async () => {
        assert.equal(deriveAssetSlug('20260429-my-new-post'), 'my-new-post');

        const markdown = [
            '![图片](./file/a b.png)',
            '![大写](./File/COVER.PNG)',
            '![照片](FILE/photo.JPEG)',
            '[附件](file/doc.pdf)',
            '![远程](https://example.com/file/a.png)',
            '![无斜杠](.file/yangloudong.JPG)',
            '![无斜杠](.File/institution.jpg)',
        ].join('\n');

        const transformed = transformMarkdownAssetLinks(markdown, {
            publicUrl: 'https://content.calvin-xia.cn',
            assetSlug: 'my-new-post',
        });

        assert.match(transformed, /https:\/\/content\.calvin-xia\.cn\/my-new-post\/a%20b\.png/);
        assert.match(transformed, /https:\/\/content\.calvin-xia\.cn\/my-new-post\/COVER\.PNG/);
        assert.match(transformed, /https:\/\/content\.calvin-xia\.cn\/my-new-post\/photo\.JPEG/);
        assert.match(transformed, /https:\/\/content\.calvin-xia\.cn\/my-new-post\/doc\.pdf/);
        assert.match(transformed, /!\[远程\]\(https:\/\/example\.com\/file\/a\.png\)/);
        assert.match(transformed, /https:\/\/content\.calvin-xia\.cn\/my-new-post\/yangloudong\.JPG/);
        assert.match(transformed, /https:\/\/content\.calvin-xia\.cn\/my-new-post\/institution\.jpg/);
    });

    test('content type detection treats image extensions case-insensitively', () => {
        assert.equal(getContentType('cover.PNG'), 'image/png');
        assert.equal(getContentType('photo.JPEG'), 'image/jpeg');
        assert.equal(getContentType('scan.TIFF'), 'image/tiff');
        assert.equal(getContentType('image.HEIC'), 'image/heic');
    });

    test('buildPublishPlan reads the vault source without mutating it', async () => {
        const vaultDir = await createTempDir();
        const outputDir = await createTempDir();
        const postDir = path.join(vaultDir, '20260429-my-new-post');
        await mkdir(path.join(postDir, 'File'), { recursive: true });
        await writeFile(path.join(postDir, 'draft.md'), '![图](./File/a.PNG)\n', 'utf8');
        await writeFile(path.join(postDir, 'File', 'a.PNG'), 'png', 'utf8');

        const plan = await buildPublishPlan({
            vaultDir,
            dirName: '20260429-my-new-post',
            outputDir,
            publicUrl: 'https://content.calvin-xia.cn',
        });

        assert.equal(plan.assetSlug, 'my-new-post');
        assert.equal(plan.destinationMarkdownPath, path.join(outputDir, '20260429-my-new-post.md'));
        assert.deepEqual(plan.assets.map((asset) => asset.key), ['my-new-post/a.PNG']);
        assert.equal(await readFile(path.join(postDir, 'draft.md'), 'utf8'), '![图](./File/a.PNG)\n');
    });

    test('deriveDateFromDirName extracts YYYY-MM-DD from dir name prefix', () => {
        assert.equal(deriveDateFromDirName('20260503-labors-day'), '2026-05-03');
        assert.equal(deriveDateFromDirName('20251231-2025年度总结'), '2025-12-31');
        assert.equal(deriveDateFromDirName('no-date-prefix'), '');
        assert.equal(deriveDateFromDirName(''), '');
    });

    test('readTransformedMarkdown injects frontmatter when source has none', async () => {
        const vaultDir = await createTempDir();
        const postDir = path.join(vaultDir, '20260503-my-post');
        await mkdir(postDir, { recursive: true });
        await writeFile(path.join(postDir, 'draft.md'), '# Hello\n![图](./file/a.png)\n', 'utf8');

        const plan = {
            sourceMarkdownPath: path.join(postDir, 'draft.md'),
            dirName: '20260503-my-post',
            publicUrl: 'https://content.example.com',
            assetSlug: 'my-post',
        };

        const result = await readTransformedMarkdown(plan);

        assert.match(result, /^---\n/);
        assert.match(result, /title: "20260503-my-post"/);
        assert.match(result, /date: "2026-05-03"/);
        assert.match(result, /category: "未分类"/);
        assert.match(result, /tags:\n  - "未分类"/);
        assert.match(result, /!\[图\]\(https:\/\/content\.example\.com\/my-post\/a\.png\)/);
        assert.ok(result.includes('\n\n# Hello\n'));
    });

    test('readTransformedMarkdown preserves existing frontmatter from source', async () => {
        const vaultDir = await createTempDir();
        const postDir = path.join(vaultDir, '20260503-my-post');
        await mkdir(postDir, { recursive: true });
        await writeFile(path.join(postDir, 'draft.md'),
            '---\ntitle: "My Title"\ndate: "2026-04-01"\ntags:\n  - "tag1"\n---\n\n# Hello\n', 'utf8');

        const plan = {
            sourceMarkdownPath: path.join(postDir, 'draft.md'),
            dirName: '20260503-my-post',
            publicUrl: 'https://content.example.com',
            assetSlug: 'my-post',
        };

        const result = await readTransformedMarkdown(plan);

        assert.match(result, /title: "My Title"/);
        assert.match(result, /date: "2026-04-01"/);
        assert.match(result, /  - "tag1"/);
        assert.match(result, /# Hello/);
    });

    test('readTransformedMarkdown defaults empty source tags to uncategorized', async () => {
        const vaultDir = await createTempDir();
        const postDir = path.join(vaultDir, '20260503-my-post');
        await mkdir(postDir, { recursive: true });
        await writeFile(path.join(postDir, 'draft.md'),
            '---\ntitle: "My Title"\ndate: "2026-04-01"\ntags:\n---\n\n# Hello\n', 'utf8');

        const plan = {
            sourceMarkdownPath: path.join(postDir, 'draft.md'),
            dirName: '20260503-my-post',
            publicUrl: 'https://content.example.com',
            assetSlug: 'my-post',
        };

        const result = await readTransformedMarkdown(plan);

        assert.match(result, /tags:\n  - "未分类"/);
    });

    test('readTransformedMarkdown gives user metadata priority over source frontmatter', async () => {
        const vaultDir = await createTempDir();
        const postDir = path.join(vaultDir, '20260503-my-post');
        await mkdir(postDir, { recursive: true });
        await writeFile(path.join(postDir, 'draft.md'),
            '---\ntitle: "Old Title"\ndate: "2026-04-01"\n---\n\n# Hello\n', 'utf8');

        const plan = {
            sourceMarkdownPath: path.join(postDir, 'draft.md'),
            dirName: '20260503-my-post',
            publicUrl: 'https://content.example.com',
            assetSlug: 'my-post',
            metadata: {
                title: 'New Title',
                date: '2026-05-03',
                excerpt: 'Custom excerpt',
                category: '随笔',
                tags: ['a', 'b'],
            },
        };

        const result = await readTransformedMarkdown(plan);

        assert.match(result, /title: "New Title"/);
        assert.match(result, /date: "2026-05-03"/);
        assert.match(result, /excerpt: "Custom excerpt"/);
        assert.match(result, /category: "随笔"/);
        assert.match(result, /  - "a"/);
        assert.match(result, /  - "b"/);
    });
});
