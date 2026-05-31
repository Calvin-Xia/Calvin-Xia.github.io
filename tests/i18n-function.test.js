import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function createStorage() {
    const values = new Map();

    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        },
        clear() {
            values.clear();
        },
    };
}

function installBrowserGlobals() {
    const localStorage = createStorage();
    globalThis.window = {
        dispatchEvent() {},
        addEventListener() {},
    };
    globalThis.document = {
        documentElement: {
            dataset: {},
            lang: '',
        },
        querySelectorAll() {
            return [];
        },
    };
    globalThis.localStorage = localStorage;
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, init = {}) {
            this.type = type;
            this.detail = init.detail;
        }
    };
    return localStorage;
}

afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.localStorage;
    delete globalThis.CustomEvent;
});

describe('i18n function', () => {
    it('should export t function', async () => {
        const mod = await import('../src/lib/i18n.ts');
        assert.equal(typeof mod.t, 'function');
    });

    it('should export getCurrentLang function', async () => {
        const mod = await import('../src/lib/i18n.ts');
        assert.equal(typeof mod.getCurrentLang, 'function');
    });

    it('should export setLang function', async () => {
        const mod = await import('../src/lib/i18n.ts');
        assert.equal(typeof mod.setLang, 'function');
    });

    it('defaults to zh-CN when there is no stored preference', async () => {
        installBrowserGlobals();
        const mod = await import('../src/lib/i18n.ts');

        assert.equal(mod.getCurrentLang(), 'zh-CN');
        assert.equal(mod.t('nav.articles'), '文章');
    });

    it('reads the stored language preference', async () => {
        const localStorage = installBrowserGlobals();
        localStorage.setItem('calvin-xia-lang', 'en-US');
        const mod = await import('../src/lib/i18n.ts');

        assert.equal(mod.getCurrentLang(), 'en-US');
        assert.equal(mod.t('nav.articles'), 'Articles');
    });

    it('persists language changes and updates document lang', async () => {
        installBrowserGlobals();
        const mod = await import('../src/lib/i18n.ts');

        mod.setLang('en-US');

        assert.equal(globalThis.localStorage.getItem('calvin-xia-lang'), 'en-US');
        assert.equal(globalThis.document.documentElement.lang, 'en-US');
        assert.equal(globalThis.document.documentElement.dataset.lang, 'en-US');
    });

    it('interpolates variables in translation values', async () => {
        const localStorage = installBrowserGlobals();
        localStorage.setItem('calvin-xia-lang', 'en-US');
        const mod = await import('../src/lib/i18n.ts');

        assert.equal(mod.t('articles.searchResultCount', { query: 'Astro', count: 3 }), 'Search "Astro" matched 3 items');
    });

    it('falls back to the key when a translation is missing', async () => {
        installBrowserGlobals();
        const mod = await import('../src/lib/i18n.ts');

        assert.equal(mod.t('missing.key'), 'missing.key');
    });
});
