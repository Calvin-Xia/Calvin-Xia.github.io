import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { checkHealth } from '../src/lib/health-check.js';

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
