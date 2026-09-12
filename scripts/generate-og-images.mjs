// Post-build step: materialize OG share cards into dist/og/.
// Posts with a hero image use the hero as og:image (wired in [...slug].astro);
// every other post gets a rendered title card, plus one site-default card.
// Usage: node scripts/generate-og-images.mjs [--out <dist-dir>]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { listPostFiles, readPostFile } from './blog-posts.js';
import { renderDefaultCardPng, renderTitleCardPng } from './og-card.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultOutputDir = path.join(rootDir, 'dist', 'og');

export function selectPostsNeedingCards(posts) {
    return posts
        .filter((post) => !post.frontmatter.hero)
        .map((post) => ({
            id: post.fileName.replace(/\.md$/i, ''),
            title: String(post.frontmatter.title || ''),
            kicker: String(post.frontmatter.category || '文章'),
            date: String(post.frontmatter.date || ''),
        }))
        .filter((post) => post.title);
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
        posts.push(await readPostFile(filePath));
    }

    const targets = selectPostsNeedingCards(posts);
    await mkdir(outputDir, { recursive: true });

    let failures = 0;
    for (const target of targets) {
        try {
            const png = await renderTitleCardPng(target);
            await writeFile(path.join(outputDir, `${target.id}.png`), png);
            console.log(`[og] ${target.id}.png (${Math.round(png.length / 1024)}KB)`);
        } catch (error) {
            failures += 1;
            console.error(`[og-fail] ${target.id}: ${error.message}`);
        }
    }

    try {
        const png = await renderDefaultCardPng();
        await writeFile(path.join(outputDir, 'default.png'), png);
        console.log(`[og] default.png (${Math.round(png.length / 1024)}KB)`);
    } catch (error) {
        failures += 1;
        console.error(`[og-fail] default: ${error.message}`);
    }

    console.log(`\nOG 卡生成完成：${targets.length + 1 - failures} 张（${targets.length} 篇标题卡 + 默认卡），${failures} 个失败。`);
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
