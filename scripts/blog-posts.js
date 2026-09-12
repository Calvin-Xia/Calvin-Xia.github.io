import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export async function listPostFiles(contentDir) {
    let entries;
    try {
        entries = await readdir(contentDir, { withFileTypes: true });
    } catch (error) {
        if (error?.code === 'ENOENT') {
            throw new Error(`目录不存在: ${contentDir}`);
        }
        throw error;
    }

    return entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
        .map((entry) => path.join(contentDir, entry.name))
        .sort((a, b) => path.basename(a).localeCompare(path.basename(b), 'zh-CN'));
}

export async function readPostFile(filePath) {
    const raw = await readFile(filePath, 'utf8');
    const parsed = matter(raw);

    return {
        filePath,
        fileName: path.basename(filePath),
        frontmatter: parsed.data || {},
        body: parsed.content || '',
    };
}
