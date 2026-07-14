import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { checkHealth } from '../src/lib/health-check.js';

describe('checkHealth', () => {
    test('returns healthy status when Analytics Engine is available', async () => {
        const mockAnalytics = {
            writeDataPoint: () => {},
        };

        const result = await checkHealth({
            analyticsEngine: mockAnalytics,
            version: '1.0.0',
        });

        assert.equal(result.status, 'healthy');
        assert.equal(result.version, '1.0.0');
        assert.equal(result.dependencies.analytics.status, 'healthy');
    });

    test('returns degraded status when Analytics Engine is not configured', async () => {
        const result = await checkHealth({
            version: '1.0.0',
        });

        assert.equal(result.status, 'degraded');
        assert.equal(result.dependencies.analytics.status, 'not_configured');
    });

    test('returns degraded status when Analytics Engine is not available', async () => {
        const mockAnalytics = {
            query: async () => ({ rows: [] }),
        };

        const result = await checkHealth({
            analyticsEngine: mockAnalytics,
            version: '1.0.0',
        });

        assert.equal(result.status, 'degraded');
        assert.equal(result.dependencies.analytics.status, 'not_configured');
    });
});
