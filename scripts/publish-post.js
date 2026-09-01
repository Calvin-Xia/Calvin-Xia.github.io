import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import prompts from 'prompts';
import { getContentType } from './content-types.js';
import { buildPublishPlan, deriveDateFromDirName, readTransformedMarkdown } from './post-utils.js';

dotenv.config({ quiet: true });

const rootDir = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(rootDir, 'src', 'content', 'blog');

export function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}

export function validatePublishEnvs({ dryRun = false, env = process.env } = {}) {
    const required = ['OKP_VAULT', 'R2_PUBLIC_URL'];
    if (!dryRun) {
        required.push('R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET');
    }

    const missing = required.filter((name) => !env[name]);
    if (missing.length > 0) {
        throw new Error(`Missing required env var(s): ${missing.join(', ')}`);
    }

    return required;
}

export function createR2Client() {
    return new S3Client({
        region: 'auto',
        endpoint: requireEnv('R2_ENDPOINT'),
        credentials: {
            accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
            secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
        },
    });
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadAssetWithRetry(asset, {
    bucket,
    client,
    logger,
    maxAttempts,
    retryDelayBaseMs,
}) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: asset.key,
                Body: createReadStream(asset.path),
                ContentType: getContentType(asset.path),
            }));
            logger.log(`Uploaded ${asset.relativePath} -> ${asset.publicUrl}`);
            return;
        } catch (error) {
            if (attempt >= maxAttempts) {
                throw error;
            }

            logger.warn?.(
                `Upload failed for ${asset.relativePath}, retrying (${attempt + 1}/${maxAttempts})...`,
            );
            await delay(retryDelayBaseMs * 2 ** (attempt - 1));
        }
    }
}

export async function uploadAssets(plan, {
    bucket = requireEnv('R2_BUCKET'),
    client = createR2Client(),
    logger = console,
    maxAttempts = 3,
    retryDelayBaseMs = 300,
} = {}) {
    if (!plan.assets.length) {
        logger.log('No local assets found under file/.');
        return;
    }

    const failures = [];

    for (const asset of plan.assets) {
        try {
            await uploadAssetWithRetry(asset, {
                bucket,
                client,
                logger,
                maxAttempts,
                retryDelayBaseMs,
            });
        } catch (error) {
            failures.push({ asset, error });
            logger.warn?.(`Upload failed permanently for ${asset.relativePath}`);
        }
    }

    if (failures.length > 0) {
        const summary = failures
            .map(({ asset, error }) => {
                const message = error instanceof Error ? error.message : String(error);
                return `${asset.relativePath}: ${message}`;
            })
            .join('; ');
        const aggregateError = new AggregateError(
            failures.map(({ error }) => error),
            `Failed to upload ${failures.length} asset(s): ${summary}`,
        );
        aggregateError.failures = failures;
        throw aggregateError;
    }
}

function printPlan(plan, logger = console) {
    logger.log(`Source markdown: ${plan.sourceMarkdownPath}`);
    logger.log(`Destination markdown: ${plan.destinationMarkdownPath}`);
    logger.log(`Asset prefix: ${plan.assetSlug}/`);

    if (!plan.assets.length) {
        logger.log('Assets: none');
        return;
    }

    logger.log('Assets:');
    for (const asset of plan.assets) {
        logger.log(`- ${asset.relativePath} -> ${asset.key}`);
    }
}

export async function executePublishPlan(plan, {
    dryRun = false,
    logger = console,
    mkdir: makeDir = mkdir,
    writeFile: writeMarkdown = writeFile,
    uploadAssets: uploadPlanAssets = uploadAssets,
    readTransformedMarkdown: readMarkdown = readTransformedMarkdown,
} = {}) {
    if (dryRun) {
        logger.log('Dry run only. No markdown will be written and no R2 assets will be uploaded.');
        return;
    }

    const transformedMarkdown = await readMarkdown(plan);

    // Upload before writing: a failed upload must never leave markdown behind with dead R2 links.
    await uploadPlanAssets(plan);

    await makeDir(outputDir, { recursive: true });
    await writeMarkdown(plan.destinationMarkdownPath, transformedMarkdown, 'utf8');
    logger.log(`Copied markdown -> ${path.relative(rootDir, plan.destinationMarkdownPath)}`);
    logger.log('Replaced markdown asset links in copied file.');
}

export function parsePublishArgs(argv = process.argv.slice(2)) {
    const args = argv.map((arg) => arg.trim()).filter(Boolean);
    const knownFlags = new Set(['--dry-run', '--help']);
    const help = args.includes('--help');
    const dryRun = args.includes('--dry-run');
    const unknownFlags = args.filter((arg) => arg.startsWith('-') && !knownFlags.has(arg));
    const dirName = args.find((arg) => !arg.startsWith('-')) || '';

    return { dirName, dryRun, help, unknownFlags };
}

function printPublishUsage(logger = console) {
    logger.log([
        'Usage: npm run publish -- [--dry-run] <obsidian-post-dir>',
        '',
        'Options:',
        '  --dry-run    预览发布计划，不写 markdown、不上传 R2',
        '  --help       显示本帮助',
        '',
        'Examples:',
        '  npm run publish -- --dry-run 20260429-my-new-post',
        '  npm run publish -- 20260429-my-new-post',
    ].join('\n'));
}

