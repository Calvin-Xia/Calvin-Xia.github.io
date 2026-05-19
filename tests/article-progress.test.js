import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function readProjectFile(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('article reading progress', () => {
    test('calculates progress from the article scroll range', async () => {
        const { calculateReadingProgress } = await import('../src/lib/article-enhancements/reading-progress.js');
        const metrics = {
            articleTop: 100,
            articleHeight: 1200,
            viewportHeight: 400,
        };

        assert.equal(calculateReadingProgress({ ...metrics, scrollY: 0 }), 0);
        assert.equal(calculateReadingProgress({ ...metrics, scrollY: 500 }), 50);
        assert.equal(calculateReadingProgress({ ...metrics, scrollY: 900 }), 100);
        assert.equal(calculateReadingProgress({ ...metrics, scrollY: 2000 }), 100);
    });

    test('hides the table of contents for short articles', async () => {
        const { shouldRenderToc } = await import('../src/lib/article-enhancements/reading-progress.js');

        assert.equal(shouldRenderToc([{ id: 'a' }, { id: 'b' }]), false);
        assert.equal(shouldRenderToc([{ id: 'a' }, { id: 'b' }, { id: 'c' }]), true);
    });

    test('collapses the table of contents at mobile widths', async () => {
        const { shouldCollapseTocForViewport } = await import('../src/lib/article-enhancements/reading-progress.js');

        assert.equal(shouldCollapseTocForViewport(390), true);
        assert.equal(shouldCollapseTocForViewport(767), true);
        assert.equal(shouldCollapseTocForViewport(768), false);
    });

    test('normalizes table of contents entries for rendering', async () => {
        const { createTocItems } = await import('../src/lib/article-enhancements/reading-progress.js');

        assert.deepEqual(createTocItems([
            { id: 'intro', level: 2, text: '引言' },
            { id: 'detail', level: 3, text: '细节' },
            { id: 'note', level: 4, text: '注释' },
        ]), [
            { href: '#intro', id: 'intro', level: 2, text: '引言' },
            { href: '#detail', id: 'detail', level: 3, text: '细节' },
            { href: '#note', id: 'note', level: 4, text: '注释' },
        ]);
    });

    test('selects the active visible heading with stable tie breakers', async () => {
        const { selectVisibleHeadingId } = await import('../src/lib/article-enhancements/reading-progress.js');
        const headingOrder = new Map([
            ['earlier', 0],
            ['later', 1],
            ['nearest', 2],
        ]);

        assert.equal(selectVisibleHeadingId([
            {
                isIntersecting: true,
                intersectionRatio: 0.5,
                target: { id: 'later' },
                boundingClientRect: { top: 64 },
            },
            {
                isIntersecting: true,
                intersectionRatio: 0.8,
                target: { id: 'earlier' },
                boundingClientRect: { top: 64 },
            },
            {
                isIntersecting: true,
                intersectionRatio: 0.25,
                target: { id: 'nearest' },
                boundingClientRect: { top: 96 },
            },
        ], headingOrder), 'earlier');

        assert.equal(selectVisibleHeadingId([
            {
                isIntersecting: true,
                intersectionRatio: 0.4,
                target: { id: 'later' },
                boundingClientRect: { top: 64 },
            },
            {
                isIntersecting: true,
                intersectionRatio: 0.4,
                target: { id: 'earlier' },
                boundingClientRect: { top: 64 },
            },
        ], headingOrder), 'earlier');
    });

    test('keeps the active table of contents link visible with bounded scroll adjustments', async () => {
        const { calculateTocAutoScrollTop } = await import('../src/lib/article-enhancements/reading-progress.js');

        const visibleRange = {
            containerTop: 100,
            containerBottom: 500,
            padding: 12,
        };

        assert.equal(calculateTocAutoScrollTop({
            ...visibleRange,
            currentScrollTop: 100,
            maxScrollTop: 1000,
            linkTop: 80,
            linkBottom: 110,
        }), 68);

        assert.equal(calculateTocAutoScrollTop({
            ...visibleRange,
            currentScrollTop: 100,
            maxScrollTop: 1000,
            linkTop: 500,
            linkBottom: 530,
        }), 142);

        assert.equal(calculateTocAutoScrollTop({
            ...visibleRange,
            currentScrollTop: 100,
            maxScrollTop: 1000,
            linkTop: 180,
            linkBottom: 220,
        }), 100);

        assert.equal(calculateTocAutoScrollTop({
            ...visibleRange,
            currentScrollTop: 10,
            maxScrollTop: 1000,
            linkTop: 40,
            linkBottom: 70,
        }), 0);
    });

    test('stores cleanup callbacks outside table of contents DOM nodes', () => {
        const source = readProjectFile('src', 'lib', 'article-enhancements', 'reading-progress.js');

        assert.match(source, /const\s+tocCleanupCallbacks\s*=\s*new\s+WeakMap\(\)/);
        assert.match(source, /tocCleanupCallbacks\.get\(tocRoot\)\?\.\(\)/);
        assert.match(source, /tocCleanupCallbacks\.set\(tocRoot,\s*cleanup\)/);
        assert.doesNotMatch(source, /_articleProgressCleanup/);
    });

    test('updates the visual progress bar with transform instead of width', () => {
        const source = readProjectFile('src', 'lib', 'article-enhancements', 'reading-progress.js');

        assert.match(source, /setProperty\(\s*['"]transform['"]\s*,\s*`scaleX\(\$\{progress\s*\/\s*100\}\)`\s*\)/);
        assert.doesNotMatch(source, /setProperty\(\s*['"]width['"]/);
    });
});
