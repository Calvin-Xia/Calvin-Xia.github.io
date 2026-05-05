import assert from 'node:assert/strict';
import { access, readFile as readFileAsync } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
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

function readFile(...segments) {
    return readFileSync(projectPath(...segments), 'utf8');
}

async function readExistingFile(...segments) {
    const filePath = await assertFileExists(...segments);
    return readFileAsync(filePath, 'utf8');
}

describe('Phase 3 tool migration', () => {
    test('Header navigation no longer exposes a top-level tools item', () => {
        const header = readFile('src', 'components', 'Header.astro');

        assert.doesNotMatch(header, /label:\s*['"]工具['"]/);
        assert.doesNotMatch(header, /href:\s*['"]\/tools\/['"]/);
        for (const label of ['首页', '作品', '文章', '关于']) {
            assert.match(header, new RegExp(`label:\\s*['"]${label}['"]`));
        }
    });

    test('site entry links point to /works/tools instead of the removed /tools route', () => {
        const index = readFile('src', 'pages', 'index.astro');
        const works = readFile('src', 'pages', 'works.astro');
        const combined = `${index}\n${works}`;

        assert.doesNotMatch(combined, /href=["']\/tools\/["']/);
        assert.match(index, /href=["']\/works\/tools\/["']/);
        assert.match(works, /href=["']\/works\/tools\/["']/);
    });

    test('works page links to the nested tools route after the project cards', () => {
        const works = readFile('src', 'pages', 'works.astro');

        assert.doesNotMatch(works, /import\s+ToolsSection\s+from/);
        assert.doesNotMatch(works, /<ToolsSection\s*\/>/);
        assert.match(works, /href=["']\/works\/tools\/["']/);
        assert.match(works, /工具集/);
        assert.ok(
            works.indexOf('href="/works/tools/"') > works.indexOf('id="work-button-block-designer"'),
            'tools entry should render after the project cards',
        );
    });

    test('works/tools page renders the full tools workbench', async () => {
        const page = await readExistingFile('src', 'pages', 'works', 'tools.astro');

        assert.match(page, /import\s+BaseLayout\s+from\s+['"]\.\.\/\.\.\/layouts\/BaseLayout\.astro['"]/);
        assert.match(page, /import\s+PageIntro\s+from\s+['"]\.\.\/\.\.\/components\/PageIntro\.astro['"]/);
        assert.match(page, /import\s+ToolsSection\s+from\s+['"]\.\.\/\.\.\/components\/ToolsSection\.astro['"]/);
        assert.match(page, /<BaseLayout/);
        assert.match(page, /<PageIntro/);
        assert.match(page, /<ToolsSection\s*\/>/);
        assert.match(page, /currentPage=["']works["']/);
    });

    test('TimerWidget renders the complete timer structure and loads timer.ts', async () => {
        const widget = await readExistingFile('src', 'components', 'TimerWidget.astro');

        for (const id of ['hours', 'minutes', 'seconds', 'set-time', 'timer-display', 'progress-bar', 'progress-text', 'start', 'pause', 'reset']) {
            assert.match(widget, new RegExp(`id=["']${id}["']`));
        }
        assert.match(widget, /onclick=["']changeTime\(['"]hours['"],\s*-1\)/);
        assert.match(widget, /onclick=["']changeTime\(['"]seconds['"],\s*1\)/);
        assert.match(widget, /import\s+['"]\.\.\/scripts\/timer\.ts['"]/);
        assert.match(widget, /Timer\.init\(/);
    });

    test('timer.ts preserves timer behavior and the global changeTime API', async () => {
        const source = await readExistingFile('src', 'scripts', 'timer.ts');

        assert.match(source, /export\s+const\s+Timer/);
        assert.match(source, /init\(\s*elements[^)]*=\s*\{\}/s);
        assert.match(source, /setInterval\([^,]+,\s*100\)/);
        assert.match(source, /validateTimeInput/);
        assert.match(source, /setTimeFromInputs/);
        assert.match(source, /updateProgress/);
        assert.match(source, /changeTime\(\s*type[^,]*,\s*delta/s);
        assert.match(source, /window\.changeTime\s*=/);
        assert.match(source, /window\.MrXiaApp/);
        assert.match(source, /elapsedTime/);
        assert.match(source, /targetTime/);
    });

    test('RandomSelector component renders inputs, upload controls, and loads random-selector.ts', async () => {
        const widget = await readExistingFile('src', 'components', 'RandomSelector.astro');

        for (const id of ['itemInput', 'items', 'chosen', 'fileInput', 'fileSelectionStatus']) {
            assert.match(widget, new RegExp(`id=["']${id}["']`));
        }
        assert.match(widget, /RandomSelector\.addItem\(\)/);
        assert.match(widget, /RandomSelector\.deleteAll\(\)/);
        assert.match(widget, /RandomSelector\.chooseRandom\(\)/);
        assert.match(widget, /RandomSelector\.handleFiles\(\)/);
        assert.match(widget, /RandomSelector\.openFilePicker\(\)/);
        assert.match(widget, /type=["']button["'][^>]+class=["'][^"']*tool-file-trigger/);
        assert.doesNotMatch(widget, /<label\s+for=["']fileInput["'][^>]*tool-file-trigger/);
        assert.match(widget, /accept=["']\.txt,\.md,\.docx["']/);
        assert.match(widget, /import\s+['"]\.\.\/scripts\/random-selector\.ts['"]/);
    });

    test('random-selector.ts preserves option management, file import, and mammoth fallback', async () => {
        const source = await readExistingFile('src', 'scripts', 'random-selector.ts');

        for (const fn of ['addItem', 'deleteItem', 'deleteAll', 'chooseRandom', 'openFilePicker', 'handleFiles', 'updateList']) {
            assert.match(source, new RegExp(`\\b${fn}\\b`));
        }
        assert.match(source, /fileInput\.click\(\)/);
        assert.match(source, /sanitizeInput/);
        assert.match(source, /SUPPORTED_FILE_EXTENSIONS/);
        assert.match(source, /\.txt|txt/);
        assert.match(source, /\.md|md/);
        assert.match(source, /\.docx|docx/);
        assert.match(source, /cdnjs\.cloudflare\.com\/ajax\/libs\/mammoth/);
        assert.match(source, /\/libs\/mammoth\/mammoth\.browser\.min\.js/);
        assert.match(source, /window\.RandomSelector\s*=/);
    });

    test('ToolsSection renders all three tabs with click and keyboard switching', async () => {
        const section = await readExistingFile('src', 'components', 'ToolsSection.astro');

        for (const component of ['TimerWidget', 'RandomSelector', 'MarkdownToolWidget']) {
            assert.match(section, new RegExp(`import\\s+${component}\\s+from`));
            assert.match(section, new RegExp(`<${component}\\s*\\/>`));
        }
        for (const label of ['计时器', '随机抽取', 'Markdown 发布']) {
            assert.match(section, new RegExp(label));
        }
        assert.match(section, /class=["']tools-shell["']/);
        assert.match(section, /class=["'][^"']*tools-quick-stats/);
        assert.match(section, /role=["']tablist["']/);
        assert.match(section, /ArrowLeft/);
        assert.match(section, /ArrowRight/);
        assert.match(section, /aria-selected/);
        assert.match(section, /window\.MrXiaApp\.Timer/);
    });

    test('markdown-renderer.ts uses npm packages and exposes the required rendering modes', async () => {
        const source = await readExistingFile('src', 'scripts', 'markdown-renderer.ts');

        assert.match(source, /import\s+\{\s*marked\s*\}\s+from\s+['"]marked['"]/);
        assert.match(source, /import\s+hljs\s+from\s+['"]highlight\.js\/lib\/core['"]/);
        assert.match(source, /hljs\.registerLanguage/);
        assert.match(source, /import\s+katex\s+from\s+['"]katex['"]/);
        assert.match(source, /from\s+['"]katex\/contrib\/auto-render['"]/);
        for (const fn of [
            'render',
            'showCollapsed',
            'showExpanded',
            'togglePreview',
            'exportHTML',
            'copyHTML',
            'copyRichHTMLToClipboard',
            'processImages',
            'formatHTML',
            'exportFormattedHTML',
            'copyFormattedHTML',
            'renderWeChat',
            'copyWeChatHTML',
            'toggleWeChatMode',
        ]) {
            assert.match(source, new RegExp(`\\b${fn}\\b`));
        }
        assert.match(source, /ClipboardItem/);
        assert.match(source, /navigator\.clipboard\.write/);
        assert.match(source, /['"]text\/html['"]/);
        assert.match(source, /['"]text\/plain['"]/);
        assert.match(source, /font-size:\s*15px/);
        assert.match(source, /line-height:\s*1\.8/);
        assert.match(source, /color:\s*#3f3f3f/);
        assert.match(source, /window\.MarkdownRenderer\s*=/);
    });

    test('MarkdownToolWidget renders the editor, preview, toolbar, and isolated styles', async () => {
        const widget = await readExistingFile('src', 'components', 'MarkdownToolWidget.astro');

        for (const id of ['markdown-input', 'markdown-output', 'toggle-btn', 'loading-indicator', 'loading-text']) {
            assert.match(widget, new RegExp(`id=["']${id}["']`));
        }
        for (const id of ['wechat-copy-btn', 'wechat-copy-status']) {
            assert.match(widget, new RegExp(`id=["']${id}["']`));
        }
        for (const label of ['加载示例', '清空', '渲染预览', '复制到公众号', '导出 HTML', '复制 HTML', '公众号预览']) {
            assert.match(widget, new RegExp(label));
        }
        assert.match(widget, /class=["'][^"']*markdown-command-surface/);
        assert.match(widget, /class=["'][^"']*markdown-workspace/);
        assert.match(widget, /MarkdownRenderer\.copyWeChatHTML\(\)/);
        assert.match(widget, /<style>/);
        assert.match(widget, /import\s+['"]\.\.\/scripts\/markdown-renderer\.ts['"]/);
        assert.match(widget, /MarkdownRenderer\.init\(/);
        assert.match(widget, /toggleWeChatMode\(\)/);
    });

    test('markdown-tool page provides an independent page that reuses MarkdownToolWidget', async () => {
        const page = await readExistingFile('src', 'pages', 'markdown-tool.astro');

        assert.match(page, /import\s+BaseLayout\s+from\s+['"]\.\.\/layouts\/BaseLayout\.astro['"]/);
        assert.match(page, /import\s+PageIntro\s+from\s+['"]\.\.\/components\/PageIntro\.astro['"]/);
        assert.match(page, /import\s+MarkdownToolWidget\s+from\s+['"]\.\.\/components\/MarkdownToolWidget\.astro['"]/);
        assert.match(page, /<BaseLayout/);
        assert.match(page, /<PageIntro/);
        assert.match(page, /<MarkdownToolWidget\s*\/>/);
    });

    test('mammoth local fallback remains available under public assets', async () => {
        await assertFileExists('public', 'libs', 'mammoth', 'mammoth.browser.min.js');
    });
});
