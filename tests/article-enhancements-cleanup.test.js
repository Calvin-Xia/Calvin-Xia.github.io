import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { initArticleEnhancements } from '../src/lib/article-enhancements/article-enhancements.js';
import { ARTICLE_CONTENT_SELECTOR } from '../src/lib/article-enhancements/article-scope.js';

/**
 * 回归守卫：离开文章页时，上一次安装的 window/document 监听器与 IntersectionObserver
 * 必须被释放。
 *
 * 上一篇的清理只发生在 `initArticleEnhancements` 入口处（`enhancementCleanups` 以
 * document 为键）。ClientRouter 站内导航只替换 body、document 本身是持久的，所以
 * 非文章页如果绕过这个入口，监听器与已脱离 DOM 的正文就会一直被 retain，直到下次
 * 打开文章页。低层接线由 `tests/article-scope.test.js` 的源码断言守护，这里守的是
 * 「无文章容器时 init 依然会执行清理」这条库契约。
 */

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = null;
        this.attributes = new Map();
        this.children = [];
        this.parentElement = null;
        this.dataset = {};
        this.textContent = '';
        this.hidden = false;
        this.listeners = new Map();
        this.classNames = new Set();
        this.matchSelectors = [];
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
        this.style = {
            setProperty(name, value) {
                this[name] = value;
            },
            removeProperty(name) {
                delete this[name];
            },
        };
    }

    append(...children) {
        children.forEach((child) => this.appendChild(child));
    }

    appendChild(child) {
        child.parentElement = this;
        child.ownerDocument = this.ownerDocument;
        this.children.push(child);
        return child;
    }

    insertBefore(child, reference) {
        const index = reference ? this.children.indexOf(reference) : -1;
        child.parentElement = this;

        if (index < 0) {
            this.children.push(child);
        } else {
            this.children.splice(index, 0, child);
        }

        return child;
    }

    removeChild(child) {
        this.children = this.children.filter((entry) => entry !== child);
        return child;
    }

    remove() {
        this.parentElement?.removeChild?.(this);
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    addEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        handlers.push(handler);
        this.listeners.set(type, handlers);
    }

    removeEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        this.listeners.set(type, handlers.filter((entry) => entry !== handler));
    }

    matches(selector) {
        return this.matchSelectors.includes(selector);
    }

    contains(target) {
        return target === this || this.children.some((child) => child.contains(target));
    }

    closest() {
        return null;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const matches = [];
        const walk = (node) => {
            if (selector.startsWith('.') && node.classNames?.has(selector.slice(1))) {
                matches.push(node);
            }

            node.children?.forEach(walk);
        };
        walk(this);
        return matches;
    }

    getBoundingClientRect() {
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }
}

class FakeIntersectionObserver {
    static instances = [];

    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observed = [];
        this.disconnected = false;
        FakeIntersectionObserver.instances.push(this);
    }

    observe(target) {
        this.observed.push(target);
    }

    unobserve(target) {
        this.observed = this.observed.filter((entry) => entry !== target);
    }

    disconnect() {
        this.disconnected = true;
    }
}

/**
 * 假环境：一个持久的 document（站内导航只换 body），article 容器可被“导航掉”。
 */
function createFakeEnvironment() {
    FakeIntersectionObserver.instances = [];

    const windowListeners = new Map();
    const documentListeners = new Map();
    const add = (registry, type, handler) => {
        const handlers = registry.get(type) || new Set();
        handlers.add(handler);
        registry.set(type, handlers);
    };
    const remove = (registry, type, handler) => {
        registry.get(type)?.delete(handler);
    };
    const count = (registry, type) => registry.get(type)?.size || 0;

    const windowRef = {
        innerWidth: 1280,
        innerHeight: 800,
        scrollY: 0,
        matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
        addEventListener: (type, handler) => add(windowListeners, type, handler),
        removeEventListener: (type, handler) => remove(windowListeners, type, handler),
        IntersectionObserver: FakeIntersectionObserver,
        history: { replaceState() {} },
        location: { href: 'https://example.com/articles/example/', hash: '' },
    };

    const state = { articlePresent: true };
    const body = new FakeElement('body');
    const articleRoot = new FakeElement('article');
    articleRoot.matchSelectors = [ARTICLE_CONTENT_SELECTOR];
    // H2 让逐段渐显真的建一个 IntersectionObserver；P 不是它的目标。
    articleRoot.append(new FakeElement('h2'), new FakeElement('p'));

    const documentRef = {
        nodeType: 9,
        defaultView: windowRef,
        body,
        documentElement: new FakeElement('html'),
        createElement: (tagName) => new FakeElement(tagName),
        createTextNode: (text) => ({ textContent: text }),
        addEventListener: (type, handler) => add(documentListeners, type, handler),
        removeEventListener: (type, handler) => remove(documentListeners, type, handler),
        matches: () => false,
        querySelector: (selector) => (selector === ARTICLE_CONTENT_SELECTOR && state.articlePresent ? articleRoot : null),
        querySelectorAll: () => [],
    };

    articleRoot.ownerDocument = documentRef;

    return {
        document: documentRef,
        articleRoot,
        windowRef,
        documentListenerCount: (type) => count(documentListeners, type),
        windowListenerCount: (type) => count(windowListeners, type),
        leaveArticle() {
            state.articlePresent = false;
        },
    };
}

describe('article enhancement cleanup', () => {
    test('init on an article page binds document/window listeners and one reveal observer', () => {
        const env = createFakeEnvironment();

        initArticleEnhancements(env.articleRoot);

        // 选区工具条无条件绑定 document keydown + window scroll。
        assert.ok(env.documentListenerCount('keydown') > 0, 'document keydown 应已绑定');
        assert.ok(env.windowListenerCount('scroll') > 0, 'window scroll 应已绑定');
        assert.equal(FakeIntersectionObserver.instances.length, 1, '逐段渐显应建一个 observer');
        assert.equal(FakeIntersectionObserver.instances[0].observed.length, 1, '应 observe 正文里的 H2');
        assert.equal(FakeIntersectionObserver.instances[0].disconnected, false);
    });

    test('a later init without an article container releases the previous listeners and observers', () => {
        const env = createFakeEnvironment();

        initArticleEnhancements(env.articleRoot);
        const observer = FakeIntersectionObserver.instances[0];

        // 模拟 ClientRouter 从文章页跳到非文章页：document 还在，正文容器没了。
        env.leaveArticle();
        initArticleEnhancements(env.document);

        assert.equal(env.documentListenerCount('keydown'), 0, 'document keydown 应被清掉');
        assert.equal(env.windowListenerCount('scroll'), 0, 'window scroll 应被清掉');
        assert.equal(env.windowListenerCount('resize'), 0, 'window resize 应被清掉');
        assert.equal(observer.disconnected, true, '逐段渐显的 observer 应 disconnect');

        // 清理是幂等的：再调一次不应抛错。
        initArticleEnhancements(env.document);
        assert.equal(env.documentListenerCount('keydown'), 0);
    });

    test('init without an article container neither binds nor throws', () => {
        const env = createFakeEnvironment();

        env.leaveArticle();
        const result = initArticleEnhancements(env.document);

        assert.deepEqual(result, { headings: [] });
        assert.equal(env.documentListenerCount('keydown'), 0);
        assert.equal(env.windowListenerCount('scroll'), 0);
        assert.equal(FakeIntersectionObserver.instances.length, 0);
    });
});
