import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { createPostFile, validatePostPayload } from './post-utils.js';
import { CATEGORY_WHITELIST, TAG_MAX_COUNT, TAG_MIN_COUNT } from '../src/lib/content-taxonomy.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const defaultContentDir = path.join(rootDir, 'src', 'content', 'blog');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function todayLocalDate() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function parseNewPostArgs(argv = process.argv.slice(2)) {
    const args = argv.map((arg) => arg.trim()).filter(Boolean);
    const valueFlags = new Set(['--title', '--date', '--excerpt', '--category', '--tags', '--content-dir']);
    const values = { title: '', date: '', excerpt: '', category: '', tags: '', contentDir: '', help: false };
    const unknownFlags = [];

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--help') {
            values.help = true;
        } else if (valueFlags.has(arg)) {
            const next = args[index + 1];
            if (next === undefined || next.startsWith('--')) {
                throw new Error(`${arg} 缺少取值`);
            }
            values[arg === '--content-dir' ? 'contentDir' : arg.slice(2)] = next;
            index += 1;
        } else {
            unknownFlags.push(arg);
        }
    }

    if (unknownFlags.length > 0) {
        throw new Error(`未知参数: ${unknownFlags.join(', ')}（支持: --title --date --excerpt --category --tags --content-dir --help）`);
    }

    return values;
}

export async function runNewPost({ payload, contentDir }) {
    const validation = validatePostPayload(payload);

    if (validation.errors) {
        const detail = Object.entries(validation.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join('；');
        throw new Error(`元数据校验失败：${detail}`);
    }

    try {
        return await createPostFile(validation.value, { contentDir });
    } catch (error) {
        if (error?.code === 'EEXIST') {
            throw new Error('同名文章已存在（entrySlug 冲突）。如需修改请使用 npm run edit-metadata。');
        }
        throw error;
    }
}

export async function promptForNewPostMetadata({
    prompts: promptUser = prompts,
    dateDefault = todayLocalDate(),
} = {}) {
    const answers = await promptUser([
        {
            type: 'text',
            name: 'title',
            message: '标题:',
            validate: (value) => (String(value || '').trim() ? true : '标题不能为空'),
        },
        {
            type: 'text',
            name: 'date',
            message: '日期:',
            initial: dateDefault,
            validate: (value) => (DATE_PATTERN.test(String(value || '').trim()) ? true : '日期必须为 YYYY-MM-DD 格式'),
        },
        { type: 'text', name: 'excerpt', message: '摘要:' },
        {
            type: 'text',
            name: 'category',
            message: `分类 (${CATEGORY_WHITELIST.join('/')}):`,
            validate: (value) => (String(value || '').trim() ? true : '分类不能为空'),
        },
        {
            type: 'text',
            name: 'tags',
            message: '标签 (逗号分隔):',
            validate: (value) => (String(value || '').trim() ? true : '标签不能为空'),
        },
    ]);

    if (!answers || !String(answers.title || '').trim()) {
        throw new Error('已取消新建文章');
    }

    return {
        title: String(answers.title).trim(),
        date: String(answers.date || '').trim(),
        excerpt: String(answers.excerpt || '').trim(),
        category: String(answers.category || '').trim(),
        tags: String(answers.tags || '').trim(),
    };
}

function printUsage(logger = console) {
    logger.log([
        'Usage: npm run new-post [-- --title <t> --date <YYYY-MM-DD> ...] ',
        '',
        'Options:',
        '  --title <t>       文章标题（提供 title 与 date 时跳过交互）',
        '  --date <d>        日期 YYYY-MM-DD',
        '  --excerpt <e>     摘要',
        `  --category <c>    分类（必填，${CATEGORY_WHITELIST.join('/')}）`,
        `  --tags <a,b,c>    标签，逗号分隔（必填，${TAG_MIN_COUNT}-${TAG_MAX_COUNT} 个）`,
        '  --content-dir <d> 输出目录（默认 src/content/blog）',
        '  --help            显示本帮助',
        '',
        '写入规则与本地 API 一致：entrySlug 为 YYYYMMDD-标题拼音缩写，同名拒绝写入。',
    ].join('\n'));
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

async function main() {
    const parsed = parseNewPostArgs();
    if (parsed.help) {
        printUsage();
        return;
    }

    const contentDir = parsed.contentDir ? path.resolve(parsed.contentDir) : defaultContentDir;
    const nonInteractive = Boolean(parsed.title && parsed.date);
    const payload = nonInteractive
        ? {
            title: parsed.title,
            date: parsed.date,
            excerpt: parsed.excerpt,
            category: parsed.category,
            tags: parsed.tags,
        }
        : await promptForNewPostMetadata();

    const result = await runNewPost({ payload, contentDir });
    console.log(`已创建: ${path.relative(rootDir, result.filePath)}`);
    console.log(`访问路径: ${result.articleUrl}`);
}

if (isMainModule()) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
