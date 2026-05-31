import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function readSource(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRuleBlock(source, selector) {
    const match = source.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));

    assert.ok(match, `${selector} rule should exist`);
    return match[1];
}

describe('frontend visual reform source contract', () => {
    test('global styles expose the Calvin Xia design tokens', () => {
        const styles = readSource('src', 'styles', 'global.css');

        for (const token of [
            '--bg: #f7f7f4',
            '--surface: #ffffff',
            '--accent: #315d67',
            '--radius-md: 8px',
            '--focus-ring:',
            '--duration-base: 240ms',
        ]) {
            assert.match(styles, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        }

        assert.match(styles, /\[data-theme=["']dark["']\]\s*\{/);
        assert.match(styles, /color-scheme:\s*light/);
        assert.match(styles, /color-scheme:\s*dark/);
        assert.doesNotMatch(styles, /--primary-color:\s*#d35d26/);
        assert.doesNotMatch(styles, /--secondary-color:\s*#c86681/);
        assert.doesNotMatch(styles, /--accent-color:\s*#2f8f83/);
    });

    test('home page uses the approved brand and keeps search/tools secondary', () => {
        const home = readSource('src', 'pages', 'index.astro');
        const styles = readSource('src', 'styles', 'global.css');

        assert.match(home, /<h1[^>]*>\s*Calvin Xia\s*<\/h1>/);
        assert.doesNotMatch(home, /欢迎来到 Mr\.Xia 的小站/);
        assert.doesNotMatch(home, /href=["']\/works\/tools\/["']/);
        assert.match(home, /id=["']currentTime["']/);
        assert.match(home, /recent-updates/);
        assert.match(home, /content-search/);

        const searchPanelRule = getRuleBlock(styles, '.home-search-panel');
        const searchPanelHeadRule = getRuleBlock(styles, '.home-search-panel .home-section-head');

        assert.match(searchPanelRule, /width:\s*min\(100%,\s*860px\)/);
        assert.match(searchPanelRule, /padding:\s*clamp\(1\.25rem,\s*3vw,\s*2rem\)/);
        assert.match(searchPanelHeadRule, /align-items:\s*center/);
        assert.match(searchPanelHeadRule, /justify-content:\s*space-between/);
        assert.doesNotMatch(searchPanelHeadRule, /flex-direction:\s*column/);
        assert.doesNotMatch(searchPanelHeadRule, /text-align:\s*center/);
    });

    test('visual shell avoids global header blur and uses library-style vector theme icons', () => {
        const header = readSource('src', 'components', 'Header.astro');
        const styles = readSource('src', 'styles', 'global.css');

        assert.match(header, /data-icon=["']sun["']/);
        assert.match(header, /data-icon=["']moon["']/);
        assert.match(header, /viewBox=["']0 0 24 24["']/);
        assert.match(styles, /\.theme-toggle\s*\{[\s\S]*width:\s*44px[\s\S]*min-height:\s*44px[\s\S]*padding:\s*0/);
        assert.match(styles, /\.theme-toggle__icon\s*\{[\s\S]*width:\s*1\.42rem[\s\S]*height:\s*1\.42rem[\s\S]*min-width:\s*1\.42rem[\s\S]*display:\s*block/);
        assert.doesNotMatch(styles, /\.site-header,\s*header\s*\{/);
        assert.doesNotMatch(styles, /\.site-header-inner,\s*header nav\s*\{/);
        assert.doesNotMatch(styles, /\.theme-toggle__icon\s*\{[\s\S]{0,180}box-shadow:\s*inset/);
    });

    test('mobile layout keeps article navigation and header controls reachable', () => {
        const styles = readSource('src', 'styles', 'global.css');

        assert.match(styles, /\.site-logo,\s*\n\.logo\s*\{[\s\S]*min-height:\s*44px/);
        assert.match(styles, /@media \(max-width:\s*767px\)\s*\{[\s\S]*\.site-header-inner\s*\{[\s\S]*grid-template-areas:\s*"brand actions"\s*"nav nav"/);
        assert.match(styles, /@media \(max-width:\s*767px\)\s*\{[\s\S]*\.site-nav,\s*\n\s*\.nav-links\s*\{[\s\S]*grid-area:\s*nav/);
        assert.match(styles, /@media \(max-width:\s*767px\)\s*\{[\s\S]*\.article-toc-shell\s*\{[\s\S]*order:\s*-1/);
    });

    test('new-post stays a local helper and does not persist secrets or drafts', () => {
        const page = readSource('src', 'pages', 'new-post.astro');
        const form = readSource('src', 'components', 'NewPostForm.astro');
        const combined = `${page}\n${form}`;

        assert.match(page, /import\.meta\.env\.DEV/);
        assert.doesNotMatch(combined, /localStorage\.setItem\([^)]*secret/i);
        assert.doesNotMatch(combined, /NEW_POST_SECRET/);
        assert.doesNotMatch(combined, /draft/i);
        assert.doesNotMatch(page, /公开导航/);
    });

    test('page titles and supporting panels keep readable editorial spacing', () => {
        const articles = readSource('src', 'pages', 'articles.astro');
        const styles = readSource('src', 'styles', 'global.css');

        assert.match(articles, /article-index-hero/);
        assert.match(styles, /\.page-title\s*\{[\s\S]*max-width:\s*min\(100%,\s*18ch\)/);
        assert.match(styles, /\.article-index-hero\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
        assert.match(styles, /\.article-hero \.page-title\s*\{[\s\S]*max-width:\s*min\(100%,\s*22ch\)/);
        assert.match(styles, /\.giscus-comments\s*\{[\s\S]*width:\s*min\(100%,\s*var\(--article-text-width\)\)/);
        assert.match(styles, /\.legal-stack\s*\{[\s\S]*padding:\s*clamp\(1\.5rem,\s*4vw,\s*2\.5rem\)/);
    });

    test('article code blocks keep Astro Shiki colors readable in both themes', () => {
        const config = readSource('astro.config.mjs');
        const styles = readSource('src', 'styles', 'global.css');

        assert.match(config, /shikiConfig:\s*\{/);
        assert.match(config, /themes:\s*\{[\s\S]*light:\s*['"]github-light['"][\s\S]*dark:\s*['"]github-dark['"]/);
        assert.match(config, /defaultColor:\s*false/);
        assert.match(styles, /\.markdown-content :not\(pre\) > code,\s*\n\.preview-content :not\(pre\) > code\s*\{/);
        assert.match(styles, /\.markdown-content pre\s*\{[\s\S]*font-family:\s*var\(--font-mono\)/);
        assert.match(styles, /\.markdown-content pre\.astro-code\s*\{[\s\S]*background:\s*var\(--code-bg\)/);
        assert.match(styles, /\.markdown-content pre code\s*\{[\s\S]*color:\s*inherit[\s\S]*font-family:\s*inherit/);
        assert.match(styles, /\[data-theme=["']dark["']\]\s+\.markdown-content pre\.astro-code span\s*\{[\s\S]*color:\s*var\(--shiki-dark,\s*var\(--code-text\)\)/);
        assert.doesNotMatch(styles, /\.markdown-content code\s*\{[\s\S]*color:\s*var\(--code-text\)/);
    });

    test('home page discovery section includes a heading for screen reader navigation', () => {
        const home = readSource('src', 'pages', 'index.astro');

        const discoveryMatch = home.match(/home-discovery[\s\S]*?<\/section>/);
        assert.ok(discoveryMatch, 'home-discovery section should exist');
        assert.match(discoveryMatch[0], /<h2[\s>]/);
    });
});
