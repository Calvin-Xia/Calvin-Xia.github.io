import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

class FakeElement {
    constructor(tagName, attributes = {}) {
        this.tagName = tagName.toUpperCase();
        this.attributes = new Map(Object.entries(attributes));
        this.children = [];
        this.parentElement = null;
        this.dataset = {};
        this.textContent = '';
        this.open = false;
        this.focused = false;
        this.listeners = new Map();
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach((name) => this.classNames.add(name)),
            remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
            contains: (name) => this.classNames.has(name),
            toggle: (name, force) => {
                const shouldHave = force ?? !this.classNames.has(name);
                if (shouldHave) {
                    this.classNames.add(name);
                } else {
                    this.classNames.delete(name);
                }
                return shouldHave;
            },
        };
        this.style = {
            setProperty(name, value) {
                this[name] = value;
            },
            removeProperty(name) {
                delete this[name];
            },
        };
    }

    append(...children) {
        children.forEach((child) => this.appendChild(child));
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    addEventListener(type, handler) {
        const handlers = this.listeners.get(type) || [];
        handlers.push(handler);
        this.listeners.set(type, handlers);
    }

    focus() {
        this.focused = true;
    }

    showModal() {
        this.open = true;
        this.setAttribute('open', '');
    }

    close() {
        this.open = false;
        this.removeAttribute('open');
    }

    closest(selector) {
        let current = this;

        while (current) {
            if (selector === 'figure' && current.tagName === 'FIGURE') {
                return current;
            }

            if (selector === '.markdown-image-figure' && current.classList.contains('markdown-image-figure')) {
                return current;
            }

            current = current.parentElement;
        }

        return null;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const matches = [];

        function walk(node) {
            if (selector.startsWith('.') && node.classList.contains(selector.slice(1))) {
                matches.push(node);
            } else if (selector === 'figcaption' && node.tagName === 'FIGCAPTION') {
                matches.push(node);
            }

            node.children.forEach(walk);
        }

        walk(this);
        return matches;
    }
}

function createFakeDocument() {
    return {
        body: new FakeElement('body'),
        createElement(tagName) {
            return new FakeElement(tagName);
        },
    };
}

