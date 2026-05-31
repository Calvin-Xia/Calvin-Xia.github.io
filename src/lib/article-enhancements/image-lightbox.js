import { t } from '../i18n.ts';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;
const TOUCH_SCALE_SENSITIVITY = 240;
const TRUSTED_IMAGE_HOSTS = new Set([
    'assets.calvin-xia.cn',
    'content.calvin-xia.cn',
]);

function getAttributeValue(element, name) {
    return element?.getAttribute?.(name) || element?.[name] || '';
}

function setButtonDisabled(button, disabled) {
    if (!button) {
        return;
    }

    button.disabled = disabled;
    button.setAttribute('aria-disabled', String(disabled));
}

function createButton(documentRef, className, label, text) {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.classList.add('article-lightbox__button', className);
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.textContent = text;
    return button;
}

export function clampScale(value, min = MIN_SCALE, max = MAX_SCALE) {
    return Math.min(max, Math.max(min, Number(value) || min));
}

export function getImageCaption(image) {
    const figure = image?.closest?.('.markdown-image-figure') || image?.closest?.('figure');
    const caption = figure?.querySelector?.('figcaption')?.textContent?.trim();
    return caption || getAttributeValue(image, 'alt').trim();
}

function getImageBaseURI(image) {
    return image?.ownerDocument?.baseURI || image?.baseURI || globalThis.document?.baseURI || 'http://localhost/';
}

export function isAllowedImageSource(source, baseURI = 'http://localhost/') {
    const value = String(source || '').trim();

    if (!value) {
        return false;
    }

    try {
        const url = new URL(value, baseURI);
        const baseUrl = new URL(baseURI);

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }

        if (url.origin === baseUrl.origin) {
            return true;
        }

        return url.protocol === 'https:' && TRUSTED_IMAGE_HOSTS.has(url.hostname);
    } catch {
        return false;
    }
}

export function getImageSource(image) {
    const baseURI = getImageBaseURI(image);
    const candidates = [
        image?.getAttribute?.('src'),
        image?.getAttribute?.('data-src'),
        image?.currentSrc,
        image?.src,
    ];

    return candidates.find((source) => isAllowedImageSource(source, baseURI))?.trim?.() || '';
}

