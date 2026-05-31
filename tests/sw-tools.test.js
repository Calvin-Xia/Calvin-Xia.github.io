import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const swPath = path.join(rootDir, 'public', 'sw-tools.js');

function readServiceWorker() {
    return readFileSync(swPath, 'utf8');
}

describe('Service Worker', () => {
    it('should exist', () => {
        const content = readServiceWorker();
        assert.ok(content.length > 0);
    });

    it('should only handle /works/tools/ routes', () => {
        const content = readServiceWorker();
        assert.match(content, /\/works\/tools\//);
        assert.doesNotMatch(content, /\/articles\//);
        assert.doesNotMatch(content, /\/works\/(?!tools)/);
    });

    it('should use a Network First strategy', () => {
        const content = readServiceWorker();
        assert.match(content, /fetch\(event\.request\)/);
        assert.match(content, /caches\.match\(event\.request\)/);
        assert.doesNotMatch(content, /caches\.match\(event\.request\)[\s\S]*fetch\(event\.request\)/);
    });

    it('should leave non-tools requests unhandled', () => {
        const content = readServiceWorker();
        assert.match(content, /return;/);
        assert.match(content, /startsWith\(TOOLS_PATH\)/);
    });

    it('should prime the tools page cache during install', () => {
        const content = readServiceWorker();
        assert.match(content, /addEventListener\('install'/);
        assert.match(content, /cacheToolsShell/);
        assert.match(content, /cache\.put\(TOOLS_PATH/);
    });
});
