import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { remarkMarkHighlight } from '../src/lib/remark-mark-highlight.js';

describe('markdown mark highlight remark plugin', () => {
    test('converts ==text== spans into mark nodes for article rendering', () => {
        const tree = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            value: '这里有 ==高亮文字== 和普通文字。',
                        },
                    ],
                },
            ],
        };

        remarkMarkHighlight()(tree);

        assert.deepEqual(tree.children[0].children, [
            { type: 'text', value: '这里有 ' },
            {
                type: 'markHighlight',
                data: { hName: 'mark' },
                children: [{ type: 'text', value: '高亮文字' }],
            },
            { type: 'text', value: ' 和普通文字。' },
        ]);
    });

    test('leaves code nodes untouched', () => {
        const tree = {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'inlineCode',
                            value: '==not-highlight==',
                        },
                    ],
                },
            ],
        };

        remarkMarkHighlight()(tree);

        assert.deepEqual(tree.children[0].children, [
            {
                type: 'inlineCode',
                value: '==not-highlight==',
            },
        ]);
    });
});
