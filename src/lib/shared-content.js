export const CONTENT_TYPES = Object.freeze({
    article: Object.freeze({
        label: '文章',
        action: '阅读全文',
    }),
    work: Object.freeze({
        label: '作品',
        action: '查看作品',
    }),
    tool: Object.freeze({
        label: '工具',
        action: '打开工具',
    }),
    'update-log': Object.freeze({
        label: '更新日志',
        action: '查看日志',
    }),
});

export const TYPE_PRIORITY = Object.freeze({
    article: 0,
    work: 1,
    'update-log': 2,
    tool: 3,
});

export function parseDateValue(value) {
    const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        return Number.NEGATIVE_INFINITY;
    }

    const [, year, month, day] = match;
    const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
    const parsed = new Date(timestamp);

    if (
        Number.isNaN(timestamp) ||
        parsed.getUTCFullYear() !== Number(year) ||
        parsed.getUTCMonth() !== Number(month) - 1 ||
        parsed.getUTCDate() !== Number(day)
    ) {
        return Number.NEGATIVE_INFINITY;
    }

    return timestamp;
}

export function compareContentItems(left, right) {
    const dateDelta = parseDateValue(right.date) - parseDateValue(left.date);
    if (dateDelta !== 0) {
        return dateDelta;
    }

    const priorityDelta = (TYPE_PRIORITY[left.type] ?? 99) - (TYPE_PRIORITY[right.type] ?? 99);
    if (priorityDelta !== 0) {
        return priorityDelta;
    }

    return String(left.title || '').localeCompare(String(right.title || ''), 'zh-CN');
}

export function isFreshDate(date, now = new Date()) {
    const timestamp = parseDateValue(date);
    if (!Number.isFinite(timestamp)) {
        return false;
    }

    const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = currentDay - timestamp;
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}
