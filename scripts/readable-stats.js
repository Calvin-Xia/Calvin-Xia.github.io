// Mirrors the counting core of src/lib/word-count.js for CLI use: that module
// imports i18n.ts, which a plain Node script cannot load.
const HAN_CHARACTER_PATTERN = /\p{Script=Han}/gu;
const ENGLISH_WORD_PATTERN = /[A-Za-z0-9]+(?:\([A-Za-z0-9]+\)|[-'_’][A-Za-z0-9]+)*/g;
const ENGLISH_LETTER_PATTERN = /[A-Za-z]/;

export function stripReadableText(body = '') {
    return String(body || '')
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

function countEnglishWords(text) {
    return text.match(ENGLISH_WORD_PATTERN)?.filter((word) => ENGLISH_LETTER_PATTERN.test(word)).length ?? 0;
}

export function computeReadingStats(body = '') {
    const readableText = stripReadableText(body);
    const characters = readableText.match(HAN_CHARACTER_PATTERN)?.length ?? 0;
    const wordCount = countEnglishWords(readableText.replace(HAN_CHARACTER_PATTERN, ' '));
    const totalCount = characters + wordCount;
    const readTimeMinutes = totalCount === 0 ? 0 : Math.ceil(characters / 300 + wordCount / 200);

    return { characters, wordCount, totalCount, readTimeMinutes };
}
