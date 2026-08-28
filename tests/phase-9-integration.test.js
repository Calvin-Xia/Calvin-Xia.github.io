import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SecurityLogger } from '../src/lib/security-logger.js';

const rootDir = path.resolve(import.meta.dirname, '..');

function readSource(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

describe('Phase 9 Integration', () => {
    it('security logger should track API calls', () => {
        const logger = new SecurityLogger();
        logger.logRequest({ path: '/api/health', status: 200, method: 'GET' });
        logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });

        const logs = logger.getLogs();
        assert.equal(logs.length, 3);
        assert.equal(logger.getErrorRate(), 1 / 3);
    });

    it('security logger should trigger alert on high error rate', () => {
        const logger = new SecurityLogger({ alertThreshold: 0.1 });
        let alertData = null;
        logger.onAlert((data) => {
            alertData = data;
        });

        // 5 requests, 1 error = 20% error rate > 10% threshold
        for (let i = 0; i < 4; i++) {
            logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        }
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });

        assert.ok(alertData);
        assert.ok(alertData.errorRate > 0.1);
    });

    it('Astro build check installs, builds, and verifies critical static output', () => {
        const workflow = readSource('.github', 'workflows', 'astro-build-check.yml');

        assert.ok(workflow.includes('npm ci'), 'expected npm ci install step');
        assert.ok(workflow.includes('npm run build'), 'expected astro build step');
        assert.ok(workflow.includes('test -f dist/index.html'), 'expected index.html output check');
        assert.ok(workflow.includes('X-Content-Type-Options: nosniff'), 'expected security header check');
    });
});
