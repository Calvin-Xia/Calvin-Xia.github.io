import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { checkHealth } from '../src/lib/health-check.js';
import worker from '../src/worker.ts';

describe('checkHealth', () => {
    test('returns healthy status when Umami is reachable', async () => {
        const result = await checkHealth({
            umamiUrl: 'https://api.umami.is',
            umamiApiKey: 'test-key',
            version: '1.0.0',
            fetchFn: async () => ({ ok: true, status: 200 }),
            now: () => 1778112000000,
            startedAt: 1778111990000,
        });

        assert.equal(result.status, 'healthy');
        assert.equal(result.version, '1.0.0');
        assert.equal(result.uptime, 10000);
        assert.equal(result.timestamp, '2026-05-07T00:00:00.000Z');
        assert.equal(result.dependencies.umami.status, 'healthy');
    });

    test('returns degraded status when Umami is unreachable', async () => {
        const result = await checkHealth({
            umamiUrl: 'https://api.umami.is',
            umamiApiKey: 'test-key',
            version: '1.0.0',
            fetchFn: async () => { throw new Error('Network error'); },
        });

        assert.equal(result.status, 'degraded');
        assert.equal(result.dependencies.umami.status, 'degraded');
    });

    test('includes latency in the Umami dependency response', async () => {
        let currentTime = 1000;
        const result = await checkHealth({
            umamiUrl: 'https://api.umami.is',
            umamiApiKey: 'test-key',
            version: '1.0.0',
            fetchFn: async () => {
                currentTime += 42;
                return { ok: true, status: 200 };
            },
            now: () => currentTime,
            startedAt: 900,
        });

        assert.equal(result.dependencies.umami.latency, 42);
    });
});

describe('Worker /api/health route', () => {
    test('returns a public health response without dependency details', async (t) => {
        t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200 }));

        const response = await worker.fetch(new Request('https://calvin-xia.cn/api/health'), {
            UMAMI_API_KEY: 'test-key',
            WORKER_VERSION: '1.2.3',
            HEALTH_CHECK_TOKEN: 'health-secret',
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.status, 'healthy');
        assert.equal(typeof body.timestamp, 'string');
        assert.equal(body.version, undefined);
        assert.equal(body.dependencies, undefined);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
    });

    test('returns detailed health response with a valid bearer token', async (t) => {
        t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200 }));

        const response = await worker.fetch(
            new Request('https://calvin-xia.cn/api/health', {
                headers: { Authorization: 'Bearer health-secret' },
            }),
            {
                UMAMI_API_KEY: 'test-key',
                WORKER_VERSION: '1.2.3',
                HEALTH_CHECK_TOKEN: 'health-secret',
            },
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.version, '1.2.3');
        assert.equal(body.dependencies.umami.status, 'healthy');
        assert.equal(typeof body.dependencies.umami.latency, 'number');
    });

    test('supports caller-configured health response caching', async (t) => {
        t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200 }));

        const response = await worker.fetch(new Request('https://calvin-xia.cn/api/health?cache=30'), {
            UMAMI_API_KEY: 'test-key',
            WORKER_VERSION: '1.2.3',
        });

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'public, max-age=30');
    });

    test('keeps degraded health checks available with HTTP 200', async (t) => {
        t.mock.method(globalThis, 'fetch', async () => { throw new Error('Network error'); });

        const response = await worker.fetch(
            new Request('https://calvin-xia.cn/api/health', {
                headers: { Authorization: 'Bearer health-secret' },
            }),
            {
                UMAMI_API_KEY: 'test-key',
                WORKER_VERSION: '1.2.3',
                HEALTH_CHECK_TOKEN: 'health-secret',
            },
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.status, 'degraded');
        assert.equal(body.dependencies.umami.status, 'degraded');
    });
});
