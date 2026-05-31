import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');

function readJson(...segments) {
    return JSON.parse(readFileSync(path.join(rootDir, ...segments), 'utf8'));
}

function getKeys(obj, prefix = '') {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
            keys.push(...getKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys.sort();
}

describe('i18n translation files', () => {
    it('zh-CN.json should be valid JSON', () => {
        assert.doesNotThrow(() => readJson('src', 'i18n', 'zh-CN.json'));
    });

    it('en-US.json should be valid JSON', () => {
        assert.doesNotThrow(() => readJson('src', 'i18n', 'en-US.json'));
    });

    it('zh-CN and en-US should have the same keys', () => {
        const zhKeys = getKeys(readJson('src', 'i18n', 'zh-CN.json'));
        const enKeys = getKeys(readJson('src', 'i18n', 'en-US.json'));

        assert.deepEqual(zhKeys, enKeys);
    });
});
