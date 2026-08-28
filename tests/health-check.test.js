import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { checkHealth } from '../src/lib/health-check.js';
import { clearUmamiTokenCache } from '../src/lib/umami-view-counter.js';

const umamiEnv = {
    UMAMI_HOST: 'https://umami.example.com',
    UMAMI_WEBSITE_ID: 'web-1',
    UMAMI_USERNAME: 'worker',
    UMAMI_PASSWORD: 'secret',
};

describe('checkHealth', () => {
    test('returns healthy status when the Umami login probe succeeds', async () => {
        const originalFetch = globalThis.fetch;
        clearUmamiTokenCache();

        globalThis.fetch = async (input, init = {}) => {
            assert.equal(String(input), 'https://umami.example.com/api/auth/login');
            assert.equal(init.method, 'POST');

            return {
                ok: true,
                status: 200,
                json: async () => ({ token: 'token-1' }),
            };
        };

        try {
            const result = await checkHealth(umamiEnv, '1.0.0');

            assert.equal(result.status, 'healthy');
            assert.equal(result.version, '1.0.0');
            assert.equal(result.dependencies.analytics.status, 'healthy');
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
        }
    });

    test('returns degraded status when Umami is not configured', async () => {
        const result = await checkHealth({}, '1.0.0');

        assert.equal(result.status, 'degraded');
        assert.equal(result.dependencies.analytics.status, 'not_configured');
    });

    test('returns degraded status when the Umami login probe fails', async () => {
        const originalFetch = globalThis.fetch;
        const originalWarn = console.warn;
        const warnings = [];
        clearUmamiTokenCache();

        console.warn = (...args) => warnings.push(args);
        globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

        try {
            const result = await checkHealth(umamiEnv, '1.0.0');

            assert.equal(result.status, 'degraded');
            assert.equal(result.dependencies.analytics.status, 'unreachable');
            assert.ok(warnings.length >= 1);
        } finally {
            clearUmamiTokenCache();
            globalThis.fetch = originalFetch;
            console.warn = originalWarn;
        }
    });
});
