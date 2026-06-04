import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('article-transitions backward compatibility', () => {
    test('re-exports from page-transitions', async () => {
        const mod = await import('../src/scripts/article-transitions.js');
        assert.equal(typeof mod.getArticleTransitionDirection, 'function');
        assert.equal(typeof mod.getSwapFadeDurationMs, 'function');
        assert.equal(typeof mod.shouldUseClientRouter, 'function');
        assert.equal(typeof mod.markArticleTransitionLinks, 'function');
        assert.equal(typeof mod.initArticleTransitions, 'function');
        assert.equal(typeof mod.saveArticleListScrollPosition, 'function');
        assert.equal(typeof mod.restoreArticleListScrollPosition, 'function');
    });

    test('markArticleTransitionLinks works via re-export', async () => {
        const { markArticleTransitionLinks } = await import('../src/scripts/article-transitions.js');
        assert.equal(typeof markArticleTransitionLinks, 'function');
    });
});
