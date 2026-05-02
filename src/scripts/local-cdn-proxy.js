const CDN_IMAGE_SELECTOR = [
    'img[src^="https://content.calvin-xia.cn/"]',
    'img[src^="https://assets.calvin-xia.cn/"]',
].join(', ');

const CDN_PROXY_HOSTS = new Map([
    ['content.calvin-xia.cn', '/__cdn/content'],
    ['assets.calvin-xia.cn', '/__cdn/assets'],
]);

function proxyCdnUrl(value) {
    try {
        const url = new URL(value);
        const proxyPrefix = CDN_PROXY_HOSTS.get(url.hostname);
        return proxyPrefix ? proxyPrefix + url.pathname + url.search : value;
    } catch {
        return value;
    }
}

function proxyImage(image) {
    if (image.dataset.cdnProxied === 'true') {
        return;
    }

    const currentSource = image.getAttribute('src') || '';
    const proxiedSource = proxyCdnUrl(currentSource);
    if (proxiedSource !== currentSource) {
        image.dataset.cdnOriginalSrc = currentSource;
        image.dataset.cdnProxied = 'true';
        image.setAttribute('src', proxiedSource);
    }
}

function proxyImages(images = document.querySelectorAll(CDN_IMAGE_SELECTOR)) {
    images.forEach(proxyImage);
}

function initLocalCdnProxy() {
    const images = document.querySelectorAll(CDN_IMAGE_SELECTOR);
    if (images.length === 0) {
        return;
    }

    proxyImages(images);
    new MutationObserver(() => proxyImages()).observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLocalCdnProxy, { once: true });
} else {
    initLocalCdnProxy();
}
