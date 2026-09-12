import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { listPostFiles, readPostFile } from './blog-posts.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultContentDir = path.join(rootDir, 'src', 'content', 'blog');

export function filterPosts(posts, { category = '', tag = '' } = {}) {
    const categoryKey = category.trim().toLowerCase();
    const tagKey = tag.trim().toLowerCase();

    return posts.filter((post) => {
        if (categoryKey && String(post.category || '').toLowerCase() !== categoryKey) {
            return false;
        }
        if (tagKey && !(post.tags || []).some((item) => String(item || '').toLowerCase() === tagKey)) {
            return false;
        }
        return true;
    });
}

export async function collectPosts(contentDir) {
    const files = await listPostFiles(contentDir);
    const posts = [];

    for (const filePath of files) {
        const post = await readPostFile(filePath);
        posts.push({
            file: post.fileName,
            title: String(post.frontmatter.title || ''),
            date: String(post.frontmatter.date || ''),
            category: String(post.frontmatter.category || ''),
            tags: Array.isArray(post.frontmatter.tags) ? post.frontmatter.tags.map(String) : [],
        });
    }

    posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'));
    return posts;
}

export function formatPostList(posts, { logger = console } = {}) {
    for (const post of posts) {
        const tags = (post.tags || []).map((tag) => `#${tag}`).join(' ');
        logger.log(`${post.date}  ${post.title}  [${post.category}]  ${tags}`);
    }
    logger.log(`\n共 ${posts.length} 篇。`);
}

function printUsage(logger = console) {
    logger.log([
        'Usage: npm run list-posts [-- --json] [--category <c>] [--tag <t>] [--dir <markdown-dir>]',
        '',
        'Options:',
        '  --json        以 JSON 输出',
        '  --category <c>  按分类过滤（不区分大小写）',
        '  --tag <t>       按标签过滤（不区分大小写）',
        '  --dir <d>       指定 markdown 目录（默认 src/content/blog）',
        '  --help          显示本帮助',
    ].join('\n'));
}

function parseArgs(argv = process.argv.slice(2)) {
    const args = argv.map((arg) => arg.trim()).filter(Boolean);
    const options = { help: false, json: false, category: '', tag: '', dir: '' };
    const unknownFlags = [];

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--help') options.help = true;
        else if (arg === '--json') options.json = true;
        else if (arg === '--category') {
            options.category = args[index + 1] || '';
            index += 1;
        } else if (arg === '--tag') {
            options.tag = args[index + 1] || '';
            index += 1;
        } else if (arg === '--dir') {
            options.dir = args[index + 1] || '';
            index += 1;
        } else {
            unknownFlags.push(arg);
        }
    }

    if (unknownFlags.length > 0) {
        throw new Error(`未知参数: ${unknownFlags.join(', ')}（支持: --json --category --tag --dir --help）`);
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
    const posts = filterPosts(await collectPosts(contentDir), options);

    if (options.json) {
        console.log(JSON.stringify(posts, null, 2));
        return;
    }

    formatPostList(posts);
}

if (isMainModule()) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
