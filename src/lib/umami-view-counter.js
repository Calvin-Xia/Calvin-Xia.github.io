export const VIEW_COUNTER_CACHE_CONTROL = 'public, max-age=300';

let cachedToken = null;

function jsonResponse(data, init = {}) {
    const headers = new Headers(init.headers || {});
    headers.set('Content-Type', 'application/json; charset=utf-8');
    headers.set('Cache-Control', VIEW_COUNTER_CACHE_CONTROL);

    return Response.json(data, {
        ...init,
        headers,
    });
}

function decodeSlug(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return '';
    }
}

export function isValidArticleSlug(value) {
    const slug = decodeSlug(String(value || '').trim());

    return Boolean(slug)
        && !slug.includes('..')
        && !slug.includes('/')
        && !slug.includes('\\');
}

function getSlugFromPath(pathname) {
    const prefix = '/api/views/';

    if (!pathname.startsWith(prefix)) {
        return null;
    }

    return pathname.slice(prefix.length);
}

export function normalizeArticlePath(slug) {
    const path = `/articles/${slug}`;
    return path.endsWith('/') ? path : `${path}/`;
}

export function getUmamiConfig(env = {}) {
    const host = String(env.UMAMI_HOST || '').trim().replace(/\/+$/, '');
    const websiteId = String(env.UMAMI_WEBSITE_ID || '').trim();
    const username = String(env.UMAMI_USERNAME || '').trim();
    const password = env.UMAMI_PASSWORD === undefined || env.UMAMI_PASSWORD === null
        ? ''
        : String(env.UMAMI_PASSWORD);

    return {
        host,
        websiteId,
        username,
        password,
        configured: Boolean(host && websiteId && username && password),
    };
}

export function clearUmamiTokenCache() {
    cachedToken = null;
}

export async function requestUmamiToken(env = {}, { forceRefresh = false, fetchImpl = globalThis.fetch } = {}) {
    if (!forceRefresh && cachedToken) {
        return cachedToken;
    }

    const config = getUmamiConfig(env);
    const response = await fetchImpl(`${config.host}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: config.username, password: config.password }),
    });

    if (!response.ok) {
        throw new Error(`umami login failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data?.token) {
        throw new Error('umami login response did not include a token');
    }

    cachedToken = data.token;
    return cachedToken;
}

export async function fetchArticleViews(env = {}, slug, fetchImpl = globalThis.fetch) {
    const config = getUmamiConfig(env);

    if (!config.configured) {
        return null;
    }

    const articlePath = normalizeArticlePath(slug);
    const statsUrl = `${config.host}/api/websites/${config.websiteId}/stats`
        + `?startAt=0&endAt=${Date.now()}&path=${encodeURIComponent(articlePath)}`;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const token = await requestUmamiToken(env, { forceRefresh: attempt > 0, fetchImpl });
        const response = await fetchImpl(statsUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if ((response.status === 401 || response.status === 403) && attempt === 0) {
            continue;
        }

        if (!response.ok) {
            throw new Error(`umami stats request failed with status ${response.status}`);
        }

        const data = await response.json();
        const views = Number(data?.pageviews);

        return Number.isFinite(views) && views >= 0 ? Math.round(views) : 0;
    }

    throw new Error('umami stats request unauthorized after token refresh');
}

export async function handleViewCounterRequest(request, env = {}) {
    const url = new URL(request.url);
    const rawSlug = getSlugFromPath(url.pathname);

    if (rawSlug === null) {
        return env?.ASSETS?.fetch
            ? env.ASSETS.fetch(request)
            : new Response('Not Found', { status: 404 });
    }

    if (!isValidArticleSlug(rawSlug)) {
        return jsonResponse({ error: 'invalid slug' }, { status: 400 });
    }

    const slug = decodeSlug(rawSlug);

    try {
        const views = await fetchArticleViews(env, slug);
        return jsonResponse({ slug, views });
    } catch (error) {
        console.warn('Unable to load article views:', error);
        return jsonResponse({ slug, views: null });
    }
}
