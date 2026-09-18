import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import rehypeScrollableTables from '../src/lib/rehype-scrollable-tables.js';

test('Markdown tables keep their structure inside keyboard-accessible scroll regions', async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins: [rehypeScrollableTables] });
    const { code } = await processor.render('| 名称 | 说明 |\n| --- | --- |\n| 示例 | 内容 |');
    assert.match(code, /<div class="article-table-scroll" tabindex="0" role="region" aria-label="表格（可横向滚动）">\s*<table>/);
    assert.match(code, /<th>名称<\/th>/);
    assert.match(code, /<td>内容<\/td>/);
    assert.match(code, /<\/table><\/div>/);
});

test('table transform tolerates empty trees and does not double-wrap tables', () => {
    const transform = rehypeScrollableTables();
    transform({ type: 'root' });
    const table = { type: 'element', tagName: 'table', children: [] };
    const tree = { type: 'root', children: [table] };
    transform(tree);
    transform(tree);
    assert.equal(tree.children[0].children[0], table);
});

test('Mermaid fences retain escaped source and a runtime language marker', async () => {
    const processor = await createMarkdownProcessor({ rehypePlugins: [rehypeScrollableTables] });
    const { code } = await processor.render('```mermaid\ngraph LR\n A["<b>text</b>"] --> B\n```');
    assert.match(code, /data-language="mermaid"/);
    assert.ok(!code.includes('<b>text</b>'));
});
