import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import matter from 'gray-matter';

const rootDir = path.resolve(import.meta.dirname, '..');
const blogDir = path.join(rootDir, 'src', 'content', 'blog');
const heroDir = path.join(rootDir, 'src', 'assets', 'hero');

function readSource(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

function readPosts() {
    return readdirSync(blogDir)
        .filter((name) => name.endsWith('.md'))
        .map((name) => ({
            name,
            ...matter(readFileSync(path.join(blogDir, name), 'utf8')).data,
        }));
}

// A hero is declared by filename in frontmatter. Every consumer must resolve it from
// that field: the hero file is not named after the article, so deriving one from the
// other silently drops the image the moment an article slug changes.
describe('hero image resolution', () => {
    test('every declared hero names a file that exists', () => {
        const available = new Set(readdirSync(heroDir));
        const declared = readPosts().filter((post) => post.hero);

        assert.ok(declared.length > 0, '至少应有一篇文章声明 hero');

        for (const post of declared) {
            assert.ok(
                available.has(post.hero),
                `${post.name} 声明的 hero 不存在: ${post.hero}`,
            );
        }
    });

    test('hero filenames are not assumed to match article slugs', () => {
        const posts = readPosts();
        const mismatched = posts.filter((post) => post.hero && post.hero !== `${post.name.replace(/\.md$/, '')}.webp`);

        // The rename of 2026-09-15 made these diverge on purpose. If this list ever
        // empties again, the guards below still hold — the point is that the code must
        // not depend on the two matching.
        assert.ok(
            mismatched.length > 0,
            '本轮回归正是由 hero 名与文章名不一致引起的；若已全部一致，请确认下面几条断言仍然必要',
        );
    });

    test('the content item carries the declared hero through to list payloads', () => {
        const content = readSource('src', 'lib', 'content.ts');

        assert.match(content, /hero\?:\s*string/);
        assert.match(content, /if \(entry\.data\.hero\)\s*\{[\s\S]*?item\.hero = entry\.data\.hero;/);
    });

    test('the article list keys thumbnails by hero filename and reads item.hero', () => {
        const page = readSource('src', 'pages', 'articles.astro');

        assert.match(page, /heroThumbs\[fileName\] = src;/);
        assert.match(page, /const heroFile = String\(item\.hero \|\| ''\)\.trim\(\);/);
        assert.match(page, /heroThumbs\[heroFile\]/);

        // The regression: keying or looking up by an article slug derived from filePath.
        assert.doesNotMatch(page, /heroThumbs\[slug\]/);
        assert.doesNotMatch(page, /item\.filePath \|\| ''\)\.replace\(\/\^\\\/articles\\\//);
    });

    test('the client-side thumbnail lookup reads item.hero too', () => {
        const payload = readSource('src', 'scripts', 'articles-index', 'payload.js');

        assert.match(payload, /const heroFile = String\(item\.hero \|\| ''\)\.trim\(\);/);
        assert.match(payload, /heroThumbs\[heroFile\]/);
        assert.doesNotMatch(payload, /heroThumbs\[slug\]/);
    });

    test('the article detail page and the OG card generator read the declared field', () => {
        const detail = readSource('src', 'pages', 'articles', '[...slug].astro');
        const og = readSource('scripts', 'generate-og-images.mjs');

        assert.match(detail, /heroImages\[`\.\.\/\.\.\/assets\/hero\/\$\{post\.data\.hero\}`\]/);
        assert.match(og, /String\(post\.frontmatter\.hero \|\| ''\)\.trim\(\)/);
        // The OG generator used to look up `${id}.webp` from the article filename.
        assert.doesNotMatch(og, /path\.join\(effectiveHeroDir, `\$\{id\}\.webp`\)/);
    });

    test('frontmatter hero validation still checks the declared file', () => {
        const checkPosts = readSource('scripts', 'check-posts.js');

        assert.match(checkPosts, /const hero = post\.frontmatter\.hero;/);
        assert.match(checkPosts, /path\.join\(heroDir, hero\)/);
    });
});
