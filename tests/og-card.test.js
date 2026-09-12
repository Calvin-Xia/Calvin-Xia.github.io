import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
    loadOgFonts,
    renderDefaultCardPng,
    renderQrDataUri,
    renderTitleCardPng,
    selectTitleFontSize,
} from '../scripts/og-card.js';
import { selectPostsForCards } from '../scripts/generate-og-images.mjs';

describe('og card title sizing', () => {
    test('picks font size tiers by title length', () => {
        assert.equal(selectTitleFontSize('潜入江心,寻一枚故土'), 76);
        assert.equal(selectTitleFontSize('潜入江心,寻一枚故土的坐标'), 62);
        assert.equal(selectTitleFontSize('一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一'), 52);
        assert.equal(selectTitleFontSize(''), 76);
    });
});

describe('og card fonts', () => {
    test('loads regular and bold Noto Serif SC woff buffers once', async () => {
        const fonts = await loadOgFonts();

        assert.equal(fonts.length, 2);
        assert.deepEqual(fonts.map((font) => font.weight), [400, 700]);
        for (const font of fonts) {
            assert.equal(font.name, 'Noto Serif SC');
            assert.equal(font.style, 'normal');
            assert.ok(font.data.byteLength > 1_000_000, 'chinese-simplified woff should be a full-size font file');
        }

        const again = await loadOgFonts();
        assert.equal(again, fonts, 'font buffers should be cached across calls');
    });
});

describe('og card rendering', () => {
    test('renders a title card as a real PNG', async () => {
        const png = await renderTitleCardPng({
            title: '潜入江心,寻一枚故土的坐标',
            kicker: '随笔',
            date: '2026-07-01',
            url: 'https://calvin-xia.cn/articles/20260620-cultural-legacy/',
        });

        assert.ok(png.byteLength > 15_000, 'rendered card should be a substantial PNG');
        assert.equal(png[0], 0x89);
        assert.equal(png[1], 0x50);
        assert.equal(png[2], 0x4e);
        assert.equal(png[3], 0x47);
    });

    test('embeds the hero thumbnail when a buffer is given', async () => {
        // 1x1 PNG: exercises the sharp thumbnail pipeline.
        const png1x1 = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64',
        );
        const png = await renderTitleCardPng({
            title: '测区日志(上)',
            kicker: '测区日志',
            date: '2026-07-06',
            url: 'https://calvin-xia.cn/articles/x/',
            thumbBuffer: png1x1,
        });

        assert.ok(png.byteLength > 15_000);
        assert.equal(png[1], 0x50);
    });

    test('renders the default card as a real PNG', async () => {
        const png = await renderDefaultCardPng({ url: 'https://calvin-xia.cn/' });

        assert.ok(png.byteLength > 15_000);
        assert.equal(png[0], 0x89);
        assert.equal(png[1], 0x50);
    });

    test('renders QR codes as png data uris', async () => {
        const dataUri = await renderQrDataUri('https://calvin-xia.cn/articles/x/');

        assert.match(dataUri, /^data:image\/png;base64,/);
        assert.ok(dataUri.length > 500);
    });
});

describe('og card selection', () => {
    test('builds card payloads for every titled post, embedding hero files when present', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'og-select-'));
        const heroDir = path.join(dir, 'hero');
        await mkdir(heroDir, { recursive: true });
        const frontmatter = (title) => `---\ntitle: "${title}"\ndate: "2026-06-03"\nexcerpt: "e"\ncategory: "随笔"\ntags:\n  - "t"\n---\n\n正文\n`;
        await writeFile(path.join(dir, '20260603-with-hero.md'), frontmatter('有头图'), 'utf8');
        await writeFile(path.join(dir, '20260604-no-hero.md'), frontmatter('无头图'), 'utf8');
        await writeFile(path.join(dir, '20260605-untitled.md'), '---\ntitle: ""\ndate: "2026-06-05"\n---\n\n正文\n', 'utf8');
        await writeFile(path.join(heroDir, '20260603-with-hero.webp'), Buffer.from('fake-webp'), 'utf8');

        const cards = await selectPostsForCards(
            [
                { fileName: '20260603-with-hero.md', frontmatter: { title: '有头图', date: '2026-06-03', category: '随笔' } },
                { fileName: '20260604-no-hero.md', frontmatter: { title: '无头图', date: '2026-06-04', category: '随笔' } },
                { fileName: '20260605-untitled.md', frontmatter: { title: '', date: '2026-06-05' } },
            ],
            { siteUrl: 'https://calvin-xia.cn', heroDir },
        );

        assert.equal(cards.length, 2);
        const withHero = cards.find((card) => card.id === '20260603-with-hero');
        const noHero = cards.find((card) => card.id === '20260604-no-hero');
        assert.ok(Buffer.isBuffer(withHero.thumbBuffer));
        assert.equal(noHero.thumbBuffer, null);
        assert.equal(withHero.url, 'https://calvin-xia.cn/articles/20260603-with-hero/');
        assert.equal(withHero.kicker, '随笔');
    });
});
