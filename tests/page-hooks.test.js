import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..');

function readProjectFile(...segments) {
    return readFileSync(path.join(rootDir, ...segments), 'utf8');
}

/**
 * Collects the DOM event names a page initializer is registered against.
 * `initName` is matched on a word boundary so `initHomePage` does not also match
 * `initHomePageExtras`.
 */
function registrationEvents(source, initName) {
    const events = new Map();
    const pattern = new RegExp(`addEventListener\\(\\s*['"]([\\w:-]+)['"]\\s*,\\s*${initName}\\b`, 'g');

    for (const match of source.matchAll(pattern)) {
        events.set(match[1], (events.get(match[1]) || 0) + 1);
    }

    return events;
}

const PAGE_HOOKS = [
    { file: ['src', 'pages', 'index.astro'], init: 'initHomePage', label: 'index.astro' },
    { file: ['src', 'pages', 'about.astro'], init: 'initAboutPage', label: 'about.astro' },
    { file: ['src', 'pages', 'styleguide.astro'], init: 'initStyleguidePage', label: 'styleguide.astro' },
];

describe('Page hooks keep working across in-site navigation', () => {
    for (const { file, init, label } of PAGE_HOOKS) {
        test(`${label} re-runs ${init} on astro:page-load`, () => {
            const source = readProjectFile(...file);
            const events = registrationEvents(source, init);

            assert.match(source, new RegExp(`function\\s+${init}\\s*\\(`), `${label} must define ${init}()`);
            assert.equal(
                events.get('astro:page-load'),
                1,
                `${label} must register ${init} on astro:page-load exactly once: the ClientRouter skips already executed module scripts, so a DOMContentLoaded hook alone leaves the page inert after an in-site navigation`,
            );
            assert.ok(
                !(events.size === 1 && events.has('DOMContentLoaded')),
                `${label} must not hook ${init} to DOMContentLoaded only`,
            );
        });

        test(`${label} boots ${init} once on first paint`, () => {
            const source = readProjectFile(...file);
            const domReadyRegistrations = source.match(
                new RegExp(`addEventListener\\(\\s*['"]DOMContentLoaded['"]\\s*,\\s*${init}\\b`, 'g'),
            ) || [];
            const guardedDomReady = new RegExp(
                `addEventListener\\(\\s*['"]DOMContentLoaded['"]\\s*,\\s*${init}\\b[^)]*\\{\\s*once:\\s*true\\s*\\}`,
            );
            const hasDomReadyBranch = /document\.readyState\s*===\s*['"]loading['"]/.test(source);

            assert.ok(
                domReadyRegistrations.length <= 1,
                `${label} must not register ${init} on DOMContentLoaded more than once`,
            );

            if (hasDomReadyBranch) {
                assert.equal(domReadyRegistrations.length, 1, `${label} must keep a single DOMContentLoaded boot`);
                assert.match(source, guardedDomReady, `${label} must guard its DOMContentLoaded boot with { once: true }`);
            } else {
                assert.equal(domReadyRegistrations.length, 0, `${label} must not keep a DOMContentLoaded hook`);
                assert.match(source, new RegExp(`\\n\\s*${init}\\(\\);`), `${label} must invoke ${init}() immediately`);
            }
        });
    }
});
