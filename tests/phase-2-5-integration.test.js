import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

function readProjectFile(...segments) {
    return readFileSync(projectPath(...segments), 'utf8');
}

describe('Phase 2.5 article experience integration', () => {
    test('Astro markdown renders math through remark-math and rehype-katex', () => {
        const packageJson = JSON.parse(readProjectFile('package.json'));
        const config = readProjectFile('astro.config.mjs');

        assert.ok(packageJson.dependencies['remark-math']);
        assert.ok(packageJson.dependencies['rehype-katex']);
        assert.match(config, /import\s+remarkMath\s+from\s+['"]remark-math['"]/);
        assert.match(config, /import\s+rehypeKatex\s+from\s+['"]rehype-katex['"]/);
        assert.match(config, /import\s+\{\s*remarkMarkHighlight\s*\}\s+from\s+['"]\.\/src\/lib\/remark-mark-highlight\.js['"]/);
        assert.match(config, /remarkPlugins:\s*\[[^\]]*remarkBlockquoteBreaks[^\]]*remarkMath/s);
        assert.match(config, /remarkPlugins:\s*\[[^\]]*remarkMarkHighlight/s);
        assert.match(config, /rehypePlugins:\s*\[[^\]]*rehypeKatex/s);
    });

    test('Astro markdown applies Shiki syntax highlighting to real code fences', async () => {
        const { createMarkdownProcessor } = await import('@astrojs/markdown-remark');
        const { default: astroConfig } = await import('../astro.config.mjs');
        const fence = '`'.repeat(3);
        const source = [
            `${fence}javascript`,
            'function publishDraft(title) {',
            '    return title + " is ready";',
            '}',
            fence,
        ].join('\n');
        const processor = await createMarkdownProcessor(astroConfig.markdown);
        const result = await processor.render(source);

        assert.match(result.code, /class="astro-code astro-code-themes github-light github-dark"/);
        assert.match(result.code, /data-language="javascript"/);
        assert.match(result.code, /--shiki-light:#D73A49/);
        assert.match(result.code, /--shiki-dark:#F97583/);
        assert.match(result.code, /publishDraft/);
    });

    test('article pages mount the TOC shell and load KaTeX CSS', () => {
        const articlePage = readProjectFile('src', 'pages', 'articles', '[...slug].astro');

        assert.match(articlePage, /import\s+ArticleToc\s+from\s+['"]\.\.\/\.\.\/components\/ArticleToc\.astro['"]/);
        assert.match(articlePage, /import\s+['"]katex\/dist\/katex\.min\.css['"]/);
        assert.match(articlePage, /<ArticleToc\s*\/>/);
        assert.match(articlePage, /class="article-reading-layout"/);
    });

    test('article reading layout dimensions use shared CSS custom properties', () => {
        const styles = readProjectFile('src', 'styles', 'global.css');

        assert.match(styles, /--article-content-width:\s*920px/);
        assert.match(styles, /--article-toc-min-width:\s*14rem/);
        assert.match(styles, /--article-toc-max-width:\s*17rem/);
        assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*var\(--article-content-width\)\)\s+minmax\(var\(--article-toc-min-width\),\s*var\(--article-toc-max-width\)\)/);
    });

    test('article table of contents stacks only below tablet widths', () => {
        const styles = readProjectFile('src', 'styles', 'global.css');

        assert.match(styles, /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*\.article-reading-layout\s*\{[\s\S]*grid-template-columns:\s*1fr/s);
        assert.doesNotMatch(styles, /@media\s*\(max-width:\s*960px\)\s*\{[\s\S]{0,320}\.article-reading-layout/s);
    });

    test('article table of contents constrains the card while the list scrolls', () => {
        const styles = readProjectFile('src', 'styles', 'global.css');

        assert.match(styles, /\.article-toc-shell\s*\{[\s\S]*max-height:\s*calc\(100vh - 7\.2rem\);[\s\S]*min-height:\s*0;/);
        assert.match(styles, /\.article-toc\s*\{[\s\S]*display:\s*flex;[\s\S]*max-height:\s*calc\(100vh - 8\.32rem\);[\s\S]*overflow:\s*hidden;/);
        assert.match(styles, /\.article-toc > nav\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*max-height:\s*calc\(100vh - 11\.4rem\);[\s\S]*min-height:\s*0;[\s\S]*overflow-y:\s*auto;[\s\S]*scrollbar-gutter:\s*stable;/);
    });

    test('view transition animations respect reduced motion preferences', () => {
        const styles = readProjectFile('src', 'styles', 'global.css');

        assert.match(styles, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[\s\S]*::view-transition-new\(site-main\)[\s\S]*::view-transition-old\(site-main\)[\s\S]*animation:\s*none/s);
    });

    test('article animations use compositor-friendly properties and bounded durations', () => {
        const styles = readProjectFile('src', 'styles', 'global.css');

        assert.match(styles, /\.content-card-enter\s*\{[\s\S]*animation:\s*fadeInUp\s+350ms\s+ease\s+forwards/s);
        assert.match(styles, /@keyframes\s+siteViewExit\s*\{[\s\S]*to\s*\{[\s\S]*opacity:\s*0;[\s\S]*transform:\s*translateY\(-10px\)/s);
        assert.match(styles, /\.article-progress span\s*\{[\s\S]*width:\s*100%;[\s\S]*transform:\s*scaleX\(0\);[\s\S]*transition:\s*transform\s+100ms\s+linear/s);
        assert.doesNotMatch(styles, /\.article-progress span\s*\{[\s\S]*transition:\s*width\s+100ms\s+linear/s);
    });

    test('swap fallback and spinner animations are paused unless active', () => {
        const styles = readProjectFile('src', 'styles', 'global.css');
        const transitions = readProjectFile('src', 'scripts', 'article-transitions.js');

        assert.match(styles, /--swap-fade-duration:\s*260ms/);
        assert.match(styles, /\.site-main\.is-swap-fade-in\s*\{[\s\S]*animation:\s*siteSwapFadeIn\s+var\(--swap-fade-duration\)\s+ease\s+both/s);
        assert.match(styles, /#page-transition-indicator \.spinner\s*\{[\s\S]*animation-play-state:\s*paused/s);
        assert.match(styles, /#page-transition-indicator\.active \.spinner\s*\{[\s\S]*animation-play-state:\s*running/s);
        assert.doesNotMatch(transitions, /const\s+SWAP_FADE_DURATION_MS\s*=/);
        assert.match(transitions, /getComputedStyle\(\s*documentRef\.documentElement\s*\)/);
        assert.match(transitions, /documentRef\.addEventListener\(\s*['"]astro:page-load['"]/);
        assert.match(transitions, /prefers-reduced-motion:\s*reduce/);
        assert.match(transitions, /startViewTransition/);
        assert.match(transitions, /is-swap-fade-in/);
    });

    test('base layout enables Astro ClientRouter and a single article runtime', () => {
        const layout = readProjectFile('src', 'layouts', 'BaseLayout.astro');

        assert.match(layout, /import\s+\{\s*ClientRouter\s*\}\s+from\s+['"]astro:transitions['"]/);
        assert.match(layout, /<script>[\s\S]*import\s+['"]\.\.\/scripts\/article-runtime\.js['"];[\s\S]*<\/script>/);
        assert.equal(layout.match(/article-runtime\.js/g)?.length, 1);
        assert.doesNotMatch(layout, /article-runtime\.js\?url/);
        assert.doesNotMatch(layout, /articleRuntimeScriptUrl/);
        assert.match(layout, /<ClientRouter\s+fallback="swap"\s*\/>/);
        assert.match(layout, /transition:name="site-main"/);
        assert.match(layout, /<meta\s+name="referrer"\s+content="strict-origin-when-cross-origin"\s*\/>/);
    });

    test('article runtime defers the first enhancement pass until the DOM is ready', () => {
        const runtime = readProjectFile('src', 'scripts', 'article-runtime.js');

        assert.match(runtime, /function\s+startArticleRuntime\(\)/);
        assert.match(runtime, /document\.readyState\s*===\s*['"]loading['"]/);
        assert.match(runtime, /DOMContentLoaded/);
        assert.match(runtime, /once:\s*true/);
        assert.match(runtime, /startArticleRuntime\(\);/);
        assert.match(runtime, /document\.addEventListener\(\s*['"]astro:page-load['"]\s*,\s*initArticleRuntime\s*\)/);
    });

    test('article runtime initializes section reveals through the shared enhancement boundary', () => {
        const enhancements = readProjectFile('src', 'lib', 'article-enhancements', 'article-enhancements.js');
        const reveals = readProjectFile('src', 'lib', 'article-enhancements', 'section-reveals.js');

        assert.match(enhancements, /import\s+\{\s*initSectionReveals\s*\}\s+from\s+['"]\.\/section-reveals\.js['"]/);
        assert.match(enhancements, /sectionRevealCleanup\s*=\s*initSectionReveals\(/);
        assert.match(reveals, /const\s+REVEAL_TAG_NAMES\s*=\s*new\s+Set\(\[[\s\S]*'H2'[\s\S]*'TABLE'[\s\S]*\]\)/);
        assert.match(reveals, /prefers-reduced-motion:\s*reduce/);
    });

    test('article enhancement cleanup callbacks are scoped by document reference', () => {
        const enhancements = readProjectFile('src', 'lib', 'article-enhancements', 'article-enhancements.js');

        assert.match(enhancements, /const\s+enhancementCleanups\s*=\s*new\s+WeakMap\(\)/);
        assert.match(enhancements, /enhancementCleanups\.get\(documentRef\)\?\.\(\)/);
        assert.match(enhancements, /enhancementCleanups\.set\(documentRef,\s*cleanup\)/);
        assert.doesNotMatch(enhancements, /let\s+progressCleanup\s*=/);
        assert.doesNotMatch(enhancements, /let\s+sectionRevealCleanup\s*=/);
    });
});
