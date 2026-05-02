import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    buildMarkdownDocument,
    encodeUrlPath,
    normalizeTags,
    transformMarkdownAssetLinks,
} from './markdown-utils.js';
import { deriveAssetSlug, slugifyTitle } from './slug.js';

function compactDate(date) {
    return String(date || '').replaceAll('-', '');
}

export function validatePostPayload(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const title = String(source.title || '').trim();
    const date = String(source.date || '').trim();
    const errors = {};

    if (!title) {
        errors.title = '标题不能为空';
    }

    if (!date) {
        errors.date = '日期不能为空';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.date = '日期格式必须为 YYYY-MM-DD';
    }

    if (Object.keys(errors).length > 0) {
        return { errors, value: null };
    }

    return {
        errors: null,
        value: {
            title,
            date,
            excerpt: String(source.excerpt || '').trim(),
            category: String(source.category || '未分类').trim() || '未分类',
            tags: normalizeTags(source.tags),
            body: String(source.body || '').trim(),
        },
    };
}

export async function createPostFile(post, { contentDir = path.join(process.cwd(), 'src', 'content', 'blog') } = {}) {
    const slug = slugifyTitle(post.title);
    const entrySlug = `${compactDate(post.date)}-${slug}`;
    const filePath = path.join(contentDir, `${entrySlug}.md`);

    await mkdir(contentDir, { recursive: true });
    await writeFile(filePath, buildMarkdownDocument(post), { encoding: 'utf8', flag: 'wx' });

    return {
        entrySlug,
        filePath,
        articleUrl: `/articles/${entrySlug}/`,
    };
}

async function fileExists(filePath) {
    try {
        await access(filePath, fsConstants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function walkFiles(dirPath, baseDir = dirPath) {
    if (!(await fileExists(dirPath))) {
        return [];
    }

    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walkFiles(entryPath, baseDir));
        } else if (entry.isFile()) {
            files.push({
                path: entryPath,
                relativePath: path.relative(baseDir, entryPath).replace(/\\/g, '/'),
            });
        }
    }

    return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'zh-CN'));
}

export async function buildPublishPlan({ vaultDir, dirName, outputDir, publicUrl }) {
    const postDir = path.resolve(vaultDir, dirName);
    const entries = await readdir(postDir, { withFileTypes: true });
    const markdownFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
        .map((entry) => path.join(postDir, entry.name));

    if (markdownFiles.length === 0) {
        throw new Error(`No markdown file found in ${postDir}`);
    }

    if (markdownFiles.length > 1) {
        throw new Error(`Expected one markdown file in ${postDir}, found ${markdownFiles.length}`);
    }

    const assetSlug = deriveAssetSlug(dirName);
    const assetDirEntry = entries.find((entry) => entry.isDirectory() && entry.name.toLowerCase() === 'file');
    const assetDir = assetDirEntry ? path.join(postDir, assetDirEntry.name) : path.join(postDir, 'file');
    const assetFiles = await walkFiles(assetDir);

    return {
        dirName,
        postDir,
        sourceMarkdownPath: markdownFiles[0],
        destinationMarkdownPath: path.join(outputDir, `${dirName}.md`),
        assetSlug,
        publicUrl,
        assets: assetFiles.map((asset) => ({
            ...asset,
            key: `${assetSlug}/${asset.relativePath}`,
            publicUrl: `${String(publicUrl || '').replace(/\/+$/, '')}/${encodeUrlPath(assetSlug)}/${encodeUrlPath(asset.relativePath)}`,
        })),
    };
}

export async function readTransformedMarkdown(plan) {
    const markdown = await readFile(plan.sourceMarkdownPath, 'utf8');
    return transformMarkdownAssetLinks(markdown, {
        publicUrl: plan.publicUrl,
        assetSlug: plan.assetSlug,
    });
}
