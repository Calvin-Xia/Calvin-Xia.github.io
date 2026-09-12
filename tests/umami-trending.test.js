import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    fetchTrendingArticles,
    handleTrendingRequest,
    parseTrendingLimit,
} from '../src/lib/umami-trending.js';

function umamiFetchStub({ token = 'token-1', metrics = [] } = {}) {
    const calls = [];
    return {
        calls,
        fetchImpl: async (url, init = {}) => {
            calls.push({ url: String(url), auth: init.headers?.Authorization || '' });
            if (String(url).includes('/api/auth/login')) {
                return { ok: true, status: 200, json: async () => ({ token }) };
            }
            return { ok: true, status: 200, json: async () => metrics };
        },
    };
}

const env = {
    UMAMI_HOST: 'https://umami.example.com',
    UMAMI_WEBSITE_ID: 'site-1',
    UMAMI_USERNAME: 'u',
    UMAMI_PASSWORD: 'p',
};

describe('trending limit parsing', () => {
    test('clamps limit into the supported range', () => {
        assert.equal(parseTrendingLimit('http://x/api/trending'), 5);
        assert.equal(parseTrendingLimit('http://x/api/trending?limit=3'), 3);
        assert.equal(parseTrendingLimit('http://x/api/trending?limit=999'), 20);
        assert.equal(parseTrendingLimit('http://x/api/trending?limit=abc'), 5);
    });
});

describe('trending article aggregation', () => {
    test('keeps article paths only, sorted by views, limited', async () => {
        const { fetchImpl } = umamiFetchStub({
            metrics: [
                { x: '/articles/20260706-diary-2/', y: 12 },
                { x: '/works/', y: 40 },
                { x: '/articles/20251231-2025%E5%B9%B4%E5%BA%A6%E6%80%BB%E7%BB%93/', y: 30 },
                { x: '/articles/20260411-ai-reliance/', y: 0 },
                { x: 'https://calvin-xia.cn/', y: 99 },
            ],
        });

        const trending = await fetchTrendingArticles(env, { limit: 2, fetchImpl });

        assert.deepEqual(trending, [
            { slug: '20251231-2025年度总结', views: 30 },
            { slug: '20260706-diary-2', views: 12 },
        ]);
    });

    test('returns an empty list when umami is not configured', async () => {
        const trending = await fetchTrendingArticles({}, { fetchImpl: async () => { throw new Error('should not fetch'); } });

        assert.deepEqual(trending, []);
    });
});

describe('trending request handler', () => {
    test('serves aggregated json and caches successful responses', async () => {
        const store = new Map();
        const cachesImpl = {
            default: {
                match: async (key) => store.get(String(key)) || undefined,
                put: async (key, response) => { store.set(String(key), response); },
            },
        };
        const { fetchImpl } = umamiFetchStub({
            metrics: [{ x: '/articles/20260620-cultural-legacy/', y: 7 }],
        });

        const response = await handleTrendingRequest(
            new Request('http://localhost/api/trending?limit=3'),
            env,
            { fetchImpl, cachesImpl },
        );
        const body = await response.json();

        assert.deepEqual(body, { trending: [{ slug: '20260620-cultural-legacy', views: 7 }] });
        assert.equal(store.size, 1, 'successful aggregation must populate the cache');

        const cached = await store.values().next().value.clone().json();
        assert.deepEqual(cached, body);
    });

    test('degrades to an empty list on upstream failures', async () => {
        const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) });

        const response = await handleTrendingRequest(
            new Request('http://localhost/api/trending'),
            env,
            { fetchImpl, cachesImpl: undefined },
        );

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { trending: [] });
    });
});
