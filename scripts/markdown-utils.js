export function normalizeTags(tags) {
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag || '').trim()).filter(Boolean);
    }

    return String(tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function yamlString(value) {
    return JSON.stringify(String(value || ''));
}

export function buildMarkdownDocument(post) {
    const tags = normalizeTags(post.tags);
    const frontmatter = [
        '---',
        `title: ${yamlString(post.title)}`,
        `date: ${yamlString(post.date)}`,
        `excerpt: ${yamlString(post.excerpt)}`,
        `category: ${yamlString(post.category)}`,
        'tags:',
        ...tags.map((tag) => `  - ${yamlString(tag)}`),
    ];

    if (post.hero) {
        frontmatter.push(`hero: ${yamlString(post.hero)}`);
    }

    if (Array.isArray(post.imageDimensions) && post.imageDimensions.length > 0) {
        frontmatter.push('imageDimensions:');
        for (const item of post.imageDimensions) {
            frontmatter.push(`  - path: ${yamlString(item.path)}`);
            frontmatter.push(`    width: ${Number(item.width)}`);
            frontmatter.push(`    height: ${Number(item.height)}`);
        }
    }

    if (post.featured !== undefined) {
        frontmatter.push(`featured: ${Boolean(post.featured)}`);
    }

    if (post.author) {
        frontmatter.push(`author: ${yamlString(post.author)}`);
    }

    if (post.readTime) {
        frontmatter.push(`readTime: ${yamlString(post.readTime)}`);
    }

    if (post.status) {
        frontmatter.push(`status: ${yamlString(post.status)}`);
    }

    frontmatter.push('---', '', '');

    return `${frontmatter.join('\n')}${String(post.body || '').trim()}\n`;
}

export function encodeUrlPath(pathValue) {
    return String(pathValue || '')
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

export function transformMarkdownAssetLinks(markdown, { publicUrl, assetSlug }) {
    const baseUrl = String(publicUrl || '').replace(/\/+$/, '');
    const safeAssetSlug = encodeUrlPath(assetSlug);

    return String(markdown || '').replace(/(!?\[[^\]]*]\()\s*(?:\.\/|\.)?file\/([^)]+)\)/gi, (_match, prefix, assetPath) => {
        const cleanAssetPath = String(assetPath || '').trim().replace(/^\/+/, '');
        return `${prefix}${baseUrl}/${safeAssetSlug}/${encodeUrlPath(cleanAssetPath)})`;
    });
}
