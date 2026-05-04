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

function extractYamlFrontmatter(markdown) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) return { frontmatterStr: null, body: markdown };
    return { frontmatterStr: match[1], body: markdown.slice(match[0].length) };
}

function parseSimpleYaml(yamlStr) {
    if (!yamlStr) return {};
    const result = {};
    const lines = yamlStr.split('\n');
    let currentKey = null;

    for (const line of lines) {
        const keyMatch = line.match(/^(\w+):\s*(.*)/);
        if (keyMatch) {
            currentKey = keyMatch[1];
            const value = keyMatch[2].trim();
            const unquoted = value.replace(/^["']|["']$/g, '');
            if (unquoted) {
                result[currentKey] = unquoted;
            } else {
                result[currentKey] = [];
            }
        } else if (currentKey && Array.isArray(result[currentKey])) {
            const itemMatch = line.match(/^\s*-\s*(.*)/);
            if (itemMatch) {
                result[currentKey].push(itemMatch[1].trim().replace(/^["']|["']$/g, ''));
            }
        }
    }

    return result;
}

export function deriveDateFromDirName(dirName) {
    const match = String(dirName).match(/^(\d{4})(\d{2})(\d{2})/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return '';
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
    const { frontmatterStr, body } = extractYamlFrontmatter(markdown);
    const sourceMeta = parseSimpleYaml(frontmatterStr);

    const transformedBody = transformMarkdownAssetLinks(body, {
        publicUrl: plan.publicUrl,
        assetSlug: plan.assetSlug,
    });

    const userMeta = plan.metadata || {};

    const post = {
        title: userMeta.title || sourceMeta.title || plan.dirName,
        date: userMeta.date || sourceMeta.date || deriveDateFromDirName(plan.dirName),
        excerpt: userMeta.excerpt || sourceMeta.excerpt || '',
        category: userMeta.category || sourceMeta.category || '未分类',
        tags: userMeta.tags || sourceMeta.tags || [],
        body: transformedBody,
        featured: userMeta.featured ?? sourceMeta.featured,
        author: userMeta.author || sourceMeta.author,
        readTime: userMeta.readTime || sourceMeta.readTime,
        status: userMeta.status || sourceMeta.status,
    };

    return buildMarkdownDocument(post);
}
