import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

class FakeAnchor {
    constructor(href) {
        this.href = href;
        this.attributes = new Map([['href', href]]);
        this.target = '';
    }

    closest(selector) {
        return selector === 'a[href]' ? this : null;
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    setAttribute(name, value = '') {
        this.attributes.set(name, String(value));
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }
}

class FakeDocument {
    constructor(anchor) {
        this.anchor = anchor;
        this.documentElement = {};
        this.main = null;
        this.listeners = new Map();
        this.ownerDocument = this;
    }

    addEventListener(type, handler, options) {
        const listeners = this.listeners.get(type) || [];
        listeners.push({ handler, options });
        this.listeners.set(type, listeners);
    }

    querySelectorAll(selector) {
        return selector === 'a[href]' ? [this.anchor] : [];
    }

    querySelector(selector) {
        return selector === '.site-main' ? this.main : null;
    }
}

class FakeMain {
    constructor() {
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach((name) => this.classNames.add(name)),
            remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
            contains: (name) => this.classNames.has(name),
        };
    }
}

function createWindow({ reducedMotion = false, swapFadeDuration = '260ms' } = {}) {
    const timers = [];

    return {
        document: null,
        location: createLocation('/articles/'),
        timers,
        matchMedia(query) {
            return {
                matches: query === '(prefers-reduced-motion: reduce)' && reducedMotion,
            };
        },
        getComputedStyle() {
            return {
                getPropertyValue(name) {
                    return name === '--swap-fade-duration' ? swapFadeDuration : '';
                },
            };
        },
        setTimeout(callback, delay) {
            const timer = { callback, delay };
            timers.push(timer);
            return timer;
        },
        clearTimeout(timer) {
            const index = timers.indexOf(timer);
            if (index >= 0) {
                timers.splice(index, 1);
            }
        },
    };
}

function createLocation(pathname = '/articles/') {
    return new URL(`https://calvin-xia.cn${pathname}`);
}

