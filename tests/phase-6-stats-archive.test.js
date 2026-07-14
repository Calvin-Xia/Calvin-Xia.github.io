import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

import { createArchiveGroups } from '../src/lib/archive.js';
import {
    countWords,
    computeReadingStats,
    formatReadTime,
    formatWordCount,
    stripReadableText,
} from '../src/lib/word-count.js';
import {
    handleViewCounterRequest,
    isValidArticleSlug,
    recordPageView,
} from '../src/lib/analytics-view-counter.js';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

function readSource(...segments) {
    return readFileSync(projectPath(...segments), 'utf8');
}

function createBlogEntry(id, date, title = id, extraData = {}) {
    return {
        id,
        body: `${title} body`,
        data: {
            title,
            date,
            excerpt: `${title} excerpt`,
            category: extraData.category || '随笔',
            tags: extraData.tags || ['测试'],
            status: extraData.status,
            ...extraData,
        },
    };
}

describe('Phase 6 reading stats', () => {
    test('counts Chinese characters without whitespace or punctuation', () => {
        const stats = computeReadingStats('你好，世界！\n今天下雨。');

        assert.equal(stats.characters, 8);
        assert.equal(stats.wordCount, 0);
        assert.equal(stats.totalCount, 8);
        assert.equal(stats.readTimeDisplay, '< 1 分钟');
        assert.equal(stats.display, '< 1 分钟');
        assert.equal(stats.wordCountDisplay, '约 8 字');
    });

    test('counts English words split by spaces and punctuation', () => {
        const stats = computeReadingStats('Hello, brave new world. Keep moving.');

        assert.equal(stats.characters, 0);
        assert.equal(stats.wordCount, 6);
        assert.equal(stats.totalCount, 6);
    });

    test('counts mixed Chinese characters and English words separately', () => {
        const stats = computeReadingStats('你好 Astro world，继续 build.');

        assert.equal(stats.characters, 4);
        assert.equal(stats.wordCount, 3);
        assert.equal(stats.totalCount, 7);
    });

    test('counts technical English tokens without treating plain numbers as words', () => {
        const text = 'API node_modules HTTP2 2026';
        const stats = computeReadingStats(text);

        assert.equal(countWords(text), 3);
        assert.equal(stats.wordCount, 3);
        assert.equal(stats.totalCount, 3);
    });

    test('filters Markdown syntax, HTML tags, entities, images, and code blocks before counting', () => {
        const source = [
            '---',
            'title: Secret Frontmatter',
            '---',
            '# 标题',
            '**你好** [链接文字](https://example.com)',
            '![图片说明](https://example.com/image.png)',
            '```js',
            'const hidden = "不要统计";',
            '```',
            '<div>正文&nbsp;content</div>&emsp;',
        ].join('\n');

        const stripped = stripReadableText(source);
        const stats = computeReadingStats(source);

        assert.doesNotMatch(stripped, /Secret Frontmatter/);
        assert.doesNotMatch(stripped, /https:\/\/example\.com/);
        assert.doesNotMatch(stripped, /图片说明/);
        assert.doesNotMatch(stripped, /不要统计/);
        assert.match(stripped, /链接文字/);
        assert.match(stripped, /正文/);
        assert.match(stripped, /content/);
        assert.ok(stats.characters > 0);
        assert.ok(stats.wordCount > 0);
    });

    test('formats read time and word count for short and long content', () => {
        assert.equal(formatReadTime(0), '< 1 分钟');
        assert.equal(formatReadTime(0.4), '< 1 分钟');
        assert.equal(formatReadTime(5), '5 分钟');
        assert.equal(formatReadTime(60), '1 小时 0 分钟');
        assert.equal(formatReadTime(65), '1 小时 5 分钟');
        assert.equal(formatWordCount(3500), '约 3,500 字');
    });

    test('returns stable empty-content stats', () => {
        assert.deepEqual(computeReadingStats(''), {
            characters: 0,
            wordCount: 0,
            totalCount: 0,
            readTimeMinutes: 0,
            readTimeDisplay: '< 1 分钟',
            wordCountDisplay: '约 0 字',
            display: '< 1 分钟',
        });
    });
});

