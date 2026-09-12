// Worker-side trending articles: proxy the self-hosted Umami metrics API and
// cache the aggregated top-article list at the edge. Degrades to an empty
// list on any failure so the homepage card can hide itself.
import { getUmamiConfig, requestUmamiToken } from './umami-view-counter.js';

export const TRENDING_CACHE_CONTROL = 'public, max-age=600';
const ARTICLE_PATH_PATTERN = /^\/articles\/(\d{8}[^/]*)\/?$/;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export function parseTrendingLimit(url) {
    const raw = Number(new URL(url).searchParams.get('limit'));
    if (!Number.isFinite(raw) || raw < 1) {
        return DEFAULT_LIMIT;
    }
    return Math.min(MAX_LIMIT, Math.round(raw));
}

export async function fetchTrendingArticles(env = {}, {
    limit = DEFAULT_LIMIT,
    rangeDays = 30,
    fetchImpl = globalThis.fetch,
} = {}) {
    const config = getUmamiConfig(env);

    if (!config.configured) {
        return [];
    }

    const endAt = Date.now();
    const startAt = endAt - rangeDays * 86400000;
    const metricsUrl = `${config.host}/api/websites/${config.websiteId}/metrics`
        + `?type=url&startAt=${startAt}&endAt=${endAt}&limit=${Math.max(50, limit * 4)}`;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const token = await requestUmamiToken(env, { forceRefresh: attempt > 0, fetchImpl });
        const response = await fetchImpl(metricsUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if ((response.status === 401 || response.status === 403) && attempt === 0) {
            continue;
        }

        if (!response.ok) {
            throw new Error(`umami trending request failed with status ${response.status}`);
        }

        const data = await response.json();
        const rows = Array.isArray(data) ? data : [];

        return rows
            .map((row) => {
                let path = String(row?.x || '');
                try {
                    path = decodeURIComponent(path);
                } catch {}
                return { path, views: Number(row?.y) };
            })
            .map(({ path, views }) => {
                const match = path.match(ARTICLE_PATH_PATTERN);
                return match ? { slug: match[1], views } : null;
            })
            .filter((entry) => entry && Number.isFinite(entry.views) && entry.views > 0)
            .sort((left, right) => right.views - left.views)
            .slice(0, limit);
    }

    throw new Error('umami trending unauthorized after token refresh');
}

export async function handleTrendingRequest(request, env = {}, {
    cacheTtlSeconds = 600,
    fetchImpl = globalThis.fetch,
    cachesImpl = globalThis.caches,
} = {}) {
    const url = new URL(request.url);
    const limit = parseTrendingLimit(url);
    const cacheKey = new Request(new URL(`/api/trending?limit=${limit}`, url.origin).toString());

    try {
        if (cachesImpl?.default) {
            const cached = await cachesImpl.default.match(cacheKey);
            if (cached) {
                return cached;
            }
        }

        const trending = await fetchTrendingArticles(env, { limit, fetchImpl });
        const response = Response.json({ trending }, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': TRENDING_CACHE_CONTROL,
            },
        });

        if (cachesImpl?.default && trending.length > 0) {
            await cachesImpl.default.put(cacheKey, response.clone());
        }

        return response;
    } catch (error) {
        console.warn('Unable to load trending articles:', error);
        return Response.json({ trending: [] }, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    }
}
