import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, test } from 'node:test';

describe('lightbox icons source contract', () => {
    test('buttons render inline svg icons instead of text glyphs', async () => {
        const source = await readFile('src/lib/article-enhancements/image-lightbox.js', 'utf8');

        assert.match(source, /LIGHTBOX_ICONS/);
        assert.match(source, /button\.innerHTML = \[/);
        assert.match(source, /stroke-width="2"/);
        for (const icon of ['previous', 'next', 'zoomOut', 'zoomIn', 'reset', 'close']) {
            assert.ok(new RegExp(`${icon}: '<`).test(source), `missing icon: ${icon}`);
        }

        const factoryStart = source.indexOf('function createButton');
        const factoryEnd = source.indexOf('export function', factoryStart);
        const factory = source.slice(factoryStart, factoryEnd);
        assert.ok(!factory.includes('textContent'), 'createButton must render svg icons, not text glyphs');
    });
});
