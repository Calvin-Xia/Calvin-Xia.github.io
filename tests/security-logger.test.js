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

    it('should evict oldest entries when maxSize is reached', () => {
        const logger = new SecurityLogger({ maxSize: 5 });

        for (let i = 0; i < 7; i++) {
            logger.logRequest({ path: `/api/test/${i}`, status: 200, method: 'GET' });
        }

        const logs = logger.getLogs();
        assert.equal(logs.length, 5);
        assert.equal(logs[0].path, '/api/test/2');
        assert.equal(logs[4].path, '/api/test/6');
    });

    it('should fire alert only once until error rate drops below threshold', () => {
        const logger = new SecurityLogger({ alertThreshold: 0.1 });
        let alertCount = 0;
        logger.onAlert(() => {
            alertCount += 1;
        });

        for (let i = 0; i < 4; i++) {
            logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        }
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });

        assert.equal(alertCount, 1);

        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });

        assert.equal(alertCount, 1);

        for (let i = 0; i < 40; i++) {
            logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        }

        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });

        assert.equal(alertCount, 2);
    });

    it('should reset alertFired flag on reset()', () => {
        const logger = new SecurityLogger({ alertThreshold: 0.1 });
        let alertCount = 0;
        logger.onAlert(() => {
            alertCount += 1;
        });

        // Trigger alert
        for (let i = 0; i < 4; i++) {
            logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        }
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });
        assert.equal(alertCount, 1);

        // Reset
        logger.reset();

        // Trigger alert again
        for (let i = 0; i < 4; i++) {
            logger.logRequest({ path: '/api/views/test', status: 200, method: 'GET' });
        }
        logger.logRequest({ path: '/api/views/test', status: 500, method: 'GET' });

        assert.equal(alertCount, 2);
    });
});

async function importFreshWorker(label) {
    const workerUrl = new URL('../src/worker.ts', import.meta.url);
    workerUrl.searchParams.set('case', label);
    const module = await import(workerUrl.href);

    return module.default;
}

describe('Worker security monitoring', () => {
    it('should log failed API responses and high error rate alerts', async (t) => {
        const worker = await importFreshWorker('security-alert');
        const warnings = [];
        t.mock.method(console, 'warn', (...args) => warnings.push(args));
        t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200 }));

        const env = {
            UMAMI_API_KEY: 'test-key',
            HEALTH_CHECK_TOKEN: 'health-secret',
        };

        for (let i = 0; i < 8; i++) {
            await worker.fetch(new Request('https://calvin-xia.cn/api/health'), env);
        }
        await worker.fetch(new Request('https://calvin-xia.cn/api/health', {
            headers: { Authorization: 'Bearer invalid' },
        }), env);
        await worker.fetch(new Request('https://calvin-xia.cn/api/health', {
            headers: { Authorization: 'Bearer invalid' },
        }), env);

        const failedRequestLog = warnings.find(([message]) => message === 'Security Request Error:');
        const alertLog = warnings.find(([message]) => message === 'Security Alert:');

        assert.ok(failedRequestLog);
        assert.equal(JSON.parse(failedRequestLog[1]).status, 401);
        assert.ok(alertLog);
        assert.ok(JSON.parse(alertLog[1]).errorRate > 0.1);
    });

    it('should log API call stats every 100 API requests', async (t) => {
        const worker = await importFreshWorker('api-call-stats');
        const statsLogs = [];
        t.mock.method(console, 'log', (...args) => statsLogs.push(args));
        t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200 }));

        const env = {
            UMAMI_API_KEY: 'test-key',
            HEALTH_CHECK_TOKEN: 'health-secret',
        };

        for (let i = 0; i < 100; i++) {
            await worker.fetch(new Request('https://calvin-xia.cn/api/health'), env);
        }

        const statsLog = statsLogs.find(([message]) => message === 'API Call Stats:');

        assert.ok(statsLog);
        assert.equal(JSON.parse(statsLog[1]).totalCalls, 100);
    });
});
