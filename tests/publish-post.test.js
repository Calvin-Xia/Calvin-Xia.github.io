import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import {
    executePublishPlan,
    parsePublishArgs,
    promptForFileSelection,
    promptForPostMetadata,
    uploadAssets,
    validatePublishEnvs,
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

    test('validates vault env vars for dry-run and R2 credentials only for real publish', () => {
        const vaultOnly = { OKP_VAULT: 'vault', R2_PUBLIC_URL: 'https://content.example.com' };

        assert.doesNotThrow(() => validatePublishEnvs({ dryRun: true, env: vaultOnly }));
        assert.throws(
            () => validatePublishEnvs({ dryRun: false, env: vaultOnly }),
            (error) => error.message.includes('R2_ENDPOINT')
                && error.message.includes('R2_BUCKET')
                && error.message.includes('R2_SECRET_ACCESS_KEY'),
        );

        const fullEnv = {
            ...vaultOnly,
            R2_ENDPOINT: 'https://r2.example.com',
            R2_ACCESS_KEY_ID: 'id',
            R2_SECRET_ACCESS_KEY: 'secret',
            R2_BUCKET: 'bucket',
        };
        assert.doesNotThrow(() => validatePublishEnvs({ dryRun: false, env: fullEnv }));

        assert.throws(
            () => validatePublishEnvs({ dryRun: true, env: {} }),
            (error) => error.message.includes('OKP_VAULT') && error.message.includes('R2_PUBLIC_URL'),
        );
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

    test('uploads assets before writing markdown so failures never leave half-published files', async () => {
        const calls = [];
        const logs = [];
        const plan = {
            destinationMarkdownPath: path.join(os.tmpdir(), 'upload-order-output.md'),
            assets: [{ relativePath: 'a.png', key: 'p/a.png' }],
        };

        await executePublishPlan(plan, {
            dryRun: false,
            logger: { log: (message) => logs.push(message) },
            mkdir: async () => calls.push('mkdir'),
            writeFile: async () => calls.push('writeFile'),
            uploadAssets: async () => calls.push('upload'),
            readTransformedMarkdown: async () => 'markdown',
        });

        assert.deepEqual(calls, ['upload', 'mkdir', 'writeFile']);
        assert.ok(logs.some((message) => message.includes('Copied markdown')));
    });

    test('does not write markdown when asset uploads fail', async () => {
        const calls = [];
        const plan = {
            destinationMarkdownPath: path.join(os.tmpdir(), 'upload-fail-output.md'),
            assets: [{ relativePath: 'a.png', key: 'p/a.png' }],
        };

        await assert.rejects(
            () => executePublishPlan(plan, {
                dryRun: false,
                logger: { log: () => {} },
                mkdir: async () => calls.push('mkdir'),
                writeFile: async () => calls.push('writeFile'),
                uploadAssets: async () => {
                    throw new Error('R2 unavailable');
                },
                readTransformedMarkdown: async () => 'markdown',
            }),
            /R2 unavailable/,
        );

        assert.ok(!calls.includes('writeFile'), 'markdown must not be written when uploads fail');
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

    test('re-asks the date prompt until it is a valid YYYY-MM-DD date', async () => {
        const logs = [];
        const answers = ['新文章', '2026/06/03', '', '2026-06-05', '摘要', '', ''];

        const metadata = await promptForPostMetadata('no-date-prefix', {
            createInterface: () => ({
                async question() {
                    return answers.shift();
                },
                close() {},
            }),
            logger: { log: (message) => logs.push(message) },
        });

        assert.equal(metadata.date, '2026-06-05');
        assert.ok(logs.some((message) => message.includes('YYYY-MM-DD')));
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

describe('promptForFileSelection', () => {
    test('returns files in selection order', async () => {
        const mockPrompts = async (question) => {
            if (question.type === 'multiselect') {
                return { files: ['c.md', 'a.md'] };
            }
            if (question.type === 'confirm') {
                return { confirmed: true };
            }
        };

        const result = await promptForFileSelection(
            ['a.md', 'b.md', 'c.md'],
            { prompts: mockPrompts },
        );

        assert.deepEqual(result, ['c.md', 'a.md']);
    });

    test('returns null on decline', async () => {
        const mockPrompts = async (question) => {
            if (question.type === 'multiselect') {
                return { files: ['a.md'] };
            }
            if (question.type === 'confirm') {
                return { confirmed: false };
            }
        };

        const result = await promptForFileSelection(
            ['a.md', 'b.md'],
            { prompts: mockPrompts },
        );

        assert.equal(result, null);
    });

    test('returns null on empty selection', async () => {
        const mockPrompts = async (question) => {
            if (question.type === 'multiselect') {
                return { files: [] };
            }
        };

        const result = await promptForFileSelection(
            ['a.md', 'b.md'],
            { prompts: mockPrompts },
        );

        assert.equal(result, null);
    });

    test('returns null when no markdown files provided', async () => {
        const result = await promptForFileSelection([]);

        assert.equal(result, null);
    });
});

describe('multi-md dry-run', () => {
    test('prints dry-run info for each plan without side effects', async () => {
        const calls = [];
        const logs = [];
        const plans = [
            {
                destinationMarkdownPath: path.join(os.tmpdir(), 'multi-dry-1.md'),
                assets: [{ relativePath: 'a.png', key: 'post/a.png' }],
            },
            {
                destinationMarkdownPath: path.join(os.tmpdir(), 'multi-dry-2.md'),
                assets: [{ relativePath: 'b.png', key: 'post/b.png' }],
            },
        ];

        for (const plan of plans) {
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
        }

        assert.deepEqual(calls, []);
        const dryRunMessages = logs.filter((m) => m.includes('Dry run only'));
        assert.equal(dryRunMessages.length, 2);
    });
});
