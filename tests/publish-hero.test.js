import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import {
    attachHeroAndDimensions,
    collectImageDimensions,
    processHeroImage,
    promptForHeroSelection,
} from '../scripts/publish-post.js';
import { readTransformedMarkdown } from '../scripts/post-utils.js';
import { buildMarkdownDocument } from '../scripts/markdown-utils.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function createTempDir(prefix) {
    const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

function pngBytes(width, height) {
    return Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        (width >>> 24) & 0xff, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
        (height >>> 24) & 0xff, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
    ]);
}

describe('publish hero selection', () => {
    test('returns null without prompting when there are no supported images', async () => {
        let prompted = false;
        const hero = await promptForHeroSelection(
            [{ path: '/tmp/notes.txt', relativePath: 'notes.txt' }],
            { prompts: async () => { prompted = true; return {}; } },
        );

        assert.equal(hero, null);
        assert.equal(prompted, false);
    });

    test('returns the chosen relative path and offers a no-hero option', async () => {
        const questions = [];
        const mockPrompts = async (question) => {
            questions.push(question);
            return { hero: 'cover.png' };
        };

        const hero = await promptForHeroSelection(
            [
                { path: '/tmp/notes.txt', relativePath: 'notes.txt' },
                { path: '/tmp/cover.png', relativePath: 'cover.png' },
            ],
            { prompts: mockPrompts },
        );

        assert.equal(hero, 'cover.png');
        assert.equal(questions[0].choices[0].value, '');
        assert.deepEqual(questions[0].choices.slice(1).map((choice) => choice.value), ['cover.png']);
    });

    test('returns null when the user picks the no-hero option', async () => {
        const hero = await promptForHeroSelection(
            [{ path: '/tmp/cover.png', relativePath: 'cover.png' }],
            { prompts: async () => ({ hero: '' }) },
        );

        assert.equal(hero, null);
    });
});

describe('publish image dimensions manifest', () => {
    test('collects entries only for supported, parseable images', async () => {
        const dir = await createTempDir('hero-dims-');
        const pngPath = path.join(dir, 'cover.png');
        await writeFile(pngPath, pngBytes(64, 48));

        const entries = await collectImageDimensions(
            [
                { path: pngPath, relativePath: 'cover.png' },
                { path: path.join(dir, 'notes.txt'), relativePath: 'notes.txt' },
                { path: path.join(dir, 'photo.avif'), relativePath: 'photo.avif' },
            ],
            { assetSlug: 'my-post' },
        );

        assert.deepEqual(entries, [{ path: 'my-post/cover.png', width: 64, height: 48 }]);
    });

    test('skips probing failures with a warning instead of aborting the publish', async () => {
        const warnings = [];
        const entries = await collectImageDimensions(
            [{ path: '/nowhere/cover.png', relativePath: 'cover.png' }],
            {
                assetSlug: 'my-post',
                logger: { warn: (message) => warnings.push(message) },
                probe: async () => { throw new Error('boom'); },
            },
        );

        assert.deepEqual(entries, []);
        assert.equal(warnings.length, 1);
        assert.match(warnings[0], /cover\.png/);
    });
});

