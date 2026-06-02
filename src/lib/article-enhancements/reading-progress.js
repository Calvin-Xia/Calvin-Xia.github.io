import { addTocAccessibility, bindTocKeyboardEvents } from './heading-index.js';

const MOBILE_TOC_BREAKPOINT = 768;
const MIN_TOC_HEADINGS = 3;
const TOC_ACTIVE_SCROLL_PADDING = 12;
const tocCleanupCallbacks = new WeakMap();

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function calculateReadingProgress({ scrollY, articleTop, articleHeight, viewportHeight }) {
    const scrollRange = Math.max(1, articleHeight - viewportHeight);
    const progress = ((scrollY - articleTop) / scrollRange) * 100;
    return Math.round(clamp(progress, 0, 100));
}

export function shouldRenderToc(entries, minHeadings = MIN_TOC_HEADINGS) {
    return Array.isArray(entries) && entries.length >= minHeadings;
}

export function shouldCollapseTocForViewport(width, breakpoint = MOBILE_TOC_BREAKPOINT) {
    return Number(width) <= breakpoint;
}

export function createTocItems(entries) {
    return entries.map((entry) => ({
        href: `#${entry.id}`,
        id: entry.id,
        level: entry.level,
        text: entry.text,
    }));
}

export function calculateTocAutoScrollTop({
    currentScrollTop,
    maxScrollTop,
    containerTop,
    containerBottom,
    linkTop,
    linkBottom,
    padding = TOC_ACTIVE_SCROLL_PADDING,
}) {
    let nextScrollTop = Number(currentScrollTop) || 0;

    if (linkTop < containerTop + padding) {
        nextScrollTop -= containerTop + padding - linkTop;
    } else if (linkBottom > containerBottom - padding) {
        nextScrollTop += linkBottom - (containerBottom - padding);
    }

    return clamp(nextScrollTop, 0, Math.max(0, maxScrollTop));
}

function setProgress(tocRoot, progress) {
    tocRoot.querySelector?.('[data-reading-progress-bar]')?.style?.setProperty('transform', `scaleX(${progress / 100})`);

    const progressText = tocRoot.querySelector?.('[data-reading-progress-text]');
    if (progressText) {
        progressText.textContent = `${progress}%`;
    }
}

function keepActiveTocLinkVisible(tocRoot, activeLink) {
    const scrollContainer = tocRoot.querySelector?.('.article-toc > nav');
    if (!scrollContainer || !activeLink) {
        return;
    }

    const containerRect = scrollContainer.getBoundingClientRect?.();
    const linkRect = activeLink.getBoundingClientRect?.();
    if (!containerRect || !linkRect) {
        return;
    }

    const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    const nextScrollTop = calculateTocAutoScrollTop({
        currentScrollTop: scrollContainer.scrollTop,
        maxScrollTop,
        containerTop: containerRect.top,
        containerBottom: containerRect.bottom,
        linkTop: linkRect.top,
        linkBottom: linkRect.bottom,
    });

    if (Math.abs(nextScrollTop - scrollContainer.scrollTop) >= 1) {
        scrollContainer.scrollTop = nextScrollTop;
    }
}

function setActiveTocItem(tocRoot, activeId) {
    let activeLink = null;

    tocRoot.querySelectorAll?.('[data-toc-link]').forEach((link) => {
        const isActive = link.getAttribute('href') === `#${activeId}`;
        link.classList.toggle('is-active', isActive);
        link.setAttribute('aria-current', isActive ? 'location' : 'false');

        if (isActive) {
            activeLink = link;
        }
    });

    keepActiveTocLinkVisible(tocRoot, activeLink);
}

function setTocToggleExpanded(documentRef, tocRoot, expanded) {
    const toggle = documentRef.querySelector?.('[data-article-toc-toggle]');
    if (!toggle || toggle.getAttribute('aria-controls') !== tocRoot.id) {
        return;
    }

    toggle.setAttribute('aria-expanded', String(expanded));
}

function clearTocList(list) {
    while (list.firstChild) {
        list.firstChild.remove();
    }
}

function renderTocList(tocRoot, entries, documentRef) {
    const list = tocRoot.querySelector?.('[data-article-toc-list]');
    if (!list) {
        return;
    }

    clearTocList(list);

    createTocItems(entries).forEach((item) => {
        const listItem = documentRef.createElement('li');
        const link = documentRef.createElement('a');

        listItem.classList.add('article-toc__item', `article-toc__item--h${item.level}`);
        link.classList.add('article-toc__link');
        link.setAttribute('href', item.href);
        link.setAttribute('data-toc-link', '');
        link.textContent = item.text;
        listItem.appendChild(link);
        list.appendChild(listItem);
    });

    addTocAccessibility(list);
    bindTocKeyboardEvents(list, documentRef);
}

