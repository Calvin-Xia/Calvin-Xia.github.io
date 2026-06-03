import { readFile as defaultReadFile, rename as defaultRename, unlink as defaultUnlink, writeFile as defaultWriteFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import prompts from 'prompts';
import { z } from 'zod';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const blogMetadataSchema = z.object({
    title: z.string().min(1, '标题不能为空'),
    date: z.string().regex(datePattern, '日期格式必须为 YYYY-MM-DD'),
    excerpt: z.string(),
    category: z.string().min(1, '分类不能为空'),
    tags: z.array(z.string()),
    featured: z.boolean().optional(),
    author: z.string().optional(),
    readTime: z.string().optional(),
    status: z.string().optional(),
}).passthrough();

function cleanString(value) {
    return String(value ?? '').trim();
}

function stripUndefined(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

function normalizeTags(tags) {
    if (Array.isArray(tags)) {
        return tags.map(cleanString).filter(Boolean);
    }

    return cleanString(tags)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function setOptionalString(target, source, key) {
    const value = cleanString(source[key]);
    if (value) {
        target[key] = value;
    } else {
        delete target[key];
    }
}

function normalizeFeatured(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return undefined;
}

export function normalizePostMetadata(metadata) {
    const source = metadata && typeof metadata === 'object' ? metadata : {};
    const normalized = { ...source };

    normalized.title = cleanString(source.title);
    normalized.date = cleanString(source.date);
    normalized.excerpt = cleanString(source.excerpt);
    normalized.category = cleanString(source.category);
    const tags = normalizeTags(source.tags);
    normalized.tags = tags.length > 0 ? tags : ['未分类'];

    const featured = normalizeFeatured(source.featured);
    if (featured === undefined) {
        delete normalized.featured;
    } else {
        normalized.featured = featured;
    }

    setOptionalString(normalized, source, 'author');
    setOptionalString(normalized, source, 'readTime');
    setOptionalString(normalized, source, 'status');

    return normalized;
}

function formatValidationErrors(issues) {
    const errors = {};

    for (const issue of issues) {
        const key = String(issue.path[0] || 'metadata');
        if (!errors[key]) {
            errors[key] = issue.message;
        }
    }

    return errors;
}

export function validatePostMetadata(metadata, { skipValidation = false } = {}) {
    const normalized = normalizePostMetadata(metadata);

    if (skipValidation) {
        return { errors: null, value: normalized };
    }

    const result = blogMetadataSchema.safeParse(normalized);
    if (result.success) {
        return { errors: null, value: result.data };
    }

    return {
        errors: formatValidationErrors(result.error.issues),
        value: null,
    };
}

function parseMarkdown(markdown, filePath) {
    try {
        return matter(markdown);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid frontmatter in ${filePath}: ${message}`, { cause: error });
    }
}

function normalizeContent(content) {
    return String(content || '').replace(/^\r?\n/, '');
}

export async function readPostMetadata(filePath, {
    readFile = defaultReadFile,
} = {}) {
    const markdown = await readFile(filePath, 'utf8');
    if (!/^---\r?\n/.test(markdown)) {
        throw new Error('Markdown frontmatter is required before editing metadata');
    }

    const parsed = parseMarkdown(markdown, filePath);

    return {
        filePath,
        metadata: normalizePostMetadata(parsed.data),
        content: normalizeContent(parsed.content),
    };
}

function createTempPath(filePath) {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${filePath}.tmp-${suffix}`;
}

function createValidationError(errors) {
    const error = new Error('Metadata validation failed');
    error.errors = errors;
    return error;
}

export async function writePostMetadataAtomic(filePath, metadata, {
    readFile = defaultReadFile,
    writeFile = defaultWriteFile,
    rename = defaultRename,
    unlink = defaultUnlink,
    skipValidation = false,
    tempPath = createTempPath(filePath),
} = {}) {
    const current = await readPostMetadata(filePath, { readFile });
    const merged = { ...current.metadata, ...stripUndefined(metadata) };
    const validation = validatePostMetadata(merged, { skipValidation });

    if (validation.errors) {
        throw createValidationError(validation.errors);
    }

    const markdown = matter.stringify(current.content, validation.value);

    await writeFile(tempPath, markdown, 'utf8');

    try {
        await rename(tempPath, filePath);
    } catch (error) {
        await unlink(tempPath).catch((unlinkError) => {
            if (unlinkError?.code !== 'ENOENT') {
                throw unlinkError;
            }
        });
        throw error;
    }

    return {
        filePath,
        metadata: validation.value,
    };
}

function featuredInitialValue(metadata) {
    if (metadata.featured === true) return 1;
    if (metadata.featured === false) return 2;
    return 0;
}

export function createMetadataQuestions(currentMetadata) {
    const metadata = normalizePostMetadata(currentMetadata);

    return [
        {
            type: 'text',
            name: 'title',
            message: '标题',
            initial: metadata.title,
            validate: (value) => cleanString(value) ? true : '标题不能为空',
        },
        {
            type: 'text',
            name: 'date',
            message: '日期',
            initial: metadata.date,
            validate: (value) => datePattern.test(cleanString(value)) ? true : '日期格式必须为 YYYY-MM-DD',
        },
        {
            type: 'text',
            name: 'excerpt',
            message: '摘要',
            initial: metadata.excerpt,
        },
        {
            type: 'text',
            name: 'category',
            message: '分类',
            initial: metadata.category || '未分类',
            validate: (value) => cleanString(value) ? true : '分类不能为空',
        },
        {
            type: 'list',
            name: 'tags',
            message: '标签（逗号分隔）',
            initial: metadata.tags.join(', '),
            separator: ',',
        },
        {
            type: 'select',
            name: 'featured',
            message: '精选',
            initial: featuredInitialValue(metadata),
            choices: [
                { title: '保持当前', value: metadata.featured },
                { title: '是', value: true },
                { title: '否', value: false },
            ],
        },
        {
            type: 'text',
            name: 'author',
            message: '作者',
            initial: metadata.author || '',
        },
        {
            type: 'text',
            name: 'readTime',
            message: '阅读时间',
            initial: metadata.readTime || '',
        },
        {
            type: 'text',
            name: 'status',
            message: '状态',
            initial: metadata.status || '',
        },
        {
            type: 'toggle',
            name: 'skipValidation',
            message: '跳过 Schema 验证',
            initial: false,
            active: '是',
            inactive: '否',
        },
        {
            type: 'toggle',
            name: 'confirmed',
            message: '确认写入',
            initial: true,
            active: '是',
            inactive: '否',
        },
    ];
}

export async function collectMetadataEdits(currentMetadata, {
    prompts: promptUser = prompts,
} = {}) {
    const response = await promptUser(createMetadataQuestions(currentMetadata));
    const {
        skipValidation = false,
        confirmed = false,
        ...metadata
    } = response || {};

    return {
        metadata: normalizePostMetadata({ ...currentMetadata, ...metadata }),
        skipValidation: Boolean(skipValidation),
        confirmed: Boolean(confirmed),
    };
}

export function parseEditMetadataArgs(argv = process.argv.slice(2)) {
    const args = argv.map((arg) => arg.trim()).filter(Boolean);
    const help = args.includes('--help') || args.includes('-h');
    const skipValidation = args.includes('--skip-validation');
    const filePath = args.find((arg) => !arg.startsWith('-')) || '';

    return {
        filePath,
        skipValidation,
        help,
    };
}

function printUsage(logger = console) {
    logger.log([
        'Usage: npm run edit-metadata -- <markdown-file> [--skip-validation]',
        '',
        'Examples:',
        '  npm run edit-metadata -- src/content/blog/20260503-labors-day.md',
        '  npm run edit-metadata -- --skip-validation src/content/blog/20260503-labors-day.md',
    ].join('\n'));
}

async function promptForFilePath(promptUser) {
    const response = await promptUser({
        type: 'text',
        name: 'filePath',
        message: 'Markdown 文件路径',
        validate: (value) => cleanString(value) ? true : '文件路径不能为空',
    });

    return cleanString(response?.filePath);
}

function formatErrors(errors) {
    return Object.entries(errors)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
}

export async function runEditMetadata(argv = process.argv.slice(2), {
    cwd = process.cwd(),
    logger = console,
    prompts: promptUser = prompts,
} = {}) {
    const args = parseEditMetadataArgs(argv);

    if (args.help) {
        printUsage(logger);
        return { help: true };
    }

    const inputPath = args.filePath || await promptForFilePath(promptUser);
    if (!inputPath) {
        throw new Error('Markdown file path is required');
    }

    const filePath = path.resolve(cwd, inputPath);
    const current = await readPostMetadata(filePath);
    logger.log(`Editing metadata: ${path.relative(cwd, filePath)}`);

    const edits = await collectMetadataEdits(current.metadata, { prompts: promptUser });
    if (!edits.confirmed) {
        logger.log('Metadata edit canceled.');
        return { canceled: true };
    }

    const result = await writePostMetadataAtomic(filePath, edits.metadata, {
        skipValidation: args.skipValidation || edits.skipValidation,
    });
    logger.log(`Metadata updated: ${path.relative(cwd, filePath)}`);
    return result;
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
    runEditMetadata().catch((error) => {
        const message = error?.errors
            ? `Metadata validation failed:\n${formatErrors(error.errors)}`
            : String(error instanceof Error ? error.message : error);

        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    });
}
