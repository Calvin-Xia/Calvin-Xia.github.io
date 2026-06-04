import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');

function readSource(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('Phase 13 Integration', () => {
    it('page-transitions.js exports expected API', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.match(source, /export function shouldUseClientRouter/);
        assert.match(source, /export function markTransitionLinks/);
        assert.match(source, /export function initPageTransitions/);
        assert.match(source, /export function getArticleTransitionDirection/);
        assert.match(source, /export function getSwapFadeDurationMs/);
    });

    it('page-transitions.js allows all internal links', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.match(source, /return true/);
    });

    it('page-transitions.js does not add data-astro-reload to internal links', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.doesNotMatch(source, /setAttribute\(\s*['"]data-astro-reload['"]\s*,\s*['"]['"]\s*\)/);
    });

    it('page-transitions.js has no click boundary listener', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.doesNotMatch(source, /clickBoundaryDocuments/);
    });

    it('article-transitions.js is a re-export shim', () => {
        const source = readSource('src/scripts', 'article-transitions.js');
        assert.match(source, /from ['"]\.\/page-transitions\.js['"]/);
        assert.match(source, /export \{/);
    });

    it('article-runtime.js imports from page-transitions', () => {
        const source = readSource('src/scripts', 'article-runtime.js');
        assert.match(source, /from ['"]\.\/page-transitions\.js['"]/);
        assert.match(source, /initPageTransitions/);
    });

    it('backward compatibility aliases exist in page-transitions.js', () => {
        const source = readSource('src/scripts', 'page-transitions.js');
        assert.match(source, /markTransitionLinks as markArticleTransitionLinks/);
        assert.match(source, /initPageTransitions as initArticleTransitions/);
    });
});
