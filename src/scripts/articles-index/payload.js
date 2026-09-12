import { t } from '../../lib/i18n.ts';

const EMPTY_PAYLOAD = '{"articles":[],"searchableTypes":[]}';

export function parseContentSearchPayload() {
    const payloadElement = document.getElementById('content-search-data');
    return JSON.parse(payloadElement?.textContent || EMPTY_PAYLOAD);
}

export function heroThumbFor(item, heroThumbs = {}) {
    const slug = String(item.filePath || '').replace(/^\/articles\//, '').replace(/\/$/, '');
    return item.thumb || heroThumbs[slug] || null;
}

export function contentTypeLabel(type, contentTypeKeys = {}) {
    const key = contentTypeKeys[type] ? `${contentTypeKeys[type]}.label` : '';
    return key ? t(key) : t('common.contentFallback');
}
