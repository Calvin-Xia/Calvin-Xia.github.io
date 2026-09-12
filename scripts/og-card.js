// Satori-based OG share-card renderer (1200x630). Fonts come from
// @fontsource/noto-serif-sc's full chinese-simplified WOFF files — satori
// accepts WOFF but not WOFF2, which is why the .woff variants are loaded.
// Every card carries a QR code; posts with a hero image embed its thumbnail.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import QRCode from 'qrcode';
import sharp from 'sharp';
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
        return 76;
    }
    if (length <= 20) {
        return 62;
    }
    return 52;
}

export async function renderQrDataUri(url) {
    const png = await QRCode.toBuffer(String(url || ''), {
        type: 'png',
        width: 512,
        margin: 1,
        color: { dark: OG_BRAND.text, light: '#FFFFFF' },
    });
    return `data:image/png;base64,${png.toString('base64')}`;
}

export async function renderThumbDataUri(thumbBuffer) {
    // resvg skips webp images inside SVG, so thumbnails must be embedded as PNG.
    const png = await sharp(thumbBuffer)
        .resize({ width: 640, height: 420, fit: 'cover', position: 'centre' })
        .png({ compressionLevel: 9 })
        .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
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
                padding: '56px 72px 46px',
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
                        style: { display: 'flex', alignItems: 'center' },
                        children: [
                            {
                                type: 'div',
                                props: {
                                    style: { fontSize: '22px', color: OG_BRAND.muted, marginRight: '16px' },
                                    children: OG_BRAND.domain,
                                },
                            },
                            {
                                type: 'div',
                                props: {
                                    style: { width: '14px', height: '14px', backgroundColor: OG_BRAND.accent, borderRadius: '3px' },
                                },
                            },
                        ],
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
            style: { display: 'flex', alignItems: 'center', marginBottom: '24px' },
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
                            fontSize: '24px',
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

function qrTile(dataUri, { size = 148 } = {}) {
    const inner = size - 24;
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                width: `${size}px`,
                height: `${size}px`,
                padding: '12px',
                backgroundColor: '#FFFFFF',
                border: `1px solid ${OG_BRAND.border}`,
                borderRadius: '14px',
            },
            children: [
                {
                    type: 'img',
                    props: {
                        src: dataUri,
                        width: `${inner}px`,
                        height: `${inner}px`,
                        style: { width: `${inner}px`, height: `${inner}px`, objectFit: 'fill', borderRadius: '4px' },
                    },
                },
            ],
        },
    };
}

function thumbImage(dataUri) {
    return {
        type: 'img',
        props: {
            src: dataUri,
            width: '320px',
            height: '210px',
            style: {
                width: '320px',
                height: '210px',
                objectFit: 'cover',
                borderRadius: '18px',
                border: `1px solid ${OG_BRAND.border}`,
            },
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
                paddingTop: '24px',
                fontSize: '24px',
                color: OG_BRAND.muted,
            },
            children: [
                { type: 'div', props: { style: {}, children: String(note || '') } },
                { type: 'div', props: { style: {}, children: '扫码阅读原文' } },
            ],
        },
    };
}

export async function renderTitleCardSvg({ title, kicker = '文章', date = '', url = '', thumbBuffer = null } = {}) {
    const fonts = await loadOgFonts();
    const [qrDataUri, thumbDataUri] = await Promise.all([
        renderQrDataUri(url),
        thumbBuffer ? renderThumbDataUri(thumbBuffer) : Promise.resolve(null),
    ]);

    const rightColumn = {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
                gap: '22px',
                flexShrink: 0,
                marginLeft: '44px',
            },
            children: [
                ...(thumbDataUri ? [thumbImage(thumbDataUri)] : []),
                qrTile(qrDataUri),
            ],
        },
    };

    const tree = cardShell([
        headerRow(),
        {
            type: 'div',
            props: {
                style: { display: 'flex', alignItems: 'center', flex: 1 },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
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
                    rightColumn,
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

export async function renderDefaultCardSvg({ url = '', tagline = '文章 · 工具 · 生活记录' } = {}) {
    const fonts = await loadOgFonts();
    const qrDataUri = await renderQrDataUri(url);

    const tree = cardShell([
        headerRow(),
        {
            type: 'div',
            props: {
                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 },
                children: [
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', flexDirection: 'column' },
                            children: [
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            fontSize: '92px',
                                            fontWeight: 700,
                                            color: OG_BRAND.text,
                                            letterSpacing: '0.01em',
                                            marginBottom: '26px',
                                        },
                                        children: OG_BRAND.siteName,
                                    },
                                },
                                {
                                    type: 'div',
                                    props: {
                                        style: { fontSize: '33px', color: OG_BRAND.muted, letterSpacing: '0.12em' },
                                        children: String(tagline),
                                    },
                                },
                            ],
                        },
                    },
                    qrTile(qrDataUri),
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
