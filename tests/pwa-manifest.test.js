import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(rootDir, 'public', 'manifest.json');

function readManifest() {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

function publicPath(src) {
    return path.join(rootDir, 'public', src.replace(/^\//, ''));
}

describe('PWA manifest', () => {
    it('should be valid JSON', () => {
        const content = readFileSync(manifestPath, 'utf8');
        assert.doesNotThrow(() => JSON.parse(content));
    });

    it('should have required fields for the tools page PWA', () => {
        const manifest = readManifest();
        assert.equal(manifest.name, 'Calvin Xia 工具集');
        assert.equal(manifest.short_name, '工具集');
        assert.equal(manifest.start_url, '/works/tools/');
        assert.equal(manifest.scope, '/works/tools/');
        assert.equal(manifest.display, 'standalone');
        assert.ok(Array.isArray(manifest.icons), 'icons must be an array');
        assert.ok(manifest.icons.length > 0, 'icons must not be empty');
    });

    it('should reference existing icon files', () => {
        const manifest = readManifest();
        for (const icon of manifest.icons) {
            assert.ok(icon.src, 'icon must have src');
            assert.ok(icon.sizes, 'icon must have sizes');
            assert.ok(icon.type, 'icon must have type');
            assert.ok(existsSync(publicPath(icon.src)), `icon file must exist: ${icon.src}`);
        }
    });
});
