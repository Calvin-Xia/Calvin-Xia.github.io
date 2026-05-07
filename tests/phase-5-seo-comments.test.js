import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

function readFile(...segments) {
    return readFileSync(projectPath(...segments), 'utf8');
}

async function loadSiteSeo() {
    return import('../src/lib/site-seo.js');
}

describe('Phase 5 SEO and comments', () => {
    test('package.json lists @astrojs/rss and @astrojs/sitemap as dependencies', () => {
        const pkg = JSON.parse(readFile('package.json'));

        assert.ok(pkg.dependencies['@astrojs/rss'], '@astrojs/rss should be in dependencies');
        assert.ok(pkg.dependencies['@astrojs/sitemap'], '@astrojs/sitemap should be in dependencies');
    });

    test('RSS endpoint generates valid XML with blog collection items', () => {
        const rssSource = readFile('src', 'pages', 'rss.xml.ts');

        assert.match(rssSource, /from\s+['"]@astrojs\/rss['"]/);
        assert.match(rssSource, /from\s+['"]astro:content['"]/);
        assert.match(rssSource, /getCollection\('blog'/);
        assert.match(rssSource, /isPublishedStatus/);
        assert.match(rssSource, /buildRssItems/);
        assert.match(rssSource, /createRssChannelCustomData/);
        assert.match(rssSource, /site:/);
        assert.match(rssSource, /title:/);
        assert.match(rssSource, /description:/);
        assert.doesNotMatch(rssSource, /new Date\(post\.data\.date\)/);
    });

    test('RSS endpoint uses APIContext type annotation', () => {
        const rssSource = readFile('src', 'pages', 'rss.xml.ts');

        assert.match(rssSource, /import\s+type\s+\{\s*APIContext\s*\}\s+from\s+['"]astro['"]/);
        assert.match(rssSource, /GET\(context:\s*APIContext\)/);
    });

    test('astro config registers sitemap integration with filter', () => {
        const configSource = readFile('astro.config.mjs');

        assert.match(configSource, /from\s+['"]@astrojs\/sitemap['"]/);
        assert.match(configSource, /sitemap\(/);
        assert.match(configSource, /filter:/);
    });

    test('astro config delegates sitemap filtering and serialization to shared SEO helpers', () => {
        const configSource = readFile('astro.config.mjs');

        assert.match(configSource, /shouldIncludeSitemapPage/);
        assert.match(configSource, /serializeSitemapItem/);
        assert.match(configSource, /filter:\s*shouldIncludeSitemapPage/);
        assert.match(configSource, /serialize:\s*serializeSitemapItem/);
        assert.match(configSource, /namespaces:\s*\{/);
    });

    test('site SEO helper builds RSS items with strict dates, categories, and channel metadata', async () => {
        const {
            buildRssItems,
            createRssChannelCustomData,
            isPublishedStatus,
        } = await loadSiteSeo();

        const entries = [
            {
                id: '20260411-old',
                data: {
                    title: '旧文章',
                    date: '2026-04-11',
                    excerpt: '较早的摘要',
                    category: '技术',
                    tags: ['AI', '思考'],
                    status: 'active',
                },
            },
            {
                id: '20260503-new',
                data: {
                    title: '新文章',
                    date: '2026-05-03',
                    excerpt: '较新的摘要',
                    category: '随笔',
                    tags: ['劳动', '思考'],
                    status: undefined,
                },
            },
            {
                id: '20260504-draft',
                data: {
                    title: '草稿',
                    date: '2026-05-04',
                    excerpt: '不应进入 RSS',
                    category: '草稿',
                    tags: ['隐藏'],
                    status: 'draft',
                },
            },
        ];

        assert.equal(isPublishedStatus('draft'), false);
        assert.equal(isPublishedStatus('active'), true);
        assert.equal(isPublishedStatus(undefined), true);

        const items = buildRssItems(entries.filter((entry) => isPublishedStatus(entry.data.status)));

        assert.deepEqual(items.map((item) => item.title), ['新文章', '旧文章']);
        assert.equal(items[0].link, '/articles/20260503-new/');
        assert.equal(items[0].pubDate.toISOString(), '2026-05-03T00:00:00.000Z');
        assert.deepEqual(items[0].categories, ['随笔', '劳动', '思考']);
        assert.equal(
            createRssChannelCustomData(items),
            '<language>zh-CN</language><lastBuildDate>Sun, 03 May 2026 00:00:00 GMT</lastBuildDate>',
        );

        assert.throws(
            () =>
                buildRssItems([
                    {
                        id: '20260229-invalid',
                        data: {
                            title: '无效日期',
                            date: '2026-02-29',
                            excerpt: '不能悄悄进入 RSS',
                            category: '测试',
                            tags: [],
                        },
                    },
                ]),
            /Invalid content date "2026-02-29"/,
        );
    });

    test('site SEO helper excludes private sitemap pages and serializes SEO hints', async () => {
        const { serializeSitemapItem, shouldIncludeSitemapPage } = await loadSiteSeo();

        assert.equal(shouldIncludeSitemapPage('https://calvin-xia.cn/new-post/'), false);
        assert.equal(shouldIncludeSitemapPage('https://calvin-xia.cn/styleguide/'), false);
        assert.equal(shouldIncludeSitemapPage('https://calvin-xia.cn/404'), false);
        assert.equal(shouldIncludeSitemapPage('https://calvin-xia.cn/404.html'), false);
        assert.equal(shouldIncludeSitemapPage('https://calvin-xia.cn/500/'), false);
        assert.equal(shouldIncludeSitemapPage('https://calvin-xia.cn/articles/20260503-labors-day/'), true);

        assert.deepEqual(serializeSitemapItem({ url: 'https://calvin-xia.cn/' }), {
            url: 'https://calvin-xia.cn/',
            changefreq: 'weekly',
            priority: 1,
        });
        assert.deepEqual(serializeSitemapItem({ url: 'https://calvin-xia.cn/articles/20260503-labors-day/' }), {
            url: 'https://calvin-xia.cn/articles/20260503-labors-day/',
            changefreq: 'monthly',
            priority: 0.7,
            lastmod: '2026-05-03',
        });
        assert.deepEqual(serializeSitemapItem({ url: 'https://calvin-xia.cn/works/tools/' }), {
            url: 'https://calvin-xia.cn/works/tools/',
            changefreq: 'monthly',
            priority: 0.7,
        });
    });

    test('robots endpoint and helper advertise sitemap while excluding internal pages', async () => {
        const robotsSource = readFile('src', 'pages', 'robots.txt.ts');
        const { buildRobotsTxt } = await loadSiteSeo();
        const robots = buildRobotsTxt(new URL('https://calvin-xia.cn/'));

        assert.match(robotsSource, /buildRobotsTxt/);
        assert.match(robotsSource, /context\.site/);
        assert.match(robots, /User-agent: \*/);
        assert.match(robots, /Disallow: \/new-post\//);
        assert.match(robots, /Disallow: \/styleguide\//);
        assert.match(robots, /Sitemap: https:\/\/calvin-xia\.cn\/sitemap-index\.xml/);
    });

    test('GiscusComments component renders with correct data attributes', () => {
        const componentSource = readFile('src', 'components', 'GiscusComments.astro');

        assert.match(componentSource, /class=['"]giscus['"]/);
        assert.match(componentSource, /data-repo=['"]Calvin-Xia\/Calvin-Xia\.github\.io['"]/);
        assert.match(componentSource, /data-repo-id=['"]R_kgDOQimLyw['"]/);
        assert.match(componentSource, /data-category=['"]Show and tell['"]/);
        assert.match(componentSource, /data-category-id=['"]DIC_kwDOQimLy84C8XWc['"]/);
        assert.match(componentSource, /data-mapping=['"]pathname['"]/);
        assert.match(componentSource, /data-input-position=['"]top['"]/);
        assert.match(componentSource, /data-theme=['"]preferred_color_scheme['"]/);
        assert.match(componentSource, /data-lang=['"]zh-CN['"]/);
        assert.match(componentSource, /data-loading=['"]lazy['"]/);
        assert.match(componentSource, /giscus\.app\/client\.js/);
    });

    test('GiscusComments uses is:inline to prevent Astro script processing', () => {
        const componentSource = readFile('src', 'components', 'GiscusComments.astro');

        assert.match(componentSource, /is:inline/);
    });

    test('GiscusComments includes noscript fallback for disabled JavaScript', () => {
        const componentSource = readFile('src', 'components', 'GiscusComments.astro');

        assert.match(componentSource, /<noscript>/);
        assert.match(componentSource, /giscus-fallback/);
        assert.match(componentSource, /请启用 JavaScript 以加载评论功能。/);
    });

    test('article detail page includes GiscusComments component', () => {
        const articleSource = readFile('src', 'pages', 'articles', '[...slug].astro');

        assert.match(articleSource, /GiscusComments/);
    });

    test('GiscusComments is placed inside article but outside reading layout', () => {
        const articleSource = readFile('src', 'pages', 'articles', '[...slug].astro');

        const templateStart = articleSource.indexOf('---\n\n') + 4;
        const template = articleSource.slice(templateStart);

        const layoutClose = template.lastIndexOf('</div>');
        const giscusUse = template.lastIndexOf('GiscusComments');
        const articleClose = template.lastIndexOf('</article>');

        assert.ok(layoutClose < giscusUse, 'GiscusComments should appear after reading-layout closes');
        assert.ok(giscusUse < articleClose, 'GiscusComments should appear before article closes');
    });

    test('GiscusComments is a static component without client directives', () => {
        const componentSource = readFile('src', 'components', 'GiscusComments.astro');

        assert.doesNotMatch(componentSource, /client:/);
    });

    test('BaseLayout includes RSS auto-discovery link in head', () => {
        const layoutSource = readFile('src', 'layouts', 'BaseLayout.astro');

        assert.match(layoutSource, /rel=['"]alternate['"]\s+type=['"]application\/rss\+xml['"]/);
        assert.match(layoutSource, /href=['"]\/rss\.xml['"]/);
    });

    test('BaseLayout includes Umami Cloud tracker with explicit host URL', () => {
        const layoutSource = readFile('src', 'layouts', 'BaseLayout.astro');

        assert.match(layoutSource, /src=['"]https:\/\/cloud\.umami\.is\/script\.js['"]/);
        assert.match(layoutSource, /data-website-id=['"]d5b9f90c-e82b-4b57-ade7-ff6a3e5d8062['"]/);
        assert.match(layoutSource, /data-host-url=['"]https:\/\/cloud\.umami\.is['"]/);
    });

    test('CSP allows Umami script loading and analytics POST requests', () => {
        const headersSource = readFile('public', '_headers');
        const csp = headersSource.match(/Content-Security-Policy:\s*(.+)/)?.[1] || '';
        const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] || '';
        const connectSrc = csp.match(/connect-src\s+([^;]+)/)?.[1] || '';

        assert.match(scriptSrc, /https:\/\/cloud\.umami\.is/);
        assert.match(connectSrc, /https:\/\/cloud\.umami\.is/);
    });

    test('Footer hides sitemap link in dev mode via import.meta.env.PROD', () => {
        const footerSource = readFile('src', 'components', 'Footer.astro');

        assert.match(footerSource, /import\.meta\.env\.PROD/);
        assert.match(footerSource, /sitemap-index\.xml/);
    });

    test('Footer includes Umami share page next to site service links', () => {
        const footerSource = readFile('src', 'components', 'Footer.astro');

        assert.match(footerSource, /aria-label=['"]站点服务['"]/);
        assert.match(footerSource, /href=['"]https:\/\/cloud\.umami\.is\/share\/0cUyNR29irh71HZd['"]/);
        assert.match(footerSource, />Umami</);
        assert.match(footerSource, /target=['"]_blank['"]/);
        assert.match(footerSource, /rel=['"]noopener['"]/);
    });

    test('CSS defines giscus-fallback style for noscript content', () => {
        const cssSource = readFile('src', 'styles', 'global.css');

        assert.match(cssSource, /\.giscus-fallback/);
        assert.match(cssSource, /text-align:\s*center/);
    });
});
