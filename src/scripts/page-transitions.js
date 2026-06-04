const ARTICLE_TRANSITION_PATHS = ['/articles/', '/updates/'];
const SWAP_FADE_CLASS = 'is-swap-fade-in';
const DEFAULT_SWAP_FADE_DURATION_MS = 260;
const ARTICLE_LIST_SCROLL_KEY = 'article-list-scroll-y';

function normalizePathname(pathname) {
    const value = String(pathname || '/');
    return value.endsWith('/') ? value : `${value}/`;
}

function isHashOnlyUrl(url, locationRef) {
    return url.pathname === locationRef.pathname && url.search === locationRef.search && Boolean(url.hash);
}

function isAllowedArticleTransitionPath(pathname) {
    const normalizedPathname = normalizePathname(pathname);
    return ARTICLE_TRANSITION_PATHS.some((prefix) => normalizedPathname === prefix || normalizedPathname.startsWith(prefix));
}

function isArticleListPath(pathname) {
    return normalizePathname(pathname) === '/articles/';
}

function isArticleDetailPath(pathname) {
    const normalizedPathname = normalizePathname(pathname);
    return normalizedPathname.startsWith('/articles/')
        && normalizedPathname !== '/articles/'
        && normalizedPathname !== '/articles/archive/';
}

export function getArticleTransitionDirection(fromPathname, toPathname, fallbackDirection = 'forward') {
    if (isArticleListPath(fromPathname) && isArticleDetailPath(toPathname)) {
        return 'forward';
    }

    if (isArticleDetailPath(fromPathname) && isArticleListPath(toPathname)) {
        return 'back';
    }

    return fallbackDirection === 'back' ? 'back' : 'forward';
}

function getDocumentForRoot(root, windowRef) {
    return root?.ownerDocument || windowRef.document || document;
}

function prefersReducedMotion(windowRef) {
    return windowRef.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function parseCssDurationMs(value) {
    const duration = String(value || '').trim();
    const match = duration.match(/^([\d.]+)(ms|s)$/);

    if (!match) {
        return DEFAULT_SWAP_FADE_DURATION_MS;
    }

    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) {
        return DEFAULT_SWAP_FADE_DURATION_MS;
    }

    return match[2] === 's' ? amount * 1000 : amount;
}

export function getSwapFadeDurationMs(documentRef = document, windowRef = window) {
    if (!windowRef.getComputedStyle || !documentRef.documentElement) {
        return DEFAULT_SWAP_FADE_DURATION_MS;
    }

    const cssDuration = windowRef.getComputedStyle(documentRef.documentElement)
        .getPropertyValue('--swap-fade-duration');

    return parseCssDurationMs(cssDuration);
}

export function shouldUseClientRouter(anchor, locationRef = window.location) {
    if (!anchor || anchor.hasAttribute('download') || anchor.target) {
        return false;
    }

    const href = anchor.getAttribute('href') || '';
    if (/^(mailto|tel|javascript):/i.test(href)) {
        return false;
    }

    const url = new URL(href, locationRef.href);
    if (url.origin !== locationRef.origin || isHashOnlyUrl(url, locationRef)) {
        return false;
    }

    return true;
}

export function markTransitionLinks(root = document, locationRef = window.location) {
    root.querySelectorAll?.('a[href]').forEach((anchor) => {
        if (shouldUseClientRouter(anchor, locationRef)) {
            anchor.removeAttribute('data-astro-reload');
            const url = new URL(anchor.getAttribute('href') || '', locationRef.href);
            if (isAllowedArticleTransitionPath(url.pathname)) {
                anchor.setAttribute('data-article-transition', 'true');
            }
        }
    });
}

const swapFallbackDocuments = new WeakSet();
const navigationStateDocuments = new WeakSet();
const swapFadeTimers = new WeakMap();

export function shouldApplySwapFadeFallback(documentRef = document, windowRef = window) {
    return typeof documentRef.startViewTransition !== 'function' && !prefersReducedMotion(windowRef);
}

