const SECTION_STAGGER_MS = 100;
const SHADOWBOX_STAGGER_MS = 150;
const SHADOWBOX_OFFSET_MS = 500;
const CARD_STAGGER_S = 0.1;

let rippleAbortController: AbortController | undefined;

function clearInlineAnimationStyles(element: HTMLElement): void {
    element.style.opacity = '';
    element.style.animation = '';
}

function addFadeInAnimations(): void {
    document.querySelectorAll<HTMLElement>('main > section').forEach((element, index) => {
        clearInlineAnimationStyles(element);
        window.setTimeout(() => {
            element.classList.add('fade-in-up');
        }, index * SECTION_STAGGER_MS);
    });
}

function addScrollAnimations(): void {
    document.querySelectorAll<HTMLElement>('.shadowbox:not(.markdown-container)').forEach((element, index) => {
        window.setTimeout(() => {
            element.classList.add('fade-in-up');
        }, index * SHADOWBOX_STAGGER_MS + SHADOWBOX_OFFSET_MS);
    });
}

function initFloatingElements(): void {
    document.querySelectorAll<HTMLElement>('.card').forEach((card, index) => {
        card.style.animationDelay = `${index * CARD_STAGGER_S}s`;
    });
}

export const PageAnimations = {
    init(): void {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        addFadeInAnimations();
        addScrollAnimations();
        initFloatingElements();
    },

    addFadeInAnimations,
    addScrollAnimations,
    initFloatingElements,
};

export function initPageAnimations(): void {
    PageAnimations.init();
}

export function initButtonRipples(): void {
    rippleAbortController?.abort();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        rippleAbortController = undefined;
        return;
    }

    const cleanupController = new AbortController();
    rippleAbortController = cleanupController;

    document.querySelectorAll<HTMLElement>('.btn').forEach((button) => {
        button.addEventListener(
            'click',
            (event) => {
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const ripple = document.createElement('span');
                const pointerEvent = event as MouseEvent;

                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${pointerEvent.clientX - rect.left - size / 2}px`;
                ripple.style.top = `${pointerEvent.clientY - rect.top - size / 2}px`;
                ripple.classList.add('ripple');

                button.appendChild(ripple);
                window.setTimeout(() => ripple.remove(), 600);
            },
            { signal: cleanupController.signal },
        );
    });
}
