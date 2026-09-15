// Post-build step: materialize OG share cards into dist/og/.
// Every published post gets a branded card (hero posts embed their hero
// thumbnail; the rest are typographic), plus one site-default card.
// Usage: node scripts/generate-og-images.mjs [--out <dist-dir>]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { listPostFiles } from './blog-posts.js';
import { renderDefaultCardPng, renderTitleCardPng } from './og-card.js';
import { buildCanonicalUrl } from '../src/lib/site-seo.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultOutputDir = path.join(rootDir, 'dist', 'og');
const heroDir = path.join(rootDir, 'src', 'assets', 'hero');

export async function selectPostsForCards(posts, { siteUrl, heroDir: heroDirOverride } = {}) {
    const effectiveHeroDir = heroDirOverride || heroDir;
    const cards = [];
    for (const post of posts) {
        const id = post.fileName.replace(/\.md$/i, '');
        const title = String(post.frontmatter.title || '').trim();
        if (!title) {
            continue;
        }

        const heroFile = String(post.frontmatter.hero || '').trim();
        let thumbBuffer = null;
        if (heroFile) {
            try {
                thumbBuffer = await readFile(path.join(effectiveHeroDir, heroFile));
            } catch {
                thumbBuffer = null;
            }
        }

        cards.push({
            id,
            title,
            kicker: String(post.frontmatter.category || '文章'),
            date: String(post.frontmatter.date || ''),
            url: buildCanonicalUrl(`/articles/${id}/`, { siteUrl }),
            thumbBuffer,
        });
    }
    return cards;
}

function printUsage(logger = console) {
    logger.log([
        'Usage: node scripts/generate-og-images.mjs [--out <dist-dir>]',
        '',
        'Options:',
        '  --out <d>  输出目录（默认 dist/og）',
    ].join('\n'));
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
        printUsage();
        return;
    }

    const outIndex = args.indexOf('--out');
    const outputDir = outIndex >= 0 ? path.resolve(args[outIndex + 1]) : defaultOutputDir;
    const contentDir = path.join(rootDir, 'src', 'content', 'blog');

    const files = await listPostFiles(contentDir);
    const posts = [];
    for (const filePath of files) {
        const raw = await readFile(filePath, 'utf8');
        posts.push({ fileName: path.basename(filePath), frontmatter: matter(raw).data || {} });
    }

    const targets = await selectPostsForCards(posts);
    await mkdir(outputDir, { recursive: true });

    let failures = 0;
    for (const target of targets) {
        try {
            const png = await renderTitleCardPng(target);
            await writeFile(path.join(outputDir, `${target.id}.png`), png);
            console.log(`[og] ${target.id}.png (${Math.round(png.length / 1024)}KB${target.thumbBuffer ? ', 含头图' : ''})`);
        } catch (error) {
            failures += 1;
            console.error(`[og-fail] ${target.id}: ${error.message}`);
        }
    }

    try {
        const png = await renderDefaultCardPng({ url: buildCanonicalUrl('/') });
        await writeFile(path.join(outputDir, 'default.png'), png);
        console.log(`[og] default.png (${Math.round(png.length / 1024)}KB)`);
    } catch (error) {
        failures += 1;
        console.error(`[og-fail] default: ${error.message}`);
    }

    console.log(`\nOG 卡生成完成：${targets.length + 1 - failures} 张（${targets.length} 篇文章卡 + 默认卡），${failures} 个失败。`);
    if (failures > 0) {
        process.exitCode = 1;
    }
}

if (isMainModule()) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
