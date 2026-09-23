import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import { listPostFiles, readPostFile } from '../scripts/blog-posts.js';
import { buildStats } from '../scripts/post-stats.js';
import { computeReadingStats as computeCliStats } from '../scripts/readable-stats.js';
import { computeReadingStats as computeSiteStats } from '../src/lib/word-count.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(rootDir, 'src', 'content', 'blog');

// The fields both implementations must agree on, byte for byte.
const NUMERIC_FIELDS = ['characters', 'wordCount', 'totalCount', 'readTimeMinutes'];
const ENTITY_PATTERN = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/;

function project(stats) {
    return Object.fromEntries(NUMERIC_FIELDS.map((field) => [field, stats[field]]));
}

function readSource(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

async function loadPosts() {
    const files = await listPostFiles(contentDir);
    return Promise.all(files.map((filePath) => readPostFile(filePath)));
}

describe('CLI vs site word-count parity on real posts', () => {
    test('every post in src/content/blog produces identical CLI and site stats', async () => {
        const posts = await loadPosts();
        assert.ok(posts.length > 0, 'expected real posts under src/content/blog');

        for (const post of posts) {
            assert.deepEqual(
                project(computeCliStats(post.body)),
                project(computeSiteStats(post.body)),
                `CLI and site stats diverged for ${post.fileName}`,
            );
        }
    });

    test('entity-heavy post 20251231-year-in-review exercises HTML entity decoding', async () => {
        const posts = await loadPosts();
        const post = posts.find((candidate) => candidate.fileName === '20251231-year-in-review.md');

        assert.ok(post, 'expected src/content/blog/20251231-year-in-review.md to exist');
        assert.match(post.body, ENTITY_PATTERN, 'fixture must contain HTML entities to guard the decoding path');

        assert.deepEqual(project(computeCliStats(post.body)), project(computeSiteStats(post.body)));
    });

    test('npm run stats pipeline (buildStats) agrees with site word-count output', async () => {
        const report = await buildStats(contentDir);
        const posts = await loadPosts();
        const siteStatsByFile = new Map(posts.map((post) => [post.fileName, project(computeSiteStats(post.body))]));

        assert.equal(report.count, posts.length);

        for (const post of report.posts) {
            const site = siteStatsByFile.get(post.file);
            assert.ok(site, `unexpected stats entry for unknown file ${post.file}`);
            assert.deepEqual(
                {
                    characters: post.characters,
                    wordCount: post.englishWords,
                    totalCount: post.totalCount,
                    readTimeMinutes: post.readTimeMinutes,
                },
                site,
                `npm run stats output diverged from site stats for ${post.file}`,
            );
        }
    });
});

describe('HTML entity decoding stays identical across both entry points', () => {
    const samples = [
        '&#x4F60;&#x597D; &emsp;word&nbsp;two',
        '&lt;tag&gt;正文&lt;/tag&gt; &amp; done',
        'a&#65;b &#8217;quote&#8217; 你好',
    ];

    test('CLI stats equal site stats on entity-heavy synthetic bodies', () => {
        for (const sample of samples) {
            assert.deepEqual(
                project(computeCliStats(sample)),
                project(computeSiteStats(sample)),
                `entity handling diverged for: ${sample}`,
            );
        }
    });

    test('named, decimal, and hex entities decode before counting', () => {
        assert.deepEqual(project(computeCliStats('&#x4F60;&#x597D; &emsp;word&nbsp;two')), {
            characters: 2,
            wordCount: 2,
            totalCount: 4,
            readTimeMinutes: 1,
        });
        assert.deepEqual(project(computeCliStats('&lt;tag&gt;正文&lt;/tag&gt; &amp; done')), {
            characters: 2,
            wordCount: 1,
            totalCount: 3,
            readTimeMinutes: 1,
        });
    });

    test('whitespace entities do not inflate counts', () => {
        assert.equal(computeCliStats('&nbsp;&ensp;&emsp;&thinsp;').totalCount, 0);
        assert.equal(computeCliStats('&nbsp;&ensp;&emsp;&thinsp;').readTimeMinutes, 0);
    });
});

describe('single counting implementation', () => {
    const wrappers = [
        ['scripts', 'readable-stats.js'],
        ['src', 'lib', 'word-count.js'],
    ];

    test('neither wrapper re-implements the counting core', () => {
        for (const segments of wrappers) {
            const source = readSource(...segments);

            assert.doesNotMatch(source, /const HAN_CHARACTER_PATTERN/, `${segments.join('/')} redefines Han pattern`);
            assert.doesNotMatch(source, /const ENGLISH_WORD_PATTERN/, `${segments.join('/')} redefines word pattern`);
            assert.doesNotMatch(source, /function decodeHtmlEntities/, `${segments.join('/')} redefines entity decoding`);
            assert.doesNotMatch(source, /characters\s*\/\s*300/, `${segments.join('/')} redefines read-time math`);
            assert.match(source, /from '\.\.?\/.*word-count-core\.js'/, `${segments.join('/')} must wrap word-count-core.js`);
        }
    });
});
