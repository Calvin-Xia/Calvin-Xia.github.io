// Satori-based OG share-card renderer (1200x630). Fonts come from
// @fontsource/noto-serif-sc's full chinese-simplified WOFF files — satori
// accepts WOFF but not WOFF2, which is why the .woff variants are loaded.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const fontPackageDir = path.dirname(require.resolve('@fontsource/noto-serif-sc/package.json'));

export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;

export const OG_BRAND = {
    background: '#F7F7F4',
    text: '#1A2221',
    accent: '#315D67',
    muted: '#5C6B69',
    border: '#D8DFDD',
    domain: 'calvin-xia.cn',
    siteName: 'Calvin Xia',
    fontFamily: 'Noto Serif SC',
};

let fontsPromise = null;

export function loadOgFonts() {
    if (!fontsPromise) {
        fontsPromise = Promise.all([
            readFile(path.join(fontPackageDir, 'files', 'noto-serif-sc-chinese-simplified-400-normal.woff')),
            readFile(path.join(fontPackageDir, 'files', 'noto-serif-sc-chinese-simplified-700-normal.woff')),
        ]).then(([regular, bold]) => [
            { name: OG_BRAND.fontFamily, data: regular, weight: 400, style: 'normal' },
            { name: OG_BRAND.fontFamily, data: bold, weight: 700, style: 'normal' },
        ]);
    }
    return fontsPromise;
}

export function selectTitleFontSize(title) {
    const length = [...String(title || '')].length;
    if (length <= 12) {
        return 84;
    }
    if (length <= 20) {
        return 68;
    }
    return 56;
}

function cardShell(children) {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                width: `${OG_CARD_WIDTH}px`,
                height: `${OG_CARD_HEIGHT}px`,
                backgroundColor: OG_BRAND.background,
                padding: '60px 80px 52px',
                justifyContent: 'space-between',
                fontFamily: OG_BRAND.fontFamily,
            },
            children,
        },
    };
}

function headerRow() {
    return {
        type: 'div',
        props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
            children: [
                {
                    type: 'div',
                    props: {
                        style: { fontSize: '30px', fontWeight: 700, letterSpacing: '0.02em', color: OG_BRAND.text },
                        children: OG_BRAND.siteName,
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: { width: '16px', height: '16px', backgroundColor: OG_BRAND.accent, borderRadius: '3px' },
                    },
                },
            ],
        },
    };
}

function kickerRow(kicker) {
    return {
        type: 'div',
        props: {
            style: { display: 'flex', alignItems: 'center', marginBottom: '26px' },
            children: [
                {
                    type: 'div',
                    props: {
                        style: { width: '34px', height: '5px', backgroundColor: OG_BRAND.accent, marginRight: '18px' },
                    },
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            fontSize: '25px',
                            color: OG_BRAND.accent,
                            letterSpacing: '0.32em',
                            fontWeight: 400,
                        },
                        children: String(kicker || '文章'),
                    },
                },
            ],
        },
    };
}

function footerRow(note) {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `1px solid ${OG_BRAND.border}`,
                paddingTop: '26px',
                fontSize: '25px',
                color: OG_BRAND.muted,
            },
            children: [
                { type: 'div', props: { style: {}, children: String(note || '') } },
                { type: 'div', props: { style: {}, children: OG_BRAND.domain } },
            ],
        },
    };
}

export async function renderTitleCardSvg({ title, kicker = '文章', date = '' } = {}) {
    const fonts = await loadOgFonts();
    const tree = cardShell([
        headerRow(),
        {
            type: 'div',
            props: {
                style: { display: 'flex', flexDirection: 'column' },
                children: [
                    kickerRow(kicker),
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                fontSize: `${selectTitleFontSize(title)}px`,
                                fontWeight: 700,
                                lineHeight: 1.32,
                                color: OG_BRAND.text,
                                lineClamp: 3,
                            },
                            children: String(title || ''),
                        },
                    },
                ],
            },
        },
        footerRow(date),
    ]);

    return satori(tree, { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT, fonts });
}

export async function renderTitleCardPng(options) {
    const svg = await renderTitleCardSvg(options);
    return new Resvg(svg, { fitTo: { mode: 'width', value: OG_CARD_WIDTH } }).render().asPng();
}

export async function renderDefaultCardSvg({ tagline = '文章 · 工具 · 生活记录' } = {}) {
    const fonts = await loadOgFonts();
    const tree = cardShell([
        headerRow(),
        {
            type: 'div',
            props: {
                style: { display: 'flex', flexDirection: 'column' },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: {
                                fontSize: '96px',
                                fontWeight: 700,
                                color: OG_BRAND.text,
                                letterSpacing: '0.01em',
                                marginBottom: '28px',
                            },
                            children: OG_BRAND.siteName,
                        },
                    },
                    {
                        type: 'div',
                        props: {
                            style: { fontSize: '34px', color: OG_BRAND.muted, letterSpacing: '0.12em' },
                            children: String(tagline),
                        },
                    },
                ],
            },
        },
        footerRow(''),
    ]);

    return satori(tree, { width: OG_CARD_WIDTH, height: OG_CARD_HEIGHT, fonts });
}

export async function renderDefaultCardPng(options) {
    const svg = await renderDefaultCardSvg(options);
    return new Resvg(svg, { fitTo: { mode: 'width', value: OG_CARD_WIDTH } }).render().asPng();
}