describe('Phase 6 archive data', () => {
    test('groups non-draft blog entries by year and sorts newest first', () => {
        const groups = createArchiveGroups([
            createBlogEntry('older', '2025-12-31', 'Older'),
            createBlogEntry('draft', '2026-04-01', 'Draft', { status: 'draft' }),
            createBlogEntry('middle', '2026-03-01', 'Middle', { category: '记录' }),
            createBlogEntry('newer', '2026-05-03', 'Newer', { category: '日常' }),
        ]);

        assert.deepEqual(groups.map((group) => group.year), ['2026', '2025']);
        assert.deepEqual(groups[0].items.map((item) => item.id), ['newer', 'middle']);
        assert.equal(groups[0].items[0].type, 'article');
        assert.equal(groups[0].items[0].monthDay, '05-03');
        assert.equal(groups[0].items[0].href, '/articles/newer/');
        assert.equal(groups[0].items[0].category, '日常');
        assert.deepEqual(groups[1].items.map((item) => item.id), ['older']);
    });

    test('archive page and article index expose the required route and entry link', () => {
        const archivePage = readSource('src', 'pages', 'articles', 'archive.astro');
        const articleIndex = readSource('src', 'pages', 'articles.astro');

        assert.match(archivePage, /createArchiveGroups/);
        assert.match(archivePage, /archive-timeline/);
        assert.match(articleIndex, /href=["']\/articles\/archive\/["']/);
        assert.match(articleIndex, /文章归档/);
    });
});

describe('Phase 6 article transitions', () => {
    test('transition script exports direction and scroll restoration helpers', async () => {
        const transitions = await import('../src/scripts/article-transitions.js');

        assert.equal(transitions.getArticleTransitionDirection('/articles/', '/articles/post/'), 'forward');
        assert.equal(transitions.getArticleTransitionDirection('/articles/post/', '/articles/'), 'back');
        assert.equal(transitions.getArticleTransitionDirection('/about/', '/articles/post/'), 'forward');
        assert.equal(typeof transitions.saveArticleListScrollPosition, 'function');
        assert.equal(typeof transitions.restoreArticleListScrollPosition, 'function');
    });

    test('CSS includes directional view-transition animations with reduced-motion fallback', () => {
        const css = readSource('src', 'styles', 'global.css');

        assert.match(css, /articleSlideFromRight/);
        assert.match(css, /articleSlideFromLeft/);
        assert.match(css, /html\[data-astro-transition=['"]forward['"]\]::view-transition-new\(site-main\)/);
        assert.match(css, /html\[data-astro-transition=['"]back['"]\]::view-transition-new\(site-main\)/);
        assert.match(css, /@media\s+\(prefers-reduced-motion:\s*reduce\)/);
    });
});

describe('Phase 6 Analytics Engine view counter', () => {
    test('validates article slugs without rejecting Chinese filenames', () => {
        assert.equal(isValidArticleSlug('20260315-两小时，环线，慢行'), true);
        assert.equal(isValidArticleSlug('20260411-ai-reliance'), true);
        assert.equal(isValidArticleSlug(''), false);
        assert.equal(isValidArticleSlug('../secret'), false);
        assert.equal(isValidArticleSlug('nested/path'), false);
        assert.equal(isValidArticleSlug('nested%2Fpath'), false);
    });

    test('records page view to Analytics Engine', async () => {
        const writtenPoints = [];
        const mockAnalytics = {
            writeDataPoint: (point) => writtenPoints.push(point),
            query: async () => ({ rows: [{ total_views: 42 }] }),
        };

        recordPageView({ ARTICLE_VIEWS: mockAnalytics }, '20260411-ai-reliance');

        assert.equal(writtenPoints.length, 1);
        assert.deepEqual(writtenPoints[0].blobs, ['/articles/20260411-ai-reliance/', '20260411-ai-reliance']);
        assert.deepEqual(writtenPoints[0].doubles, [1]);
    });

    test('returns views from Analytics Engine', async () => {
        const mockAnalytics = {
            query: async () => ({ rows: [{ total_views: 1234 }] }),
        };

        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/20260411-ai-reliance'),
            { ARTICLE_VIEWS: mockAnalytics, ASSETS: { fetch: () => new Response('asset') } },
        );

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            slug: '20260411-ai-reliance',
            views: 1234,
        });
    });

    test('returns null views when Analytics Engine is not configured', async () => {
        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/20260411-ai-reliance'),
            { ASSETS: { fetch: () => new Response('asset') } },
        );

        assert.deepEqual(await response.json(), {
            slug: '20260411-ai-reliance',
            views: null,
        });
    });

    test('returns null views when Analytics Engine query fails', async () => {
        const mockAnalytics = {
            query: async () => { throw new Error('Query failed'); },
        };

        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/post'),
            { ARTICLE_VIEWS: mockAnalytics, ASSETS: { fetch: () => new Response('asset') } },
        );

        assert.deepEqual(await response.json(), { slug: 'post', views: null });
    });

    test('logs failed browser view counter loads before hiding the counter', async (t) => {
        const originalDocument = globalThis.document;
        const originalFetch = globalThis.fetch;
        const originalWarn = console.warn;
        const warnings = [];
        const addedClasses = [];
        const removedClasses = [];
        const counter = {
            dataset: { slug: 'post' },
            textContent: '',
            classList: {
                add(cls) { addedClasses.push(cls); },
                remove(cls) { removedClasses.push(cls); },
            },
        };
        const documentRef = {
            readyState: 'loading',
            addEventListener() {},
            querySelectorAll() {
                return [];
            },
        };

        globalThis.document = documentRef;
        globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
        console.warn = (...args) => warnings.push(args);

        t.after(() => {
            globalThis.document = originalDocument;
            globalThis.fetch = originalFetch;
            console.warn = originalWarn;
        });

        const viewCounterUrl = new URL('../src/scripts/view-counter.js', import.meta.url);
        viewCounterUrl.searchParams.set('case', 'warn-on-fetch-error');
        const { initViewCounters } = await import(viewCounterUrl.href);

        initViewCounters({
            querySelectorAll(selector) {
                return selector === '[data-view-counter][data-slug]' ? [counter] : [];
            },
        });
        await new Promise((resolve) => setImmediate(resolve));

        assert.equal(counter.textContent.includes('加载失败') || counter.textContent.includes('error'), true);
        assert.ok(addedClasses.includes('view-count--error'));
        assert.ok(removedClasses.includes('view-count--pending'));
        assert.equal(warnings.length, 1);
        assert.deepEqual(warnings[0].slice(0, 2), ['View counter failed for slug:', 'post']);
        assert.equal(warnings[0][2]?.message, 'fetch failed');
    });

    test('rejects invalid slugs and lets non-API requests pass through assets', async () => {
        const invalid = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/nested/path'),
            { ASSETS: { fetch: () => new Response('asset') } },
        );
        const asset = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/articles/'),
            { ASSETS: { fetch: () => new Response('asset-ok') } },
        );

        assert.equal(invalid.status, 400);
        assert.deepEqual(await invalid.json(), { error: 'invalid slug' });
        assert.equal(await asset.text(), 'asset-ok');
    });

    test('wrangler config exposes the Worker entry, ASSETS binding, and Analytics Engine dataset', () => {
        const config = readSource('wrangler.jsonc');

        assert.match(config, /"main":\s*"src\/worker\.ts"/);
        assert.match(config, /"binding":\s*"ASSETS"/);
        assert.match(config, /"run_worker_first":\s*\[\s*"\/api\/\*"\s*\]/);
        assert.match(config, /"binding":\s*"ARTICLE_VIEWS"/);
        assert.match(config, /"dataset":\s*"article-views"/);
    });
});

describe('Phase 6 rendered integration points', () => {
    test('article cards and detail pages render reading stats and view counter hooks', () => {
        const articleIndex = readSource('src', 'pages', 'articles.astro');
        const detailPage = readSource('src', 'pages', 'articles', '[...slug].astro');
        const layout = readSource('src', 'layouts', 'BaseLayout.astro');

        assert.match(articleIndex, /readingStats/);
        assert.match(articleIndex, /blog-card-reading-stats/);
        assert.match(detailPage, /computeReadingStats\(post\.body/);
        assert.match(detailPage, /data-slug=\{post\.id\}/);
        assert.match(layout, /import\s+['"]\.\.\/scripts\/view-counter\.js['"]/);
        assert.doesNotMatch(detailPage, /viewCounterScriptUrl|view-counter\.js\?url/);
    });

    test('article filters and search state are serialized to URL search parameters', () => {
        const articleIndex = readSource('src', 'pages', 'articles.astro');

        assert.match(articleIndex, /new URLSearchParams\(window\.location\.search\)/);
        assert.match(articleIndex, /params\.set\('q'/);
        assert.match(articleIndex, /params\.set\('category'/);
        assert.match(articleIndex, /params\.set\('tag'/);
        assert.match(articleIndex, /history\.replaceState/);
        assert.match(articleIndex, /restoreStateFromUrl/);
    });

    test('all current non-draft markdown articles can appear in the archive', () => {
        const files = readdirSync(projectPath('src', 'content', 'blog')).filter((file) => file.endsWith('.md'));
        const entries = files.map((file) => {
            const source = readSource('src', 'content', 'blog', file);
            const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
            const date = frontmatter.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})["']?/m)?.[1];
            const title = frontmatter.match(/^title:\s*["']?(.+?)["']?$/m)?.[1];
            const status = frontmatter.match(/^status:\s*["']?(.+?)["']?$/m)?.[1];
            const category = frontmatter.match(/^category:\s*["']?(.+?)["']?$/m)?.[1] || '未分类';

            return createBlogEntry(file.replace(/\.md$/, ''), date, title, { category, status });
        });

        const archivedIds = new Set(createArchiveGroups(entries).flatMap((group) => group.items.map((item) => item.id)));
        const expectedIds = entries.filter((entry) => entry.data.status !== 'draft').map((entry) => entry.id);

        assert.deepEqual([...archivedIds].sort(), expectedIds.sort());
    });
});
