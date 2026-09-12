import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import rehypeImageDimensions from '../src/lib/rehype-image-dimensions.js';

function img(src, extraProperties = {}) {
    return { type: 'element', tagName: 'img', properties: { src, ...extraProperties }, children: [] };
}

function frontmatterFile(manifest) {
    return { data: { astro: { frontmatter: { imageDimensions: manifest } } } };
}

describe('rehype image dimensions injection', () => {
    const manifest = [
        { path: 'post/img.jpg', width: 800, height: 600 },
        { path: 'post/second.png', width: 100, height: 50 },
        { path: 'post/中文名.jpg', width: 30, height: 20 },
    ];

    test('injects dimensions on matching cdn images, eager for the first hit', () => {
        const tree = {
            type: 'root',
            children: [
                img('https://content.calvin-xia.cn/post/img.jpg'),
                {
                    type: 'element',
                    tagName: 'p',
                    children: [img('https://assets.calvin-xia.cn/post/second.png')],
                },
                img('https://other.example/post/img.jpg'),
                img('https://content.calvin-xia.cn/post/missing.jpg'),
            ],
        };

        rehypeImageDimensions()(tree, frontmatterFile(manifest));

        const [first, second, foreign, missing] = [
            tree.children[0].properties,
            tree.children[1].children[0].properties,
            tree.children[2].properties,
            tree.children[3].properties,
        ];

        assert.equal(first.width, 800);
        assert.equal(first.height, 600);
        assert.equal(first.loading, 'eager');
        assert.equal(first.decoding, 'async');

        assert.equal(second.width, 100);
        assert.equal(second.height, 50);
        assert.equal(second.loading, 'lazy');

        assert.equal(foreign.width, undefined);
        assert.equal(missing.width, undefined);
    });

    test('matches percent-encoded cdn urls against decoded manifest paths', () => {
        const tree = { type: 'root', children: [img('https://assets.calvin-xia.cn/post/%E4%B8%AD%E6%96%87%E5%90%8D.jpg')] };

        rehypeImageDimensions()(tree, frontmatterFile(manifest));

        assert.equal(tree.children[0].properties.width, 30);
        assert.equal(tree.children[0].properties.height, 20);
    });

    test('matches dev-proxy urls', () => {
        const tree = { type: 'root', children: [img('/__cdn/content/post/img.jpg')] };

        rehypeImageDimensions()(tree, frontmatterFile(manifest));

        assert.equal(tree.children[0].properties.width, 800);
    });

    test('keeps pre-sized images and still marks later matches lazy', () => {
        const tree = {
            type: 'root',
            children: [
                img('https://content.calvin-xia.cn/post/img.jpg', { width: 800, height: 600 }),
                img('https://content.calvin-xia.cn/post/second.png'),
            ],
        };

        rehypeImageDimensions()(tree, frontmatterFile(manifest));

        assert.equal(tree.children[0].properties.loading, undefined);
        assert.equal(tree.children[1].properties.width, 100);
        assert.equal(tree.children[1].properties.loading, 'lazy');
    });

    test('is a no-op without a manifest', () => {
        const tree = { type: 'root', children: [img('https://content.calvin-xia.cn/post/img.jpg')] };

        rehypeImageDimensions()(tree, { data: { astro: { frontmatter: {} } } });

        assert.equal(tree.children[0].properties.width, undefined);
    });

    test('ignores invalid manifest entries', () => {
        const tree = { type: 'root', children: [img('https://content.calvin-xia.cn/post/img.jpg')] };

        rehypeImageDimensions()(tree, frontmatterFile([
            { path: 'post/img.jpg', width: -5, height: 600 },
            { path: '', width: 1, height: 1 },
            null,
        ]));

        assert.equal(tree.children[0].properties.width, undefined);
    });
});
