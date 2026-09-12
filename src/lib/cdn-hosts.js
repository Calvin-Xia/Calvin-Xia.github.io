// Single source of truth for the public CDN hosts serving article assets.
// image-lightbox trusts them for zoom; local-cdn-proxy routes dev requests.
export const trustedImageHosts = new Set([
    'assets.calvin-xia.cn',
    'content.calvin-xia.cn',
]);

export const cdnProxyPaths = new Map([
    ['content.calvin-xia.cn', '/__cdn/content'],
    ['assets.calvin-xia.cn', '/__cdn/assets'],
]);
