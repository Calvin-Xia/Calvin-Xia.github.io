import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getCollection, render } from 'astro:content';
import { buildRssItems, createRssChannelCustomData, isPublishedStatus } from '../lib/site-seo.js';

export async function GET(context: APIContext) {
    const posts = await getCollection('blog', ({ data }) => isPublishedStatus(data.status));
    const container = await AstroContainer.create();

    const contentByLink = new Map<string, string>();
    for (const post of posts) {
        const { Content } = await render(post);
        contentByLink.set(`/articles/${post.id}/`, await container.renderToString(Content));
    }

    const items = buildRssItems(posts).map((item) => ({
        ...item,
        content: contentByLink.get(item.link) || '',
    }));

    return rss({
        title: 'Mr.Xia - 个人小站',
        description: 'Mr.Xia的个人网站 - 记录生活、技术与思考',
        site: context.site ?? new URL('https://calvin-xia.cn'),
        items,
        customData: createRssChannelCustomData(items),
    });
}
