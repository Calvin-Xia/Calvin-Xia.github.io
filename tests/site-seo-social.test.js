import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    buildBlogPostingJsonLd,
    buildCanonicalUrl,
    buildSocialMeta,
    buildWebSiteJsonLd,
    DEFAULT_OG_IMAGE_PATH,
} from '../src/lib/site-seo.js';

describe('social meta builder', () => {
    test('builds canonical, og and twitter tags with the default card image', () => {
        const { canonical, ogImage, tags } = buildSocialMeta({
            title: 'Calvin Xia',
            description: '个人网站',
            path: '/',
        });

        assert.equal(canonical, 'https://calvin-xia.cn/');
        assert.equal(ogImage, `https://calvin-xia.cn${DEFAULT_OG_IMAGE_PATH}`);

        const byKey = new Map(tags.map((tag) => [tag.property || tag.name, tag.content]));
        assert.equal(byKey.get('og:type'), 'website');
        assert.equal(byKey.get('og:site_name'), 'Calvin Xia');
        assert.equal(byKey.get('og:url'), 'https://calvin-xia.cn/');
        assert.equal(byKey.get('og:locale'), 'zh-CN');
        assert.equal(byKey.get('og:image'), ogImage);
        assert.equal(byKey.get('twitter:card'), 'summary_large_image');
        assert.equal(byKey.get('twitter:image'), ogImage);
        assert.equal(byKey.get('article:published_time'), undefined);
    });

    test('article pages join paths, use the given image and add published time', () => {
        const { canonical, ogImage, tags } = buildSocialMeta({
            title: '标题',
            description: '摘要',
            path: '/articles/20260706-short-term-training-diary-1/',
            image: 'https://calvin-xia.cn/_astro/hero.abc.webp',
            type: 'article',
            publishedTime: '2026-07-06',
        });

        assert.equal(canonical, 'https://calvin-xia.cn/articles/20260706-short-term-training-diary-1/');
        assert.equal(ogImage, 'https://calvin-xia.cn/_astro/hero.abc.webp');

        const byKey = new Map(tags.map((tag) => [tag.property || tag.name, tag.content]));
        assert.equal(byKey.get('og:type'), 'article');
        assert.equal(byKey.get('article:published_time'), '2026-07-06');
    });

    test('relative og image paths resolve against the site origin', () => {
        const { ogImage } = buildSocialMeta({
            title: 'T',
            description: 'D',
            path: '/works/',
            image: '/_astro/x.webp',
        });

        assert.equal(ogImage, 'https://calvin-xia.cn/_astro/x.webp');
    });
});

describe('json-ld builders', () => {
    test('builds a BlogPosting payload', () => {
        const jsonLd = buildBlogPostingJsonLd({
            title: '标题',
            description: '摘要',
            canonical: 'https://calvin-xia.cn/articles/20260620-cultural-legacy/',
            image: 'https://calvin-xia.cn/og/20260620-cultural-legacy.png',
            datePublished: '2026-07-01',
        });

        assert.equal(jsonLd['@type'], 'BlogPosting');
        assert.equal(jsonLd.headline, '标题');
        assert.deepEqual(jsonLd.author, { '@type': 'Person', name: 'Calvin Xia' });
        assert.deepEqual(jsonLd.publisher, { '@type': 'Person', name: 'Calvin Xia' });
        assert.equal(jsonLd.datePublished, '2026-07-01');
        assert.equal(jsonLd.image, 'https://calvin-xia.cn/og/20260620-cultural-legacy.png');
        assert.equal(jsonLd.mainEntityOfPage, 'https://calvin-xia.cn/articles/20260620-cultural-legacy/');
    });

    test('builds a WebSite payload', () => {
        const jsonLd = buildWebSiteJsonLd();

        assert.equal(jsonLd['@type'], 'WebSite');
        assert.equal(jsonLd.name, 'Calvin Xia');
        assert.equal(jsonLd.url, 'https://calvin-xia.cn/');
    });

    test('buildCanonicalUrl joins paths', () => {
        assert.equal(buildCanonicalUrl('/works/tools/'), 'https://calvin-xia.cn/works/tools/');
        assert.equal(buildCanonicalUrl('/'), 'https://calvin-xia.cn/');
    });
});
