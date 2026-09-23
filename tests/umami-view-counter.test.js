import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    clearUmamiTokenCache,
    fetchArticleViews,
    getUmamiConfig,
    handleViewCounterRequest,
    normalizeArticlePath,
    UPSTREAM_FETCH_TIMEOUT_MS,
    VIEW_COUNTER_CACHE_CONTROL,
    VIEW_COUNTER_ERROR_CACHE_CONTROL,
} from '../src/lib/umami-view-counter.js';

const umamiEnv = {
    UMAMI_HOST: 'https://umami.example.com',
    UMAMI_WEBSITE_ID: 'web-1',
    UMAMI_USERNAME: 'worker',
    UMAMI_PASSWORD: 'secret',
};

function timeoutError() {
    return new DOMException('The operation was aborted due to timeout', 'TimeoutError');
}

describe('umami-view-counter', () => {
    test('normalizeArticlePath keeps a trailing slash on article URLs', () => {
        assert.equal(normalizeArticlePath('20260411-ai-reliance'), '/articles/20260411-ai-reliance/');
        assert.equal(normalizeArticlePath('20260315-两小时，环线，慢行'), '/articles/20260315-两小时，环线，慢行/');
    });

    test('getUmamiConfig trims the host and requires every field', () => {
        const config = getUmamiConfig({
            UMAMI_HOST: ' https://umami.example.com/ ',
            UMAMI_WEBSITE_ID: ' web-1 ',
            UMAMI_USERNAME: ' worker ',
            UMAMI_PASSWORD: ' secret ',
        });

        assert.equal(config.host, 'https://umami.example.com');
        assert.equal(config.websiteId, 'web-1');
        assert.equal(config.username, 'worker');
        assert.equal(config.password, ' secret ');
        assert.equal(config.configured, true);

        assert.equal(getUmamiConfig({ UMAMI_HOST: 'https://umami.example.com' }).configured, false);
        assert.equal(getUmamiConfig({}).configured, false);
    });

    test('non-API requests fall back to a 404 response when ASSETS is unavailable', async () => {
        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/articles/'),
            {},
        );

        assert.equal(response.status, 404);
    });

    test('rejects path traversal in view counter slugs', async () => {
        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/..%2Fsecret'),
            {},
        );

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: 'invalid slug' });
    });
});

describe('umami view counter timeouts', () => {
    test('bounds the upstream timeout at 8s', () => {
        assert.equal(UPSTREAM_FETCH_TIMEOUT_MS, 8000);
    });

    test('attaches an abort timeout signal to every outbound umami request', async () => {
        clearUmamiTokenCache();
        const inits = [];
        const fetchImpl = async (input, init = {}) => {
            inits.push({ url: String(input), init });
            if (String(input).includes('/api/auth/login')) {
                return { ok: true, status: 200, json: async () => ({ token: 'token-1' }) };
            }

            return { ok: true, status: 200, json: async () => [] };
        };

        try {
            const views = await fetchArticleViews(umamiEnv, '20260101-timeout-signal', fetchImpl);

            assert.equal(views, 0);
            assert.equal(inits.length, 2, 'login plus metrics');
            for (const { url, init } of inits) {
                assert.ok(init.signal instanceof AbortSignal, `${url} must carry a signal`);
                assert.equal(init.signal.aborted, false);
            }
        } finally {
            clearUmamiTokenCache();
        }
    });

    test('degrades a timed-out login to views:null with a no-store response', async (t) => {
        const originalFetch = globalThis.fetch;
        clearUmamiTokenCache();
        t.mock.method(console, 'warn', () => {});
        globalThis.fetch = async () => { throw timeoutError(); };

        try {
            const response = await handleViewCounterRequest(
                new Request('https://calvin-xia.cn/api/views/20260101-timeout'),
                umamiEnv,
            );

            assert.equal(response.status, 200);
            assert.equal(response.headers.get('Cache-Control'), VIEW_COUNTER_ERROR_CACHE_CONTROL);
            assert.deepEqual(await response.json(), { slug: '20260101-timeout', views: null });
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });
});

describe('umami view counter cache headers', () => {
    test('caches only the success payload for 5 minutes', async () => {
        const originalFetch = globalThis.fetch;
        clearUmamiTokenCache();
        globalThis.fetch = async (input) => {
            if (String(input).includes('/api/auth/login')) {
                return { ok: true, status: 200, json: async () => ({ token: 'token-1' }) };
            }

            return { ok: true, status: 200, json: async () => [{ x: '/articles/20260101-ok/', y: 42 }] };
        };

        try {
            const response = await handleViewCounterRequest(
                new Request('https://calvin-xia.cn/api/views/20260101-ok'),
                umamiEnv,
            );

            assert.equal(response.headers.get('Cache-Control'), VIEW_COUNTER_CACHE_CONTROL);
            assert.equal(VIEW_COUNTER_CACHE_CONTROL, 'public, max-age=300');
            assert.deepEqual(await response.json(), { slug: '20260101-ok', views: 42 });
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });

    test('keeps failed upstream responses out of the browser cache', async (t) => {
        const originalFetch = globalThis.fetch;
        clearUmamiTokenCache();
        t.mock.method(console, 'warn', () => {});
        globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

        try {
            const response = await handleViewCounterRequest(
                new Request('https://calvin-xia.cn/api/views/20260101-failed'),
                umamiEnv,
            );

            assert.equal(response.headers.get('Cache-Control'), 'no-store');
            assert.deepEqual(await response.json(), { slug: '20260101-failed', views: null });
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });

    test('keeps invalid slugs out of the browser cache', async () => {
        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/..%2Fsecret'),
            {},
        );

        assert.equal(response.status, 400);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
    });

    test('keeps the unconfigured views:null degradation out of the browser cache', async () => {
        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/20260101-unconfigured'),
            {},
        );

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.deepEqual(await response.json(), { slug: '20260101-unconfigured', views: null });
    });

    test('caches a real zero count like any other success payload', async () => {
        const originalFetch = globalThis.fetch;
        clearUmamiTokenCache();
        globalThis.fetch = async (input) => {
            if (String(input).includes('/api/auth/login')) {
                return { ok: true, status: 200, json: async () => ({ token: 'token-1' }) };
            }

            return { ok: true, status: 200, json: async () => [] };
        };

        try {
            const response = await handleViewCounterRequest(
                new Request('https://calvin-xia.cn/api/views/20260101-zero'),
                umamiEnv,
            );

            assert.equal(response.headers.get('Cache-Control'), VIEW_COUNTER_CACHE_CONTROL);
            assert.deepEqual(await response.json(), { slug: '20260101-zero', views: 0 });
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });
});
