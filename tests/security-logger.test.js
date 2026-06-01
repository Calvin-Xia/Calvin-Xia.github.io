import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SecurityLogger } from '../src/lib/security-logger.js';

describe('SecurityLogger', () => {
    it('should log request with status code', () => {
        const logger = new SecurityLogger();
        logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        const logs = logger.getLogs();
        assert.equal(logs.length, 1);
        assert.equal(logs[0].status, 200);
    });

    it('should track error rate', () => {
        const logger = new SecurityLogger();
        logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });
        logger.logRequest({ path: '/api/views/test', status: 404, method: 'GET' });
        const errorRate = logger.getErrorRate();
        assert.equal(errorRate, 2 / 3);
    });

    it('should trigger alert when error rate exceeds threshold', () => {
        const logger = new SecurityLogger({ alertThreshold: 0.1 });
        let alertTriggered = false;
        logger.onAlert(() => {
            alertTriggered = true;
        });

        // 10 requests, 2 errors = 20% error rate
        for (let i = 0; i < 8; i++) {
            logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        }
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });

        assert.ok(alertTriggered);
    });
});
