// Site-facing wrapper around the shared counting core in src/lib/word-count-core.js.
// The counting algorithm lives only in that module; this file adds the i18n
// display strings. scripts/readable-stats.js wraps the same core for CLI use.
import { t } from './i18n.ts';
import {
    computeReadingStats as computeCoreReadingStats,
    countCharacters,
    countWords,
    stripReadableText,
} from './word-count-core.js';

export { countCharacters, countWords, stripReadableText };

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
    const stats = computeCoreReadingStats(body);
    const readTimeDisplay = formatReadTime(stats.rawReadMinutes);

    return {
        characters: stats.characters,
        wordCount: stats.wordCount,
        totalCount: stats.totalCount,
        readTimeMinutes: stats.readTimeMinutes,
        readTimeDisplay,
        wordCountDisplay: formatWordCount(stats.totalCount),
        // Backward-compatible alias for older reading-stats consumers.
        display: readTimeDisplay,
    };
}
