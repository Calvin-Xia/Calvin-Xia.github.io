import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import {
    executePublishPlan,
    parsePublishArgs,
    promptForPostMetadata,
    uploadAssets,
} from '../scripts/publish-post.js';

const tempDirs = [];

async function createTempAsset(name, content = 'asset') {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'publish-post-'));
    tempDirs.push(dir);
    const filePath = path.join(dir, name);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
    return filePath;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('publish post uploads', () => {
    test('parses dry-run publish arguments without changing direct publish behavior', () => {
        assert.deepEqual(parsePublishArgs(['--dry-run', '20260429-my-post']), {
            dirName: '20260429-my-post',
            dryRun: true,
        });
        assert.deepEqual(parsePublishArgs(['20260429-my-post']), {
            dirName: '20260429-my-post',
            dryRun: false,
        });
    });

    test('dry-run prints the publish plan without writing markdown or uploading assets', async () => {
        const calls = [];
        const logs = [];
        const plan = {
            destinationMarkdownPath: path.join(os.tmpdir(), 'dry-run-output.md'),
            assets: [{
                relativePath: 'cover.png',
                key: 'my-post/cover.png',
            }],
        };

        await executePublishPlan(plan, {
            dryRun: true,
            logger: {
                log: (message) => logs.push(message),
            },
            mkdir: async () => calls.push('mkdir'),
            writeFile: async () => calls.push('writeFile'),
            uploadAssets: async () => calls.push('uploadAssets'),
            readTransformedMarkdown: async () => 'markdown',
        });

        assert.deepEqual(calls, []);
        assert.ok(logs.some((message) => message.includes('Dry run only')));
    });

    test('metadata prompt shows the default tag and uses it when tags are blank', async () => {
        const prompts = [];
        const answers = ['新文章', '', '摘要', '', ''];

        const metadata = await promptForPostMetadata('20260603-my-post', {
            createInterface: () => ({
                async question(prompt) {
                    prompts.push(prompt);
                    return answers.shift();
                },
                close() {},
            }),
            logger: { log() {} },
        });

        assert.deepEqual(metadata, {
            title: '新文章',
            date: '2026-06-03',
            excerpt: '摘要',
            category: '未分类',
            tags: ['未分类'],
        });
        assert.equal(prompts[4], '标签 (逗号分隔) [未分类]: ');
    });

    test('retries transient R2 upload failures before succeeding', async () => {
        const assetPath = await createTempAsset('cover.PNG');
        const attempts = [];
        const client = {
            async send(command) {
                attempts.push(command.input);
                if (attempts.length < 3) {
                    throw new Error('temporary network issue');
                }
            },
        };

        await uploadAssets(
            {
                assets: [{
                    path: assetPath,
                    relativePath: 'cover.PNG',
                    key: 'my-post/cover.PNG',
                    publicUrl: 'https://content.calvin-xia.cn/my-post/cover.PNG',
                }],
            },
            {
                bucket: 'assets-of-my-blogs',
                client,
                logger: { log() {} },
                retryDelayBaseMs: 0,
            },
        );

        assert.equal(attempts.length, 3);
        assert.equal(attempts[0].Bucket, 'assets-of-my-blogs');
        assert.equal(attempts[0].Key, 'my-post/cover.PNG');
        assert.equal(attempts[0].ContentType, 'image/png');
    });

    test('keeps uploading later assets and reports every failed R2 upload after retries', async () => {
        const failPath = await createTempAsset('fail.png');
        const okPath = await createTempAsset('ok.jpeg');
        const attemptsByKey = new Map();
        const client = {
            async send(command) {
                const key = command.input.Key;
                attemptsByKey.set(key, (attemptsByKey.get(key) || 0) + 1);
                if (key === 'my-post/fail.png') {
                    throw new Error('R2 unavailable');
                }
            },
        };

        await assert.rejects(
            () => uploadAssets(
                {
                    assets: [
                        {
                            path: failPath,
                            relativePath: 'fail.png',
                            key: 'my-post/fail.png',
                            publicUrl: 'https://content.calvin-xia.cn/my-post/fail.png',
                        },
                        {
                            path: okPath,
                            relativePath: 'ok.jpeg',
                            key: 'my-post/ok.jpeg',
                            publicUrl: 'https://content.calvin-xia.cn/my-post/ok.jpeg',
                        },
                    ],
                },
                {
                    bucket: 'assets-of-my-blogs',
                    client,
                    logger: { log() {}, warn() {} },
                    retryDelayBaseMs: 0,
                },
            ),
            /Failed to upload 1 asset\(s\): fail\.png/,
        );

        assert.equal(attemptsByKey.get('my-post/fail.png'), 3);
        assert.equal(attemptsByKey.get('my-post/ok.jpeg'), 1);
    });
});