async function promptForDirName() {
    const rl = createInterface({ input, output });
    try {
        return (await rl.question('请输入 Obsidian 文章目录名（如 20260429-my-new-post）：')).trim();
    } finally {
        rl.close();
    }
}

async function confirmPlan() {
    const rl = createInterface({ input, output });
    try {
        const answer = (await rl.question('确认执行发布？(y/N) ')).trim().toLowerCase();
        return answer === 'y' || answer === 'yes';
    } finally {
        rl.close();
    }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function promptForPostMetadata(dirName, {
    createInterface: openInterface = createInterface,
    logger = console,
} = {}) {
    const rl = openInterface({ input, output });
    const derivedDate = deriveDateFromDirName(dirName);
    try {
        logger.log('\n请输入文章元数据：');
        const title = (await rl.question('标题: ')).trim();
        if (!title) throw new Error('标题不能为空');

        const dateHint = DATE_PATTERN.test(derivedDate) ? derivedDate : 'YYYY-MM-DD';
        let date = '';
        while (!DATE_PATTERN.test(date)) {
            const answer = (await rl.question(`日期 [${dateHint}]: `)).trim();
            date = answer || (DATE_PATTERN.test(dateHint) ? dateHint : '');
            if (!DATE_PATTERN.test(date)) {
                logger.log('日期不能为空，且必须为 YYYY-MM-DD 格式（如 2026-06-03）');
            }
        }

        const excerpt = (await rl.question('摘要: ')).trim();
        const category = (await rl.question('分类 [未分类]: ')).trim() || '未分类';
        const tagsInput = (await rl.question('标签 (逗号分隔) [未分类]: ')).trim();
        const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : ['未分类'];

        return { title, date, excerpt, category, tags };
    } finally {
        rl.close();
    }
}

export async function promptForFileSelection(markdownFiles, {
    prompts: promptUser = prompts,
} = {}) {
    if (!markdownFiles.length) {
        return null;
    }

    const choices = markdownFiles.map((file) => ({
        title: file,
        value: file,
    }));

    const { files } = await promptUser({
        type: 'multiselect',
        name: 'files',
        message: '选择要发布的 Markdown 文件（空格选择/取消，回车确认）：',
        choices,
        hint: '- 空格选择/取消，方向键移动，回车确认',
    });

    if (!files || files.length === 0) {
        return null;
    }

    const { confirmed } = await promptUser({
        type: 'confirm',
        name: 'confirmed',
        message: `将按此顺序发布: [${files.join(', ')}] — 确认？`,
        initial: true,
    });

    if (!confirmed) {
        return null;
    }

    return files;
}

async function main() {
    console.log('Obsidian Post Publisher');

    const { dirName: directDirName, dryRun, help, unknownFlags } = parsePublishArgs();
    if (help) {
        printPublishUsage();
        return;
    }
    if (unknownFlags.length > 0) {
        console.warn(`忽略未知参数: ${unknownFlags.join(', ')}（支持的 flag: --dry-run、--help）`);
    }
    validatePublishEnvs({ dryRun });
    const dirName = directDirName || await promptForDirName();
    if (!dirName) {
        throw new Error('Post directory name is required');
    }

    const plan = await buildPublishPlan({
        vaultDir: requireEnv('OKP_VAULT'),
        dirName,
        outputDir,
        publicUrl: requireEnv('R2_PUBLIC_URL'),
    });

    // Multi-md path: plan is an array
    if (Array.isArray(plan)) {
        if (dryRun) {
            console.log(`Found ${plan.length} markdown files.`);
            for (const p of plan) {
                printPlan(p);
            }
            console.log('Dry run complete.');
            return;
        }

        const selectedFiles = await promptForFileSelection(
            plan.map((p) => p.sourceMarkdownPath),
        );
        if (!selectedFiles) {
            console.log('Publish canceled.');
            return;
        }

        const orderedPlans = selectedFiles
            .map((file) => plan.find((p) => p.sourceMarkdownPath === file))
            .filter(Boolean);

        for (const p of orderedPlans) {
            p.metadata = await promptForPostMetadata(p.dirName);
        }

        if (!directDirName) {
            const confirmed = await confirmPlan();
            if (!confirmed) {
                console.log('Publish canceled.');
                return;
            }
        }

        // Every plan shares the same asset set (same assetSlug); upload once so N files do not re-upload it.
        await uploadAssets(orderedPlans[0]);

        for (const p of orderedPlans) {
            await executePublishPlan(p, { dryRun: false, uploadAssets: async () => {} });
        }
        console.log('Publish complete.');
        return;
    }

    // Single-md path: existing flow
    printPlan(plan);

    if (!dryRun) {
        plan.metadata = await promptForPostMetadata(plan.dirName);
    }

    if (!directDirName) {
        const confirmed = await confirmPlan();
        if (!confirmed) {
            console.log('Publish canceled.');
            return;
        }
    }

    await executePublishPlan(plan, { dryRun });
    console.log(dryRun ? 'Dry run complete.' : 'Publish complete.');
}

function isMainModule() {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
