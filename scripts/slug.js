const CHINESE_INITIALS = new Map(Object.entries({
    我: 'w',
    与: 'y',
    大: 'd',
    语: 'y',
    言: 'y',
    模: 'm',
    型: 'x',
    的: 'd',
    初: 'c',
    次: 'c',
    邂: 'x',
    逅: 'h',
    返: 'f',
    校: 'x',
    宣: 'x',
    讲: 'j',
    破: 'p',
    局: 'j',
    成: 'c',
    长: 'z',
    新: 'x',
    建: 'j',
    文: 'w',
    章: 'z',
    年: 'n',
    度: 'd',
    总: 'z',
    结: 'j',
    两: 'l',
    小: 'x',
    时: 's',
    环: 'h',
    线: 'x',
    慢: 'm',
    行: 'x',
    生: 's',
    活: 'h',
    学: 'x',
    业: 'y',
    人: 'r',
    工: 'g',
    智: 'z',
    能: 'n',
    思: 's',
    考: 'k',
    武: 'w',
    汉: 'h',
    火: 'h',
    车: 'c',
    运: 'y',
    转: 'z',
    旅: 'l',
    游: 'y',
    高: 'g',
}));

function isAsciiLetterOrDigit(char) {
    return /[a-z0-9]/.test(char);
}

function isChineseChar(char) {
    return /[\u3400-\u9fff]/u.test(char);
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
    const parts = [];

    for (const char of normalized) {
        if (isAsciiLetterOrDigit(char)) {
            parts.push(char);
            continue;
        }

        if (isChineseChar(char)) {
            const initial = CHINESE_INITIALS.get(char);
            if (initial) {
                parts.push(initial);
            }
            continue;
        }

        if (isSeparator(char)) {
            appendSeparator(parts);
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
