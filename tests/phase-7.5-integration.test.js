import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');

function readProjectFile(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('Phase 7.5 Integration', () => {
    it('OptimizedIcon renders a picture with WebP and PNG fallback', () => {
        const component = readProjectFile('src', 'components', 'OptimizedIcon.astro');
        assert.match(component, /interface Props/);
        assert.match(component, /src:\s*string/);
        assert.match(component, /alt:\s*string/);
        assert.match(component, /<picture>/);
        assert.match(component, /type="image\/webp"/);
        assert.match(component, /src\.replace\(\/\\\.\png\$\/,\s*'\.webp'\)/);
        assert.match(component, /loading="lazy"/);
        assert.match(component, /decoding="async"/);
    });

    it('local WebP icons should exist', () => {
        assert.ok(existsSync(path.join(rootDir, 'public', 'storage', 'icon.webp')));
        assert.ok(existsSync(path.join(rootDir, 'public', 'storage', 'Beian.webp')));
    });

    it('Footer uses OptimizedIcon for the public security record icon', () => {
        const footer = readProjectFile('src', 'components', 'Footer.astro');
        assert.match(footer, /import OptimizedIcon/);
        assert.match(footer, /<OptimizedIcon/);
        assert.match(footer, /src="\/storage\/Beian\.png"/);
    });

    it('manifest should reference a valid icon and the tools scope', () => {
        const manifest = JSON.parse(readProjectFile('public', 'manifest.json'));
        assert.equal(manifest.start_url, '/works/tools/');
        assert.equal(manifest.scope, '/works/tools/');
        const iconPath = path.join(rootDir, 'public', manifest.icons[0].src.replace(/^\//, ''));
        assert.ok(existsSync(iconPath));
    });

    it('Service Worker should not intercept non-tools routes', () => {
        const sw = readProjectFile('public', 'sw-tools.js');
        assert.match(sw, /const TOOLS_PATH = '\/works\/tools\/'/);
        assert.doesNotMatch(sw, /\/articles\//);
        assert.doesNotMatch(sw, /\/works\/(?!tools)/);
        assert.doesNotMatch(sw, /pathname === '\/'/);
    });

    it('BaseLayout links the manifest and registers the tools Service Worker only on the tools page', () => {
        const layout = readProjectFile('src', 'layouts', 'BaseLayout.astro');
        assert.match(layout, /rel="manifest"/);
        assert.match(layout, /serviceWorker' in navigator/);
        assert.match(layout, /window\.location\.pathname\.startsWith\('\/works\/tools\/'\)/);
        assert.match(layout, /register\('\/sw-tools\.js',\s*\{\s*scope:\s*'\/works\/tools\/'\s*\}\)/);
        assert.match(layout, /\.catch\(\(\) =>/);
    });

    it('BaseLayout schedules Service Worker registration without nesting load handlers', () => {
        const layout = readProjectFile('src', 'layouts', 'BaseLayout.astro');
        assert.match(layout, /function registerToolsServiceWorker\(\)[\s\S]*navigator\.serviceWorker\.register\('\/sw-tools\.js',\s*\{\s*scope:\s*'\/works\/tools\/'\s*\}\)/);
        assert.match(layout, /function scheduleToolsServiceWorkerRegistration\(\)/);
        assert.doesNotMatch(
            layout,
            /function registerToolsServiceWorker\(\)[\s\S]*window\.addEventListener\(\s*'load'[\s\S]*register\('\/sw-tools\.js'\)/,
        );
    });
});
