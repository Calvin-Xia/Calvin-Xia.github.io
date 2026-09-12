import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    loadOgFonts,
    renderDefaultCardPng,
    renderTitleCardPng,
    selectTitleFontSize,
} from '../scripts/og-card.js';

describe('og card title sizing', () => {
    test('picks font size tiers by title length', () => {
        assert.equal(selectTitleFontSize('潜入江心,寻一枚故土'), 84);
        assert.equal(selectTitleFontSize('潜入江心,寻一枚故土的坐标'), 68);
        assert.equal(selectTitleFontSize('一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一'), 56);
        assert.equal(selectTitleFontSize(''), 84);
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
            title: '潜入江心，寻一枚故土的坐标',
            kicker: '随笔',
            date: '2026-07-01',
        });

        assert.ok(png.byteLength > 15_000, 'rendered card should be a substantial PNG');
        assert.equal(png[0], 0x89);
        assert.equal(png[1], 0x50);
        assert.equal(png[2], 0x4e);
        assert.equal(png[3], 0x47);
    });

    test('renders the default card as a real PNG', async () => {
        const png = await renderDefaultCardPng();

        assert.ok(png.byteLength > 15_000);
        assert.equal(png[0], 0x89);
        assert.equal(png[1], 0x50);
    });
});
