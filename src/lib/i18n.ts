import zhCN from '../i18n/zh-CN.json' with { type: 'json' };
import enUS from '../i18n/en-US.json' with { type: 'json' };

export const STORAGE_KEY = 'calvin-xia-lang';
export const DEFAULT_LANG = 'zh-CN';
export const SUPPORTED_LANGS = ['zh-CN', 'en-US'] as const;

export type Lang = (typeof SUPPORTED_LANGS)[number];

type TranslationTree = {
    [key: string]: string | TranslationTree;
};

type TranslationVars = Record<string, string | number>;

const translations: Record<Lang, TranslationTree> = {
    'zh-CN': zhCN,
    'en-US': enUS,
};

const i18nAttributeMap = {
    'aria-label': 'aria-label',
    alt: 'alt',
    content: 'content',
    placeholder: 'placeholder',
    title: 'title',
    value: 'value',
    'data-title': 'data-title',
} as const;

export function normalizeLang(value: unknown): Lang {
    return value === 'en-US' ? 'en-US' : DEFAULT_LANG;
}

function getStorage(): Storage | undefined {
    try {
        return globalThis.localStorage;
    } catch {
        return undefined;
    }
}

export function getCurrentLang(): Lang {
    const stored = getStorage()?.getItem(STORAGE_KEY);
    return normalizeLang(stored);
}

export function setLang(lang: Lang): void {
    const nextLang = normalizeLang(lang);

    try {
        getStorage()?.setItem(STORAGE_KEY, nextLang);
    } catch {}

    if (typeof document !== 'undefined') {
        document.documentElement.lang = nextLang;
        document.documentElement.dataset['lang'] = nextLang;
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function getNestedValue(tree: TranslationTree, key: string): string | undefined {
    const value = key.split('.').reduce<string | TranslationTree | undefined>((current, segment) => {
        if (!current || typeof current === 'string') {
            return undefined;
        }
        return current[segment];
    }, tree);

    return typeof value === 'string' ? value : undefined;
}

function interpolate(value: string, vars?: TranslationVars): string {
    if (!vars) {
        return value;
    }

    return Object.entries(vars).reduce((result, [key, replacement]) => {
        return result.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), String(replacement));
    }, value);
}

export function translate(lang: Lang, key: string, vars?: TranslationVars): string {
    const normalizedLang = normalizeLang(lang);
    const value = getNestedValue(translations[normalizedLang], key)
        ?? getNestedValue(translations[DEFAULT_LANG], key)
        ?? key;

    return interpolate(value, vars);
}

export function t(key: string, vars?: TranslationVars): string {
    return translate(getCurrentLang(), key, vars);
}

export function i18nText(key: string, vars?: TranslationVars): Record<string, string> {
    const attrs: Record<string, string> = {
        'data-i18n': key,
    };

    if (vars) {
        attrs['data-i18n-vars'] = JSON.stringify(vars);
    }

    return attrs;
}

function readVars(element: Element, attribute = 'data-i18n-vars'): TranslationVars | undefined {
    const raw = element.getAttribute(attribute);
    if (!raw) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function getRoot(root?: ParentNode): ParentNode | undefined {
    if (root && typeof root.querySelectorAll === 'function') {
        return root;
    }

    if (typeof document !== 'undefined') {
        return document;
    }

    return undefined;
}

export function applyTranslations(root?: ParentNode): void {
    const targetRoot = getRoot(root);
    if (!targetRoot) {
        return;
    }

    const lang = getCurrentLang();
    if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dataset['lang'] = lang;
    }

    targetRoot.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        if (!key) {
            return;
        }

        element.textContent = translate(lang, key, readVars(element));
    });

    Object.entries(i18nAttributeMap).forEach(([dataName, attributeName]) => {
        targetRoot.querySelectorAll(`[data-i18n-${dataName}]`).forEach((element) => {
            const key = element.getAttribute(`data-i18n-${dataName}`);
            if (!key) {
                return;
            }

            element.setAttribute(attributeName, translate(lang, key, readVars(element, `data-i18n-${dataName}-vars`)));
        });
    });
}

function bindLanguageToggle(root: ParentNode): void {
    root.querySelectorAll<HTMLButtonElement>('[data-lang-toggle]').forEach((button) => {
        if (button.dataset['langReady'] === 'true') {
            return;
        }

        button.dataset['langReady'] = 'true';
        button.addEventListener('click', () => {
            const nextLang = getCurrentLang() === 'zh-CN' ? 'en-US' : 'zh-CN';
            setLang(nextLang);
            applyTranslations(document);
            window.dispatchEvent(new CustomEvent('calvin-lang-change', { detail: { lang: nextLang } }));
        });
    });
}

export function initI18n(root?: ParentNode): void {
    const targetRoot = getRoot(root);
    if (!targetRoot) {
        return;
    }

    applyTranslations(targetRoot);
    bindLanguageToggle(targetRoot);
}
