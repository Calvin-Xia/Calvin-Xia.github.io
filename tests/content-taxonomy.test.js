import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    CATEGORY_WHITELIST,
    TAG_MAX_COUNT,
    TAG_MIN_COUNT,
    TAG_WHITELIST,
    validateTaxonomy,
} from '../src/lib/content-taxonomy.js';

// 测试词表（假值），与生产词表解耦：词表变更不应影响这些断言。
const taxonomy = {
    categoryWhitelist: ['c1', 'c2'],
    tagWhitelist: ['t1', 't2', 't3', 't4', 't5'],
};

describe('validateTaxonomy shared taxonomy rules', () => {
    test('accepts category and tags inside the injected whitelist', () => {
        assert.deepEqual(validateTaxonomy('c1', ['t1', 't2'], taxonomy), {});
        assert.deepEqual(validateTaxonomy('c2', 't3,t4', taxonomy), {});
    });

    test('rejects a category outside the whitelist', () => {
        const errors = validateTaxonomy('c9', ['t1'], taxonomy);
        assert.match(errors.category, /category 必须为 c1 \/ c2 之一/);
        assert.match(errors.category, /c9/);
        assert.equal(errors.tags, undefined);
    });

    test('rejects a tag outside the whitelist', () => {
        const errors = validateTaxonomy('c1', ['t1', 't9'], taxonomy);
        assert.equal(errors.category, undefined);
        assert.match(errors.tags, /tags 含白名单外的词: t9/);
    });

    test(`rejects more than ${TAG_MAX_COUNT} tags`, () => {
        const errors = validateTaxonomy('c1', ['t1', 't2', 't3', 't4', 't5'], taxonomy);
        assert.match(errors.tags, new RegExp(`tags 数量必须为 ${TAG_MIN_COUNT}-${TAG_MAX_COUNT} 个，实际值: 5 个`));
    });

    test('rejects a tag equal to the category', () => {
        const overlapping = { categoryWhitelist: ['c'], tagWhitelist: ['c', 't1'] };
        const errors = validateTaxonomy('c', ['c', 't1'], overlapping);
        assert.match(errors.tags, /tags 不得与 category 相同: c/);
        assert.ok(!/白名单外/.test(errors.tags), 'overlap case must not blame the whitelist');
    });

    test('reports empty category and tags in the existing wording', () => {
        assert.deepEqual(validateTaxonomy('', [], taxonomy), {
            category: '分类不能为空',
            tags: '标签不能为空',
        });
    });

    test('skips tag rules when tags is undefined (single-field prompts)', () => {
        assert.deepEqual(validateTaxonomy('c9', undefined, taxonomy), {
            category: 'category 必须为 c1 / c2 之一，实际值: c9（见 AGENTS.md 的 Blog Taxonomy）',
        });
        assert.deepEqual(validateTaxonomy('c1', undefined, taxonomy), {});
    });

    test('defaults to the production whitelist and rejects fake values', () => {
        const errors = validateTaxonomy('c', ['t']);
        assert.ok(errors.category, 'fake category must fail against the default whitelist');
        assert.ok(errors.tags, 'fake tags must fail against the default whitelist');
        assert.deepEqual(CATEGORY_WHITELIST, ['随笔', '总结', '日志']);
        assert.ok(TAG_WHITELIST.length > 0);
    });
});
