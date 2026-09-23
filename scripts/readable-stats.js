// CLI wrapper around the shared counting core in src/lib/word-count-core.js —
// the single implementation of the word-count / reading-time algorithm. The
// site-facing src/lib/word-count.js wraps that same core with i18n display
// strings, which plain Node CLI scripts avoid loading.
import {
    computeReadingStats as computeCoreReadingStats,
    stripReadableText,
} from '../src/lib/word-count-core.js';

export { stripReadableText };

export function computeReadingStats(body = '') {
    const stats = computeCoreReadingStats(body);

    return {
        characters: stats.characters,
        wordCount: stats.wordCount,
        totalCount: stats.totalCount,
        readTimeMinutes: stats.readTimeMinutes,
    };
}
