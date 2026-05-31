// Visual obfuscation only, not a security boundary against crawlers.
import { t } from '../lib/i18n.ts';

const encodedEmail = 'cGVyc29uYWxwYWdlZmVlZGJhY2tAY2FsdmluLXhpYS5jb20=';

function decode(): string {
    return window.atob(encodedEmail);
}

export const EmailProtection = {
    decode,

    init(): void {
        document.querySelectorAll<HTMLElement>('[data-email-placeholder]').forEach((container) => {
            const existingLink = container.querySelector<HTMLAnchorElement>('.email-link');
            if (existingLink) {
                existingLink.textContent = t('about.emailLink');
                return;
            }

            const email = decode();
            const link = document.createElement('a');

            link.href = `mailto:${email}`;
            link.textContent = t('about.emailLink');
            link.className = 'email-link';
            container.appendChild(link);
        });
    },
};

export function initEmailProtection(): void {
    EmailProtection.init();
}

if (typeof window !== 'undefined') {
    window.addEventListener('calvin-lang-change', () => EmailProtection.init());
}
