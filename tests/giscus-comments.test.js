import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

function readFile(...segments) {
    return readFileSync(projectPath(...segments), 'utf8');
}

const distArticleDir = projectPath('dist', 'articles');
const blogContentDir = projectPath('src', 'content', 'blog');

// These assertions inspect build output, which only exists after `npm run build`. Skip rather than
// fail so a bare `npm test` on a fresh clone stays useful; CI runs this file after the build.
const distReady = existsSync(distArticleDir) && existsSync(blogContentDir);
const skipWithoutBuild = distReady
    ? false
    : 'run `npm run build` first: dist/articles is missing';

// Article filenames determine the URL (generateId: fileStem), so the content collection is the
// authoritative list of real article pages. It excludes the legacy redirect stubs that also live
// under dist/articles/ and deliberately carry no comments.
function builtArticlePages() {
    return readdirSync(blogContentDir)
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.replace(/\.md$/, ''))
        .map((slug) => path.join(distArticleDir, slug, 'index.html'))
        .filter((file) => existsSync(file));
}

describe('Giscus comments survive client-side navigation', () => {
    test('loader keeps the rerun opt-in that Astro\'s router requires', () => {
        const component = readFile('src', 'components', 'GiscusComments.astro');

        // Astro's ClientRouter records every executed script and skips it on later navigations.
        // giscus resolves '.giscus' exactly once per execution, so without this attribute a
        // client-side move to another article leaves an empty mount behind until a full reload.
        assert.match(component, /<script\s[^>]*data-astro-rerun[^>]*src="https:\/\/giscus\.app\/client\.js"/);
    });

    test('built article pages ship the rerun opt-in on the giscus loader', { skip: skipWithoutBuild }, () => {
        const pages = builtArticlePages();
        assert.ok(pages.length > 0, 'expected at least one built article page');

        for (const page of pages) {
            const html = readFileSync(page, 'utf8');
            const loaders = html.match(/<script[^>]*giscus\.app\/client\.js[^>]*>/g) ?? [];

            assert.equal(loaders.length, 1, `${path.relative(rootDir, page)} should load giscus exactly once`);
            assert.match(loaders[0], /data-astro-rerun/, `${path.relative(rootDir, page)} loads giscus without data-astro-rerun`);
        }
    });

    test('comments never opt into a persisted container', () => {
        const component = readFile('src', 'components', 'GiscusComments.astro');

        // Persisting the container across navigations would leave the previous article's iframe
        // in place: giscus keys its discussion off the pathname baked into the iframe src.
        assert.doesNotMatch(component, /transition:persist/);
        assert.doesNotMatch(component, /data-astro-transition-persist/);
    });

    test('built article pages render exactly one comments container', { skip: skipWithoutBuild }, () => {
        for (const page of builtArticlePages()) {
            const html = readFileSync(page, 'utf8');
            const containers = html.match(/<div class="giscus-comments">/g) ?? [];

            assert.equal(containers.length, 1, `${path.relative(rootDir, page)} should render one comments container`);
        }
    });
});

describe('Giscus comments show a placeholder instead of collapsing', () => {
    test('component renders an i18n placeholder inside the container', () => {
        const component = readFile('src', 'components', 'GiscusComments.astro');

        assert.match(component, /<p class="giscus-placeholder" data-i18n="comments\.loading">/);
    });

    test('placeholder copy exists in both locales', () => {
        const zh = JSON.parse(readFile('src', 'i18n', 'zh-CN.json'));
        const en = JSON.parse(readFile('src', 'i18n', 'en-US.json'));

        assert.ok(zh.comments.loading, 'zh-CN comments.loading is required');
        assert.ok(en.comments.loading, 'en-US comments.loading is required');
    });

    test('CSS holds the container open and reveals the placeholder only when armed', () => {
        const css = readFile('src', 'styles', 'global.css');
        const block = css.match(/\.giscus-comments \{[\s\S]*?\n\}/);

        assert.ok(block, '.giscus-comments rule should exist');
        assert.match(block[0], /min-height:\s*\d/, '.giscus-comments needs a min-height so an unloaded frame cannot collapse');
        assert.match(css, /\.giscus-comments\.is-loading:not\(\.is-ready\) \.giscus-placeholder\s*\{[^}]*display:\s*block/);
    });

    test('placeholder stays hidden without JavaScript', () => {
        const css = readFile('src', 'styles', 'global.css');
        const rule = css.match(/\.giscus-placeholder \{[\s\S]*?\n\}/);

        assert.ok(rule, '.giscus-placeholder rule should exist');
        // The arming class is added from script, so a scripts-off page falls through to <noscript>.
        assert.match(rule[0], /display:\s*none/);
    });
});

describe('Giscus theme sync reacts to the frame instead of polling a fixed budget', () => {
    test('component observes the DOM for the injected iframe', () => {
        const component = readFile('src', 'components', 'GiscusComments.astro');

        assert.match(component, /new MutationObserver\(/);
        assert.match(component, /observer\.observe\(document\.documentElement/);
    });

    test('component no longer gives up after a fixed retry budget', () => {
        const component = readFile('src', 'components', 'GiscusComments.astro');

        // A 6s ceiling silently dropped theme sync whenever client.js ran slower than that.
        assert.doesNotMatch(component, /maxSyncAttempts/);
        assert.doesNotMatch(component, /setInterval\(/);
    });
});
