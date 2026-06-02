import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { buildRssItems, createRssChannelCustomData, isPublishedStatus } from '../lib/site-seo.js';

export async function GET(context: APIContext) {
    const posts = await getCollection('blog', ({ data }) => isPublishedStatus(data.status));
    const items = buildRssItems(posts);

    return rss({
        title: 'Mr.Xia - 个人小站',
        description: 'Mr.Xia的个人网站 - 记录生活、技术与思考',
        site: context.site ?? new URL('https://calvin-xia.cn'),
        items,
        customData: createRssChannelCustomData(items),
    });
}