export function applySwapFadeFallback(documentRef = document, windowRef = window) {
    if (!shouldApplySwapFadeFallback(documentRef, windowRef)) {
        return false;
    }

    const main = documentRef.querySelector?.('.site-main');
    if (!main?.classList) {
        return false;
    }

    const existingTimer = swapFadeTimers.get(main);
    if (existingTimer) {
        windowRef.clearTimeout?.(existingTimer);
    }

    main.classList.remove(SWAP_FADE_CLASS);
    // Force a style recalculation so re-adding the class restarts the animation.
    void main.offsetWidth;
    main.classList.add(SWAP_FADE_CLASS);

    const timer = (windowRef.setTimeout || setTimeout)(() => {
        main.classList.remove(SWAP_FADE_CLASS);
        swapFadeTimers.delete(main);
    }, getSwapFadeDurationMs(documentRef, windowRef));

    swapFadeTimers.set(main, timer);
    return true;
}

export function initSwapFadeFallback(documentRef = document, windowRef = window) {
    if (swapFallbackDocuments.has(documentRef)) {
        return;
    }

    swapFallbackDocuments.add(documentRef);
    if (!documentRef.addEventListener) {
        return;
    }

    documentRef.addEventListener('astro:page-load', () => {
        applySwapFadeFallback(documentRef, windowRef);
    });
}

export function saveArticleListScrollPosition(windowRef = window) {
    if (!isArticleListPath(windowRef.location?.pathname)) {
        return false;
    }

    try {
        windowRef.sessionStorage?.setItem(ARTICLE_LIST_SCROLL_KEY, String(Math.max(0, windowRef.scrollY || 0)));
        return true;
    } catch {
        return false;
    }
}

export function restoreArticleListScrollPosition(windowRef = window) {
    if (!isArticleListPath(windowRef.location?.pathname)) {
        return false;
    }

    let storedScrollY = null;

    try {
        storedScrollY = windowRef.sessionStorage?.getItem(ARTICLE_LIST_SCROLL_KEY) ?? null;
    } catch {
        return false;
    }

    if (storedScrollY === null) {
        return false;
    }

    const scrollY = Number.parseInt(storedScrollY, 10);
    if (!Number.isFinite(scrollY)) {
        return false;
    }

    const restore = () => {
        windowRef.scrollTo?.({ left: 0, top: scrollY, behavior: 'instant' });
    };

    if (windowRef.requestAnimationFrame) {
        windowRef.requestAnimationFrame(restore);
    } else {
        restore();
    }

    return true;
}

export function initArticleNavigationState(documentRef = document, windowRef = window) {
    if (navigationStateDocuments.has(documentRef) || !documentRef.addEventListener) {
        return;
    }

    navigationStateDocuments.add(documentRef);
    documentRef.addEventListener('astro:before-preparation', (event) => {
        const fromPathname = event.from?.pathname || windowRef.location?.pathname;
        const toPathname = event.to?.pathname || windowRef.location?.pathname;

        if (isArticleListPath(fromPathname)) {
            saveArticleListScrollPosition(windowRef);
        }

        if (isAllowedArticleTransitionPath(fromPathname) && isAllowedArticleTransitionPath(toPathname)) {
            // Astro documents direction as writable during astro:before-preparation for custom animations.
            event.direction = getArticleTransitionDirection(fromPathname, toPathname, event.direction);
        }
    });

    documentRef.addEventListener('astro:after-swap', () => {
        restoreArticleListScrollPosition(windowRef);
    });
}

export function initPageTransitions(root = document, windowRef = window) {
    markTransitionLinks(root, windowRef.location);
    const documentRef = getDocumentForRoot(root, windowRef);
    initSwapFadeFallback(documentRef, windowRef);
    initArticleNavigationState(documentRef, windowRef);
}

// Backward compatibility aliases
export { markTransitionLinks as markArticleTransitionLinks };
export { initPageTransitions as initArticleTransitions };
