import { checkHealth } from './lib/health-check.js';
import { handleViewCounterRequest } from './lib/umami-view-counter.js';

interface Env {
    UMAMI_API_KEY?: string;
    HEALTH_CHECK_TOKEN?: string;
    WORKER_VERSION?: string;
    ASSETS?: {
        fetch(request: Request): Response | Promise<Response>;
    };
}

function createJsonResponse(data: unknown, init: ResponseInit = {}): Response {
    const headers = new Headers(init.headers || {});
    headers.set('Content-Type', 'application/json; charset=utf-8');

    return Response.json(data, {
        ...init,
        headers,
    });
}

function getCacheControl(url: URL): string {
    const cacheSeconds = Number(url.searchParams.get('cache') || '0');

    if (Number.isInteger(cacheSeconds) && cacheSeconds > 0) {
        return `public, max-age=${cacheSeconds}`;
    }

    return 'no-store';
}

function getBearerToken(request: Request): string {
    const authorization = request.headers.get('Authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || '';
}

async function handleHealthRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const headers = new Headers({
        'Cache-Control': getCacheControl(url),
    });
    const bearerToken = getBearerToken(request);

    if (bearerToken && bearerToken !== env.HEALTH_CHECK_TOKEN) {
        return createJsonResponse({ error: 'unauthorized' }, { status: 401, headers });
    }

    try {
        const health = await checkHealth({
            umamiUrl: 'https://api.umami.is',
            umamiApiKey: env.UMAMI_API_KEY,
            version: env.WORKER_VERSION || '0.0.1',
            fetchFn: fetch,
        });

        if (!bearerToken) {
            return createJsonResponse({
                status: health.status,
                timestamp: health.timestamp,
            }, { status: 200, headers });
        }

        return createJsonResponse(health, { status: 200, headers });
    } catch {
        return createJsonResponse({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
        }, { status: 503, headers });
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === '/api/health') {
            return handleHealthRequest(request, env);
        }

        return handleViewCounterRequest(request, env);
    },
};