describe('publish hero processing', () => {
    function fakeSharp(recorder) {
        const chain = {
            rotate() { recorder.ops.push('rotate'); return chain; },
            resize(options) { recorder.ops.push(['resize', options]); return chain; },
            webp(options) { recorder.ops.push(['webp', options]); return chain; },
            async toFile(destination) { recorder.ops.push(['toFile', destination]); },
        };
        return chain;
    }

    test('runs the sharp pipeline with 1600px webp settings', async () => {
        const recorder = { ops: [] };
        const sharpCalls = [];
        const sharpImpl = (source) => {
            sharpCalls.push(source);
            return fakeSharp(recorder);
        };

        await processHeroImage({
            sourcePath: '/vault/cover.png',
            destinationPath: '/repo/src/assets/hero/x.webp',
            sharpImpl,
            logger: { log() {} },
        });

        assert.deepEqual(sharpCalls, ['/vault/cover.png']);
        assert.deepEqual(recorder.ops, [
            'rotate',
            ['resize', { width: 1600, withoutEnlargement: true }],
            ['webp', { quality: 82 }],
            ['toFile', '/repo/src/assets/hero/x.webp'],
        ]);
    });

    test('attachHeroAndDimensions writes manifest and hero metadata onto the plan', async () => {
        const dir = await createTempDir('hero-attach-');
        const pngPath = path.join(dir, 'cover.png');
        await writeFile(pngPath, pngBytes(64, 48));
        const recorder = { ops: [] };
        const sharpCalls = [];
        const sharpImpl = (source) => {
            sharpCalls.push(source);
            return fakeSharp(recorder);
        };
        const heroDestinations = [];
        const heroDir = path.join(dir, 'hero');
        const sharpThroughDir = (source) => sharpImpl(source);

        const plan = {
            assets: [{ path: pngPath, relativePath: 'cover.png' }],
            assetSlug: 'my-post',
            destinationMarkdownPath: path.join(dir, '20260603-my-post.md'),
            metadata: { title: 'T', date: '2026-06-03' },
        };

        await attachHeroAndDimensions(plan, {
            logger: { log() {}, warn() {} },
            prompts: async () => ({ hero: 'cover.png' }),
            probe: async () => ({ width: 64, height: 48 }),
            heroDir,
            sharpImpl: (source) => {
                sharpCalls.push(source);
                const chain = fakeSharp(recorder);
                const originalToFile = chain.toFile;
                chain.toFile = async (destination) => {
                    heroDestinations.push(destination);
                    await originalToFile(destination);
                };
                return chain;
            },
        });

        assert.deepEqual(plan.metadata.imageDimensions, [{ path: 'my-post/cover.png', width: 64, height: 48 }]);
        assert.equal(plan.metadata.hero, '20260603-my-post.webp');
        assert.equal(sharpCalls.length, 1);
        assert.equal(heroDestinations[0], path.join(heroDir, '20260603-my-post.webp'));
        assert.match(recorder.ops.find((op) => Array.isArray(op) && op[0] === 'toFile')[1], /20260603-my-post\.webp$/);
        assert.ok(sharpThroughDir);
    });

    test('attachHeroAndDimensions skips hero metadata when the user opts out', async () => {
        const plan = {
            assets: [{ path: '/tmp/cover.png', relativePath: 'cover.png' }],
            assetSlug: 'my-post',
            destinationMarkdownPath: '/tmp/20260603-my-post.md',
            metadata: {},
        };

        await attachHeroAndDimensions(plan, {
            logger: { log() {}, warn() {} },
            prompts: async () => ({ hero: '' }),
            probe: async () => ({ width: 10, height: 10 }),
        });

        assert.deepEqual(plan.metadata.imageDimensions, [{ path: 'my-post/cover.png', width: 10, height: 10 }]);
        assert.equal(plan.metadata.hero, undefined);
    });
});

describe('hero and dimensions frontmatter round-trip', () => {
    test('buildMarkdownDocument serializes hero and imageDimensions', () => {
        const markdown = buildMarkdownDocument({
            title: 'T',
            date: '2026-06-03',
            excerpt: 'e',
            category: 'c',
            tags: ['t'],
            hero: '20260603-t.webp',
            imageDimensions: [{ path: 'p/中文名.jpg', width: 800, height: 600 }],
        });

        assert.match(markdown, /hero: "20260603-t\.webp"/);
        assert.match(markdown, /imageDimensions:\n  - path: "p\/中文名\.jpg"\n    width: 800\n    height: 600/);
    });

    test('readTransformedMarkdown carries hero and dimensions from plan metadata', async () => {
        const dir = await createTempDir('hero-roundtrip-');
        const sourcePath = path.join(dir, 'source.md');
        await writeFile(sourcePath, '---\ntitle: "S"\ndate: "2026-06-03"\nexcerpt: "e"\ncategory: "c"\ntags:\n  - "t"\n---\n\n正文\n', 'utf8');

        const markdown = await readTransformedMarkdown({
            sourceMarkdownPath: sourcePath,
            dirName: '20260603-my-post',
            assetSlug: 'my-post',
            publicUrl: 'https://content.example.com',
            metadata: {
                title: 'T',
                date: '2026-06-03',
                excerpt: 'e',
                category: 'c',
                tags: ['t'],
                hero: '20260603-my-post.webp',
                imageDimensions: [{ path: 'my-post/cover.png', width: 64, height: 48 }],
            },
        });

        assert.match(markdown, /hero: "20260603-my-post\.webp"/);
        assert.match(markdown, /width: 64/);
        const content = await readFile(sourcePath, 'utf8');
        assert.match(content, /title: "S"/);
    });
});
