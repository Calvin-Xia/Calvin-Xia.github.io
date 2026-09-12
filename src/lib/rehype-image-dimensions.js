// Injects width/height/loading/decoding onto <img> elements using the
// post's frontmatter imageDimensions manifest (Astro exposes frontmatter to
// rehype via file.data.astro.frontmatter). Raw HTML <img> tags stay untouched:
// without rehype-raw they are raw nodes, and their authors set sizes inline.

const CDN_HOST_SUFFIX = '.calvin-xia.cn';
const DEV_PROXY_PREFIX_PATTERN = /^\/__cdn\/(content|assets)\//;

function manifestPathFromSrc(src) {
    const value = String(src || '');
    if (!value) {
        return '';
    }

    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value);
            if (!parsed.hostname.endsWith(CDN_HOST_SUFFIX)) {
                return '';
            }
            return decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
        } catch {
            return '';
        }
    }

    if (DEV_PROXY_PREFIX_PATTERN.test(value)) {
        return decodeURIComponent(value.replace(DEV_PROXY_PREFIX_PATTERN, '')).replace(/^\/+/, '');
    }

    return '';
}

function visitImages(node, visitor) {
    if (!node || typeof node !== 'object') {
        return;
    }
    if (node.type === 'element' && node.tagName === 'img') {
        visitor(node);
    }
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            visitImages(child, visitor);
        }
    }
}

export default function rehypeImageDimensions() {
    return (tree, file) => {
        const manifest = file?.data?.astro?.frontmatter?.imageDimensions;
        if (!Array.isArray(manifest) || manifest.length === 0) {
            return;
        }

        const entriesByPath = new Map();
        for (const item of manifest) {
            if (
                item
                && typeof item.path === 'string'
                && Number.isFinite(item.width) && item.width > 0
                && Number.isFinite(item.height) && item.height > 0
            ) {
                entriesByPath.set(item.path.replace(/^\/+/, ''), item);
            }
        }
        if (entriesByPath.size === 0) {
            return;
        }

        let imageSeen = false;
        visitImages(tree, (node) => {
            const properties = node.properties || (node.properties = {});
            if (properties.width && properties.height) {
                imageSeen = true;
                return;
            }

            const entry = entriesByPath.get(manifestPathFromSrc(properties.src));
            if (!entry) {
                return;
            }

            properties.width = entry.width;
            properties.height = entry.height;
            properties.decoding = 'async';
            // The first matched image is a likely LCP candidate: keep it eager.
            properties.loading = imageSeen ? 'lazy' : 'eager';
            imageSeen = true;
        });
    };
}
