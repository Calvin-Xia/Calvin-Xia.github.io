export async function checkHealth(options = {}) {
    const { analyticsEngine, version = '0.0.1' } = options;
    const timestamp = new Date().toISOString();

    if (!analyticsEngine || typeof analyticsEngine.writeDataPoint !== 'function') {
        return {
            status: 'degraded',
            version,
            timestamp,
            dependencies: {
                analytics: { status: 'not_configured' },
            },
        };
    }

    return {
        status: 'healthy',
        version,
        timestamp,
        dependencies: {
            analytics: { status: 'healthy' },
        },
    };
}
