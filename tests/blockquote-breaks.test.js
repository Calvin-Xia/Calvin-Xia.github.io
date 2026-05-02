import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('blockquote markdown rendering', () => {
    test('preserves soft line breaks only inside blockquotes', async () => {
        let module;

        try {
            module = await import('../src/lib/remark-blockquote-breaks.js');
        } catch {
            assert.fail('remark-blockquote-breaks.js must provide blockquote line-break handling');
        }

        const tree = {
            type: 'root',
            children: [
                {
                    type: 'blockquote',
                    children: [
                        {
                            type: 'paragraph',
                            children: [{ type: 'text', value: '第一行\n第二行\n第三行' }],
                        },
                    ],
                },
                {
                    type: 'paragraph',
                    children: [{ type: 'text', value: '普通第一行\n普通第二行' }],
                },
            ],
        };

        module.preserveBlockquoteSoftBreaks(tree);

        assert.deepEqual(tree.children[0].children[0].children, [
            { type: 'text', value: '第一行' },
            { type: 'break' },
            { type: 'text', value: '第二行' },
            { type: 'break' },
            { type: 'text', value: '第三行' },
        ]);

        assert.deepEqual(tree.children[1].children, [
            { type: 'text', value: '普通第一行\n普通第二行' },
        ]);
    });
});
