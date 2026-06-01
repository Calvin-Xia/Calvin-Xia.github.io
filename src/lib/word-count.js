import { t } from './i18n.ts';

const HAN_CHARACTER_PATTERN = /\p{Script=Han}/gu;
const ENGLISH_WORD_PATTERN = /[A-Za-z0-9]+(?:\([A-Za-z0-9]+\)|[-'_’][A-Za-z0-9]+)*/g;
const ENGLISH_LETTER_PATTERN = /[A-Za-z]/;

const HTML_ENTITIES = new Map([
    ['nbsp', ' '],
    ['ensp', ' '],
    ['emsp', ' '],
    ['thinsp', ' '],
    ['amp', '&'],
    ['lt', '<'],
    ['gt', '>'],
    ['quot', '"'],
    ['apos', "'"],
]);

function decodeHtmlEntities(value) {
    return String(value || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
        const normalized = entity.toLowerCase();

        if (normalized.startsWith('#x')) {
            const codePoint = Number.parseInt(normalized.slice(2), 16);
            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
        }

        if (normalized.startsWith('#')) {
            const codePoint = Number.parseInt(normalized.slice(1), 10);
            return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
        }

        return HTML_ENTITIES.get(normalized) ?? ' ';
    });
}

function countEnglishWords(text) {
    return text.match(ENGLISH_WORD_PATTERN)?.filter((word) => ENGLISH_LETTER_PATTERN.test(word)).length ?? 0;
}

export function stripReadableText(body = '') {
    return decodeHtmlEntities(String(body || ''))
        .replace(/^\uFEFF?---\s*[\s\S]*?\s*---\s*/u, ' ')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/~~~[\s\S]*?~~~/g, ' ')
        .replace(/`[^`\n]*`/g, ' ')
        .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/^#{1,6}\s+/gm, ' ')
        .replace(/^[>\s]*>\s?/gm, ' ')
        .replace(/^\s*[-*+]\s+/gm, ' ')
        .replace(/^\s*\d+[.)]\s+/gm, ' ')
        .replace(/[*~]{1,3}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function countCharacters(text = '') {
    return stripReadableText(text).match(HAN_CHARACTER_PATTERN)?.length ?? 0;
}

export function countWords(text = '') {
    const readableText = stripReadableText(text).replace(HAN_CHARACTER_PATTERN, ' ');
    return countEnglishWords(readableText);
}

export function formatReadTime(minutes = 0) {
    if (!Number.isFinite(minutes) || minutes < 1) {
        return t('wordCount.lessThanMinute');
    }

    const roundedMinutes = Math.ceil(minutes);

    if (roundedMinutes < 60) {
        return t('wordCount.minutes', { minutes: roundedMinutes });
    }

    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;

    return t('wordCount.hoursMinutes', { hours, minutes: remainingMinutes });
}

export function formatWordCount(count = 0) {
    const normalizedCount = Math.max(0, Number.isFinite(count) ? Math.round(count) : 0);
    return t('wordCount.words', { count: normalizedCount.toLocaleString('en-US') });
}

export function computeReadingStats(body = '') {
    const readableText = stripReadableText(body);
    const characters = readableText.match(HAN_CHARACTER_PATTERN)?.length ?? 0;
    const wordCount = countEnglishWords(readableText.replace(HAN_CHARACTER_PATTERN, ' '));
    const totalCount = characters + wordCount;
    const rawMinutes = characters / 300 + wordCount / 200;
    const readTimeMinutes = totalCount === 0 ? 0 : Math.ceil(rawMinutes);
    const readTimeDisplay = formatReadTime(rawMinutes);

    return {
        characters,
        wordCount,
        totalCount,
        readTimeMinutes,
        readTimeDisplay,
        wordCountDisplay: formatWordCount(totalCount),
        // Backward-compatible alias for older reading-stats consumers.
        display: readTimeDisplay,
    };
}
