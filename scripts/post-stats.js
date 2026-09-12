import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { listPostFiles, readPostFile } from './blog-posts.js';
import { computeReadingStats } from './readable-stats.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultContentDir = path.join(rootDir, 'src', 'content', 'blog');

const IMAGE_PATTERN = /!\[[^\]]*]\([^)]*\)|<img\b[^>]*>/gi;

export function countImages(body = '') {
    return (String(body || '').match(IMAGE_PATTERN) || []).length;
}

export async function buildStats(contentDir) {
    const files = await listPostFiles(contentDir);
    const posts = [];

    for (const filePath of files) {
        const post = await readPostFile(filePath);
        const stats = computeReadingStats(post.body);

        posts.push({
            file: post.fileName,
            title: String(post.frontmatter.title || ''),
            date: String(post.frontmatter.date || ''),
            category: String(post.frontmatter.category || ''),
            characters: stats.characters,
            englishWords: stats.wordCount,
            totalCount: stats.totalCount,
            readTimeMinutes: stats.readTimeMinutes,
            images: countImages(post.body),
        });
    }

    posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'));

    const totals = posts.reduce((acc, post) => ({
        characters: acc.characters + post.characters,
        englishWords: acc.englishWords + post.englishWords,
        totalCount: acc.totalCount + post.totalCount,
        images: acc.images + post.images,
    }), { characters: 0, englishWords: 0, totalCount: 0, images: 0 });

    return {
        count: posts.length,
        posts,
        totals: {
            ...totals,
            readTimeMinutes: posts.reduce((sum, post) => sum + post.readTimeMinutes, 0),
        },
    };
}

export function formatStatsTable(report, { logger = console } = {}) {
    logger.log('日期        标题 | 分类 | 字数 | 图片');
    for (const post of report.posts) {
        logger.log([
            post.date,
            `${post.title} | ${post.category} | ${post.totalCount.toLocaleString('en-US')} | ${post.images}`,
        ].join('  '));
    }
    logger.log(`\n共 ${report.count} 篇 | 总字数 ${report.totals.totalCount.toLocaleString('en-US')}（中文 ${report.totals.characters.toLocaleString('en-US')} / 英文词 ${report.totals.englishWords.toLocaleString('en-US')}）| 总阅读时长约 ${report.totals.readTimeMinutes} 分钟 | 图片引用 ${report.totals.images} 处`);
}

function printUsage(logger = console) {
    logger.log([
        'Usage: npm run stats [-- --json] [--dir <markdown-dir>]',
        '',
        'Options:',
        '  --json      以 JSON 输出统计结果',
        '  --dir <d>   指定要统计的 markdown 目录（默认 src/content/blog）',
        '  --help      显示本帮助',
    ].join('\n'));
}

function parseArgs(argv = process.argv.slice(2)) {
    const args = argv.map((arg) => arg.trim()).filter(Boolean);
    const options = { help: false, json: false, dir: '' };
    const unknownFlags = [];

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--help') options.help = true;
        else if (arg === '--json') options.json = true;
        else if (arg === '--dir') {
            options.dir = args[index + 1] || '';
            index += 1;
        } else {
            unknownFlags.push(arg);
        }
    }

    if (unknownFlags.length > 0) {
        throw new Error(`未知参数: ${unknownFlags.join(', ')}（支持: --json --dir --help）`);
    }

    return options;
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function main() {
    const options = parseArgs();
    if (options.help) {
        printUsage();
        return;
    }

    const contentDir = options.dir ? path.resolve(options.dir) : defaultContentDir;
    const report = await buildStats(contentDir);

    if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    formatStatsTable(report);
}

if (isMainModule()) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
