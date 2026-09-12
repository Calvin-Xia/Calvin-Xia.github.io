import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import {
    parseNewPostArgs,
    promptForNewPostMetadata,
    runNewPost,
    todayLocalDate,
} from '../scripts/new-post-cli.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createTempContentDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'new-post-cli-'));
    tempDirs.push(dir);
    return dir;
}

describe('new-post CLI arguments', () => {
    test('returns the local date in YYYY-MM-DD', () => {
        assert.match(todayLocalDate(), /^\d{4}-\d{2}-\d{2}$/);
    });

    test('parses non-interactive flags', () => {
        const parsed = parseNewPostArgs(['--title', 'T', '--date', '2026-06-03', '--tags', 'a,b', '--content-dir', 'out']);

        assert.deepEqual({
            title: parsed.title,
            date: parsed.date,
            tags: parsed.tags,
            contentDir: parsed.contentDir,
            help: parsed.help,
        }, { title: 'T', date: '2026-06-03', tags: 'a,b', contentDir: 'out', help: false });
    });

    test('rejects unknown flags and value flags without a value', () => {
        assert.throws(() => parseNewPostArgs(['--bogus']), /未知参数/);
        assert.throws(() => parseNewPostArgs(['--title']), /缺少取值/);
    });
});

describe('new-post CLI creation', () => {
    test('writes a post with slug and shared validation', async () => {
        const dir = await createTempContentDir();

        const result = await runNewPost({
            payload: { title: 'CLI Test', date: '2026-06-03', excerpt: 'e', category: 'c', tags: 't1,t2' },
            contentDir: dir,
        });

        assert.equal(result.entrySlug, '20260603-cli-test');
        assert.equal(result.articleUrl, '/articles/20260603-cli-test/');
        const markdown = await readFile(path.join(dir, '20260603-cli-test.md'), 'utf8');
        assert.match(markdown, /title: "CLI Test"/);
        assert.match(markdown, /- "t1"/);
    });

    test('rejects duplicate entry slugs with a friendly message', async () => {
        const dir = await createTempContentDir();
        const payload = { title: 'CLI Test', date: '2026-06-03', excerpt: 'e', category: 'c', tags: 't' };
        await runNewPost({ payload, contentDir: dir });

        await assert.rejects(
            () => runNewPost({ payload, contentDir: dir }),
            /同名文章已存在/,
        );
    });

    test('surfaces validation errors', async () => {
        const dir = await createTempContentDir();

        await assert.rejects(
            () => runNewPost({ payload: { title: '', date: 'bad-date' }, contentDir: dir }),
            /元数据校验失败/,
        );
    });
});

describe('new-post CLI prompts', () => {
    test('collects and normalizes interactive answers using defaults', async () => {
        const mockPrompts = async (questions) => {
            const raw = { title: '  交互文章  ', date: '', excerpt: '', category: '', tags: '' };
            const answers = {};
            for (const question of questions) {
                answers[question.name] = raw[question.name] || question.initial || '';
            }
            return answers;
        };

        const payload = await promptForNewPostMetadata({ prompts: mockPrompts, dateDefault: '2026-06-03' });

        assert.deepEqual(payload, {
            title: '交互文章',
            date: '2026-06-03',
            excerpt: '',
            category: '未分类',
            tags: '未分类',
        });
    });

    test('throws on cancellation', async () => {
        await assert.rejects(
            () => promptForNewPostMetadata({ prompts: async () => ({}) }),
            /已取消新建文章/,
        );
    });
});
