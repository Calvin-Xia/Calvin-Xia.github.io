const CACHE_NAME = 'tools-v1';
const TOOLS_PATH = '/works/tools/';
const TOOL_STATIC_URLS = [
    TOOLS_PATH,
    '/manifest.json',
    '/storage/icon.png',
    '/storage/icon.webp',
    '/storage/Beian.png',
    '/storage/Beian.webp',
    '/libs/mammoth/mammoth.browser.min.js',
];
const HTML_ASSET_PATTERN = /\b(?:href|src)="([^"]+)"/g;

function isCacheableToolAsset(assetUrl) {
    return (
        assetUrl.origin === self.location.origin &&
        (assetUrl.pathname.startsWith('/_astro/') ||
            assetUrl.pathname.startsWith('/storage/') ||
            assetUrl.pathname.startsWith('/libs/') ||
            assetUrl.pathname === '/manifest.json')
    );
}

function extractToolAssetUrls(html) {
    return Array.from(html.matchAll(HTML_ASSET_PATTERN), (match) => {
        try {
            return new URL(match[1], self.location.origin);
        } catch {
            return null;
        }
    })
        .filter(Boolean)
        .filter(isCacheableToolAsset)
        .map((assetUrl) => assetUrl.href);
}

async function putIfHealthy(cache, cacheKey, response) {
    if (response.ok) {
        await cache.put(cacheKey, response);
    }
}

async function cacheToolUrl(cache, url) {
    const response = await fetch(url, { cache: 'reload' });
    await putIfHealthy(cache, url, response);
}

async function cacheToolsShell() {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch(TOOLS_PATH, { cache: 'reload' });

    if (!shellResponse.ok) {
        return;
    }

    const shellHtml = await shellResponse.clone().text();
    await cache.put(TOOLS_PATH, shellResponse);

    const assetUrls = new Set([...TOOL_STATIC_URLS, ...extractToolAssetUrls(shellHtml)]);
    assetUrls.delete(TOOLS_PATH);

    await Promise.allSettled(Array.from(assetUrls, (assetUrl) => cacheToolUrl(cache, assetUrl)));
}

function isToolsPageRequest(requestUrl) {
    return requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith(TOOLS_PATH);
}

function isToolsAssetRequest(request, requestUrl) {
    if (requestUrl.origin !== self.location.origin || !request.referrer) {
        return false;
    }

    const referrerUrl = new URL(request.referrer);
    return referrerUrl.origin === self.location.origin && referrerUrl.pathname.startsWith(TOOLS_PATH);
}

function shouldHandleRequest(request) {
    if (request.method !== 'GET') {
        return false;
    }

    const requestUrl = new URL(request.url);
    return isToolsPageRequest(requestUrl) || isToolsAssetRequest(request, requestUrl);
}

self.addEventListener('fetch', (event) => {
    if (!shouldHandleRequest(event.request)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => caches.match(event.request)),
    );
});

self.addEventListener('install', (event) => {
    event.waitUntil(
        cacheToolsShell()
            .catch(() => undefined)
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name)),
                );
            })
            .then(() => self.clients.claim()),
    );
});