function findCurrentHeadingId(headings) {
    let current = headings[0]?.id || '';

    headings.forEach((entry) => {
        const rect = entry.element?.getBoundingClientRect?.();
        if (rect && rect.top <= 150) {
            current = entry.id;
        }
    });

    return current;
}

export function selectVisibleHeadingId(entries, headingOrder = new Map()) {
    const visible = Array.from(entries || [])
        .filter((entry) => entry?.isIntersecting && entry.target?.id)
        .sort((left, right) => {
            const topDelta = (left.boundingClientRect?.top ?? Number.POSITIVE_INFINITY)
                - (right.boundingClientRect?.top ?? Number.POSITIVE_INFINITY);

            if (topDelta !== 0) {
                return topDelta;
            }

            const ratioDelta = (right.intersectionRatio || 0) - (left.intersectionRatio || 0);

            if (ratioDelta !== 0) {
                return ratioDelta;
            }

            return (headingOrder.get(left.target.id) ?? Number.MAX_SAFE_INTEGER)
                - (headingOrder.get(right.target.id) ?? Number.MAX_SAFE_INTEGER);
        });

    return visible[0]?.target?.id || '';
}

function metricsForContent(contentRoot, windowRef) {
    const rect = contentRoot.getBoundingClientRect();

    return {
        articleTop: rect.top + windowRef.scrollY,
        articleHeight: Math.max(rect.height, contentRoot.scrollHeight || 0),
        viewportHeight: windowRef.innerHeight,
        scrollY: windowRef.scrollY,
    };
}

export function initReadingProgress({
    tocRoot,
    contentRoot,
    headings,
    documentRef = document,
    windowRef = window,
}) {
    if (tocRoot) {
        tocCleanupCallbacks.get(tocRoot)?.();
        tocCleanupCallbacks.delete(tocRoot);
    }

    if (!tocRoot || !contentRoot || !shouldRenderToc(headings)) {
        if (tocRoot) {
            tocRoot.hidden = true;
        }
        return () => {};
    }

    tocRoot.hidden = false;
    renderTocList(tocRoot, headings, documentRef);

    const details = tocRoot.querySelector?.('.article-toc');
    const syncTocDisclosure = () => {
        const shouldCollapse = shouldCollapseTocForViewport(windowRef.innerWidth);
        details?.setAttribute?.('open', '');
        tocRoot.classList?.toggle?.('is-collapsed', shouldCollapse);
        setTocToggleExpanded(documentRef, tocRoot, !shouldCollapse);
    };
    syncTocDisclosure();

    const update = () => {
        const progress = calculateReadingProgress(metricsForContent(contentRoot, windowRef));
        setProgress(tocRoot, progress);
        setActiveTocItem(tocRoot, findCurrentHeadingId(headings));
    };

    let observer;
    if ('IntersectionObserver' in windowRef) {
        const headingOrder = new Map(headings.map((entry, index) => [entry.id, index]));
        observer = new windowRef.IntersectionObserver(
            (entries) => {
                const activeId = selectVisibleHeadingId(entries, headingOrder);

                if (activeId) {
                    setActiveTocItem(tocRoot, activeId);
                }
            },
            { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] },
        );
        headings.forEach((entry) => observer.observe(entry.element));
    }

    const handleResize = () => {
        syncTocDisclosure();
        update();
    };

    windowRef.addEventListener('scroll', update, { passive: true });
    windowRef.addEventListener('resize', handleResize);
    tocRoot.querySelectorAll?.('[data-toc-link]').forEach((link) => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('href')?.slice(1);
            if (targetId) {
                windowRef.history?.replaceState?.(null, '', `#${targetId}`);
            }

            if (shouldCollapseTocForViewport(windowRef.innerWidth)) {
                tocRoot.classList?.add?.('is-collapsed');
                setTocToggleExpanded(documentRef, tocRoot, false);
            }
        });
    });

    update();

    const cleanup = () => {
        observer?.disconnect?.();
        windowRef.removeEventListener('scroll', update);
        windowRef.removeEventListener('resize', handleResize);
        tocCleanupCallbacks.delete(tocRoot);
    };

    tocCleanupCallbacks.set(tocRoot, cleanup);
    return cleanup;
}
