const FIGURE_CLASS = 'markdown-image-figure';
const SIZED_FIGURE_CLASS = 'markdown-image-figure--sized';
const CAPTION_CLASS = 'markdown-image-caption';

function captionTextFor(image) {
    return (image.getAttribute('alt') || '').trim();
}

function isAlreadyCaptioned(image) {
    return image.closest(`.${FIGURE_CLASS}`) || image.closest('figure');
}

function isImageOnlyParagraph(parent, image) {
    if (!parent || parent.tagName !== 'P') {
        return false;
    }

    return Array.from(parent.children).every((child) => child === image);
}

function applyFigureWidth(image, figure) {
    const inlineWidth = image.style?.width || image.getAttribute('width');

    if (!inlineWidth) {
        return;
    }

    const figureWidth = inlineWidth.trim();

    figure.classList.add(SIZED_FIGURE_CLASS);
    figure.style.setProperty(
        '--markdown-image-width',
        /^\d+$/.test(figureWidth) ? `${figureWidth}px` : figureWidth,
    );
    image.style?.removeProperty?.('width');
}

function wrapImage(image, captionText, documentRef) {
    const figure = documentRef.createElement('figure');
    const caption = documentRef.createElement('figcaption');
    const parent = image.parentElement;

    figure.classList.add(FIGURE_CLASS);
    caption.classList.add(CAPTION_CLASS);
    caption.textContent = captionText;
    applyFigureWidth(image, figure);

    if (isImageOnlyParagraph(parent, image)) {
        parent.parentNode.insertBefore(figure, parent);
        figure.appendChild(image);
        parent.remove();
    } else {
        parent.insertBefore(figure, image);
        figure.appendChild(image);
    }

    figure.appendChild(caption);
    image.dataset.captioned = 'true';
}

export function enhanceArticleImageCaptions(root, documentRef = document) {
    if (!root) {
        return;
    }

    root.querySelectorAll('img[alt]').forEach((image) => {
        const captionText = captionTextFor(image);

        if (!captionText || image.dataset.captioned === 'true' || isAlreadyCaptioned(image)) {
            return;
        }

        wrapImage(image, captionText, documentRef);
    });
}
