import { pinyin } from 'pinyin-pro';

function isAsciiLetterOrDigit(char) {
    return /[a-z0-9]/.test(char);
}

function isSeparator(char) {
    return /[\s_\-:：/\\|,.，。!?！？()[\]{}"'`~、；;]+/u.test(char);
}

function appendSeparator(parts) {
    if (parts.length > 0 && parts.at(-1) !== '-') {
        parts.push('-');
    }
}

export function slugifyTitle(title, fallback = 'post') {
    const normalized = String(title || '').trim().normalize('NFKD').toLowerCase();
    // Whole-string call so pinyin-pro's segmenter can resolve polyphonic characters in context (成长 -> cz).
    // nonZh: 'consecutive' groups non-Chinese runs into single segments; Chinese chars come back as initials.
    const segments = pinyin(normalized, {
        pattern: 'first',
        toneType: 'none',
        type: 'array',
        nonZh: 'consecutive',
    });
    const parts = [];

    for (const segment of segments) {
        if (/^[a-z]$/.test(segment)) {
            parts.push(segment);
            continue;
        }

        for (const char of segment) {
            if (isAsciiLetterOrDigit(char)) {
                parts.push(char);
                continue;
            }

            if (isSeparator(char)) {
                appendSeparator(parts);
            }
        }
    }

    const slug = parts
        .join('')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return slug || fallback;
}

export function deriveAssetSlug(dirName) {
    const normalized = String(dirName || '').trim().replace(/\\/g, '/').split('/').filter(Boolean).at(-1) || '';
    const withoutDate = normalized.replace(/^\d{8}-?/, '');
    return slugifyTitle(withoutDate, withoutDate || normalized || 'post');
}
