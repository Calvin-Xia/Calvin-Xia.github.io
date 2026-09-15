import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, test } from 'node:test';

import {
    destinationPathFor,
    findPageIssues,
    legacyRedirects,
    renderRedirectPage,
    renderRedirectPages,
    validateRedirects,
} from '../scripts/legacy-redirects.js';
import { parseArgs, resolveSiteUrl, writeRedirectPages } from '../scripts/generate-redirects.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = path.join(rootDir, 'src', 'content', 'blog');
const updatesDir = path.join(rootDir, 'src', 'content', 'updates');
const pagesDir = path.join(rootDir, 'src', 'pages');

const tempDirs = [];

async function createTempDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'legacy-redirects-'));
    tempDirs.push(dir);
    return dir;
}

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

// A target resolves if it is a content-collection entry or a real Astro page.
// The pages fall into three shapes: `<name>.astro`, `<name>/index.astro`, and a
// dynamic catch-all such as `updates/[...slug].astro` backed by a JSON entry.
async function targetExists(target) {
    const articleSlug = target.match(/^\/articles\/([^/]+)\/$/);
    if (articleSlug) {
        return fileExists(path.join(blogDir, `${articleSlug[1]}.md`));
    }

    const updateSlug = target.match(/^\/updates\/([^/]+)\/$/);
    if (updateSlug) {
        return fileExists(path.join(updatesDir, `${updateSlug[1]}.json`));
    }

    const segment = target.replace(/^\/|\/$/g, '');

    return (await fileExists(path.join(pagesDir, `${segment}.astro`)))
        || (await fileExists(path.join(pagesDir, segment, 'index.astro')))
        || (await fileExists(path.join(pagesDir, segment, '[...slug].astro')));
}

describe('legacy redirect map', () => {
    test('passes its own soundness rules', () => {
        assert.deepEqual(validateRedirects(), []);
    });

    test('has no duplicate sources and no target that is itself a source', () => {
        const froms = legacyRedirects.map((entry) => entry.from);
        assert.equal(new Set(froms).size, froms.length);

        const fromSet = new Set(froms);
        for (const entry of legacyRedirects) {
            assert.equal(fromSet.has(entry.to), false, `${entry.to} 同时是跳转源与目标`);
            assert.notEqual(entry.from, entry.to);
        }
    });

    test('every source is one of the known legacy URL shapes', () => {
        for (const { from } of legacyRedirects) {
            assert.match(from, /^\/(?:blog\/[^/]+\.html|articles\/[^/]+\/|[^/]+\.html|UpdateLog\/[^/]+\.html)$/);
        }
    });

    test('every target resolves to a real article file or a real Astro page', async () => {
        for (const { from, to } of legacyRedirects) {
            assert.equal(await targetExists(to), true, `${from} → ${to}: 目标不存在`);
        }
    });

    test('covers both legacy families for the four renamed Chinese files', () => {
        const renamed = [
            ['20251231-2025年度总结', '20251231-year-in-review'],
            ['20260204-返校宣讲稿', '20260204-school-talk'],
            ['20260312-返校宣讲回顾', '20260312-school-talk-review'],
            ['20260315-两小时，环线，慢行', '20260315-two-hour-loop-ride'],
        ];

        for (const [oldSlug, newSlug] of renamed) {
            const sources = legacyRedirects.map((entry) => entry.from);
            assert.ok(sources.includes(`/articles/${oldSlug}/`), `缺少旧文章 URL 跳转: ${oldSlug}`);
            assert.ok(sources.includes(`/blog/${oldSlug}.html`), `缺少预 Astro 跳转: ${oldSlug}`);
            assert.equal(
                legacyRedirects.find((entry) => entry.from === `/articles/${oldSlug}/`)?.to,
                `/articles/${newSlug}/`,
            );
        }
    });

    test('no legacy source still points at a percent-encoded-prone Chinese slug', () => {
        for (const { to } of legacyRedirects) {
            assert.match(to, /^\/[\x20-\x7E]*$/, `跳转目标仍含非 ASCII 字符: ${to}`);
        }
    });

    test('validateRedirects reports the failure modes it guards against', () => {
        const bad = [
            { from: '/a/', to: '/a/' },
            { from: '/b/', to: '/c' },
            { from: '/b/', to: '/d/' },
            { from: 'relative/', to: '/e/' },
            { from: '/f/', to: '/g/' },
        ];
        const issues = validateRedirects(bad);

        assert.ok(issues.some((issue) => issue.includes('指向自身')));
        assert.ok(issues.some((issue) => issue.includes('重复的 from')));
        assert.ok(issues.some((issue) => issue.includes('必须以 / 结尾')));
        assert.ok(issues.some((issue) => issue.includes('必须以 / 开头')));
        assert.ok(issues.some((issue) => issue.includes('二次跳转')));
    });
});

