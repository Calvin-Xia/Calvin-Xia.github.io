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
        assert.match(rssSource, /status\s*!==?\s*['"]draft['"]/);
        assert.match(rssSource, /site:/);
        assert.match(rssSource, /title:/);
        assert.match(rssSource, /description:/);
        assert.match(rssSource, /pubDate:/);
        assert.match(rssSource, /link:/);
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

    test('sitemap filter excludes new-post page', () => {
        const configSource = readFile('astro.config.mjs');
        assert.match(configSource, /new-post/);
    });

    test('sitemap filter uses endsWith for precise 404 matching', () => {
        const configSource = readFile('astro.config.mjs');

        assert.match(configSource, /endsWith\('/);
        assert.match(configSource, /endsWith\('\/404'\)/);
        assert.match(configSource, /endsWith\('\/404\.html'\)/);
        assert.doesNotMatch(configSource, /includes\('\/404'\)/);
    });

    test('GiscusComments component renders with correct data attributes', () => {
        const componentSource = readFile('src', 'components', 'GiscusComments.astro');

        assert.match(componentSource, /class=['"]giscus['"]/);
        assert.match(componentSource, /data-repo=['"]Calvin-Xia\/mr\.xia\.github\.io['"]/);
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

    test('CSS defines giscus-fallback style for noscript content', () => {
        const cssSource = readFile('src', 'styles', 'global.css');

        assert.match(cssSource, /\.giscus-fallback/);
        assert.match(cssSource, /text-align:\s*center/);
    });
});
