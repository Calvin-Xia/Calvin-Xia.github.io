import { parseDateValue } from './shared-content.js';

export const SITE_LANGUAGE = 'zh-CN';
export const SITEMAP_INDEX_PATH = '/sitemap-index.xml';
export const SITE_NAME = 'Calvin Xia';
export const DEFAULT_OG_IMAGE_PATH = '/og/default.png';

const defaultSiteUrl = 'https://calvin-xia.cn';
const excludedSitemapRoots = ['/new-post', '/styleguide'];
const statusPagePattern = /^\/(?:404|500)(?:\.html)?$/;

export function isPublishedStatus(status) {
    return status !== 'draft';
}

export function contentDateToUtcDate(value) {
    const timestamp = parseDateValue(value);

    if (!Number.isFinite(timestamp)) {
        throw new Error(`Invalid content date "${value}"`);
    }

    return new Date(timestamp);
}

export function buildRssItems(entries) {
    return entries
        .map((entry) => ({
            entry,
            pubDate: contentDateToUtcDate(entry.data.date),
        }))
        .sort((left, right) => right.pubDate.getTime() - left.pubDate.getTime() || left.entry.id.localeCompare(right.entry.id, 'zh-CN'))
        .map(({ entry, pubDate }) => ({
            title: entry.data.title,
            description: entry.data.excerpt,
            pubDate,
            link: `/articles/${entry.id}/`,
            categories: getRssCategories(entry.data),
        }));
}

export function createRssChannelCustomData(items) {
    const latestPubDate = items
        .map((item) => item.pubDate)
        .filter((date) => date instanceof Date && Number.isFinite(date.getTime()))
        .sort((left, right) => right.getTime() - left.getTime())[0];

    const lastBuildDate = latestPubDate ? `<lastBuildDate>${latestPubDate.toUTCString()}</lastBuildDate>` : '';
    return `<language>${SITE_LANGUAGE}</language>${lastBuildDate}`;
}

export function shouldIncludeSitemapPage(page) {
    const pathname = stripTrailingSlash(getPagePathname(page));

    if (statusPagePattern.test(pathname)) {
        return false;
    }

    return !excludedSitemapRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function serializeSitemapItem(item) {
    if (!shouldIncludeSitemapPage(item.url)) {
        return undefined;
    }

    return {
        ...item,
        ...getSitemapHints(getPagePathname(item.url)),
    };
}

export function buildRobotsTxt(site = defaultSiteUrl) {
    const siteUrl = site instanceof URL ? site : new URL(String(site || defaultSiteUrl));
    const sitemapUrl = new URL(SITEMAP_INDEX_PATH, siteUrl).href;

    return [
        'User-agent: *',
        'Allow: /',
        'Disallow: /new-post/',
        'Disallow: /styleguide/',
        '',
        `Sitemap: ${sitemapUrl}`,
        '',
    ].join('\n');
}

export function buildCanonicalUrl(path = '/', { siteUrl = defaultSiteUrl } = {}) {
    return new URL(path || '/', siteUrl).toString();
}

export function buildSocialMeta({
    title,
    description,
    path = '/',
    image = '',
    type = 'website',
    publishedTime = '',
} = {}, { siteUrl = defaultSiteUrl } = {}) {
    const canonical = buildCanonicalUrl(path, { siteUrl });
    const ogImage = new URL(image || DEFAULT_OG_IMAGE_PATH, siteUrl).toString();
    const tags = [
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:type', content: type },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        { property: 'og:image', content: ogImage },
        { property: 'og:locale', content: SITE_LANGUAGE },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
    ];

    if (publishedTime) {
        tags.push({ property: 'article:published_time', content: publishedTime });
    }

    return { canonical, ogImage, tags };
}

export function buildBlogPostingJsonLd({
    title,
    description,
    canonical,
    image,
    datePublished,
    author = SITE_NAME,
} = {}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        image,
        datePublished,
        author: { '@type': 'Person', name: author },
        publisher: { '@type': 'Person', name: author },
        mainEntityOfPage: canonical,
    };
}

export function buildWebSiteJsonLd({ siteUrl = defaultSiteUrl, name = SITE_NAME } = {}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name,
        url: buildCanonicalUrl('/', { siteUrl }),
    };
}

function getRssCategories(data) {
    return Array.from(new Set([data.category, ...(data.tags || [])].filter(Boolean)));
}

function getPagePathname(page) {
    return new URL(String(page || '/'), defaultSiteUrl).pathname || '/';
}

function stripTrailingSlash(pathname) {
    if (pathname === '/') {
        return pathname;
    }

    return pathname.replace(/\/+$/, '');
}

function normalizeDirectoryPathname(pathname) {
    if (pathname === '/' || /\.[a-z0-9]+$/i.test(pathname)) {
        return pathname;
    }

    return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function getSitemapHints(pathname) {
    const normalizedPathname = normalizeDirectoryPathname(pathname);

    if (normalizedPathname === '/') {
        return { changefreq: 'weekly', priority: 1 };
    }

    if (normalizedPathname === '/articles/') {
        return { changefreq: 'weekly', priority: 0.8 };
    }

    if (normalizedPathname.startsWith('/articles/')) {
        return {
            changefreq: 'monthly',
            priority: 0.7,
            ...getArticleLastmod(normalizedPathname),
        };
    }

    if (normalizedPathname === '/works/') {
        return { changefreq: 'monthly', priority: 0.8 };
    }

    if (normalizedPathname === '/works/tools/' || normalizedPathname === '/markdown-tool/') {
        return { changefreq: 'monthly', priority: 0.7 };
    }

    if (normalizedPathname.startsWith('/updates/')) {
        return { changefreq: 'monthly', priority: 0.6 };
    }

    if (normalizedPathname === '/about/') {
        return { changefreq: 'yearly', priority: 0.5 };
    }

    return { changefreq: 'monthly', priority: 0.5 };
}

function getArticleLastmod(pathname) {
    const dateMatch = pathname.match(/^\/articles\/(\d{4})(\d{2})(\d{2})[^/]*\/$/);

    if (!dateMatch) {
        return {};
    }

    const [, year, month, day] = dateMatch;
    const date = `${year}-${month}-${day}`;
    return Number.isFinite(parseDateValue(date)) ? { lastmod: date } : {};
}
