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

    it('Astro build check should generate content types before running TypeScript', () => {
        const workflow = readSource('.github', 'workflows', 'astro-build-check.yml');
        const typecheckIndex = workflow.indexOf('npx tsc --noEmit');
        const astroSyncIndex = workflow.indexOf('npx astro sync');

        assert.notEqual(typecheckIndex, -1);
        assert.notEqual(astroSyncIndex, -1);
        assert.ok(astroSyncIndex < typecheckIndex);
    });
});
