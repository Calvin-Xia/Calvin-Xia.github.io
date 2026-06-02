import { t } from '../i18n.ts';

const TOOLBAR_OFFSET = 10;
const VIEWPORT_PADDING = 8;
const toolbarCleanups = new WeakMap();

function elementFromNode(node) {
    if (!node) {
        return null;
    }

    return node.nodeType === 1 ? node : node.parentElement;
}

function selectionBelongsToContainer(selection, container) {
    const anchor = elementFromNode(selection?.anchorNode);
    const focus = elementFromNode(selection?.focusNode);

    return Boolean(anchor && container.contains(anchor) && (!focus || container.contains(focus)));
}

function selectedText(selection) {
    return selection?.toString?.().trim() || '';
}

function createToolbarButton(documentRef, action, key) {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = 'selection-toolbar-btn';
    button.dataset.action = action;
    button.dataset.i18n = key;
    button.textContent = t(key);
    return button;
}

function createToolbarElement(documentRef) {
    const toolbar = documentRef.createElement('div');
    toolbar.className = 'selection-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', t('articleEnhancements.selectionToolbarAria'));
    toolbar.setAttribute('data-i18n-aria-label', 'articleEnhancements.selectionToolbarAria');
    toolbar.append(
        createToolbarButton(documentRef, 'copy', 'articleEnhancements.selectionCopy'),
        createToolbarButton(documentRef, 'share', 'articleEnhancements.selectionShare'),
    );
    return toolbar;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function positionToolbar(toolbar, rect, windowRef) {
    const toolbarWidth = toolbar.offsetWidth || 132;
    const left = clamp(
        rect.left + (rect.width / 2),
        VIEWPORT_PADDING + (toolbarWidth / 2),
        Math.max(VIEWPORT_PADDING + (toolbarWidth / 2), windowRef.innerWidth - VIEWPORT_PADDING - (toolbarWidth / 2)),
    );
    const top = rect.top - toolbar.offsetHeight - TOOLBAR_OFFSET;

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top >= VIEWPORT_PADDING ? top : rect.bottom + TOOLBAR_OFFSET}px`;
}

function showToolbar(toolbar, selection, windowRef, state) {
    if (!selection?.rangeCount) {
        hideToolbar(toolbar);
        return;
    }

    const text = selectedText(selection);
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!text || !rect || (!rect.width && !rect.height)) {
        hideToolbar(toolbar);
        return;
    }

    state.selectedText = text;
    state.anchorNode = selection.anchorNode;
    positionToolbar(toolbar, rect, windowRef);
    toolbar.classList.add('is-visible');
}

function hideToolbar(toolbar) {
    toolbar.classList.remove('is-visible');
}

async function writeClipboard(text, windowRef) {
    try {
        if (windowRef.navigator?.clipboard?.writeText) {
            await windowRef.navigator.clipboard.writeText(text);
            return true;
        }
    } catch {}

    return false;
}

function showFeedback(documentRef, message) {
    documentRef.querySelector?.('[data-selection-toolbar-feedback]')?.remove?.();

    const feedback = documentRef.createElement('div');
    feedback.className = 'selection-toolbar-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.setAttribute('data-selection-toolbar-feedback', '');
    feedback.textContent = message;
    documentRef.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 2000);
}

function findLastHeading(element) {
    if (element.matches?.('h1,h2,h3,h4,h5,h6')) {
        return element;
    }

    const headings = element.querySelectorAll?.('h1,h2,h3,h4,h5,h6');
    return headings?.[headings.length - 1] || null;
}

export function findNearestHeading(node, container) {
    let current = elementFromNode(node);

    if (!current || !container?.contains?.(current)) {
        return null;
    }

    const ownHeading = current.closest?.('h1,h2,h3,h4,h5,h6');
    if (ownHeading && container.contains(ownHeading)) {
        return ownHeading;
    }

    while (current && current !== container) {
        let sibling = current.previousElementSibling;
        while (sibling) {
            const heading = findLastHeading(sibling);
            if (heading) {
                return heading;
            }
            sibling = sibling.previousElementSibling;
        }
        current = current.parentElement;
    }

    return null;
}

function buildShareUrl(windowRef, heading) {
    const url = new URL(windowRef.location.href);
    url.hash = heading?.id || '';
    return url.toString();
}

export function initSelectionToolbar(container, { windowRef = container?.ownerDocument?.defaultView || window } = {}) {
    if (!container?.appendChild || !container?.addEventListener) {
        return () => {};
    }

    toolbarCleanups.get(container)?.();

    const documentRef = container.ownerDocument || windowRef.document;
    const toolbar = createToolbarElement(documentRef);
    const state = {
        anchorNode: null,
        selectedText: '',
    };

    container.appendChild(toolbar);

    const currentSelection = () => windowRef.getSelection?.();
    const showFromSelection = (event) => {
        if (event?.target && toolbar.contains(event.target)) {
            return;
        }

        const selection = currentSelection();
        if (!selection || !selectionBelongsToContainer(selection, container)) {
            hideToolbar(toolbar);
            return;
        }

        showToolbar(toolbar, selection, windowRef, state);
    };
    const hideUnlessToolbar = (event) => {
        if (!event?.target || !toolbar.contains(event.target)) {
            hideToolbar(toolbar);
        }
    };
    const handleToolbarClick = async (event) => {
        const action = event.target?.closest?.('[data-action]')?.dataset?.action;
        if (!action) {
            return;
        }

        const selection = currentSelection();
        const text = selectedText(selection) || state.selectedText;
        if (!text) {
            hideToolbar(toolbar);
            return;
        }

        if (action === 'copy') {
            await writeClipboard(text, windowRef);
            showFeedback(documentRef, t('articleEnhancements.selectionCopied'));
            hideToolbar(toolbar);
            return;
        }

        if (action === 'share') {
            const heading = findNearestHeading(selection?.anchorNode || state.anchorNode, container);
            await writeClipboard(buildShareUrl(windowRef, heading), windowRef);
            showFeedback(documentRef, t('articleEnhancements.selectionLinkCopied'));
            hideToolbar(toolbar);
        }
    };
    const handleKeydown = (event) => {
        if (event.key === 'Escape') {
            hideToolbar(toolbar);
        }
    };
    const handleScroll = () => hideToolbar(toolbar);

    container.addEventListener('mouseup', showFromSelection);
    container.addEventListener('touchend', showFromSelection, { passive: true });
    container.addEventListener('mousedown', hideUnlessToolbar);
    toolbar.addEventListener('click', handleToolbarClick);
    documentRef.addEventListener?.('keydown', handleKeydown);
    windowRef.addEventListener?.('scroll', handleScroll, { passive: true });

    const cleanup = () => {
        container.removeEventListener('mouseup', showFromSelection);
        container.removeEventListener('touchend', showFromSelection);
        container.removeEventListener('mousedown', hideUnlessToolbar);
        toolbar.removeEventListener('click', handleToolbarClick);
        documentRef.removeEventListener?.('keydown', handleKeydown);
        windowRef.removeEventListener?.('scroll', handleScroll);
        toolbar.remove();
        toolbarCleanups.delete(container);
    };

    toolbarCleanups.set(container, cleanup);
    return cleanup;
}
