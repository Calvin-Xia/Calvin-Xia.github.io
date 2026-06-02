import { checkHealth } from './lib/health-check.js';
import { SecurityLogger } from './lib/security-logger.js';
import { handleViewCounterRequest } from './lib/umami-view-counter.js';

interface Env {
    UMAMI_API_KEY?: string;
    HEALTH_CHECK_TOKEN?: string;
    WORKER_VERSION?: string;
    ASSETS?: {
        fetch(request: Request): Response | Promise<Response>;
    };
}

interface SecurityLogEntry {
    timestamp: string;
    path: string;
    status: number;
    method: string;
    isError: boolean;
}

interface SecurityAlert {
    errorRate: number;
    threshold: number;
    totalRequests: number;
    errorRequests: number;
}

const API_STATS_INTERVAL = 100;
const securityLogger = new SecurityLogger({ alertThreshold: 0.1, maxSize: 1000 });
let apiCallCounter = 0;

securityLogger.onAlert((alert: SecurityAlert) => {
    console.warn('Security Alert:', JSON.stringify(alert));
});

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

function logApiCallStats(url: URL): void {
    if (!url.pathname.startsWith('/api/')) {
        return;
    }

    apiCallCounter += 1;

    if (apiCallCounter > 0 && apiCallCounter % API_STATS_INTERVAL === 0) {
        console.log('API Call Stats:', JSON.stringify({
            totalCalls: apiCallCounter,
            errorRate: securityLogger.getErrorRate(),
            timestamp: new Date().toISOString(),
        }));
    }
}

function logSecurityRequest(request: Request, url: URL, response: Response): void {
    if (!url.pathname.startsWith('/api/')) {
        return;
    }

    const entry = securityLogger.logRequest({
        path: url.pathname,
        status: response.status,
        method: request.method,
    }) as SecurityLogEntry;

    if (entry.isError) {
        console.warn('Security Request Error:', JSON.stringify({
            timestamp: entry.timestamp,
            path: entry.path,
            status: entry.status,
            method: entry.method,
        }));
    }

    logApiCallStats(url);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        let response: Response;

        if (url.pathname === '/api/health') {
            response = await handleHealthRequest(request, env);
        } else {
            response = await handleViewCounterRequest(request, env);
        }

        logSecurityRequest(request, url, response);
        return response;
    },
};
