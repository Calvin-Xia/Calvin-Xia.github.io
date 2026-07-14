export const VIEW_COUNTER_CACHE_CONTROL = 'public, max-age=300';
export const DATASET_NAME = 'article-views';

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

export function recordPageView(env, slug) {
    if (!env?.ARTICLE_VIEWS) {
        return;
    }

    const articlePath = normalizeArticlePath(slug);

    env.ARTICLE_VIEWS.writeDataPoint({
        blobs: [articlePath, slug],
        doubles: [1],
        indexes: [articlePath],
    });
}

export async function getArticleViews(env, slug) {
    if (!env?.ARTICLE_VIEWS) {
        return null;
    }

    const articlePath = normalizeArticlePath(slug);

    try {
        const result = await env.ARTICLE_VIEWS.query(
            `SELECT SUM(double1) AS total_views FROM ${DATASET_NAME} WHERE blob1 = ?`,
            [articlePath]
        );

        if (result?.rows?.[0]?.total_views !== undefined) {
            return Number(result.rows[0].total_views) || 0;
        }

        return 0;
    } catch (error) {
        console.error('Analytics Engine query error:', error);
        return null;
    }
}

export async function handleViewCounterRequest(request, env = {}, options = {}) {
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
        const views = await getArticleViews(env, slug);
        return jsonResponse({ slug, views });
    } catch (error) {
        console.warn('Unable to load article views:', error);
        return jsonResponse({ slug, views: null });
    }
}
