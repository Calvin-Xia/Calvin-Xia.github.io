import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

class FakeElement {
    constructor(tagName, attributes = {}) {
        this.tagName = tagName.toUpperCase();
        this.attributes = new Map(Object.entries(attributes));
        this.children = [];
        this.parentElement = null;
        this.dataset = {};
        this.textContent = '';
        this.offsetWidth = 132;
        this.offsetHeight = 40;
        this.listeners = new Map();
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach((name) => this.classNames.add(name)),
            remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
            contains: (name) => this.classNames.has(name),
            toggle: (name, force) => {
                const shouldHave = force ?? !this.classNames.has(name);
                if (shouldHave) {
                    this.classNames.add(name);
                } else {
                    this.classNames.delete(name);
                }
                return shouldHave;
            },
        };
        this.style = {};
    }

    get className() {
        return [...this.classNames].join(' ');
    }

    set className(value) {
        this.classNames.clear();
        String(value).split(/\s+/).filter(Boolean).forEach((name) => this.classNames.add(name));
    }

    append(...children) {
        children.forEach((child) => this.appendChild(child));
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    remove() {
        if (this.parentElement) {
            this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
            this.parentElement = null;
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    addEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        handlers.push(handler);
        this.listeners.set(type, handlers);
    }

    removeEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        this.listeners.set(type, handlers.filter((h) => h !== handler));
    }

    contains(target) {
        if (target === this) return true;
        return this.children.some((child) => child.contains(target));
    }

    closest(selector) {
        if (selector.startsWith('[data-') && selector.endsWith(']')) {
            const attr = selector.slice(6, -1);
            if (this.dataset && attr in this.dataset) {
                return this;
            }
        }
        return this.parentElement?.closest?.(selector) || null;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const matches = [];
        const walk = (node) => {
            if (selector.startsWith('.') && node.classNames?.has(selector.slice(1))) {
                matches.push(node);
            } else if (selector.startsWith('[data-') && selector.endsWith(']')) {
                const attr = selector.slice(6, -1);
                if (node.dataset && attr in node.dataset) {
                    matches.push(node);
                }
            }
            node.children?.forEach((child) => {
                child.parentElement = node;
                walk(child);
            });
        };
        walk(this);
        return matches;
    }
}

function createFakeEnvironment({ clipboardWrite } = {}) {
    const body = new FakeElement('body');
    const container = new FakeElement('div');
    body.appendChild(container);

    const fakeDocument = {
        createElement: (tag) => new FakeElement(tag),
        querySelector: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
        body,
        activeElement: null,
    };
    const fakeWindow = {
        innerWidth: 1024,
        innerHeight: 768,
        getSelection: () => null,
        navigator: {
            clipboard: clipboardWrite
                ? { writeText: clipboardWrite }
                : undefined,
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        document: fakeDocument,
    };
    container.ownerDocument = fakeDocument;
    fakeDocument.defaultView = fakeWindow;

    return { container, fakeDocument, fakeWindow };
}

describe('article selection toolbar', () => {
    test('clipboard rejection does not throw during copy action', async () => {
        const { initSelectionToolbar } = await import('../src/lib/article-enhancements/selection-toolbar.js');
        const { container, fakeWindow } = createFakeEnvironment({
            clipboardWrite: () => Promise.reject(new Error('permission denied')),
        });

        const cleanup = initSelectionToolbar(container, { windowRef: fakeWindow });

        const toolbar = container.querySelector('.selection-toolbar');
        assert.ok(toolbar, 'toolbar should be created');

        const unhandledRejections = [];
        const originalHandler = process.listeners('unhandledRejection');
        process.on('unhandledRejection', (reason) => {
            unhandledRejections.push(reason);
        });

        try {
            const copyButton = toolbar.children.find((c) => c.dataset?.action === 'copy');
            assert.ok(copyButton, 'copy button should exist');

            const clickHandlers = toolbar.listeners.get('click');
            assert.ok(clickHandlers, 'click handlers should be registered');

            fakeWindow.getSelection = () => ({
                toString: () => 'selected text',
                rangeCount: 1,
                anchorNode: container.children[0],
                getRangeAt: () => ({
                    getBoundingClientRect: () => ({ left: 100, top: 100, width: 50, height: 20 }),
                }),
            });

            for (const handler of clickHandlers) {
                await handler({ target: copyButton });
            }

            assert.equal(unhandledRejections.length, 0, 'clipboard rejection should not become unhandled');
        } finally {
            process.removeAllListeners('unhandledRejection');
            originalHandler.forEach((h) => process.on('unhandledRejection', h));
            cleanup();
        }
    });

    test('toolbar hides after copy even when clipboard write fails', async () => {
        const { initSelectionToolbar } = await import('../src/lib/article-enhancements/selection-toolbar.js');
        const { container, fakeWindow } = createFakeEnvironment({
            clipboardWrite: () => Promise.reject(new Error('not allowed')),
        });

        const cleanup = initSelectionToolbar(container, { windowRef: fakeWindow });

        const toolbar = container.querySelector('.selection-toolbar');
        toolbar.classNames.add('is-visible');

        fakeWindow.getSelection = () => ({
            toString: () => 'test',
            rangeCount: 1,
            anchorNode: container.children[0],
            getRangeAt: () => ({
                getBoundingClientRect: () => ({ left: 100, top: 100, width: 50, height: 20 }),
            }),
        });

        const copyButton = toolbar.children.find((c) => c.dataset?.action === 'copy');
        const clickHandlers = toolbar.listeners.get('click');

        for (const handler of clickHandlers) {
            await handler({ target: copyButton });
        }

        assert.equal(toolbar.classNames.has('is-visible'), false, 'toolbar should hide after copy attempt');
        cleanup();
    });
});