describe('redirect page output shape', () => {
    test('maps URL shapes to the right output file', () => {
        assert.equal(destinationPathFor('/about.html'), 'about.html');
        assert.equal(destinationPathFor('/blog/20260411-ai-reliance.html'), 'blog/20260411-ai-reliance.html');
        assert.equal(
            destinationPathFor('/articles/20251231-2025年度总结/'),
            'articles/20251231-2025年度总结/index.html',
        );
        assert.equal(destinationPathFor('/a/?x=1'), 'a/index.html');
    });

    test('renders a themed page that redirects, canonicalizes and stays out of the way', () => {
        const html = renderRedirectPage({ from: '/about.html', to: '/about/' });

        assert.match(html, /<html lang="zh-CN">/);
        assert.match(html, /<meta http-equiv="refresh" content="0;url=\/about\/">/);
        assert.match(html, /<link rel="canonical" href="https:\/\/calvin-xia\.cn\/about\/">/);
        assert.match(html, /location\.replace\("\/about\/"\)/);
        assert.match(html, /<a class="site-logo" href="\/">Calvin Xia<\/a>/);
        assert.match(html, /页面已迁移/);
        assert.match(html, /This page has moved\./);
    });

    test('ships both theme token blocks and the shared theme boot key', () => {
        const html = renderRedirectPage({ from: '/about.html', to: '/about/' });

        assert.match(html, /\[data-theme="dark"\]/);
        assert.match(html, /calvin-xia-theme/);
        assert.match(html, /--accent: #315d67;/);
        assert.match(html, /prefers-reduced-motion/);
    });

    test('does not add a robots meta, per the canonical-only decision', () => {
        const html = renderRedirectPage({ from: '/about.html', to: '/about/' });

        assert.doesNotMatch(html, /name="robots"/);
        assert.doesNotMatch(html, /noindex/);
    });

    test('escapes a target that carries URL-unsafe characters', () => {
        const html = renderRedirectPage({ from: '/x/', to: '/a/"><b>' });

        assert.doesNotMatch(html, /url=\/a\/"><b>/);
        assert.match(html, /&quot;&gt;&lt;b&gt;/);
    });

    test('cannot break out of the inline script through the target', () => {
        const html = renderRedirectPage({ from: '/x/', to: '/</script><script>alert(1)</script>/' });

        assert.equal(html.match(/<script/g).length, 2, '只应存在主题引导与跳转两段脚本');
        assert.match(html, /location\.replace\("\/\\u003c\/script\\u003e/);
    });

    test('honours a custom site url for the canonical tag', () => {
        const pages = renderRedirectPages({ siteUrl: 'https://example.test' });
        const about = pages.find((page) => page.from === '/about.html');

        assert.match(about.html, /href="https:\/\/example\.test\/about\/"/);
    });
});

describe('generated page self-check', () => {
    test('accepts a page the template renders', () => {
        const html = renderRedirectPage({ from: '/about.html', to: '/about/' });
        assert.deepEqual(findPageIssues(html, { to: '/about/' }), []);
    });

    test('accepts every entry in the shipped map', () => {
        for (const page of renderRedirectPages()) {
            assert.deepEqual(findPageIssues(page.html, { to: page.to }), [], page.from);
        }
    });

    test('flags each signal independently when it is stripped', () => {
        const html = renderRedirectPage({ from: '/about.html', to: '/about/' });
        const cases = [
            ['meta refresh 目标缺失或不正确', (value) => value.replace(/<meta http-equiv="refresh"[^>]*>\n\s*/, '')],
            ['canonical 缺失或不正确', (value) => value.replace(/<link rel="canonical"[^>]*>\n\s*/, '')],
            ['JS 跳转缺失或不正确', (value) => value.replace(/<script>location\.replace[^<]*<\/script>/, '')],
            ['无 JS 兜底链接缺失或不正确', (value) => value.replace('class="btn" href="/about/"', 'class="btn" href="/wrong/"')],
        ];

        for (const [expectedMessage, mutate] of cases) {
            assert.deepEqual(findPageIssues(mutate(html), { to: '/about/' }), [expectedMessage]);
        }
    });

    test('detects a tampered target rather than trusting the in-memory string', () => {
        const html = renderRedirectPage({ from: '/about.html', to: '/about/' });
        const tampered = html.replace('/about/', '/elsewhere/');

        assert.ok(findPageIssues(tampered, { to: '/about/' }).length > 0);
    });
});

describe('redirect generation', () => {
    test('writes one file per entry into the output dir', async () => {
        const outDir = await createTempDir();
        const pages = await writeRedirectPages({ outDir });

        assert.equal(pages.length, legacyRedirects.length);

        for (const page of pages) {
            const body = await readFile(path.join(outDir, page.destinationPath), 'utf8');
            assert.equal(body, page.html);
        }
    });

    test('refuses to write when the map is unsound', async () => {
        const outDir = await createTempDir();
        const broken = [
            { from: '/loop/', to: '/loop/' },
        ];

        await assert.rejects(
            () => writeRedirectPages({ outDir, entries: broken }),
            /跳转映射表不合法/,
        );
    });

    test('parseArgs defaults to dist and accepts an override', () => {
        assert.equal(parseArgs([]).outDir, path.join(rootDir, 'dist'));
        assert.equal(parseArgs(['--out', 'tmp-out']).outDir, path.resolve('tmp-out'));
        assert.equal(parseArgs(['--help']).help, true);
    });

    test('resolveSiteUrl trims trailing slashes and falls back to the default', () => {
        assert.equal(resolveSiteUrl('https://example.test/'), 'https://example.test');
        assert.equal(resolveSiteUrl(''), 'https://calvin-xia.cn');
        assert.equal(resolveSiteUrl('   '), 'https://calvin-xia.cn');
        assert.equal(resolveSiteUrl(undefined), 'https://calvin-xia.cn');
    });
});
