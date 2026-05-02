import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createPostFile, validatePostPayload } from '../scripts/post-utils.js';

dotenv.config({ quiet: true });

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultContentDir = path.join(rootDir, 'src', 'content', 'blog');
const port = Number(process.env.NEW_POST_PORT || 4322);
const defaultAllowedOrigins = new Set([
    'https://calvin-xia.cn',
    'https://www.calvin-xia.cn',
    'https://origin.calvin-xia.cn',
    'https://mr-xia-site.calvin-xia.workers.dev',
]);
const localOriginHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function normalizeOrigin(origin) {
    if (!origin) {
        return '';
    }

    try {
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return '';
        }

        return url.origin;
    } catch {
        return '';
    }
}

function getConfiguredAllowedOrigins(value = process.env.NEW_POST_ALLOWED_ORIGINS || '') {
    return value
        .split(',')
        .map((origin) => normalizeOrigin(origin.trim()))
        .filter(Boolean);
}

function isLocalOrigin(origin) {
    try {
        const url = new URL(origin);
        return localOriginHosts.has(url.hostname);
    } catch {
        return false;
    }
}

export function isAllowedOrigin(origin, configuredAllowedOrigins = getConfiguredAllowedOrigins()) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
        return false;
    }

    return (
        isLocalOrigin(normalizedOrigin)
        || defaultAllowedOrigins.has(normalizedOrigin)
        || configuredAllowedOrigins.includes(normalizedOrigin)
    );
}

export function buildCorsHeaders(request) {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        Vary: 'Origin',
    };
    const origin = request.headers.origin || '';

    if (isAllowedOrigin(origin)) {
        headers['Access-Control-Allow-Origin'] = normalizeOrigin(origin);
    }

    return headers;
}

function isCorsRequestAllowed(request) {
    const origin = request.headers.origin || '';
    return !origin || isAllowedOrigin(origin);
}

function sendJson(request, response, statusCode, payload) {
    response.writeHead(statusCode, buildCorsHeaders(request));
    response.end(JSON.stringify(payload));
}

function isConflictError(error) {
    const message = error instanceof Error ? error.message : '';
    const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
    return code === 'EEXIST' || message.includes('already exists') || message.includes('EEXIST');
}

export function createNewPostErrorResponse(error, logger = console) {
    if (isConflictError(error)) {
        return {
            statusCode: 409,
            payload: { error: 'Post already exists' },
        };
    }

    if (error instanceof Error && error.message === 'Request body too large') {
        return {
            statusCode: 413,
            payload: { error: 'Request body too large' },
        };
    }

    logger.error?.('New post creation failed:', error);
    return {
        statusCode: 500,
        payload: { error: 'Internal server error' },
    };
}

export function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';
        let settled = false;

        function cleanup() {
            request.off('data', onData);
            request.off('end', onEnd);
            request.off('error', onError);
        }

        function settle(callback) {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            callback();
        }

        function fail(error) {
            settle(() => {
                reject(error);
                request.destroy();
            });
        }

        function onData(chunk) {
            const nextLength = body.length + chunk.length;
            if (nextLength > 1_000_000) {
                fail(new Error('Request body too large'));
                return;
            }

            body += chunk;
        }

        function onEnd() {
            settle(() => resolve(body));
        }

        function onError(error) {
            settle(() => reject(error));
        }

        request.setEncoding('utf8');
        request.on('data', onData);
        request.on('end', onEnd);
        request.on('error', onError);
    });
}

function isAuthorized(request, secret) {
    const header = request.headers.authorization || '';
    return Boolean(secret) && header === `Bearer ${secret}`;
}

export function createNewPostServer({
    contentDir = defaultContentDir,
    secret = process.env.NEW_POST_SECRET || '',
    logger = console,
} = {}) {
    return createServer(async (request, response) => {
        const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

        if (!isCorsRequestAllowed(request)) {
            sendJson(request, response, 403, { error: 'Origin not allowed' });
            return;
        }

        if (request.method === 'OPTIONS') {
            sendJson(request, response, 204, {});
            return;
        }

        if (url.pathname !== '/api/new-post' || request.method !== 'POST') {
            sendJson(request, response, 404, { error: 'Not found' });
            return;
        }

        if (!isAuthorized(request, secret)) {
            sendJson(request, response, 401, { error: 'Unauthorized' });
            return;
        }

        try {
            const rawBody = await readRequestBody(request);
            const payload = JSON.parse(rawBody || '{}');
            const validation = validatePostPayload(payload);

            if (validation.errors) {
                sendJson(request, response, 422, { errors: validation.errors });
                return;
            }

            const result = await createPostFile(validation.value, { contentDir });
            sendJson(request, response, 201, {
                filePath: path.relative(rootDir, result.filePath).replace(/\\/g, '/'),
                entrySlug: result.entrySlug,
                articleUrl: result.articleUrl,
            });
        } catch (error) {
            const { statusCode, payload } = createNewPostErrorResponse(error, logger);
            sendJson(request, response, statusCode, payload);
        }
    });
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
    const server = createNewPostServer();
    server.listen(port, '127.0.0.1', () => {
        console.log(`New post API server listening at http://127.0.0.1:${port}`);
    });
}
