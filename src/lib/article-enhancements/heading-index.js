import { t } from '../i18n.ts';

const HEADING_SELECTOR = 'h2,h3,h4';
const HEADING_ANCHOR_CLASS = 'heading-anchor';

function normalizeHeadingText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function textWithoutAnchor(heading) {
    if (heading.dataset?.headingText) {
        return heading.dataset.headingText;
    }

    if (heading.childNodes) {
        return Array.from(heading.childNodes)
            .filter((node) => !node.classList?.contains?.(HEADING_ANCHOR_CLASS))
            .map((node) => node.textContent || '')
            .join('');
    }

    return String(heading.textContent || '').replace(/\s+#\s*$/, '');
}

function claimUniqueId(baseId, usedIds) {
    const base = baseId || 'section';
    let id = base;
    let suffix = 2;

    while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix += 1;
    }

    usedIds.add(id);
    return id;
}

export function createHeadingId(text, usedIds = new Set()) {
    const baseId = normalizeHeadingText(text)
        .normalize('NFKD')
        .replace(/\p{Mark}+/gu, '')
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-+|-+$/g, '');

    return claimUniqueId(baseId || 'section', usedIds);
}

function getHeadingLevel(heading) {
    return Number.parseInt(String(heading.tagName || '').replace(/^H/i, ''), 10);
}

function appendHeadingAnchor(heading, documentRef, text) {
    if (heading.querySelector?.(`.${HEADING_ANCHOR_CLASS}`)) {
        return;
    }

    const anchor = documentRef.createElement('a');
    anchor.classList.add(HEADING_ANCHOR_CLASS);
    anchor.setAttribute('href', `#${heading.id}`);
    anchor.setAttribute('aria-label', t('articleEnhancements.headingAnchorAria', { text }));
    anchor.setAttribute('title', t('articleEnhancements.headingAnchorTitle'));
    anchor.textContent = '#';
    heading.appendChild(anchor);
}

export function addTocAccessibility(tocList) {
    if (!tocList?.querySelectorAll) {
        return;
    }

    tocList.setAttribute?.('role', 'list');
    tocList.setAttribute?.('aria-label', t('toc.aria'));
    tocList.querySelectorAll('a').forEach((link) => {
        link.setAttribute?.('role', 'link');
        link.setAttribute?.('tabindex', '0');
    });
}

export function bindTocKeyboardEvents(tocList, documentRef = tocList?.ownerDocument || globalThis.document) {
    if (!tocList?.querySelectorAll || !tocList?.addEventListener || tocList.dataset?.tocKeyboardBound === 'true') {
        return;
    }

    if (tocList.dataset) {
        tocList.dataset.tocKeyboardBound = 'true';
    }

    tocList.addEventListener('keydown', (event) => {
        const links = Array.from(tocList.querySelectorAll('a'));
        if (!links.length) {
            return;
        }

        const activeElement = documentRef?.activeElement;
        const currentIndex = Math.max(0, links.indexOf(activeElement));

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            links[(currentIndex + 1) % links.length].focus();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            links[(currentIndex - 1 + links.length) % links.length].focus();
            return;
        }

        if (event.key === 'Enter' && links.includes(activeElement)) {
            event.preventDefault();
            activeElement.click?.();
        }
    });
}

export function buildHeadingIndex(root, documentRef = document) {
    if (!root?.querySelectorAll) {
        return [];
    }

    const usedIds = new Set();

    return Array.from(root.querySelectorAll(HEADING_SELECTOR)).map((heading) => {
        const text = normalizeHeadingText(textWithoutAnchor(heading));
        const existingId = normalizeHeadingText(heading.id || heading.getAttribute?.('id'));
        const id = existingId ? claimUniqueId(existingId, usedIds) : createHeadingId(text, usedIds);
        const level = getHeadingLevel(heading);

        heading.id = id;
        heading.setAttribute?.('id', id);
        heading.dataset.headingText = text;
        heading.dataset.headingIndexed = 'true';
        heading.classList?.add('markdown-heading');
        appendHeadingAnchor(heading, documentRef, text);

        return {
            id,
            level,
            text,
            element: heading,
        };
    });
}