export function createLightboxController({ documentRef = document } = {}) {
    const state = {
        captionNode: null,
        closeButton: null,
        currentIndex: 0,
        dialog: null,
        frameNode: null,
        imageNode: null,
        images: [],
        nextButton: null,
        previousButton: null,
        scale: 1,
        sourceImage: null,
        touchDistance: 0,
    };

    function updateScale() {
        if (state.imageNode?.style) {
            state.imageNode.style.transform = `scale(${state.scale})`;
            state.imageNode.style.setProperty?.('--article-lightbox-scale', String(state.scale));
        }
    }

    function setScale(scale) {
        state.scale = clampScale(scale);
        updateScale();
    }

    function renderCurrentImage() {
        const image = state.images[state.currentIndex] || state.sourceImage;
        const source = getImageSource(image);
        const caption = getImageCaption(image);

        if (!source) {
            state.imageNode.removeAttribute('src');
            state.captionNode.textContent = '';
            setButtonDisabled(state.previousButton, true);
            setButtonDisabled(state.nextButton, true);
            setScale(1);
            return false;
        }

        state.sourceImage = image;
        state.imageNode.setAttribute('src', source);
        state.imageNode.setAttribute('alt', getAttributeValue(image, 'alt') || caption);
        state.captionNode.textContent = caption;
        setButtonDisabled(state.previousButton, state.images.length < 2);
        setButtonDisabled(state.nextButton, state.images.length < 2);
        setScale(1);
        return true;
    }

    function close() {
        if (!state.dialog) {
            return;
        }

        if (typeof state.dialog.close === 'function') {
            state.dialog.close();
        } else {
            state.dialog.removeAttribute('open');
        }

        state.sourceImage?.focus?.();
    }

    function showPrevious() {
        if (state.images.length < 2) {
            return;
        }

        state.currentIndex = (state.currentIndex - 1 + state.images.length) % state.images.length;
        renderCurrentImage();
    }

    function showNext() {
        if (state.images.length < 2) {
            return;
        }

        state.currentIndex = (state.currentIndex + 1) % state.images.length;
        renderCurrentImage();
    }

    function touchDistance(event) {
        if (!event.touches || event.touches.length < 2) {
            return 0;
        }

        const [first, second] = event.touches;
        return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    }

    function isFrameOutsideClick(event) {
        if (event.target !== state.dialog) {
            return false;
        }

        const frameRect = state.frameNode?.getBoundingClientRect?.();

        if (!frameRect || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') {
            return true;
        }

        return event.clientX < frameRect.left
            || event.clientX > frameRect.right
            || event.clientY < frameRect.top
            || event.clientY > frameRect.bottom;
    }

    function ensureDialog() {
        if (state.dialog) {
            return state.dialog;
        }

        const dialog = documentRef.createElement('dialog');
        const frame = documentRef.createElement('div');
        const toolbar = documentRef.createElement('div');
        const figure = documentRef.createElement('figure');
        const image = documentRef.createElement('img');
        const caption = documentRef.createElement('figcaption');
        const previousButton = createButton(documentRef, 'article-lightbox__button--previous', t('articleEnhancements.lightboxPrevious'), '<');
        const nextButton = createButton(documentRef, 'article-lightbox__button--next', t('articleEnhancements.lightboxNext'), '>');
        const zoomOutButton = createButton(documentRef, 'article-lightbox__button--zoom-out', t('articleEnhancements.lightboxZoomOut'), '-');
        const resetButton = createButton(documentRef, 'article-lightbox__button--reset', t('articleEnhancements.lightboxReset'), '1x');
        const zoomInButton = createButton(documentRef, 'article-lightbox__button--zoom-in', t('articleEnhancements.lightboxZoomIn'), '+');
        const closeButton = createButton(documentRef, 'article-lightbox__button--close', t('articleEnhancements.lightboxClose'), 'x');

        dialog.classList.add('article-lightbox');
        dialog.setAttribute('aria-modal', 'true');
        frame.classList.add('article-lightbox__frame');
        toolbar.classList.add('article-lightbox__toolbar');
        figure.classList.add('article-lightbox__figure');
        image.classList.add('article-lightbox__image');
        caption.classList.add('article-lightbox__caption');

        toolbar.append(previousButton, zoomOutButton, resetButton, zoomInButton, nextButton, closeButton);
        figure.append(image, caption);
        frame.append(toolbar, figure);
        dialog.append(frame);
        documentRef.body.appendChild(dialog);

        previousButton.addEventListener('click', showPrevious);
        nextButton.addEventListener('click', showNext);
        zoomOutButton.addEventListener('click', () => setScale(state.scale - SCALE_STEP));
        resetButton.addEventListener('click', () => setScale(1));
        zoomInButton.addEventListener('click', () => setScale(state.scale + SCALE_STEP));
        closeButton.addEventListener('click', close);
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            close();
        });
        dialog.addEventListener('click', (event) => {
            if (isFrameOutsideClick(event)) {
                close();
            }
        });
        dialog.addEventListener('wheel', (event) => {
            event.preventDefault();
            setScale(state.scale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP));
        }, { passive: false });
        image.addEventListener('touchstart', (event) => {
            state.touchDistance = touchDistance(event);
        }, { passive: true });
        image.addEventListener('touchmove', (event) => {
            const nextDistance = touchDistance(event);
            if (!state.touchDistance || !nextDistance) {
                return;
            }

            event.preventDefault();
            setScale(state.scale + (nextDistance - state.touchDistance) / TOUCH_SCALE_SENSITIVITY);
            state.touchDistance = nextDistance;
        }, { passive: false });

        state.captionNode = caption;
        state.closeButton = closeButton;
        state.dialog = dialog;
        state.frameNode = frame;
        state.imageNode = image;
        state.nextButton = nextButton;
        state.previousButton = previousButton;

        return dialog;
    }

    function open(image, gallery = []) {
        ensureDialog();

        state.images = gallery.length ? gallery : [image];
        state.currentIndex = Math.max(0, state.images.indexOf(image));
        state.sourceImage = image;

        if (!renderCurrentImage()) {
            return;
        }

        if (typeof state.dialog.showModal === 'function') {
            state.dialog.showModal();
        } else {
            state.dialog.setAttribute('open', '');
        }

        state.closeButton?.focus?.();
    }

    return {
        close,
        getState() {
            return { ...state };
        },
        open,
        previous: showPrevious,
        next: showNext,
        resetZoom() {
            setScale(1);
        },
        setScale,
        zoomIn() {
            setScale(state.scale + SCALE_STEP);
        },
        zoomOut() {
            setScale(state.scale - SCALE_STEP);
        },
    };
}

const sharedControllers = new WeakMap();

function getSharedController(documentRef) {
    let controller = sharedControllers.get(documentRef);

    if (!controller) {
        controller = createLightboxController({ documentRef });
        sharedControllers.set(documentRef, controller);
    }

    return controller;
}

export function initImageLightbox(root, { documentRef = document } = {}) {
    if (!root?.querySelectorAll) {
        return null;
    }

    const controller = getSharedController(documentRef);
    const images = Array.from(root.querySelectorAll('.markdown-image-figure img, img'));

    images.forEach((image) => {
        if (image.dataset.articleLightboxBound === 'true') {
            return;
        }

        image.dataset.articleLightboxBound = 'true';
        image.setAttribute('role', 'button');
        image.setAttribute('tabindex', image.getAttribute('tabindex') || '0');
        image.classList?.add('article-lightbox-trigger');
        image.addEventListener('click', () => controller.open(image, images));
        image.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                controller.open(image, images);
            }
        });
    });

    return controller;
}
