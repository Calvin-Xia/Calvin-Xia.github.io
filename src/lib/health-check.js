const DEFAULT_UMAMI_URL = 'https://api.umami.is';
const DEFAULT_TIMEOUT_MS = 5000;
const WORKER_STARTED_AT = Date.now();

function getNow(options) {
    return typeof options.now === 'function' ? options.now() : Date.now();
}

function getUmamiWebsitesUrl(umamiUrl) {
    return new URL('/v1/websites', umamiUrl || DEFAULT_UMAMI_URL).toString();
}

function getTimeoutSignal(timeoutMs) {
    return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(timeoutMs)
        : undefined;
}

async function checkUmami(options) {
    const { umamiApiKey, fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const startedAt = getNow(options);

    if (!umamiApiKey) {
        return {
            status: 'degraded',
            latency: 0,
        };
    }

    try {
        const response = await fetchFn(getUmamiWebsitesUrl(options.umamiUrl), {
            headers: {
                'x-umami-api-key': umamiApiKey,
            },
            signal: getTimeoutSignal(timeoutMs),
        });
        const latency = Math.max(0, getNow(options) - startedAt);

        return {
            status: response.ok ? 'healthy' : 'degraded',
            latency,
        };
    } catch {
        return {
            status: 'degraded',
            latency: Math.max(0, getNow(options) - startedAt),
        };
    }
}

export async function checkHealth(options = {}) {
    const timestampMs = getNow(options);
    const startedAt = options.startedAt ?? WORKER_STARTED_AT;
    const umami = await checkUmami(options);

    return {
        status: umami.status === 'healthy' ? 'healthy' : 'degraded',
        version: options.version || '0.0.1',
        uptime: Math.max(0, timestampMs - startedAt),
        timestamp: new Date(timestampMs).toISOString(),
        dependencies: {
            umami,
        },
    };
}
