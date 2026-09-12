import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

describe('article share button source contract', () => {
    test('detail page wires image-first sharing with link and clipboard fallbacks', async () => {
        const page = await readFile('src/pages/articles/[...slug].astro', 'utf8');

        assert.match(page, /id="article-share-btn"/);
        assert.match(page, /<svg[^>]*aria-hidden="true"/, 'share icon must be an inline svg');
        assert.match(page, /data-share-image=\{`\/og\/\$\{post\.id\}\.png`\}/, 'share image must stay site-relative so the click-time fetch is same-origin');
        assert.match(page, /navigator\.canShare\(\{ files: \[file\] \}\)/, 'must gate file sharing behind canShare');
        assert.match(page, /new File\(\[blob\]/);
        assert.match(page, /navigator\.share\(\{ title: shareTitle, url: shareUrl \}\)/, 'link share fallback');
        assert.match(page, /navigator\.clipboard\.writeText/);
        assert.match(page, /articleDetail\.shareCopied/);
    });

    test('share labels exist in both locales', async () => {
        const zh = JSON.parse(await readFile('src/i18n/zh-CN.json', 'utf8'));
        const en = JSON.parse(await readFile('src/i18n/en-US.json', 'utf8'));

        assert.equal(zh.articleDetail.share, '分享');
        assert.ok(zh.articleDetail.shareCopied);
        assert.equal(en.articleDetail.share, 'Share');
        assert.ok(en.articleDetail.shareCopied);
    });

    test('share button styles exist', async () => {
        const css = await readFile('src/styles/global.css', 'utf8');

        assert.match(css, /\.article-share-btn \{/);
        assert.match(css, /\.article-share-btn:hover \{/);
    });
});
