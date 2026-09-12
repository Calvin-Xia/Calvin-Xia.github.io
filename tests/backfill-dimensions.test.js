import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import {
    backfillFile,
    buildFrontmatterBlock,
    collectRemoteImageUrls,
    mergeDimensions,
    urlToManifestPath,
} from '../scripts/backfill-image-dimensions.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createTempContentDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'backfill-dims-'));
    tempDirs.push(dir);
    return dir;
}

function pngArrayBuffer(width, height) {
    const bytes = [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        (width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
        (height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    ];
    return Uint8Array.from(bytes).buffer;
}

describe('backfill image dimensions helpers', () => {
    test('collects R2 image urls from markdown and raw html, case-insensitively', () => {
        const body = [
            '![水牌](https://content.calvin-xia.cn/slow-train/train-sign.JPG)',
            '<img src="https://assets.calvin-xia.cn/image_%E4%B8%AD%E7%A7%8B.JPG" alt="中秋月">',
            '![外部](https://example.com/x.png)',
            '[链接不是图](https://content.calvin-xia.cn/slow-train/doc.pdf)',
        ].join('\n');

        assert.deepEqual(collectRemoteImageUrls(body), [
            'https://content.calvin-xia.cn/slow-train/train-sign.JPG',
            'https://assets.calvin-xia.cn/image_%E4%B8%AD%E7%A7%8B.JPG',
        ]);
    });

    test('decodes manifest paths from urls', () => {
        assert.equal(
            urlToManifestPath('https://assets.calvin-xia.cn/my-post/%E4%B8%AD%E7%A7%8B.JPG'),
            'my-post/中秋.JPG',
        );
        assert.equal(urlToManifestPath('not-a-url'), '');
    });

    test('merges dimensions by path with later entries winning, sorted', () => {
        const merged = mergeDimensions(
            [{ path: 'b/2.png', width: 1, height: 1 }, { path: 'a/1.png', width: 2, height: 2 }],
            [{ path: 'b/2.png', width: 9, height: 9 }, { path: 'c/3.png', width: 3, height: 3 }],
        );

        assert.deepEqual(merged, [
            { path: 'a/1.png', width: 2, height: 2 },
            { path: 'b/2.png', width: 9, height: 9 },
            { path: 'c/3.png', width: 3, height: 3 },
        ]);
    });

    test('builds a stable frontmatter block', () => {
        const block = buildFrontmatterBlock([{ path: 'my-post/a.png', width: 64, height: 48 }]);

        assert.equal(block, 'imageDimensions:\n  - path: "my-post/a.png"\n    width: 64\n    height: 48');
    });
});

describe('backfill file processing', () => {
    const fetchImpl = async (url) => {
        if (url === 'https://content.calvin-xia.cn/my-post/cover.png') {
            return { ok: true, arrayBuffer: async () => pngArrayBuffer(640, 480) };
        }
        if (url === 'https://assets.calvin-xia.cn/my-post/broken.png') {
            return { ok: false, status: 404 };
        }
        throw new Error('network down');
    };

    async function writePost(dir, body) {
        const frontmatter = [
            'title: "T"',
            'date: "2026-06-03"',
            'excerpt: "e"',
            'category: "c"',
            'tags:',
            '  - "t"',
            '',
        ].join('\n');
        const filePath = path.join(dir, '20260603-post.md');
        await writeFile(filePath, `---\n${frontmatter}---\n\n${body}\n`, 'utf8');
        return filePath;
    }

    test('appends the manifest after probing remote images', async () => {
        const dir = await createTempContentDir();
        const filePath = await writePost(dir, '![封面](https://content.calvin-xia.cn/my-post/cover.png)\n![坏图](https://assets.calvin-xia.cn/my-post/broken.png)');

        const result = await backfillFile(filePath, { dryRun: false, fetchImpl, logger: { log() {} } });
        const updated = await readFile(filePath, 'utf8');

        assert.deepEqual(result, { added: 1, failures: 1 });
        assert.match(updated, /imageDimensions:\n  - path: "my-post\/cover\.png"\n    width: 640\n    height: 480\n---/);
        assert.match(updated, /title: "T"/);
    });

    test('is idempotent once the manifest exists', async () => {
        const dir = await createTempContentDir();
        const filePath = await writePost(dir, '![封面](https://content.calvin-xia.cn/my-post/cover.png)');
        await backfillFile(filePath, { dryRun: false, fetchImpl, logger: { log() {} } });

        const logs = [];
        const result = await backfillFile(filePath, { dryRun: false, fetchImpl, logger: { log: (m) => logs.push(m) } });

        assert.deepEqual(result, { added: 0, failures: 0 });
        assert.ok(logs.some((message) => message.includes('已有 imageDimensions')));
    });

    test('dry-run does not modify the file', async () => {
        const dir = await createTempContentDir();
        const filePath = await writePost(dir, '![封面](https://content.calvin-xia.cn/my-post/cover.png)');
        const before = await readFile(filePath, 'utf8');

        const result = await backfillFile(filePath, { dryRun: true, fetchImpl, logger: { log() {} } });

        assert.equal(result.added, 1);
        assert.equal(await readFile(filePath, 'utf8'), before);
    });
});
