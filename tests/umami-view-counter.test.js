import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    getUmamiConfig,
    handleViewCounterRequest,
    normalizeArticlePath,
} from '../src/lib/umami-view-counter.js';

describe('umami-view-counter', () => {
    test('normalizeArticlePath keeps a trailing slash on article URLs', () => {
        assert.equal(normalizeArticlePath('20260411-ai-reliance'), '/articles/20260411-ai-reliance/');
        assert.equal(normalizeArticlePath('20260315-两小时，环线，慢行'), '/articles/20260315-两小时，环线，慢行/');
    });

    test('getUmamiConfig trims the host and requires every field', () => {
        const config = getUmamiConfig({
            UMAMI_HOST: ' https://umami.example.com/ ',
            UMAMI_WEBSITE_ID: ' web-1 ',
            UMAMI_USERNAME: ' worker ',
            UMAMI_PASSWORD: ' secret ',
        });

        assert.equal(config.host, 'https://umami.example.com');
        assert.equal(config.websiteId, 'web-1');
        assert.equal(config.username, 'worker');
        assert.equal(config.password, ' secret ');
        assert.equal(config.configured, true);

        assert.equal(getUmamiConfig({ UMAMI_HOST: 'https://umami.example.com' }).configured, false);
        assert.equal(getUmamiConfig({}).configured, false);
    });

    test('non-API requests fall back to a 404 response when ASSETS is unavailable', async () => {
        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/articles/'),
            {},
        );

        assert.equal(response.status, 404);
    });

    test('rejects path traversal in view counter slugs', async () => {
        const response = await handleViewCounterRequest(
            new Request('https://calvin-xia.cn/api/views/..%2Fsecret'),
            {},
        );

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: 'invalid slug' });
    });
});
