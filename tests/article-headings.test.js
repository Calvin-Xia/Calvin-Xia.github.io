import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

class FakeHeading {
    constructor(tagName, textContent, id = '') {
        this.tagName = tagName.toUpperCase();
        this.textContent = textContent;
        this.id = id;
        this.children = [];
        this.dataset = {};
        this.attributes = new Map();
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach((name) => this.classNames.add(name)),
            contains: (name) => this.classNames.has(name),
        };
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    querySelector(selector) {
        if (selector === '.heading-anchor') {
            return this.children.find((child) => child.classList?.contains('heading-anchor')) || null;
        }

        return null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }
}

class FakeTocLink {
    constructor(text) {
        this.textContent = text;
        this.attributes = new Map();
        this.focused = false;
        this.clicked = false;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    focus() {
        this.focused = true;
        this.ownerDocument.activeElement = this;
    }

    click() {
        this.clicked = true;
    }
}

class FakeTocList {
    constructor(links, ownerDocument) {
        this.links = links;
        this.ownerDocument = ownerDocument;
        this.attributes = new Map();
        this.dataset = {};
        this.listeners = new Map();
        links.forEach((link) => {
            link.ownerDocument = ownerDocument;
        });
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    querySelectorAll(selector) {
        return selector === 'a' ? this.links : [];
    }

    addEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        handlers.push(handler);
        this.listeners.set(type, handlers);
    }
}

function createFakeDocument() {
    return {
        activeElement: null,
        createElement(tagName) {
            return new FakeHeading(tagName, '');
        },
    };
}

describe('article heading index', () => {
    test('creates stable ids for Chinese, English, punctuation, and duplicates', async () => {
        const { createHeadingId } = await import('../src/lib/article-enhancements/heading-index.js');
        const usedIds = new Set();

        assert.equal(createHeadingId('瞬间的 callback', usedIds), '瞬间的-callback');
        assert.equal(createHeadingId('Why / What?', usedIds), 'why-what');
        assert.equal(createHeadingId('瞬间的 callback', usedIds), '瞬间的-callback-2');
        assert.equal(createHeadingId('!!!', usedIds), 'section');
        assert.equal(createHeadingId('!!!', usedIds), 'section-2');
    });

    test('normalizes combining marks from broader Unicode scripts without adding separators', async () => {
        const { createHeadingId } = await import('../src/lib/article-enhancements/heading-index.js');

        assert.equal(createHeadingId('Café déjà vu'), 'cafe-deja-vu');
        assert.equal(createHeadingId('שָׁלוֹם עולם'), 'שלום-עולם');
        assert.equal(createHeadingId('العَرَبِيَّة'), 'العربية');
    });

    test('builds heading data, preserves existing ids, and appends accessible anchors', async () => {
        const { buildHeadingIndex } = await import('../src/lib/article-enhancements/heading-index.js');
        const headings = [
            new FakeHeading('h2', '已有标题', 'custom-id'),
            new FakeHeading('h3', '重复标题'),
            new FakeHeading('h3', '重复标题'),
            new FakeHeading('h4', '附录：A/B'),
        ];
        const root = {
            querySelectorAll() {
                return headings;
            },
        };

        const entries = buildHeadingIndex(root, createFakeDocument());

        assert.deepEqual(entries.map((entry) => [entry.id, entry.level, entry.text]), [
            ['custom-id', 2, '已有标题'],
            ['重复标题', 3, '重复标题'],
            ['重复标题-2', 3, '重复标题'],
            ['附录-a-b', 4, '附录：A/B'],
        ]);
        assert.equal(headings[1].querySelector('.heading-anchor').getAttribute('href'), '#重复标题');
        assert.equal(headings[1].querySelector('.heading-anchor').textContent, '#');
        assert.equal(headings[1].dataset.headingIndexed, 'true');
    });

    test('adds accessible TOC metadata and arrow-key navigation', async () => {
        const { addTocAccessibility, bindTocKeyboardEvents } = await import('../src/lib/article-enhancements/heading-index.js');
        const documentRef = createFakeDocument();
        const links = [
            new FakeTocLink('第一节'),
            new FakeTocLink('第二节'),
            new FakeTocLink('第三节'),
        ];
        const tocList = new FakeTocList(links, documentRef);
        const preventedKeys = [];

        addTocAccessibility(tocList);
        bindTocKeyboardEvents(tocList, documentRef);

        assert.equal(tocList.getAttribute('role'), 'list');
        assert.equal(tocList.getAttribute('aria-label'), '文章目录');
        links.forEach((link) => {
            assert.equal(link.getAttribute('role'), 'link');
            assert.equal(link.getAttribute('tabindex'), '0');
        });

        links[0].focus();
        const dispatchKey = (key) => tocList.listeners.get('keydown').forEach((handler) => handler({
            key,
            preventDefault() {
                preventedKeys.push(key);
            },
        }));

        dispatchKey('ArrowDown');
        assert.equal(documentRef.activeElement, links[1]);

        dispatchKey('ArrowUp');
        assert.equal(documentRef.activeElement, links[0]);

        dispatchKey('Enter');
        assert.equal(links[0].clicked, true);
        assert.deepEqual(preventedKeys, ['ArrowDown', 'ArrowUp', 'Enter']);
    });
});
