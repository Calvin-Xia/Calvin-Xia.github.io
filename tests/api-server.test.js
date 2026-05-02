import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'node:test';
import { describe, test } from 'node:test';
import {
    buildCorsHeaders,
    createNewPostServer,
    createNewPostErrorResponse,
    isAllowedOrigin,
    readRequestBody,
} from '../tools/api-server.js';

const tempDirs = [];

afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

class FakeRequest extends EventEmitter {
    headers = {};
    destroyed = false;
    encoding = '';

    setEncoding(encoding) {
        this.encoding = encoding;
    }

    destroy() {
        this.destroyed = true;
    }
}

function requestWithOrigin(origin) {
    return {
        headers: origin ? { origin } : {},
    };
}

async function createTempContentDir() {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'new-post-api-'));
    tempDirs.push(dir);
    await mkdir(dir, { recursive: true });
    return dir;
}

async function listen(server) {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    return address.port;
}

async function close(server) {
    await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });
}

function postJson(port, payload, { token = 'dev-secret' } = {}) {
    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
        const request = http.request(
            {
                hostname: '127.0.0.1',
                port,
                path: '/api/new-post',
                method: 'POST',
                headers: {
                    Authorization: token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    Origin: 'http://localhost:4321',
                },
            },
            (response) => {
                let responseBody = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    responseBody += chunk;
                });
                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: responseBody ? JSON.parse(responseBody) : {},
                    });
                });
            },
        );

        request.on('error', reject);
        request.end(body);
    });
}

describe('new-post API CORS policy', () => {
    test('allows localhost development origins without using a wildcard', () => {
        const headers = buildCorsHeaders(requestWithOrigin('http://localhost:4323'));

        assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:4323');
        assert.notEqual(headers['Access-Control-Allow-Origin'], '*');
        assert.equal(headers.Vary, 'Origin');
    });

    test('allows production site origins and exact configured worker origins', () => {
        assert.equal(isAllowedOrigin('https://calvin-xia.cn'), true);
        assert.equal(isAllowedOrigin('https://www.calvin-xia.cn'), true);
        assert.equal(isAllowedOrigin('https://origin.calvin-xia.cn'), true);
        assert.equal(isAllowedOrigin('https://mr-xia-site.calvin-xia.workers.dev/'), true);
        assert.equal(
            isAllowedOrigin('https://mr-xia.example.workers.dev', [
                'https://mr-xia.example.workers.dev',
            ]),
            true,
        );
    });

    test('rejects unlisted origins and omits the CORS allow-origin header', () => {
        const headers = buildCorsHeaders(requestWithOrigin('https://attacker.example'));

        assert.equal(isAllowedOrigin('https://attacker.example'), false);
        assert.equal(headers['Access-Control-Allow-Origin'], undefined);
        assert.notEqual(headers['Access-Control-Allow-Origin'], '*');
    });

    test('stops reading and removes stream listeners when the body limit is exceeded', async () => {
        const request = new FakeRequest();
        const bodyPromise = readRequestBody(request);

        request.emit('data', 'x'.repeat(1_000_001));

        await assert.rejects(bodyPromise, /Request body too large/);
        assert.equal(request.destroyed, true);
        assert.equal(request.listenerCount('data'), 0);
        assert.equal(request.listenerCount('end'), 0);
        assert.equal(request.listenerCount('error'), 0);
    });

    test('sanitizes file system errors before returning new-post responses', () => {
        const logs = [];
        const logger = {
            error: (...args) => logs.push(args),
        };
        const conflictError = new Error("EEXIST: file already exists, open 'C:\\Users\\Calvin-Xia\\site\\src\\content\\blog\\post.md'");
        conflictError.code = 'EEXIST';

        const conflict = createNewPostErrorResponse(conflictError, logger);

        assert.equal(conflict.statusCode, 409);
        assert.deepEqual(conflict.payload, { error: 'Post already exists' });
        assert.doesNotMatch(JSON.stringify(conflict.payload), /Calvin-Xia|src\\content|post\.md/);
        assert.equal(logs.length, 0);

        const internal = createNewPostErrorResponse(new Error('EACCES: permission denied, open C:\\secret\\post.md'), logger);

        assert.equal(internal.statusCode, 500);
        assert.deepEqual(internal.payload, { error: 'Internal server error' });
        assert.doesNotMatch(JSON.stringify(internal.payload), /C:\\secret|post\.md/);
        assert.equal(logs.length, 1);
        assert.equal(logs[0][0], 'New post creation failed:');
    });

    test('handles unauthorized, invalid, and successful new-post HTTP requests', async () => {
        const contentDir = await createTempContentDir();
        const server = createNewPostServer({
            secret: 'dev-secret',
            contentDir,
            logger: { error() {} },
        });
        const port = await listen(server);

        try {
            const missingAuth = await postJson(port, { title: '测试文章' }, { token: '' });
            assert.equal(missingAuth.statusCode, 401);
            assert.deepEqual(missingAuth.body, { error: 'Unauthorized' });

            const invalid = await postJson(port, { title: '', date: '' });
            assert.equal(invalid.statusCode, 422);
            assert.ok(invalid.body.errors.title);
            assert.ok(invalid.body.errors.date);

            const created = await postJson(port, {
                title: 'HTTP Integration Test',
                date: '2026-05-02',
                category: '测试',
                tags: ['review', 'api'],
                excerpt: '验证本地 API HTTP 行为',
                body: '正文内容',
            });

            assert.equal(created.statusCode, 201);
            assert.equal(created.body.entrySlug, '20260502-http-integration-test');
            assert.equal(created.body.articleUrl, '/articles/20260502-http-integration-test/');
            assert.equal(created.headers['access-control-allow-origin'], 'http://localhost:4321');

            const markdown = await readFile(path.join(contentDir, '20260502-http-integration-test.md'), 'utf8');
            assert.match(markdown, /title: "HTTP Integration Test"/);
            assert.match(markdown, /正文内容/);
        } finally {
            await close(server);
        }
    });
});
