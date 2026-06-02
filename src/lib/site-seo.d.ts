import type { RSSFeedItem } from '@astrojs/rss';
import type { SitemapItem } from '@astrojs/sitemap';

export const SITE_LANGUAGE: 'zh-CN';
export const SITEMAP_INDEX_PATH: '/sitemap-index.xml';

export interface RssSourceEntry {
    id: string;
    data: {
        title: string;
        date: string;
        excerpt: string;
        category: string;
        tags: string[];
        status?: string | undefined;
    };
}

export function isPublishedStatus(status?: string): boolean;
export function contentDateToUtcDate(value: string): Date;
export function buildRssItems(entries: RssSourceEntry[]): RSSFeedItem[];
export function createRssChannelCustomData(items: RSSFeedItem[]): string;
export function shouldIncludeSitemapPage(page: string): boolean;
export function serializeSitemapItem(item: SitemapItem): SitemapItem | undefined;
export function buildRobotsTxt(site?: string | URL): string;
