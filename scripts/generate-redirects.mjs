// Post-build step: materialize one themed redirect page per legacy URL into dist/.
// The map and the HTML template live in scripts/legacy-redirects.js.
//
// These pages are intentionally duplicated markup: they are written straight to the
// output dir and cannot reuse the Astro bundle. Generating them keeps the template in
// exactly one place instead of 17 hand-maintained files under public/.
//
// Usage: node scripts/generate-redirects.mjs [--out <dist-dir>]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { findPageIssues, legacyRedirects, renderRedirectPages, validateRedirects } from './legacy-redirects.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultOutputDir = path.join(rootDir, 'dist');
const defaultSiteUrl = 'https://calvin-xia.cn';

export function resolveSiteUrl(value = process.env.BASE_URL || defaultSiteUrl) {
    return String(value || '').trim().replace(/\/+$/, '') || defaultSiteUrl;
}

export function parseArgs(args = []) {
    const outIndex = args.indexOf('--out');
    const outDir = outIndex === -1 ? defaultOutputDir : args[outIndex + 1];

    return {
        help: args.includes('--help'),
        outDir: outDir ? path.resolve(outDir) : defaultOutputDir,
    };
}

export async function writeRedirectPages({
    outDir = defaultOutputDir,
    siteUrl = resolveSiteUrl(),
    entries = legacyRedirects,
} = {}) {
    const issues = validateRedirects(entries);
    if (issues.length > 0) {
        throw new Error(`跳转映射表不合法：\n  - ${issues.join('\n  - ')}`);
    }

    const pages = renderRedirectPages({ siteUrl, entries });

    for (const page of pages) {
        const filePath = path.join(outDir, page.destinationPath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, page.html, 'utf8');
    }

    // Read back what landed on disk: a template regression should fail the build,
    // not ship pages that quietly fail to redirect.
    const failures = [];
    for (const page of pages) {
        const filePath = path.join(outDir, page.destinationPath);
        const written = await readFile(filePath, 'utf8');
        for (const issue of findPageIssues(written, { to: page.to, siteUrl })) {
            failures.push(`${page.from} → ${issue}`);
        }
    }

    if (failures.length > 0) {
        throw new Error(`生成的跳转页未通过校验：\n  - ${failures.join('\n  - ')}`);
    }

    return pages;
}

function printUsage(logger = console) {
    logger.log([
        'Usage: node scripts/generate-redirects.mjs [--out <dist-dir>]',
        '',
        'Options:',
        '  --out <d>  输出目录（默认 dist）',
    ].join('\n'));
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);

    if (options.help) {
        printUsage();
        return;
    }

    const pages = await writeRedirectPages({ outDir: options.outDir });
    console.log(`跳转页生成完成：${pages.length} 个 → ${path.relative(rootDir, options.outDir) || '.'}`);
    for (const page of pages) {
        console.log(`  ${page.from}  ->  ${page.destinationPath}`);
    }
}

if (isMainModule()) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
