const CHINESE_ONLY_PATTERN = /^\p{Script=Han}+$/u;
const SEARCH_TOKEN_PATTERN = /\p{Script=Han}+|[\p{Letter}\p{Number}]+(?:[-_][\p{Letter}\p{Number}]+)*/gu;
const MIN_CHINESE_NGRAM = 2;
const MAX_CHINESE_NGRAM = 4;

function addChineseTerms(terms: Set<string>, value: string): void {
    if (value.length <= 1) {
        terms.add(value);
        return;
    }

    terms.add(value);

    for (let size = MIN_CHINESE_NGRAM; size <= Math.min(MAX_CHINESE_NGRAM, value.length); size += 1) {
        for (let index = 0; index <= value.length - size; index += 1) {
            terms.add(value.slice(index, index + size));
        }
    }
}

export function tokenizeSearchText(text: string): string[] {
    const terms = new Set<string>();
    const source = String(text || '').normalize('NFKC');

    for (const match of source.matchAll(SEARCH_TOKEN_PATTERN)) {
        const token = match[0].trim();

        if (!token) {
            continue;
        }

        if (CHINESE_ONLY_PATTERN.test(token)) {
            addChineseTerms(terms, token);
            continue;
        }

        terms.add(token);
    }

    return Array.from(terms);
}
