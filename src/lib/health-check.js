import { getUmamiConfig, requestUmamiToken } from './umami-view-counter.js';

export async function checkHealth(env = {}) {
    const timestamp = new Date().toISOString();
    const version = env.CF_VERSION_METADATA?.id ?? 'dev';
    const umami = getUmamiConfig(env);

    if (!umami.configured) {
        return {
            status: 'degraded',
            version,
            timestamp,
            dependencies: {
                analytics: { status: 'not_configured' },
            },
        };
    }

    try {
        await requestUmamiToken(env);

        return {
            status: 'healthy',
            version,
            timestamp,
            dependencies: {
                analytics: { status: 'healthy' },
            },
        };
    } catch (error) {
        console.warn('Umami health probe failed:', error?.message || error);

        return {
            status: 'degraded',
            version,
            timestamp,
            dependencies: {
                analytics: { status: 'unreachable' },
            },
        };
    }
}
