import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');

function readSource(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('Phase 8 Integration', () => {
    it('Header should import i18n', () => {
        const source = readSource('src', 'components', 'Header.astro');
        assert.match(source, /from\s+['"]\.\.\/lib\/i18n\.ts['"]/);
        assert.match(source, /data-lang-toggle/);
    });

    it('Footer should import i18n', () => {
        const source = readSource('src', 'components', 'Footer.astro');
        assert.match(source, /from\s+['"]\.\/\.\.\/lib\/i18n\.ts['"]|from\s+['"]\.\.\/lib\/i18n\.ts['"]/);
    });

    it('Footer should keep official filing records in Chinese', () => {
        const footer = readSource('src', 'components', 'Footer.astro');
        const englishTranslations = JSON.parse(readSource('src', 'i18n', 'en-US.json'));
        const chineseTranslations = JSON.parse(readSource('src', 'i18n', 'zh-CN.json'));

        assert.match(footer, /渝ICP备2026000319号/);
        assert.match(footer, /公安备案/);
        assert.match(footer, /渝公网安备50010102001439号/);
        assert.doesNotMatch(footer, /data-i18n="footer\.(icp|policeRecord)"/);
        assert.doesNotMatch(footer, /data-i18n-alt="footer\.recordIconAlt"/);
        assert.equal(englishTranslations.footer.icp, '渝ICP备2026000319号');
        assert.equal(englishTranslations.footer.recordIconAlt, '公安备案');
        assert.equal(englishTranslations.footer.policeRecord, '渝公网安备50010102001439号');
        assert.equal(chineseTranslations.footer.copyright, englishTranslations.footer.copyright);
        assert.equal(chineseTranslations.footer.poweredBy, englishTranslations.footer.poweredBy);
    });

    it('page families should import i18n helpers', () => {
        const pages = [
            ['src', 'pages', 'index.astro'],
            ['src', 'pages', 'articles.astro'],
            ['src', 'pages', 'works.astro'],
            ['src', 'pages', 'works', 'tools.astro'],
            ['src', 'pages', 'about.astro'],
            ['src', 'pages', '404.astro'],
        ];

        pages.forEach((segments) => {
            const source = readSource(...segments);
            assert.match(source, /from\s+['"].*\/lib\/i18n\.ts['"]/, segments.join('/'));
        });
    });

    it('tool components and client scripts should use i18n for visible UI states', () => {
        const sources = [
            readSource('src', 'components', 'ToolsSection.astro'),
            readSource('src', 'components', 'TimerWidget.astro'),
            readSource('src', 'components', 'RandomSelector.astro'),
            readSource('src', 'components', 'MarkdownToolWidget.astro'),
            readSource('src', 'scripts', 'timer.ts'),
            readSource('src', 'scripts', 'random-selector.ts'),
            readSource('src', 'scripts', 'markdown-renderer.ts'),
            readSource('src', 'scripts', 'time-display.ts'),
            readSource('src', 'scripts', 'view-counter.js'),
        ].join('\n');

        assert.match(sources, /from\s+['"].*\/lib\/i18n\.ts['"]|from\s+['"].*\/lib\/i18n['"]/);
        assert.match(sources, /calvin-lang-change/);
    });

    it('BaseLayout should boot the stored language before app scripts run', () => {
        const source = readSource('src', 'layouts', 'BaseLayout.astro');
        assert.match(source, /calvin-xia-lang/);
        assert.match(source, /document\.documentElement\.lang\s*=/);
    });

    it('BaseLayout should update translated head metadata on language changes', () => {
        const layout = readSource('src', 'layouts', 'BaseLayout.astro');
        const articles = readSource('src', 'pages', 'articles.astro');

        assert.match(layout, /<title data-i18n=\{titleKey\}>/);
        assert.match(layout, /<meta name="description" content=\{description\} data-i18n-content=\{descriptionKey\}/);
        assert.match(articles, /titleKey="articles\.pageTitle"/);
        assert.match(articles, /descriptionKey="articles\.description"/);
    });

    it('i18n module should export t and initI18n functions', () => {
        const source = readSource('src', 'lib', 'i18n.ts');
        assert.match(source, /export\s+function\s+t/);
        assert.match(source, /export\s+function\s+initI18n/);
    });
});
