import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function readProjectFile(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('Phase 10 article experience integration', () => {
    test('article TOC exposes a mobile floating toggle with accessible state', () => {
        const component = readProjectFile('src', 'components', 'ArticleToc.astro');

        assert.match(component, /id="article-toc-panel"/);
        assert.match(component, /role="complementary"/);
        assert.match(component, /data-article-toc-toggle/);
        assert.match(component, /aria-controls="article-toc-panel"/);
        assert.match(component, /aria-expanded="false"/);
        assert.match(component, /data-i18n-aria-label="toc\.toggleAria"/);
        assert.match(component, /data-article-toc-list role="list"/);
    });

    test('mobile TOC keeps a fixed right-side wiki sidebar posture', () => {
        const styles = readProjectFile('src', 'styles', 'global.css');

        assert.match(styles, /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.article-toc-shell\s*\{[\s\S]*position:\s*fixed;[\s\S]*right:\s*0;[\s\S]*top:\s*50%;[\s\S]*transform:\s*translateY\(-50%\);/);
        assert.match(styles, /\.article-toc-shell\.is-collapsed\s*\{[\s\S]*transform:\s*translateY\(-50%\)\s+translateX\(100%\);/);
        assert.match(styles, /\.article-toc-toggle\s*\{[\s\S]*display:\s*none;/);
        assert.match(styles, /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.article-toc-toggle\s*\{[\s\S]*position:\s*fixed;[\s\S]*right:\s*1rem;[\s\S]*bottom:\s*2rem;[\s\S]*width:\s*48px;[\s\S]*height:\s*48px;/);
    });

    test('lightbox exposes custom keyboard shortcuts to assistive technology', () => {
        const source = readProjectFile('src', 'lib', 'article-enhancements', 'image-lightbox.js');

        assert.match(source, /dialog\.addEventListener\(\s*['"]keydown['"]/);
        assert.match(source, /dialog\.setAttribute\(\s*['"]aria-keyshortcuts['"]\s*,\s*['"]Escape ArrowLeft ArrowRight \+ -['"]\s*\)/);
    });

    test('selection toolbar is importable, initialized, and styled', async () => {
        const mod = await import('../src/lib/article-enhancements/selection-toolbar.js');
        const enhancements = readProjectFile('src', 'lib', 'article-enhancements', 'article-enhancements.js');
        const styles = readProjectFile('src', 'styles', 'global.css');

        assert.equal(typeof mod.initSelectionToolbar, 'function');
        assert.match(enhancements, /import\s+\{\s*initSelectionToolbar\s*\}\s+from\s+['"]\.\/selection-toolbar\.js['"]/);
        assert.match(enhancements, /selectionToolbarCleanup\s*=\s*initSelectionToolbar\(markdownContent/);
        assert.match(styles, /\.selection-toolbar\s*\{[\s\S]*position:\s*fixed;[\s\S]*z-index:\s*1000;[\s\S]*opacity:\s*0;/);
        assert.match(styles, /\.selection-toolbar\.is-visible\s*\{[\s\S]*opacity:\s*1;[\s\S]*visibility:\s*visible;/);
        assert.match(styles, /\.selection-toolbar-feedback\s*\{[\s\S]*position:\s*fixed;[\s\S]*bottom:\s*2rem;/);
    });
});
