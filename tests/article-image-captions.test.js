import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

class FakeElement {
    constructor(tagName, attributes = {}) {
        this.tagName = tagName.toUpperCase();
        this.attributes = new Map(Object.entries(attributes));
        this.children = [];
        this.parentElement = null;
        this.parentNode = null;
        this.dataset = {};
        this.style = {
            setProperty(name, value) {
                this[name] = value;
            },
            removeProperty(name) {
                delete this[name];
            },
        };
        this.textContent = '';
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach((name) => this.classNames.add(name)),
            contains: (name) => this.classNames.has(name),
        };
    }

    appendChild(child) {
        if (child.parentElement) {
            child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
        }

        child.parentElement = this;
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    insertBefore(child, reference) {
        if (child.parentElement) {
            child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
        }

        const index = this.children.indexOf(reference);
        child.parentElement = this;
        child.parentNode = this;
        this.children.splice(index === -1 ? this.children.length : index, 0, child);
        return child;
    }

    remove() {
        if (!this.parentElement) {
            return;
        }

        this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
        this.parentElement = null;
        this.parentNode = null;
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    closest(selector) {
        let current = this;

        while (current) {
            if (selector === 'figure' && current.tagName === 'FIGURE') {
                return current;
            }

            if (selector === '.markdown-image-figure' && current.classNames.has('markdown-image-figure')) {
                return current;
            }

            current = current.parentElement;
        }

        return null;
    }

    querySelectorAll(selector) {
        const matches = [];

        function walk(node) {
            if (selector === 'img[alt]' && node.tagName === 'IMG' && node.getAttribute('alt') !== null) {
                matches.push(node);
            }

            node.children.forEach(walk);
        }

        walk(this);
        return matches;
    }
}

const fakeDocument = {
    createElement(tagName) {
        return new FakeElement(tagName);
    },
};

describe('article image captions', () => {
    test('wraps image-only paragraphs in a figure with a gray caption hook', async () => {
        const { enhanceArticleImageCaptions } = await import('../src/lib/article-image-captions.js');
        const root = new FakeElement('div');
        const paragraph = root.appendChild(new FakeElement('p'));
        const image = paragraph.appendChild(new FakeElement('img', { alt: '交叉路口' }));
        image.style.width = '39%';

        enhanceArticleImageCaptions(root, fakeDocument);

        const figure = root.children[0];
        assert.equal(figure.tagName, 'FIGURE');
        assert.ok(figure.classList.contains('markdown-image-figure'));
        assert.ok(figure.classList.contains('markdown-image-figure--sized'));
        assert.equal(figure.style.width, undefined);
        assert.equal(figure.style['--markdown-image-width'], '39%');
        assert.equal(figure.children[0], image);
        assert.equal(image.style.width, undefined);
        assert.equal(figure.children[1].tagName, 'FIGCAPTION');
        assert.ok(figure.children[1].classList.contains('markdown-image-caption'));
        assert.equal(figure.children[1].textContent, '交叉路口');
    });

    test('skips empty alt text and images that are already captioned', async () => {
        const { enhanceArticleImageCaptions } = await import('../src/lib/article-image-captions.js');
        const root = new FakeElement('div');
        const emptyAlt = root.appendChild(new FakeElement('img', { alt: '   ' }));
        const figure = root.appendChild(new FakeElement('figure'));
        figure.appendChild(new FakeElement('img', { alt: '已有说明' }));

        enhanceArticleImageCaptions(root, fakeDocument);

        assert.equal(root.children[0], emptyAlt);
        assert.equal(root.children[1], figure);
        assert.equal(figure.children.length, 1);
    });
});
