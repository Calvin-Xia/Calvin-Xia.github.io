// Single source of truth for the word-count / reading-time algorithm.
// src/lib/word-count.js wraps this with i18n display strings for the site and
// scripts/readable-stats.js wraps it for CLI tooling. Keep this module free of
// i18n/TypeScript imports so plain Node scripts can load it directly.
const HAN_CHARACTER_PATTERN = /\p{Script=Han}/gu;
const ENGLISH_WORD_PATTERN = /[A-Za-z0-9]+(?:\([A-Za-z0-9]+\)|[-'_’][A-Za-z0-9]+)*/g;
const ENGLISH_LETTER_PATTERN = /[A-Za-z]/;

const CHINESE_CHARACTERS_PER_MINUTE = 300;
const ENGLISH_WORDS_PER_MINUTE = 200;

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

// Returns rawReadMinutes (unrounded) so i18n formatters can decide between
// "< 1 分钟" and a rounded minute count without recomputing the algorithm.
export function computeReadingStats(body = '') {
    const readableText = stripReadableText(body);
    const characters = readableText.match(HAN_CHARACTER_PATTERN)?.length ?? 0;
    const wordCount = countEnglishWords(readableText.replace(HAN_CHARACTER_PATTERN, ' '));
    const totalCount = characters + wordCount;
    const rawReadMinutes = characters / CHINESE_CHARACTERS_PER_MINUTE + wordCount / ENGLISH_WORDS_PER_MINUTE;
    const readTimeMinutes = totalCount === 0 ? 0 : Math.ceil(rawReadMinutes);

    return { characters, wordCount, totalCount, readTimeMinutes, rawReadMinutes };
}
