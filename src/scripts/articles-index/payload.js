import { t } from '../../lib/i18n.ts';

const EMPTY_PAYLOAD = '{"articles":[],"searchableTypes":[]}';

export function parseContentSearchPayload() {
    const payloadElement = document.getElementById('content-search-data');
    return JSON.parse(payloadElement?.textContent || EMPTY_PAYLOAD);
}

// `heroThumbs` is keyed by hero filename (what frontmatter declares), not by article
// slug, so a renamed article keeps its thumbnail as long as it declares the hero.
export function heroThumbFor(item, heroThumbs = {}) {
    if (item.thumb) {
        return item.thumb;
    }

    const heroFile = String(item.hero || '').trim();
    return heroFile ? heroThumbs[heroFile] || null : null;
}

export function contentTypeLabel(type, contentTypeKeys = {}) {
    const key = contentTypeKeys[type] ? `${contentTypeKeys[type]}.label` : '';
    return key ? t(key) : t('common.contentFallback');
}