describe('article image lightbox', () => {
    test('clamps zoom between 1x and 4x', async () => {
        const { clampScale } = await import('../src/lib/article-enhancements/image-lightbox.js');

        assert.equal(clampScale(0.2), 1);
        assert.equal(clampScale(2.5), 2.5);
        assert.equal(clampScale(7), 4);
    });

    test('calculates pinch zoom from the initial touch distance without incremental drift', async () => {
        const { calculatePinchScale } = await import('../src/lib/article-enhancements/image-lightbox.js');

        assert.equal(calculatePinchScale({ startScale: 1, startDistance: 120, currentDistance: 240 }), 2);
        assert.equal(calculatePinchScale({ startScale: 2, startDistance: 200, currentDistance: 50 }), 1);
        assert.equal(calculatePinchScale({ startScale: 3, startDistance: 100, currentDistance: 200 }), 4);
        assert.equal(calculatePinchScale({ startScale: 2, startDistance: 0, currentDistance: 200 }), 2);
    });

    test('keyboard shortcuts switch images, zoom, and close the dialog', async () => {
        const { createLightboxController } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const documentRef = createFakeDocument();
        const firstImage = new FakeElement('img', { src: '/storage/first.jpg', alt: 'First image' });
        const secondImage = new FakeElement('img', { src: '/storage/second.jpg', alt: 'Second image' });
        const controller = createLightboxController({ documentRef });
        const preventedKeys = [];

        controller.open(firstImage, [firstImage, secondImage]);

        const dialog = documentRef.body.querySelector('.article-lightbox');
        const renderedImage = dialog.querySelector('.article-lightbox__image');
        const keyHandlers = dialog.listeners.get('keydown');
        const dispatchKey = (key) => keyHandlers.forEach((handler) => handler({
            key,
            preventDefault() {
                preventedKeys.push(key);
            },
        }));

        dispatchKey('+');
        assert.equal(controller.getState().scale, 1.5);

        dispatchKey('-');
        assert.equal(controller.getState().scale, 1);

        dispatchKey('ArrowRight');
        assert.equal(renderedImage.getAttribute('src'), '/storage/second.jpg');

        dispatchKey('ArrowLeft');
        assert.equal(renderedImage.getAttribute('src'), '/storage/first.jpg');

        dispatchKey('Escape');
        assert.equal(dialog.open, false);
        assert.deepEqual(preventedKeys, ['+', '-', 'ArrowRight', 'ArrowLeft', 'Escape']);
    });

    test('creates an accessible image viewer dialog with fallback alt text', async () => {
        const { createLightboxController } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const documentRef = createFakeDocument();
        const image = new FakeElement('img', { src: '/storage/photo.jpg' });
        const controller = createLightboxController({ documentRef });

        controller.open(image, [image]);

        const dialog = documentRef.body.querySelector('.article-lightbox');
        const renderedImage = dialog.querySelector('.article-lightbox__image');

        assert.equal(dialog.getAttribute('role'), 'dialog');
        assert.equal(dialog.getAttribute('aria-modal'), 'true');
        assert.equal(dialog.getAttribute('aria-label'), '图片查看器');
        assert.equal(dialog.getAttribute('aria-describedby'), 'article-lightbox-caption');
        assert.equal(dialog.querySelector('.article-lightbox__caption').getAttribute('id'), 'article-lightbox-caption');
        assert.equal(renderedImage.getAttribute('alt'), '文章图片');
    });

    test('uses figure captions before image alt text', async () => {
        const { getImageCaption } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const figure = new FakeElement('figure');
        figure.classList.add('markdown-image-figure');
        const image = figure.appendChild(new FakeElement('img', { alt: 'Alt fallback' }));
        const caption = figure.appendChild(new FakeElement('figcaption'));
        caption.textContent = 'Figure caption';

        assert.equal(getImageCaption(image), 'Figure caption');
    });

    test('allows only relative, same-origin, or trusted CDN image sources', async () => {
        const { getImageSource } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const baseURI = 'https://calvin-xia.cn/articles/post/';
        const relativeImage = new FakeElement('img', { src: '/storage/photo.jpg' });
        const sameOriginImage = new FakeElement('img', { src: 'https://calvin-xia.cn/storage/photo.jpg' });
        const trustedCdnImage = new FakeElement('img', { src: 'https://content.calvin-xia.cn/post/photo.jpg' });
        const devProxyImage = new FakeElement('img', { src: '/__cdn/assets/photo.jpg' });
        const offsiteImage = new FakeElement('img', { src: 'https://example.com/photo.jpg' });
        const scriptImage = new FakeElement('img', { src: 'javascript:alert(1)' });
        const dataImage = new FakeElement('img', { src: 'data:image/svg+xml,<svg onload=alert(1)></svg>' });

        [
            relativeImage,
            sameOriginImage,
            trustedCdnImage,
            devProxyImage,
            offsiteImage,
            scriptImage,
            dataImage,
        ].forEach((image) => {
            image.baseURI = baseURI;
        });

        assert.equal(getImageSource(relativeImage), '/storage/photo.jpg');
        assert.equal(getImageSource(sameOriginImage), 'https://calvin-xia.cn/storage/photo.jpg');
        assert.equal(getImageSource(trustedCdnImage), 'https://content.calvin-xia.cn/post/photo.jpg');
        assert.equal(getImageSource(devProxyImage), '/__cdn/assets/photo.jpg');
        assert.equal(getImageSource(offsiteImage), '');
        assert.equal(getImageSource(scriptImage), '');
        assert.equal(getImageSource(dataImage), '');
    });

    test('does not open the lightbox for unsafe image sources', async () => {
        const { createLightboxController } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const documentRef = createFakeDocument();
        const image = new FakeElement('img', { src: 'https://example.com/photo.jpg', alt: 'External photo' });
        image.baseURI = 'https://calvin-xia.cn/articles/post/';
        const controller = createLightboxController({ documentRef });

        controller.open(image, [image]);

        const dialog = documentRef.body.querySelector('.article-lightbox');
        const renderedImage = dialog.querySelector('.article-lightbox__image');

        assert.equal(renderedImage.getAttribute('src'), null);
        assert.equal(dialog.open, false);
    });

    test('keeps shared controllers scoped to each document reference', async () => {
        const { initImageLightbox } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const firstDocument = createFakeDocument();
        const secondDocument = createFakeDocument();
        const firstImage = new FakeElement('img', { src: '/storage/first.jpg', alt: 'First image' });
        const secondImage = new FakeElement('img', { src: '/storage/second.jpg', alt: 'Second image' });
        const firstRoot = { querySelectorAll: () => [firstImage] };
        const secondRoot = { querySelectorAll: () => [secondImage] };

        firstImage.baseURI = 'https://calvin-xia.cn/articles/first/';
        secondImage.baseURI = 'https://calvin-xia.cn/articles/second/';

        const firstController = initImageLightbox(firstRoot, { documentRef: firstDocument });
        const secondController = initImageLightbox(secondRoot, { documentRef: secondDocument });

        assert.notEqual(firstController, secondController);

        secondImage.listeners.get('click').forEach((handler) => handler({}));

        const firstDialog = firstDocument.body.querySelector('.article-lightbox');
        const secondDialog = secondDocument.body.querySelector('.article-lightbox');

        assert.equal(firstDialog, null);
        assert.ok(secondDialog);
        assert.equal(secondDialog.querySelector('.article-lightbox__image').getAttribute('src'), '/storage/second.jpg');
        assert.equal(secondDialog.open, true);
    });

    test('closes dialog clicks only when they land outside the lightbox frame', async () => {
        const { createLightboxController } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const documentRef = createFakeDocument();
        const image = new FakeElement('img', { src: '/storage/photo.jpg', alt: 'Photo caption' });
        const controller = createLightboxController({ documentRef });

        controller.open(image, [image]);

        const dialog = documentRef.body.querySelector('.article-lightbox');
        const frame = dialog.querySelector('.article-lightbox__frame');
        const clickHandlers = dialog.listeners.get('click');

        frame.getBoundingClientRect = () => ({
            left: 20,
            right: 220,
            top: 20,
            bottom: 220,
        });

        clickHandlers.forEach((handler) => handler({ target: dialog, clientX: 120, clientY: 120 }));

        assert.equal(dialog.open, true);

        clickHandlers.forEach((handler) => handler({ target: dialog, clientX: 10, clientY: 10 }));

        assert.equal(dialog.open, false);
    });

    test('opens, zooms, closes, and restores focus to the source image', async () => {
        const { createLightboxController } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const documentRef = createFakeDocument();
        const image = new FakeElement('img', { src: '/storage/photo.jpg', alt: 'Photo caption' });
        const controller = createLightboxController({ documentRef });

        controller.open(image, [image]);
        controller.zoomIn();
        controller.zoomIn();
        controller.zoomOut();
        controller.close();

        const dialog = documentRef.body.querySelector('.article-lightbox');
        const renderedImage = dialog.querySelector('.article-lightbox__image');

        assert.equal(renderedImage.getAttribute('src'), '/storage/photo.jpg');
        assert.equal(dialog.open, false);
        assert.equal(image.focused, true);
        assert.equal(controller.getState().scale, 1.5);
    });

    test('single-finger touchend does not reset touchStartScale when not pinching', async () => {
        const { createLightboxController } = await import('../src/lib/article-enhancements/image-lightbox.js');
        const documentRef = createFakeDocument();
        const image = new FakeElement('img', { src: '/storage/photo.jpg', alt: 'Photo' });
        const controller = createLightboxController({ documentRef });

        controller.open(image, [image]);
        controller.zoomIn();
        controller.zoomIn();

        const dialog = documentRef.body.querySelector('.article-lightbox');
        const renderedImage = dialog.querySelector('.article-lightbox__image');
        const touchEndHandlers = renderedImage.listeners.get('touchend');

        assert.ok(touchEndHandlers, 'touchend handlers should be registered');
        assert.equal(controller.getState().isPinching, false);
        assert.equal(controller.getState().scale, 2);

        const initialStartScale = controller.getState().touchStartScale;

        for (const handler of touchEndHandlers) {
            handler({ touches: [] });
        }

        assert.equal(controller.getState().isPinching, false, 'isPinching stays false');
        assert.equal(controller.getState().touchStartScale, initialStartScale, 'touchStartScale unchanged for non-pinch touchend');
    });
});
