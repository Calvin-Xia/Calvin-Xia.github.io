import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { listPostFiles, readPostFile } from './blog-posts.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultContentDir = path.join(rootDir, 'src', 'content', 'blog');

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOADER_NAME_PATTERN = /^\d/;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*]\(([^)\s]+)\)/g;
const HTML_IMG_SRC_PATTERN = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
const INTERNAL_ARTICLE_LINK_PATTERN = /\[[^\]]*]\(\/articles\/([^)\s#?/]+)\/?[)#]/g;
const UNTRANSFORMED_ASSET_LINK_PATTERN = /!?\[[^\]]*]\(\s*(?:\.\/|\.\.\/)?file\//i;

function isRealCalendarDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

export function validateFrontmatter(meta = {}) {
    const issues = [];

    if (typeof meta.title !== 'string' || !meta.title.trim()) {
        issues.push({ level: 'error', message: 'title 必须为非空字符串' });
    }

    if (typeof meta.date !== 'string' || !DATE_PATTERN.test(meta.date)) {
        issues.push({ level: 'error', message: 'date 必须为 YYYY-MM-DD 格式字符串' });
    } else if (!isRealCalendarDate(meta.date)) {
        issues.push({ level: 'error', message: 'date 不是真实存在的日历日期' });
    }

    if (typeof meta.excerpt !== 'string') {
        issues.push({ level: 'error', message: 'excerpt 必须为字符串' });
    } else if (!meta.excerpt.trim()) {
        issues.push({ level: 'warning', message: 'excerpt 为空，建议补充摘要' });
    }

    if (typeof meta.category !== 'string' || !meta.category.trim()) {
        issues.push({ level: 'error', message: 'category 必须为非空字符串' });
    }

    if (
        !Array.isArray(meta.tags)
        || meta.tags.length === 0
        || meta.tags.some((tag) => typeof tag !== 'string' || !tag.trim())
    ) {
        issues.push({ level: 'error', message: 'tags 必须为非空字符串数组' });
    }

    if (meta.featured !== undefined && typeof meta.featured !== 'boolean') {
        issues.push({ level: 'error', message: 'featured 必须为布尔值' });
    }

    for (const field of ['author', 'readTime', 'status']) {
        if (meta[field] !== undefined && typeof meta[field] !== 'string') {
            issues.push({ level: 'error', message: `${field} 必须为字符串` });
        }
    }

    return issues;
}

export function findUntransformedAssetLinks(body) {
    return UNTRANSFORMED_ASSET_LINK_PATTERN.test(String(body || ''));
}

export function collectHttpUrls(body) {
    const urls = new Set();
    const text = String(body || '');

    for (const match of text.matchAll(MARKDOWN_LINK_PATTERN)) {
        urls.add(match[1]);
    }
    for (const match of text.matchAll(HTML_IMG_SRC_PATTERN)) {
        urls.add(match[1]);
    }

    return [...urls].filter((url) => /^https?:\/\//i.test(url));
}

export function findInvalidUrls(body) {
    return collectHttpUrls(body).filter((url) => {
        try {
            new URL(url);
            return false;
        } catch {
            return true;
        }
    });
}

export function collectInternalArticleSlugs(body) {
    return [...String(body || '').matchAll(INTERNAL_ARTICLE_LINK_PATTERN)].map((match) => match[1]);
}

export function analyzePost(post, { knownSlugs }) {
    const issues = [];

    for (const issue of validateFrontmatter(post.frontmatter)) {
        issues.push({ ...issue, file: post.filePath });
    }

    if (findUntransformedAssetLinks(post.body)) {
        issues.push({
            level: 'error',
            message: '正文存在未转换的 file/ 本地资源链接（发布后不应残留）',
            file: post.filePath,
        });
    }

    for (const url of findInvalidUrls(post.body)) {
        issues.push({ level: 'error', message: `无效 URL: ${url}`, file: post.filePath });
    }

    for (const slug of collectInternalArticleSlugs(post.body)) {
        if (!knownSlugs.has(slug)) {
            issues.push({
                level: 'error',
                message: `内部链接指向不存在的文章: /articles/${slug}/`,
                file: post.filePath,
            });
        }
    }

    if (!LOADER_NAME_PATTERN.test(post.fileName)) {
        issues.push({
            level: 'warning',
            message: '文件名不以数字开头，content loader 的 [0-9]*.md 模式不会收录该文件',
            file: post.filePath,
        });
    }

    return issues;
}

export async function collectPostIssues(contentDir, { online = false, fetchImpl = fetch } = {}) {
    const files = await listPostFiles(contentDir);
    const issues = [];

    if (files.length === 0) {
        return { fileCount: 0, issues: [{ level: 'error', message: '未找到任何 markdown 文件', file: contentDir }] };
    }

    const knownSlugs = new Set(files.map((file) => path.basename(file).replace(/\.md$/i, '')));
    const httpUrls = new Set();

    for (const filePath of files) {
        const post = await readPostFile(filePath);
        issues.push(...analyzePost(post, { knownSlugs }));
        for (const url of collectHttpUrls(post.body)) {
            httpUrls.add(url);
        }
    }

    if (online) {
        for (const url of httpUrls) {
            try {
                const response = await fetchImpl(url, {
                    method: 'HEAD',
                    redirect: 'follow',
                    signal: AbortSignal.timeout(8000),
                });
                if (response.status >= 400) {
                    issues.push({ level: 'error', message: `${url} 返回 ${response.status}`, file: '(online)' });
                }
            } catch {
                issues.push({ level: 'warning', message: `${url} 无法访问（网络原因，仅供参考）`, file: '(online)' });
            }
        }
    }

    return { fileCount: files.length, issues };
}

export function formatReport({ fileCount, issues }, { logger = console } = {}) {
    const errors = issues.filter((issue) => issue.level === 'error');
    const warnings = issues.filter((issue) => issue.level === 'warning');

    for (const issue of issues) {
        const fileLabel = issue.file === '(online)' ? '' : `${path.relative(rootDir, issue.file)}: `;
        logger.log(`[${issue.level.toUpperCase()}] ${fileLabel}${issue.message}`);
    }

    logger.log(`\n检查完成：${fileCount} 篇文章，${errors.length} 个错误，${warnings.length} 个警告。`);
    return errors.length;
}

function printUsage(logger = console) {
    logger.log([
        'Usage: npm run check [-- --json] [--online] [--dir <markdown-dir>]',
        '',
        'Options:',
        '  --json      以 JSON 输出检查结果',
        '  --online    对正文中的 http(s) 链接逐一发起 HEAD 探活（默认离线，仅做结构校验）',
        '  --dir <d>   指定要检查的 markdown 目录（默认 src/content/blog）',
        '  --help      显示本帮助',
        '',
        '检查项：frontmatter 规范（title/date/excerpt/category/tags 及可选字段类型）、',
        '残留 file/ 本地资源链接、无效 URL、指向不存在文章的内部链接。',
    ].join('\n'));
}

function parseArgs(argv = process.argv.slice(2)) {
    const args = argv.map((arg) => arg.trim()).filter(Boolean);
    const options = { help: false, json: false, online: false, dir: '' };
    const unknownFlags = [];

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--help') options.help = true;
        else if (arg === '--json') options.json = true;
        else if (arg === '--online') options.online = true;
        else if (arg === '--dir') {
            options.dir = args[index + 1] || '';
            index += 1;
        } else {
            unknownFlags.push(arg);
        }
    }

    if (unknownFlags.length > 0) {
        throw new Error(`未知参数: ${unknownFlags.join(', ')}（支持: --json --online --dir --help）`);
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
    const report = await collectPostIssues(contentDir, { online: options.online });

    if (options.json) {
        console.log(JSON.stringify({
            checked: report.fileCount,
            errorCount: report.issues.filter((issue) => issue.level === 'error').length,
            warningCount: report.issues.filter((issue) => issue.level === 'warning').length,
            issues: report.issues,
        }, null, 2));
        return;
    }

    const errorCount = formatReport(report);
    if (errorCount > 0) {
        process.exitCode = 1;
    }
}

if (isMainModule()) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
