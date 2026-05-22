// @ts-check
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { remarkBlockquoteBreaks } from './src/lib/remark-blockquote-breaks.js';
import { remarkMarkHighlight } from './src/lib/remark-mark-highlight.js';
import { serializeSitemapItem, shouldIncludeSitemapPage } from './src/lib/site-seo.js';

const defaultSiteUrl = 'https://calvin-xia.cn';
const cdnProxyReferer = 'https://workers.calvin-xia.cn/';

function normalizeSiteUrl(value = process.env.BASE_URL || defaultSiteUrl) {
    const siteUrl = String(value || '').trim() || defaultSiteUrl;
    return siteUrl.replace(/\/+$/, '');
}

function resolveAstroPrerenderEntrypoint() {
    const prerenderEntrypoint = fileURLToPath(import.meta.resolve('astro/entrypoints/prerender'));

    return {
        name: 'resolve-astro-prerender-entrypoint',
        enforce: 'pre',
        resolveId(id) {
            // Vite/Rollup may not resolve this bare Astro build input on Windows.
            if (id === 'astro/entrypoints/prerender') {
                return prerenderEntrypoint;
            }

            return null;
        },
    };
}

export default defineConfig({
    site: normalizeSiteUrl(),
    base: '/',
    outDir: './dist',
    integrations: [
        sitemap({
            filter: shouldIncludeSitemapPage,
            serialize: serializeSitemapItem,
            namespaces: {
                news: false,
                xhtml: false,
                image: false,
                video: false,
            },
        }),
    ],
    markdown: {
        shikiConfig: {
            themes: {
                light: 'github-light',
                dark: 'github-dark',
            },
            defaultColor: false,
        },
        remarkPlugins: [remarkBlockquoteBreaks, remarkMarkHighlight, remarkMath],
        rehypePlugins: [rehypeKatex],
    },
    vite: {
        plugins: [resolveAstroPrerenderEntrypoint()],
        server: {
            proxy: {
                '/__cdn/content': {
                    target: 'https://content.calvin-xia.cn',
                    changeOrigin: true,
                    headers: { Referer: cdnProxyReferer },
                    rewrite: (requestPath) => requestPath.replace(/^\/__cdn\/content/, ''),
                },
                '/__cdn/assets': {
                    target: 'https://assets.calvin-xia.cn',
                    changeOrigin: true,
                    headers: { Referer: cdnProxyReferer },
                    rewrite: (requestPath) => requestPath.replace(/^\/__cdn\/assets/, ''),
                },
            },
        },
    },
});
