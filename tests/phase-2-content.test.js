import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function projectPath(...segments) {
    return path.join(rootDir, ...segments);
}

async function assertFileExists(...segments) {
    const filePath = projectPath(...segments);
    await access(filePath);
    return filePath;
}

function readJson(...segments) {
    return JSON.parse(readFileSync(projectPath(...segments), 'utf8'));
}

function readFrontmatter(markdown) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, 'Markdown entry must start with YAML frontmatter');
    return match[1];
}

describe('Phase 2 content collections', () => {
    test('content config declares all required collections', async () => {
        const configPath = await assertFileExists('src', 'content.config.ts');
        const config = readFileSync(configPath, 'utf8');

        for (const collection of ['blog', 'works', 'tools', 'updates']) {
            assert.match(config, new RegExp(`\\b${collection}\\b`));
        }
    });

    test('environment example uses generic local paths only', async () => {
        const envExamplePath = await assertFileExists('.env.example');
        const envExample = readFileSync(envExamplePath, 'utf8');

        assert.match(envExample, /OKP_VAULT=C:\\path\\to\\your\\ObsidianVault/);
        assert.doesNotMatch(envExample, /Calvin-Xia/);
        assert.doesNotMatch(envExample, /C:\\Users\\[^\\\r\n]+\\Documents\\ObsidianNotes/);
    });

    test('blog loader only accepts dated markdown content files', async () => {
        const configPath = await assertFileExists('src', 'content.config.ts');
        const config = readFileSync(configPath, 'utf8');

        assert.match(config, /loader:\s*glob\(\{\s*pattern:\s*'\[0-9]\*\.md'/);
        assert.doesNotMatch(config, /loader:\s*glob\(\{\s*pattern:\s*'\*\*\/\*\.md'/);
    });

    test('six blog markdown files exist with required frontmatter', async () => {
        const metadata = readJson('blog', 'blog-metadata.json');

        for (const entry of metadata) {
            const filePath = await assertFileExists('src', 'content', 'blog', `${entry.id}.md`);
            const frontmatter = readFrontmatter(readFileSync(filePath, 'utf8'));

            assert.match(frontmatter, /title:\s*.+/);
            assert.match(frontmatter, /date:\s*["']?\d{4}-\d{2}-\d{2}["']?/);
            assert.match(frontmatter, /excerpt:\s*.+/);
            assert.match(frontmatter, /category:\s*.+/);
            assert.match(frontmatter, /tags:\s*\r?\n\s+-\s*.+/);
        }
    });

    test('2025 summary images point to the assets CDN root', async () => {
        const markdown = readFileSync(
            projectPath('src', 'content', 'blog', '20251231-2025年度总结.md'),
            'utf8',
        );

        assert.doesNotMatch(markdown, /2025summaryimage/);
        assert.doesNotMatch(markdown, /https:\/\/content\.calvin-xia\.cn\//);
        assert.match(markdown, /https:\/\/assets\.calvin-xia\.cn\/image_%E4%B8%AD%E7%A7%8B\.JPG/);
        assert.match(markdown, /https:\/\/assets\.calvin-xia\.cn\/image_%E7%BB%B5%E9%98%B33\.JPG/);
    });

    test('base layout keeps cross-origin image previews from sending localhost referrers', async () => {
        const layoutPath = await assertFileExists('src', 'layouts', 'BaseLayout.astro');
        const layout = readFileSync(layoutPath, 'utf8');

        assert.match(layout, /<meta\s+name="referrer"\s+content="same-origin"\s*\/>/);
    });

    test('astro config derives the canonical site URL from BASE_URL', async () => {
        const configPath = await assertFileExists('astro.config.mjs');
        const config = readFileSync(configPath, 'utf8');
        const envExample = readFileSync(projectPath('.env.example'), 'utf8');

        assert.match(config, /process\.env\.BASE_URL/);
        assert.match(config, /normalizeSiteUrl/);
        assert.match(config, /site:\s*normalizeSiteUrl\(\)/);
        assert.match(envExample, /BASE_URL=https:\/\/calvin-xia\.cn/);
        assert.doesNotMatch(config, /site:\s*['"]https:\/\/calvin-xia\.github\.io['"]/);
    });

    test('gitattributes pins source file line endings to LF', async () => {
        const gitattributesPath = await assertFileExists('.gitattributes');
        const gitattributes = readFileSync(gitattributesPath, 'utf8');

        for (const rule of [
            '* text=auto',
            '.gitattributes text eol=lf',
            '.gitignore text eol=lf',
            '*.mjs text eol=lf',
            '*.astro text eol=lf',
            '*.ts text eol=lf',
            '*.js text eol=lf',
            '*.json text eol=lf',
            '*.css text eol=lf',
            '*.md text eol=lf',
            '*.yml text eol=lf',
            '*.yaml text eol=lf',
        ]) {
            assert.match(gitattributes, new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        }
    });

    test('local dev server proxies CDN images with a production referrer', async () => {
        const config = readFileSync(projectPath('astro.config.mjs'), 'utf8');
        const layout = readFileSync(projectPath('src', 'layouts', 'BaseLayout.astro'), 'utf8');
        const proxyScriptPath = await assertFileExists('src', 'scripts', 'local-cdn-proxy.js');
        const proxyScript = readFileSync(proxyScriptPath, 'utf8');

        assert.match(config, /\/__cdn\/content/);
        assert.match(config, /\/__cdn\/assets/);
        assert.match(config, /Referer:\s*'https:\/\/calvin-xia\.cn\/'/);
        assert.match(layout, /enableLocalCdnProxy/);
        assert.match(layout, /local-cdn-proxy\.js\?url/);
        assert.doesNotMatch(layout, /new MutationObserver/);
        assert.doesNotMatch(layout, /__cdn\/content/);
        assert.match(proxyScript, /__cdn\/content/);
        assert.match(proxyScript, /__cdn\/assets/);
        assert.match(proxyScript, /if\s*\(\s*images\.length\s*===\s*0\s*\)\s*\{\s*return;/s);
        assert.match(proxyScript, /new MutationObserver/);
    });

    test('update log page uses structured collection data instead of legacy HTML extraction', async () => {
        const pagePath = await assertFileExists('src', 'pages', 'updates', '[...slug].astro');
        const page = readFileSync(pagePath, 'utf8');
        const update = readJson('src', 'content', 'updates', 'fingerprint-app-update-log.json');

        assert.doesNotMatch(page, /readFileSync/);
        assert.doesNotMatch(page, /UpdateLog\/fingerprint-app-update-log\.html/);
        assert.doesNotMatch(page, /set:html/);
        assert.ok(Array.isArray(update.timeline), 'update entry must contain a structured timeline');
        assert.equal(update.timeline[0].version, 'v2.0.0beta');
        assert.equal(update.timeline.at(-1).version, 'v1.1.1');
        assert.deepEqual(update.timeline[0].items[1], {
            type: 'new',
            label: '新增：',
            text: '新版指纹验证(beta)',
        });
    });

    test('article search scope is serialized in the payload instead of hardcoded in the client script', async () => {
        const pagePath = await assertFileExists('src', 'pages', 'articles.astro');
        const page = readFileSync(pagePath, 'utf8');

        assert.match(page, /const\s+searchableTypes\s*=\s*\[/);
        assert.match(page, /searchableTypes,/);
        assert.match(page, /new Set\(payload\.searchableTypes/);
        assert.doesNotMatch(page, /searchExcludedTypes/);
        assert.doesNotMatch(page, /new Set\(\['update-log'\]\)/);
    });

    test('new-post page keeps the local API endpoint out of production client code', async () => {
        const pagePath = await assertFileExists('src', 'pages', 'new-post.astro');
        const formPath = await assertFileExists('src', 'components', 'NewPostForm.astro');
        const page = readFileSync(pagePath, 'utf8');
        const form = readFileSync(formPath, 'utf8');
        const combinedSource = `${page}\n${form}`;

        assert.doesNotMatch(combinedSource, /http:\/\/localhost:4322\/api\/new-post/);
        assert.match(page, /import\.meta\.env\.DEV/);
        assert.match(page, /newPostApiBase/);
        assert.match(page, /await import\('\.\.\/components\/NewPostForm\.astro'\)/);
        assert.match(page, /<NewPostForm\s+categories=\{categories\}\s+today=\{today\}\s+apiBase=\{newPostApiBase\}/);
        assert.match(form, /data-api-base=\{apiBase\}/);
        assert.match(form, /\$\{apiBase\}\/api\/new-post/);
    });

    test('works, tools, and updates are split into schema-compatible JSON entries', async () => {
        const expectations = [
            ['works', readJson('content', 'works-metadata.json'), (entry) => entry.id.replace(/^work-/, '')],
            ['tools', readJson('content', 'tools-metadata.json'), (entry) => entry.id.replace(/^tool-/, '')],
            ['updates', readJson('content', 'update-logs-metadata.json'), () => 'fingerprint-app-update-log'],
        ];

        for (const [collection, entries, getFileId] of expectations) {
            for (const entry of entries) {
                const id = getFileId(entry);
                const filePath = await assertFileExists('src', 'content', collection, `${id}.json`);
                const json = readJson('src', 'content', collection, `${id}.json`);

                for (const key of ['title', 'date', 'excerpt', 'category', 'tags', 'filePath']) {
                    assert.ok(Object.hasOwn(json, key), `${filePath} missing ${key}`);
                }

                assert.ok(Array.isArray(json.tags), `${filePath} tags must be an array`);
            }
        }
    });
});