describe('page transitions', () => {
    test('initPageTransitions marks links without binding click boundaries', async () => {
        const { initPageTransitions } = await import('../src/scripts/page-transitions.js');
        const anchor = new FakeAnchor('/works/');
        const documentRef = new FakeDocument(anchor);
        const originalDocument = globalThis.document;

        try {
            globalThis.document = documentRef;

            initPageTransitions(documentRef, {
                document: documentRef,
                location: createLocation('/articles/'),
            });
        } finally {
            globalThis.document = originalDocument;
        }

        assert.equal(anchor.attributes.has('data-astro-reload'), false);
        assert.equal(anchor.attributes.has('data-article-transition'), false);
        assert.equal(documentRef.listeners.has('click'), false);
    });

    test('adds and clears the swap fade fallback class after Astro page loads without View Transitions', async () => {
        const { initPageTransitions } = await import('../src/scripts/page-transitions.js');
        const anchor = new FakeAnchor('/about/');
        const documentRef = new FakeDocument(anchor);
        const windowRef = createWindow({ swapFadeDuration: '340ms' });
        const main = new FakeMain();

        documentRef.main = main;
        windowRef.document = documentRef;

        initPageTransitions(documentRef, windowRef);
        documentRef.listeners.get('astro:page-load')[0].handler();

        assert.equal(main.classList.contains('is-swap-fade-in'), true);
        assert.equal(windowRef.timers[0].delay, 340);

        windowRef.timers[0].callback();

        assert.equal(main.classList.contains('is-swap-fade-in'), false);
    });

    test('parses swap fade CSS duration seconds and falls back for invalid values', async () => {
        const { getSwapFadeDurationMs } = await import('../src/scripts/page-transitions.js');
        const documentRef = new FakeDocument(new FakeAnchor('/about/'));

        assert.equal(getSwapFadeDurationMs(documentRef, createWindow({ swapFadeDuration: '0.42s' })), 420);
        assert.equal(getSwapFadeDurationMs(documentRef, createWindow({ swapFadeDuration: 'not-a-duration' })), 260);
    });

    test('skips the swap fade fallback when reduced motion is preferred', async () => {
        const { initPageTransitions } = await import('../src/scripts/page-transitions.js');
        const anchor = new FakeAnchor('/about/');
        const documentRef = new FakeDocument(anchor);
        const windowRef = createWindow({ reducedMotion: true });

        documentRef.main = new FakeMain();
        windowRef.document = documentRef;

        initPageTransitions(documentRef, windowRef);
        documentRef.listeners.get('astro:page-load')[0].handler();

        assert.equal(documentRef.main.classList.contains('is-swap-fade-in'), false);
        assert.equal(windowRef.timers.length, 0);
    });

    test('skips the swap fade fallback when native View Transitions are available', async () => {
        const { initPageTransitions } = await import('../src/scripts/page-transitions.js');
        const anchor = new FakeAnchor('/about/');
        const documentRef = new FakeDocument(anchor);
        const windowRef = createWindow();

        documentRef.main = new FakeMain();
        documentRef.startViewTransition = () => {};
        windowRef.document = documentRef;

        initPageTransitions(documentRef, windowRef);
        documentRef.listeners.get('astro:page-load')[0].handler();

        assert.equal(documentRef.main.classList.contains('is-swap-fade-in'), false);
        assert.equal(windowRef.timers.length, 0);
    });

    test('shouldUseClientRouter allows all internal links', async () => {
        const { shouldUseClientRouter } = await import('../src/scripts/page-transitions.js');
        const location = new URL('https://calvin-xia.cn/');

        const worksAnchor = new FakeAnchor('/works/');
        assert.equal(shouldUseClientRouter(worksAnchor, location), true);

        const aboutAnchor = new FakeAnchor('/about/');
        assert.equal(shouldUseClientRouter(aboutAnchor, location), true);

        const toolsAnchor = new FakeAnchor('/works/tools/');
        assert.equal(shouldUseClientRouter(toolsAnchor, location), true);

        const externalAnchor = new FakeAnchor('https://example.com/');
        assert.equal(shouldUseClientRouter(externalAnchor, location), false);

        const mailtoAnchor = new FakeAnchor('mailto:test@example.com');
        assert.equal(shouldUseClientRouter(mailtoAnchor, location), false);

        const telAnchor = new FakeAnchor('tel:+1234567890');
        assert.equal(shouldUseClientRouter(telAnchor, location), false);

        const javascriptAnchor = new FakeAnchor('javascript:void(0)');
        assert.equal(shouldUseClientRouter(javascriptAnchor, location), false);
    });

    test('shouldUseClientRouter rejects non-HTML endpoints', async () => {
        const { shouldUseClientRouter } = await import('../src/scripts/page-transitions.js');
        const location = new URL('https://calvin-xia.cn/');

        const rssAnchor = new FakeAnchor('/rss.xml');
        assert.equal(shouldUseClientRouter(rssAnchor, location), false);

        const sitemapAnchor = new FakeAnchor('/sitemap-index.xml');
        assert.equal(shouldUseClientRouter(sitemapAnchor, location), false);

        const jsonAnchor = new FakeAnchor('/search-index.json');
        assert.equal(shouldUseClientRouter(jsonAnchor, location), false);

        const robotsAnchor = new FakeAnchor('/robots.txt');
        assert.equal(shouldUseClientRouter(robotsAnchor, location), false);

        const pdfAnchor = new FakeAnchor('/document.pdf');
        assert.equal(shouldUseClientRouter(pdfAnchor, location), false);

        const imageAnchor = new FakeAnchor('/photo.png');
        assert.equal(shouldUseClientRouter(imageAnchor, location), false);

        // HTML pages should still work
        const htmlAnchor = new FakeAnchor('/about/');
        assert.equal(shouldUseClientRouter(htmlAnchor, location), true);
    });

    test('markTransitionLinks does not add data-astro-reload to internal links', async () => {
        const { markTransitionLinks } = await import('../src/scripts/page-transitions.js');
        const anchor = new FakeAnchor('/works/');
        const documentRef = new FakeDocument(anchor);
        const location = new URL('https://calvin-xia.cn/');

        markTransitionLinks(documentRef, location);

        assert.equal(anchor.attributes.has('data-astro-reload'), false);
        assert.equal(anchor.attributes.has('data-article-transition'), false);
    });

    test('markTransitionLinks adds data-article-transition to article links', async () => {
        const { markTransitionLinks } = await import('../src/scripts/page-transitions.js');
        const anchor = new FakeAnchor('/articles/test-post/');
        const documentRef = new FakeDocument(anchor);
        const location = new URL('https://calvin-xia.cn/');

        markTransitionLinks(documentRef, location);

        assert.equal(anchor.attributes.get('data-article-transition'), 'true');
        assert.equal(anchor.attributes.has('data-astro-reload'), false);
    });
});
