import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { checkHealth } from '../src/lib/health-check.js';
import { clearUmamiTokenCache, UPSTREAM_FETCH_TIMEOUT_MS } from '../src/lib/umami-view-counter.js';

const umamiEnv = {
    UMAMI_HOST: 'https://umami.example.com',
    UMAMI_WEBSITE_ID: 'web-1',
    UMAMI_USERNAME: 'worker',
    UMAMI_PASSWORD: 'secret',
};

function timeoutError() {
    return new DOMException('The operation was aborted due to timeout', 'TimeoutError');
}

async function importFreshWorker(label) {
    const workerUrl = new URL('../src/worker.ts', import.meta.url);
    workerUrl.searchParams.set('case', label);

    return (await import(workerUrl.href)).default;
}

describe('checkHealth', () => {
    test('returns healthy status when the Umami login probe succeeds', async () => {
        const originalFetch = globalThis.fetch;
        clearUmamiTokenCache();

        globalThis.fetch = async (input, init = {}) => {
            assert.equal(String(input), 'https://umami.example.com/api/auth/login');
            assert.equal(init.method, 'POST');
            assert.ok(init.signal instanceof AbortSignal);
            assert.equal(init.signal.aborted, false);

            return {
                ok: true,
                status: 200,
                json: async () => ({ token: 'token-1' }),
            };
        };

        try {
            const result = await checkHealth(umamiEnv);

            assert.equal(result.status, 'healthy');
            assert.equal(result.dependencies.analytics.status, 'healthy');
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });

    test('returns degraded status when Umami is not configured', async () => {
        const result = await checkHealth({});

        assert.equal(result.status, 'degraded');
        assert.equal(result.dependencies.analytics.status, 'not_configured');
    });

    test('returns degraded status when the Umami login probe fails', async (t) => {
        const originalFetch = globalThis.fetch;
        const warnings = [];
        clearUmamiTokenCache();

        t.mock.method(console, 'warn', (...args) => warnings.push(args));
        globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

        try {
            const result = await checkHealth(umamiEnv);

            assert.equal(result.status, 'degraded');
            assert.equal(result.dependencies.analytics.status, 'unreachable');
            assert.ok(warnings.length >= 1);
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });

    test('returns degraded status when the Umami login probe times out', async (t) => {
        const originalFetch = globalThis.fetch;
        clearUmamiTokenCache();
        t.mock.method(console, 'warn', () => {});
        globalThis.fetch = async () => { throw timeoutError(); };

        try {
            const result = await checkHealth(umamiEnv);

            assert.equal(result.status, 'degraded');
            assert.equal(result.dependencies.analytics.status, 'unreachable');
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });

    test('uses the Workers version metadata id and falls back to dev', async () => {
        assert.equal((await checkHealth({})).version, 'dev');
        assert.equal((await checkHealth({
            CF_VERSION_METADATA: { id: 'version-uuid', tag: 'v1.2.3' },
        })).version, 'version-uuid');
        assert.equal((await checkHealth({ UMAMI_HOST: 'https://umami.example.com' })).version, 'dev');
    });

    test('bounds the upstream timeout at 8s', () => {
        assert.equal(UPSTREAM_FETCH_TIMEOUT_MS, 8000);
    });
});

describe('/api/health worker route', () => {
    test('keeps the detailed response shape and reports dev without a binding', async () => {
        const worker = await importFreshWorker('health-dev');
        const token = 'health-secret';
        const response = await worker.fetch(
            new Request('https://calvin-xia.cn/api/health', {
                headers: { Authorization: `Bearer ${token}` },
            }),
            { HEALTH_CHECK_TOKEN: token },
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(body).sort(), ['dependencies', 'status', 'timestamp', 'version']);
        assert.equal(body.status, 'degraded');
        assert.equal(body.version, 'dev');
        assert.equal(body.dependencies.analytics.status, 'not_configured');
        assert.ok(Number.isFinite(Date.parse(body.timestamp)));
    });

    test('reports the Workers version metadata id when bound', async () => {
        const worker = await importFreshWorker('health-versioned');
        const token = 'health-secret';
        const response = await worker.fetch(
            new Request('https://calvin-xia.cn/api/health', {
                headers: { Authorization: `Bearer ${token}` },
            }),
            {
                HEALTH_CHECK_TOKEN: token,
                CF_VERSION_METADATA: { id: 'version-uuid', tag: 'v1.2.3' },
            },
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.version, 'version-uuid');
        assert.equal(body.status, 'degraded');
    });

    test('keeps the public (unauthenticated) response free of the version field', async () => {
        const worker = await importFreshWorker('health-public');
        const response = await worker.fetch(
            new Request('https://calvin-xia.cn/api/health'),
            {},
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(Object.keys(body).sort(), ['status', 'timestamp']);
    });

    test('still rejects a wrong bearer token', async () => {
        const worker = await importFreshWorker('health-unauthorized');
        const response = await worker.fetch(
            new Request('https://calvin-xia.cn/api/health', {
                headers: { Authorization: 'Bearer nope' },
            }),
            { HEALTH_CHECK_TOKEN: 'health-secret' },
        );

        assert.equal(response.status, 401);
    });
});
