// One-off backfill: probe every R2-hosted image referenced by existing blog
// posts and write an imageDimensions manifest into each post's frontmatter.
// Usage: node scripts/backfill-image-dimensions.js [--dry-run] [--dir <markdown-dir>]
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { getImageDimensions } from './image-dimensions.js';
import { listPostFiles } from './blog-posts.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultContentDir = path.join(rootDir, 'src', 'content', 'blog');
const CDN_HOST_PATTERN = /(^|\.)calvin-xia\.cn$/i;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\(([^)\s]+)\)/g;
const HTML_IMG_SRC_PATTERN = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;

export function collectRemoteImageUrls(body) {
    const urls = new Set();
    const text = String(body || '');

    for (const match of text.matchAll(MARKDOWN_IMAGE_PATTERN)) {
        urls.add(match[1]);
    }
    for (const match of text.matchAll(HTML_IMG_SRC_PATTERN)) {
        urls.add(match[1]);
    }

    return [...urls].filter((url) => {
        try {
            const parsed = new URL(url);
            return /^https?:$/.test(parsed.protocol) && CDN_HOST_PATTERN.test(parsed.hostname);
        } catch {
            return false;
        }
    });
}

export function urlToManifestPath(url) {
    try {
        return decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
    } catch {
        return '';
    }
}

export function mergeDimensions(existing = [], additions = []) {
    const byPath = new Map();
    for (const item of existing) {
        if (item && typeof item.path === 'string') {
            byPath.set(item.path, item);
        }
    }
    for (const item of additions) {
        byPath.set(item.path, item);
    }
    return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function buildFrontmatterBlock(entries) {
    const lines = ['imageDimensions:'];
    for (const item of entries) {
        lines.push(`  - path: ${JSON.stringify(item.path)}`);
        lines.push(`    width: ${item.width}`);
        lines.push(`    height: ${item.height}`);
    }
    return lines.join('\n');
}

async function probeRemoteImage(url, fetchImpl) {
    // The CDN requires this Referer (see AGENTS.md) — bare requests get 403.
    const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(20000),
        headers: { Referer: 'https://workers.calvin-xia.cn/' },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return getImageDimensions(buffer);
}

export async function backfillFile(filePath, { dryRun, fetchImpl, logger }) {
    const raw = await readFile(filePath, 'utf8');
    if (/^imageDimensions:/m.test(raw.slice(0, raw.indexOf('\n---', 3) + 1))) {
        logger.log(`[skip] ${path.basename(filePath)}: 已有 imageDimensions`);
        return { added: 0, failures: 0 };
    }

    const parsed = matter(raw);
    const existing = Array.isArray(parsed.data.imageDimensions) ? parsed.data.imageDimensions : [];
    const knownPaths = new Set(existing.map((item) => item && item.path));
    const urls = collectRemoteImageUrls(parsed.content);

    const additions = [];
    let failures = 0;
    for (const url of urls) {
        const manifestPath = urlToManifestPath(url);
        if (!manifestPath || knownPaths.has(manifestPath)) {
            continue;
        }
        try {
            const dimensions = await probeRemoteImage(url, fetchImpl);
            if (dimensions) {
                additions.push({ path: manifestPath, width: dimensions.width, height: dimensions.height });
            } else {
                failures += 1;
                logger.log(`[warn] ${manifestPath}: 无法解析图片尺寸（格式不支持）`);
            }
        } catch (error) {
            failures += 1;
            logger.log(`[warn] ${manifestPath}: ${error.message}`);
        }
    }

    if (additions.length === 0) {
        logger.log(`[ok] ${path.basename(filePath)}: 无需更新`);
        return { added: 0, failures };
    }

    const closingIndex = raw.indexOf('\n---', 3);
    const block = buildFrontmatterBlock(mergeDimensions(existing, additions));
    const updated = `${raw.slice(0, closingIndex)}\n${block}${raw.slice(closingIndex)}`;

    if (dryRun) {
        logger.log(`[dry-run] ${path.basename(filePath)}: 将写入 ${additions.length} 条尺寸记录`);
    } else {
        await writeFile(filePath, updated, 'utf8');
        logger.log(`[done] ${path.basename(filePath)}: 写入 ${additions.length} 条尺寸记录`);
    }
    return { added: additions.length, failures };
}

function printUsage(logger = console) {
    logger.log([
        'Usage: node scripts/backfill-image-dimensions.js [--dry-run] [--dir <markdown-dir>]',
        '',
        'Options:',
        '  --dry-run   只打印计划，不写文件',
        '  --dir <d>   指定 markdown 目录（默认 src/content/blog）',
    ].join('\n'));
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const dirIndex = args.indexOf('--dir');
    const contentDir = dirIndex >= 0 ? path.resolve(args[dirIndex + 1]) : defaultContentDir;
    if (args.includes('--help')) {
        printUsage();
        return;
    }

    const logger = console;
    const files = await listPostFiles(contentDir);
    let added = 0;
    let failures = 0;

    for (const filePath of files) {
        const result = await backfillFile(filePath, { dryRun, fetchImpl: fetch, logger });
        added += result.added;
        failures += result.failures;
    }

    logger.log(`\n回填完成：新增 ${added} 条尺寸记录，${failures} 个未解析。`);
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
